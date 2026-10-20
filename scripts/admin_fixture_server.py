"""Local-only UI fixture. All cloud and calendar operations stay in memory."""
from copy import deepcopy
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_administrations import fixture
from administrations import prepare, BUNDLE_ID
import server

source = fixture()
storage = {BUNDLE_ID: prepare(source)}


def cloud(method, path, payload=None):
    if method == "GET":
        identifier = path.split("id=eq.")[1].split("&")[0] if "id=eq." in path else ""
        return [{"data": deepcopy(storage[identifier])}] if identifier in storage else []
    for row in payload or []:
        storage[row["id"]] = deepcopy(row["data"])
    return []


if __name__ == "__main__":
    server.supabase_request = cloud
    server.load_table_state = lambda: deepcopy(source)
    server.load_cloud_state = lambda: deepcopy(source)
    server.create_calendar_event = lambda _: {"ok": True, "id": "test-only"}
    instance = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    print(instance.server_port, flush=True)
    instance.serve_forever()
