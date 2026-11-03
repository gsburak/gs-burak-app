"""Server-only credentials and revocable cloud sessions. No browser passwords."""
import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from urllib.parse import urlsplit

LOCK = threading.RLock()
COOKIE = 'burak_session'
SESSION_SECONDS = 28800


def derive(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), 600_000).hex()


class Auth:
    def __init__(self, cloud, config=None, clock=time.time):
        self.cloud, self.clock = cloud, clock
        self.origin = os.environ.get('GS_PUBLIC_ORIGIN') or os.environ.get('RENDER_EXTERNAL_URL', '')
        self.users = json.loads(config if config is not None else os.environ.get('GS_AUTH_CONFIG', '{}'))
        for name, user in self.users.items():
            if name not in ('admin', 'tecnico', 'consulta') or user.get('role') not in ('admin', 'operativo', 'consulta'):
                raise ValueError('Configuración de acceso inválida')
            if len(bytes.fromhex(user['salt'])) != 32 or len(bytes.fromhex(user['hash'])) != 32:
                raise ValueError('Credenciales inválidas')

    def read(self, key):
        rows = self.cloud('GET', f'app_state?id=eq.{key}&select=data')
        return rows[0]['data'] if rows else None

    def write(self, key, data):
        self.cloud('POST', 'app_state?on_conflict=id', [{'id': key, 'data': data, 'updated_at': datetime.now(timezone.utc).isoformat()}])

    def token(self, headers):
        cookie = SimpleCookie()
        try:
            cookie.load(headers.get('Cookie', ''))
            token = cookie[COOKIE].value if COOKIE in cookie else ''
            return token if len(token) <= 100 else ''
        except Exception:
            return ''

    def key(self, token):
        return 'burak_session_' + hashlib.sha256(token.encode()).hexdigest()

    def user(self, headers):
        token = self.token(headers)
        data = self.read(self.key(token)) if token else None
        if not data or data.get('expires', 0) <= self.clock():
            return None
        user = self.users.get(data.get('user'))
        # Password rotation invalidates all old sessions for this account.
        if not user or not hmac.compare_digest(data.get('credential', ''), user['hash']):
            return None
        return {'id': data['user'], 'name': user['name'], 'role': user['role']}

    def login(self, username, password):
        with LOCK:
            now = self.clock()
            # Account-wide throttle is persisted so proxy headers cannot bypass it.
            name = username if username in self.users else 'unknown'
            key = 'burak_login_' + name
            attempts = [t for t in (self.read(key) or {}).get('attempts', []) if now-t < 300]
            if len(attempts) >= 10:
                return None, 429
            user = self.users.get(username)
            valid = isinstance(password, str) and len(password) <= 256 and user
            if valid:
                valid = hmac.compare_digest(derive(password, user['salt']), user['hash'])
            if not valid:
                self.write(key, {'attempts': attempts + [now]})
                return None, 401
            self.write(key, {'attempts': []})
            token = secrets.token_urlsafe(32)
            self.write(self.key(token), {'user': username, 'credential': user['hash'], 'expires': now+SESSION_SECONDS})
            return token, 200

    def logout(self, headers):
        token = self.token(headers)
        if token:
            self.write(self.key(token), {'expires': 0})

    def same_origin(self, headers):
        supplied = headers.get('Origin', '')
        expected = self.origin.rstrip('/')
        if not expected:
            host = headers.get('Host', '')
            if host.split(':')[0] not in ('127.0.0.1', 'localhost'):
                return False
            expected = 'http://' + host
        parsed = urlsplit(expected)
        return (parsed.netloc == headers.get('Host') and supplied == expected
                and headers.get('Sec-Fetch-Site') != 'cross-site')

    def cookie(self, token, clear=False):
        secure = '; Secure' if self.origin.startswith('https://') else ''
        return f'{COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={0 if clear else SESSION_SECONDS}{secure}'
