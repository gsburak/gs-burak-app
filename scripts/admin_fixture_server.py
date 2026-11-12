"""Local-only UI fixture. All cloud and calendar operations stay in memory."""
from copy import deepcopy
from pathlib import Path
import sys
from urllib.parse import parse_qs
from threading import RLock
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_administrations import fixture
from administrations import prepare, BUNDLE_ID
import server

source = fixture()
storage = {BUNDLE_ID: prepare(source)}


cloud_lock=RLock()
def cloud(method, path, payload=None, prefer=None):
    with cloud_lock:
        query=parse_qs(path.partition('?')[2]);identifier=query.get('id',[''])[0].removeprefix('eq.')
        if method=='GET':
            if identifier not in storage:return []
            data=deepcopy(storage[identifier])
            selection=query.get('select',['data'])[0]
            if selection.startswith('stage:data->etapas->'):
                return [{'stage':data.get('etapas',{}).get(selection.split('->')[-1])}]
            if selection=='index:data->documentIndex':return [{'index':data.get('documentIndex')}]
            if selection.startswith('document:data->documents->'):
                return [{'document':data.get('documents',{}).get(selection.split('->')[-1])}]
            return [{'data':data}]
        if method=='PATCH':
            expected=query.get('data->>revision',[''])[0].removeprefix('eq.')
            if identifier not in storage or str(storage[identifier].get('revision'))!=expected:return []
            storage[identifier]=deepcopy(payload['data']);return [{'data':deepcopy(storage[identifier])}]
        for row in payload or []:
            if prefer and 'ignore-duplicates' in prefer and row['id'] in storage:continue
            storage[row['id']]=deepcopy(row['data'])
        return []


if __name__ == "__main__":
    server.supabase_request = cloud
    server.load_table_state = lambda: deepcopy(source)
    server.load_cloud_state = lambda: deepcopy(source)
    server.create_calendar_event = lambda _: {"ok": True, "id": "test-only"}
    instance = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
    print(instance.server_port, flush=True)
    instance.serve_forever()
