"""Isolated persistence. The original tables are never deleted or overwritten."""
from copy import deepcopy
from datetime import datetime, timezone
import json
import threading
from urllib.parse import parse_qs, urlparse
from administrations import BACKUP_ID, BUNDLE_ID, CUTOFF, LABELS, prepare, validate_stage

LOCK = threading.RLock()


class AdministrationAPI:
    def __init__(self, request, load_source, cloud_request):
        self.request = request
        self.load_source = load_source
        self.cloud = cloud_request

    def load(self):
        rows = self.cloud("GET", f"app_state?id=eq.{BUNDLE_ID}&select=data")
        return rows[0].get("data") if rows else None

    def write(self, identifier, data):
        self.cloud("POST", "app_state?on_conflict=id", [{"id": identifier, "data": data, "updated_at": datetime.now(timezone.utc).isoformat()}])

    def respond(self, data, status=200):
        r = self.request
        r.send_response(status)
        r.send_header("Content-Type", "application/json; charset=utf-8")
        r.end_headers()
        r.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def body(self):
        size = int(self.request.headers.get("Content-Length", "0"))
        if size > 20_000_000:
            raise ValueError("Archivo demasiado grande")
        return json.loads(self.request.rfile.read(size).decode()) if size else {}

    def handle(self, method):
        parsed = urlparse(self.request.path)
        if not parsed.path.startswith("/api/"):
            return False
        management = parsed.path.startswith("/api/administraciones")
        stage = self.request.headers.get("X-Burak-Administracion")
        # The legacy application remains active until an explicit, validated activation.
        try:
            with LOCK:
                bundle = self.load()
                if parsed.path == "/api/administraciones" and method == "GET":
                    self.respond({"activa": bool(bundle), "corte": CUTOFF, "etapas": LABELS})
                    return True
                if parsed.path == "/api/administraciones/preparar" and method == "GET":
                    if bundle:
                        self.respond({"activa": True, "corte": CUTOFF})
                    else:
                        draft = prepare(self.load_source())
                        self.respond({"activa": False, "huellaOrigen": draft["huellaOrigen"], **draft["revision"]})
                    return True
                if parsed.path == "/api/administraciones/activar" and method == "POST":
                    payload = self.body()
                    if bundle:
                        self.respond({"ok": True, "yaActiva": True})
                        return True
                    original = self.load_source()
                    draft = prepare(original)
                    if payload.get("huellaOrigen") != draft["huellaOrigen"]:
                        self.respond({"error": "Los datos cambiaron. Actualiza la revisión antes de activar."}, 409)
                        return True
                    blockers = [i for i in draft["revision"]["incidencias"] if i["tipo"] != "cliente_desconocido"]
                    if blockers:
                        self.respond({"error": "Hay diferencias pendientes de resolver antes del corte.", "incidencias": blockers}, 409)
                        return True
                    for key, data in draft["etapas"].items():
                        validate_stage(data, key)
                    # Save the complete, immutable baseline first, in the cloud.
                    self.write(BACKUP_ID, original)
                    from administrations import fingerprint
                    if fingerprint(self.load_source()) != draft["huellaOrigen"]:
                        self.respond({"error": "Se capturaron movimientos durante la preparación. Revisa de nuevo antes de activar."}, 409)
                        return True
                    self.write(BUNDLE_ID, draft)
                    self.respond({"ok": True})
                    return True
                if management:
                    self.respond({"error": "Ruta no disponible"}, 404)
                    return True
                if not bundle:
                    if stage:
                        self.respond({"error": "Las administraciones todavía no están activadas"}, 409)
                        return True
                    return False
                if stage not in LABELS:
                    # Old browser tabs and field-report editors cannot reintroduce old data.
                    self.respond({"error": "Actualiza la aplicación y selecciona una administración antes de continuar."}, 409)
                    return True
                if parsed.path == "/api/calendar-event":
                    return False
                data = deepcopy(bundle["etapas"][stage])
                if parsed.path == "/api/state" and method == "GET":
                    self.respond(data)
                    return True
                payload = self.body() if method == "POST" else {}
                expected_revision = self.request.headers.get("X-Burak-Revision")
                if parsed.path in ("/api/record", "/api/pendientes") and method != "GET":
                    if expected_revision is None or str(data["revisionAdministracion"]) != expected_revision:
                        self.respond({"error": "Otra ventana actualizó los datos. Recarga antes de guardar."}, 409)
                        return True
                if parsed.path in ("/api/state", "/api/restore") and method == "POST":
                    validate_stage(payload, stage)
                    if payload.get("revisionAdministracion") != data.get("revisionAdministracion"):
                        self.respond({"error": "Otra ventana actualizó los datos. Recarga antes de guardar o restaurar."}, 409)
                        return True
                    if parsed.path == "/api/restore":
                        stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
                        self.write(f"respaldo_restauracion_{stage}_{stamp}", data)
                    data = deepcopy(payload)
                elif parsed.path == "/api/pendientes" and method == "POST":
                    if not isinstance(payload.get("pendientes"), list):
                        raise ValueError("Pendientes inválidos")
                    data["pendientes"] = payload["pendientes"]
                elif parsed.path == "/api/record" and method in ("POST", "DELETE"):
                    query = parse_qs(parsed.query)
                    collection = payload.get("collection") if method == "POST" else query.get("collection", [""])[0]
                    if collection not in ("clientes", "productos", "tiposServicio", "servicios", "programaciones", "compras", "gastos", "equipos"):
                        raise ValueError("Colección inválida")
                    record = payload.get("record") or {}
                    identifier = record.get("id") if method == "POST" else query.get("id", [""])[0]
                    if not identifier:
                        raise ValueError("Registro sin identificador")
                    data[collection] = [r for r in data[collection] if str(r["id"]) != str(identifier)]
                    if method == "POST":
                        data[collection].append(record)
                        # Field reports and their scheduled job must commit together.
                        if collection == "servicios" and record.get("reporte") and record.get("programacionId"):
                            programacion = next((p for p in data["programaciones"] if str(p["id"]) == str(record["programacionId"])), None)
                            if programacion is None:
                                raise ValueError("No se encontró el servicio programado en esta administración")
                            if programacion.get("servicioId") and str(programacion["servicioId"]) != str(identifier):
                                raise ValueError("El programado ya está vinculado a otra venta. Actualiza la aplicación.")
                            programacion.update(estatus="Realizado", servicioId=identifier)
                else:
                    self.respond({"error": "Ruta no disponible para esta administración"}, 404)
                    return True
                validate_stage(data, stage)
                data["revisionAdministracion"] = int(data.get("revisionAdministracion", 0)) + 1
                bundle["etapas"][stage] = data
                self.write(BUNDLE_ID, bundle)
                self.respond({"ok": True, "revisionAdministracion": data["revisionAdministracion"]})
                return True
        except (ValueError, KeyError, TypeError) as error:
            self.respond({"error": str(error)}, 400)
            return True
        except Exception:
            # Never fall back to the legacy data or local seed on a cloud failure.
            self.respond({"error": "No se pudo consultar o guardar la administración. Intenta nuevamente; no se usarán datos de otra etapa."}, 503)
            return True
