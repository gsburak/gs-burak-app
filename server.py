import json
import os
import shutil
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import datetime


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "gs_burak_data.json"
BACKUP_DIR = ROOT / "backups"
COLLECTIONS = ("clientes", "productos", "tiposServicio", "servicios", "compras", "gastos", "equipos")
SUPABASE_URL = "https://xuswzuxtccpwlyizbrcj.supabase.co"
SUPABASE_KEY = "sb_publishable_dBXdapkvlNFK2byoRHCLgw_mBAAF87-"
SUPABASE_STATE_ID = "main"


def backup_current_state():
    if not DATA_FILE.exists():
        return
    BACKUP_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.copy2(DATA_FILE, BACKUP_DIR / f"gs_burak_data_{stamp}.json")


def merge_without_losing_existing(existing, incoming):
    if not isinstance(existing, dict) or not isinstance(incoming, dict):
        return incoming
    merged = dict(incoming)
    for collection in COLLECTIONS:
        old_rows = existing.get(collection) or []
        new_rows = incoming.get(collection) or []
        if not isinstance(old_rows, list) or not isinstance(new_rows, list):
            continue
        if len(new_rows) >= len(old_rows):
            continue
        seen_ids = {str(row.get("id")) for row in new_rows if isinstance(row, dict) and row.get("id")}
        recovered = [
            row for row in old_rows
            if isinstance(row, dict) and row.get("id") and str(row.get("id")) not in seen_ids
        ]
        if recovered:
            merged[collection] = new_rows + recovered
    return merged


def supabase_request(method, path, payload=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Prefer"] = "return=representation"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else None


def load_cloud_state():
    rows = supabase_request("GET", f"app_state?id=eq.{SUPABASE_STATE_ID}&select=data")
    if rows:
        return rows[0].get("data") or {}
    return {}


def save_cloud_state(data):
    payload = {
        "id": SUPABASE_STATE_ID,
        "data": data,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    return supabase_request(
        "POST",
        "app_state?on_conflict=id",
        [payload],
    )


def load_local_state():
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    return {}


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        if self.path == "/api/state":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            try:
                data = load_cloud_state()
                if not data:
                    data = load_local_state()
                    if data:
                        save_cloud_state(data)
                self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
            except Exception:
                if DATA_FILE.exists():
                    self.wfile.write(DATA_FILE.read_bytes())
                else:
                    self.wfile.write(b"{}")
            return
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/state":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length)
            try:
                data = json.loads(body.decode("utf-8"))
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
                return
            existing = {}
            if DATA_FILE.exists():
                try:
                    existing = json.loads(DATA_FILE.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    existing = {}
            backup_current_state()
            data = merge_without_losing_existing(existing, data)
            DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            try:
                cloud = load_cloud_state()
                data = merge_without_losing_existing(cloud, data)
                save_cloud_state(data)
            except Exception as error:
                print(f"No se pudo guardar en Supabase: {error}")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return
        self.send_error(404)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "4173"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"GS Burak disponible en http://0.0.0.0:{port}")
    server.serve_forever()
