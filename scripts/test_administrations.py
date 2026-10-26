import io
import json
from copy import deepcopy
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from administrations import prepare, validate_stage, BUNDLE_ID, BACKUP_ID, COLLECTIONS
from administration_api import AdministrationAPI


def fixture():
    source = {k: [] for k in COLLECTIONS}
    source.update(schemaVersion=2,
        clientes=[{"id": "client", "nombre": "Cliente de prueba"}],
        productos=[{"id": "p", "producto": "Producto", "factor": 1000, "costo": 200, "unidadCompra": "kilo", "unidadUso": "gr"}],
        compras=[{"id": "b1", "fecha": "2026-10-01", "productoId": "p", "cantidad": 1, "costoUnitario": 100, "operacion": "Yucatan"},
                 {"id": "b2", "fecha": "2026-10-15", "productoId": "p", "cantidad": 1, "costoUnitario": 200, "operacion": "Yucatan"},
                 {"id": "b3", "fecha": "2026-10-16", "productoId": "p", "cantidad": 1, "costoUnitario": 300, "operacion": "Yucatan"}],
        servicios=[{"id": "old", "fecha": "2026-10-15", "clienteId": "client", "subtotal": 1000, "cobrado": 300, "pagos": [{"id": "pay", "fecha": "2026-10-17", "importe": 300}], "productos": [{"productoId": "p", "cantidad": 1200}]},
                   {"id": "new", "fecha": "2026-10-16", "clienteId": "client", "subtotal": 500, "productos": [{"productoId": "p", "cantidad": 100}]}],
        gastos=[{"id": "g", "fecha": "2026-10-16", "monto": 50}],
        equipos=[{"id": "e", "fecha": "2025-01-01", "costo": 1000, "vida": 5}, {"id": "e2", "fecha": "2026-10-17", "costo": 200}],
        programaciones=[{"id": "a", "fecha": "2026-10-20", "clienteId": "client", "calendarEventId": "existing-event", "anticipo": 500}],
        pendientes=[{"id": "task", "estatus": "Pendiente", "fechaRecordatorio": "2026-10-10"}, {"id": "done", "estatus": "Completado"}])
    return source


class Request:
    def __init__(self, path, payload=None, stage=None, revision=None):
        self.path, self.status = path, None
        raw = json.dumps(payload).encode() if payload is not None else b""
        self.headers = {"Content-Length": str(len(raw))}
        if stage: self.headers["X-Burak-Administracion"] = stage
        if revision is not None: self.headers["X-Burak-Revision"] = str(revision)
        self.rfile, self.wfile = io.BytesIO(raw), io.BytesIO()

    def send_response(self, status): self.status = status
    def send_header(self, *_): pass
    def end_headers(self): pass
    def json(self): return json.loads(self.wfile.getvalue())


class Tests(unittest.TestCase):
    def test_cutover_and_fifo(self):
        source = fixture(); original = deepcopy(source)
        draft = prepare(source); old, new = draft["etapas"].values()
        self.assertEqual(source, original)
        self.assertEqual(draft["revision"]["incidencias"], [])
        self.assertEqual(old["servicios"][0]["pagos"][0]["fecha"], "2026-10-17")
        self.assertEqual([s["id"] for s in new["servicios"]], ["new"])
        self.assertEqual([c["id"] for c in new["compras"]], ["b3"])
        self.assertEqual([(l["cantidadUso"], l["costoUso"]) for l in new["inventarioInicial"]], [(800, .2)])
        self.assertEqual(len(new["equipos"]), 2)
        self.assertEqual(len(old["equipos"]), 1)
        self.assertTrue(new["equipos"][0]["equipoInicial"])
        self.assertFalse(new["equipos"][1]["equipoInicial"])
        self.assertEqual(len(new["pendientes"]), 1)
        self.assertEqual(new["programaciones"][0]["anticipo"], 500)
        self.assertEqual(new["programaciones"][0]["calendarEventId"], "existing-event")
        self.assertEqual(draft["revision"]["inventario"][0]["actual"], 1700)
        validate_stage(old, "anterior"); validate_stage(new, "nueva")
        with self.assertRaises(ValueError): validate_stage(old, "nueva")

    def test_negative_and_missing_dates_are_not_silently_fixed(self):
        source = fixture(); source["compras"] = source["compras"][2:]
        source["gastos"][0]["fecha"] = "2026-02-30"
        issues = prepare(source)["revision"]["incidencias"]
        self.assertTrue(any(i["tipo"] == "inventario_negativo" and i["saldo"] == -1200 for i in issues))
        self.assertTrue(any(i["tipo"] == "fecha" for i in issues))

    def test_api_activation_is_explicit_and_idempotent(self):
        source = fixture(); storage = {}
        def cloud(method, path, payload=None):
            if method == "GET":
                return [{"data": deepcopy(storage[BUNDLE_ID])}] if BUNDLE_ID in storage else []
            for row in payload: storage[row["id"]] = deepcopy(row["data"])
        def call(method, path, payload=None, stage=None, revision=None):
            request = Request(path, payload, stage, revision)
            handled = AdministrationAPI(request, lambda: source, cloud).handle(method)
            return handled, request
        handled, request = call("GET", "/api/state")
        self.assertFalse(handled); self.assertEqual(storage, {})
        _, request = call("GET", "/api/administraciones/preparar")
        preview = request.json(); self.assertEqual(storage, {})
        _, request = call("POST", "/api/administraciones/activar", {"huellaOrigen": "stale"})
        self.assertEqual(request.status, 409); self.assertEqual(storage, {})
        _, request = call("POST", "/api/administraciones/activar", {"huellaOrigen": preview["huellaOrigen"]})
        self.assertEqual(request.status, 200); self.assertEqual(storage[BACKUP_ID], source)
        immutable = deepcopy(storage[BACKUP_ID]); old = deepcopy(storage[BUNDLE_ID]["etapas"]["anterior"])
        _, request = call("POST", "/api/record", {"collection": "gastos", "record": {"id": "newg", "fecha": "2026-10-17", "monto": 10}}, "nueva", 0)
        self.assertEqual(request.status, 200)
        self.assertEqual(storage[BUNDLE_ID]["etapas"]["anterior"], old)
        _, request = call("POST", "/api/record", {"collection": "gastos", "record": {"id": "bad", "fecha": "2026-10-14"}}, "nueva", 1)
        self.assertEqual(request.status, 400)
        _, request = call("POST", "/api/state", source)
        self.assertEqual(request.status, 409)
        _, request = call("POST", "/api/restore", old, "nueva")
        self.assertEqual(request.status, 400)
        _, request = call("POST", "/api/record", {"collection": "clientes", "record": {"id": "client"}}, "nueva", 0)
        self.assertEqual(request.status, 409)
        _, request = call("POST", "/api/administraciones/activar", {})
        self.assertTrue(request.json()["yaActiva"])
        self.assertEqual(storage[BACKUP_ID], immutable)

    def test_failed_cloud_never_falls_back_to_legacy(self):
        def failed(*args): raise RuntimeError("network error")
        request = Request("/api/state", stage="nueva")
        self.assertTrue(AdministrationAPI(request, lambda: fixture(), failed).handle("GET"))
        self.assertEqual(request.status, 503)

    def test_field_report_completes_schedule_atomically(self):
        storage = {BUNDLE_ID: prepare(fixture())}
        original_old = deepcopy(storage[BUNDLE_ID]["etapas"]["anterior"])
        def cloud(method, path, payload=None):
            if method == "GET": return [{"data": deepcopy(storage[BUNDLE_ID])}]
            for row in payload: storage[row["id"]] = deepcopy(row["data"])
        def save(record, revision):
            request = Request("/api/record", {"collection": "servicios", "record": record}, "nueva", revision)
            AdministrationAPI(request, fixture, cloud).handle("POST")
            return request
        report = {"id": "report-a", "fecha": "2026-10-20", "clienteId": "client", "programacionId": "a", "reporte": {"folio": "1"}, "subtotal": 0}
        self.assertEqual(save(report, 0).status, 200)
        stage = storage[BUNDLE_ID]["etapas"]["nueva"]
        schedule = stage["programaciones"][0]
        self.assertEqual(schedule["estatus"], "Realizado")
        self.assertEqual(schedule["servicioId"], "report-a")
        self.assertEqual(schedule["calendarEventId"], "existing-event")
        self.assertEqual(schedule["anticipo"], 500)
        self.assertEqual(stage["revisionAdministracion"], 1)
        self.assertEqual(save(report, 1).status, 200)
        self.assertEqual(sum(s["id"] == "report-a" for s in storage[BUNDLE_ID]["etapas"]["nueva"]["servicios"]), 1)
        before = deepcopy(storage)
        self.assertEqual(save({**report, "id": "duplicate"}, 2).status, 400)
        self.assertEqual(save({**report, "programacionId": "missing"}, 2).status, 400)
        self.assertEqual(save(report, 0).status, 409)
        self.assertEqual(save({**report, "fecha": "2026-10-14"}, 2).status, 400)
        self.assertEqual(storage, before)
        self.assertEqual(storage[BUNDLE_ID]["etapas"]["anterior"], original_old)


if __name__ == "__main__": unittest.main()
