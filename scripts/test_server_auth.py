"""Real HTTP requests to an isolated server; cloud reads/writes stay in memory."""
import hashlib
import http.client
import json
import os
import sys
import threading
import unittest
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from burak_auth import Auth, derive
from admin_fixture_server import cloud, storage, source
from administrations import BUNDLE_ID, prepare
import server


class AuthTests(unittest.TestCase):
    def setUp(self):
        self.password = 'Only-for-test-123456'
        salt = '12' * 32
        self.config = {name: {'name': name, 'role': role, 'salt': salt, 'hash': derive(self.password, salt)}
                       for name, role in [('admin', 'admin'), ('consulta', 'consulta')]}
        storage.clear()
        storage[BUNDLE_ID] = prepare(deepcopy(source))
        self.original = deepcopy(storage[BUNDLE_ID])
        self.env = patch.dict(os.environ, {'GS_AUTH_CONFIG': json.dumps(self.config), 'GS_PUBLIC_ORIGIN': 'https://test.example'})
        self.env.start()
        self.cloudpatch = patch.object(server, 'supabase_request', cloud)
        self.cloudpatch.start()
        class QuietHandler(server.Handler):
            def log_message(self, *args): pass
        self.http = server.ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self.cleanup)

    def cleanup(self):
        self.http.shutdown(); self.http.server_close(); self.thread.join()
        self.cloudpatch.stop(); self.env.stop()

    def call(self, method, path, body=None, cookie=None, origin='https://test.example'):
        headers = {'Host': 'test.example', 'X-Burak-Administracion': 'nueva'}
        if cookie: headers['Cookie'] = cookie
        if origin: headers['Origin'] = origin
        if body is not None: headers['Content-Type'] = 'application/json'
        conn = http.client.HTTPConnection('127.0.0.1', self.http.server_port)
        conn.request(method, path, json.dumps(body) if body is not None else None, headers)
        res = conn.getresponse(); result = (res.status, dict(res.getheaders()), res.read())
        conn.close(); return result

    def login(self, username='admin'):
        status, headers, _ = self.call('POST', '/api/auth/login', {'username': username, 'password': self.password})
        self.assertEqual(status, 200)
        cookie = headers['Set-Cookie']
        for flag in ('HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/'): self.assertIn(flag, cookie)
        return cookie.split(';')[0]

    def test_anonymous_business_routes_denied_without_cloud_changes(self):
        for path in ['/api/state', '/api/backup', '/api/formats', '/api/administraciones/preparar']:
            self.assertEqual(self.call('GET', path)[0], 401, path)
        for method, path in [('POST', '/api/state'), ('POST', '/api/record'), ('POST', '/api/restore'),
                             ('POST', '/api/formats'), ('POST', '/api/pendientes'), ('DELETE', '/api/record?id=x')]:
            self.assertEqual(self.call(method, path, {})[0], 401, path)
        self.assertEqual(storage[BUNDLE_ID], self.original)

    def test_login_state_backup_logout_and_cookie_tampering(self):
        cookie = self.login()
        self.assertEqual(json.loads(self.call('GET', '/api/state', cookie=cookie)[2]), self.original['etapas']['nueva'])
        backup = json.loads(self.call('GET', '/api/backup', cookie=cookie)[2])
        self.assertEqual(backup['data'], self.original['etapas']['nueva'])
        self.assertEqual(self.call('GET', '/api/state', cookie='burak_session=forged')[0], 401)
        self.assertEqual(self.call('POST', '/api/auth/logout', cookie=cookie)[0], 200)
        self.assertEqual(self.call('GET', '/api/state', cookie=cookie)[0], 401)

    def test_origin_checks_and_restricted_backup(self):
        cookie = self.login('consulta')
        self.assertEqual(self.call('GET', '/api/backup', cookie=cookie)[0], 403)
        self.assertEqual(self.call('POST', '/api/restore', {}, cookie=cookie)[0], 403)
        self.assertEqual(self.call('POST', '/api/record', {}, cookie=cookie)[0], 403)
        self.assertEqual(self.call('POST', '/api/auth/logout', cookie=cookie, origin=None)[0], 403)
        self.assertEqual(self.call('POST', '/api/auth/login', {}, origin='https://evil.example')[0], 403)

    def test_private_files_and_directory_listing_are_not_served(self):
        for path in ['/server.py', '/burak_auth.py', '/gs_burak_data.json', '/.git/config', '/.env',
                     '/docs/', '/tmp/', '/scripts/', '/netlify-sites/', '/%2eenv', '/backups/data.json']:
            for method in ('GET', 'HEAD'):
                self.assertEqual(self.call(method, path)[0], 404, (method, path))
        for path in ['/', '/app.js', '/styles.css', '/netlify-sites/certificado/index.html']:
            self.assertEqual(self.call('GET', path)[0], 200, path)
        self.assertNotIn(b'password:', self.call('GET', '/app.js')[2][:1200])

    def test_missing_configuration_and_cloud_outage_fail_closed(self):
        with patch.dict(os.environ, {'GS_AUTH_CONFIG': '{}'}):
            self.assertEqual(self.call('POST', '/api/auth/login', {'username':'admin','password':self.password})[0],503)
        cookie=self.login()
        with patch.object(server, 'supabase_request', side_effect=RuntimeError('private key must never appear')):
            status, _, body=self.call('GET', '/api/state', cookie=cookie)
            self.assertEqual(status,503);self.assertNotIn(b'private key',body)

    def test_expiry_rotation_and_throttle(self):
        auth=Auth(cloud,json.dumps(self.config),clock=lambda:1000)
        token,status=auth.login('admin',self.password);self.assertEqual(status,200)
        headers={'Cookie':'burak_session='+token}
        self.assertIsNotNone(auth.user(headers))
        auth.clock=lambda:1000+28801
        self.assertIsNone(auth.user(headers))
        auth.clock=lambda:1000
        auth.users['admin']['hash']='ab'*32
        self.assertIsNone(auth.user(headers))
        for _ in range(10):self.assertEqual(auth.login('admin','wrong')[1],401)
        self.assertEqual(auth.login('admin',self.password)[1],429)


if __name__ == '__main__': unittest.main()
