import json
import os
import shutil
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import datetime


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "gs_burak_data.json"
BACKUP_DIR = ROOT / "backups"
COLLECTIONS = ("clientes", "productos", "tiposServicio", "servicios", "programaciones", "compras", "gastos", "equipos")
COLLECTION_TABLES = {
    "clientes": "app_clientes",
    "productos": "app_productos",
    "tiposServicio": "app_tipos_servicio",
    "servicios": "app_servicios",
    "programaciones": "app_programaciones",
    "compras": "app_compras",
    "gastos": "app_gastos",
    "equipos": "app_equipos",
}
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
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read().decode("utf-8")
        return json.loads(body) if body else None


def load_cloud_state():
    rows = supabase_request("GET", f"app_state?id=eq.{SUPABASE_STATE_ID}&select=data")
    if rows:
        return rows[0].get("data") or {}
    return {}


def load_table_state():
    data = {"schemaVersion": 2}
    total_rows = 0
    for collection, table in COLLECTION_TABLES.items():
        rows = supabase_request("GET", f"{table}?select=data")
        items = [row.get("data") for row in (rows or []) if isinstance(row, dict) and row.get("data")]
        data[collection] = items
        total_rows += len(items)
    return data if total_rows else {}


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


def save_cloud_record(collection, record):
    table = COLLECTION_TABLES.get(collection)
    record_id = record.get("id") if isinstance(record, dict) else None
    if not table or not record_id:
        raise ValueError("Invalid collection or record id")
    payload = {
        "id": str(record_id),
        "data": record,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    return supabase_request("POST", f"{table}?on_conflict=id", [payload])


def delete_cloud_record(collection, record_id):
    table = COLLECTION_TABLES.get(collection)
    if not table or not record_id:
        raise ValueError("Invalid collection or record id")
    safe_id = urllib.parse.quote(str(record_id), safe="")
    return supabase_request("DELETE", f"{table}?id=eq.{safe_id}")


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
                data = load_table_state() or load_cloud_state()
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
        if self.path == "/api/record":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length)
            try:
                payload = json.loads(body.decode("utf-8"))
                collection = payload.get("collection")
                record = payload.get("record")
                save_cloud_record(collection, record)
            except Exception as error:
                self.send_error(400, f"Invalid record: {error}")
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return
        self.send_error(404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/record":
            params = urllib.parse.parse_qs(parsed.query)
            collection = (params.get("collection") or [""])[0]
            record_id = (params.get("id") or [""])[0]
            try:
                delete_cloud_record(collection, record_id)
            except Exception as error:
                self.send_error(400, f"Invalid delete: {error}")
                return
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
