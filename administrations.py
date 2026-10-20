"""Deterministic, non-destructive preparation of the administration cutover."""
from copy import deepcopy
from datetime import date
import hashlib
import json
import math

CUTOFF = "2026-10-16"
COLLECTIONS = ("clientes", "productos", "tiposServicio", "servicios", "programaciones", "pendientes", "compras", "gastos", "equipos")
LABELS = {"anterior": "Administración anterior — hasta el 15/10/2026", "nueva": "Nueva administración — desde el 16/10/2026"}
BUNDLE_ID = "administraciones_20261016_v1"
BACKUP_ID = "respaldo_pre_corte_20261016_v1"


def fingerprint(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def valid_date(value):
    try:
        return isinstance(value, str) and date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def number(value):
    result = float(value or 0)
    if not math.isfinite(result):
        raise ValueError("Cantidad o costo no válido")
    return result


def operation(row, fallback="Sin clasificar"):
    return row.get("operacion") or row.get("ciudad") or fallback


def prepare(source):
    """No writes; payment arrays remain attached to their original sale."""
    if source.get("administracion"):
        raise ValueError("El origen ya pertenece a una administración")
    before, after = deepcopy(source), deepcopy(source)
    issues = []
    for key in COLLECTIONS:
        if not isinstance(source.get(key), list):
            raise ValueError(f"Falta la colección {key}")
        ids = [row.get("id") for row in source[key]]
        if None in ids or len(set(ids)) != len(ids):
            issues.append({"tipo": "identificadores", "coleccion": key, "mensaje": "Identificadores vacíos o repetidos"})
    products = {p["id"]: p for p in source["productos"]}
    clients = {p["id"] for p in source["clientes"]}
    for key in ("servicios", "compras", "gastos", "programaciones"):
        before[key], after[key] = [], []
        for row in source[key]:
            if not valid_date(row.get("fecha")):
                issues.append({"tipo": "fecha", "coleccion": key, "id": row["id"]})
                before[key].append(deepcopy(row))
                continue
            (after if row["fecha"] >= CUTOFF else before)[key].append(deepcopy(row))
            if key == "compras" and row.get("productoId") not in products:
                issues.append({"tipo": "producto_desconocido", "id": row["id"]})
            if row.get("clienteId") and row["clienteId"] not in clients:
                issues.append({"tipo": "cliente_desconocido", "id": row["id"]})
            if key == "servicios":
                for item in row.get("productos", []):
                    if item.get("productoId") not in products:
                        issues.append({"tipo": "producto_desconocido", "id": row["id"]})

    # Equipment acquired after the cut belongs only to the new administration.
    before["equipos"] = [deepcopy(e) for e in source["equipos"] if not valid_date(e.get("fecha")) or e["fecha"] < CUTOFF]
    for equipment in after["equipos"]:
        equipment["equipoInicial"] = not valid_date(equipment.get("fecha")) or equipment["fecha"] < CUTOFF
    # Open tasks transfer regardless of their reminder date; the archived copy is labelled.
    after["pendientes"] = []
    for row in before["pendientes"]:
        if row.get("estatus") not in ("Realizado", "Cancelado", "Completado", "Confirmado", "Resuelto", "Cerrado"):
            after["pendientes"].append(deepcopy(row))
            row["trasladadoAdministracion"] = "nueva"
    for stage in (before, after):
        stage["schemaVersion"] = 2
    before["administracion"] = {"id": "anterior", "nombre": LABELS["anterior"], "corte": CUTOFF}
    after["administracion"] = {"id": "nueva", "nombre": LABELS["nueva"], "corte": CUTOFF}
    after["inventarioInicial"] = []
    reconciliation = []
    for product_id, product in products.items():
        factor = number(product.get("factor") or 1)
        if factor <= 0:
            issues.append({"tipo": "factor", "producto": product.get("producto")})
            continue
        groups = {}
        for purchase in before["compras"]:
            if purchase.get("productoId") != product_id:
                continue
            op = operation(purchase)
            groups.setdefault(op, {"lots": [], "used": 0, "bought": 0})
            amount = number(purchase.get("cantidad")) * factor
            cost = number(purchase.get("costoUnitario")) / factor
            if amount < 0 or cost < 0:
                issues.append({"tipo": "cantidad_negativa", "id": purchase["id"]})
            groups[op]["bought"] += amount
            groups[op]["lots"].append({"id": purchase["id"], "fechaOrigen": purchase["fecha"], "cantidadUso": amount, "costoUso": cost})
        for service in before["servicios"]:
            for item in service.get("productos", []):
                if item.get("productoId") != product_id:
                    continue
                op = operation(service, "Yucatan")
                groups.setdefault(op, {"lots": [], "used": 0, "bought": 0})
                amount = number(item.get("cantidad"))
                if amount < 0:
                    issues.append({"tipo": "consumo_negativo", "id": service["id"]})
                groups[op]["used"] += amount
        # Include cities/products that start moving only after the cutover.
        for purchase in after["compras"]:
            if purchase.get("productoId") == product_id:
                groups.setdefault(operation(purchase), {"lots": [], "used": 0, "bought": 0})
        for service in after["servicios"]:
            if any(i.get("productoId") == product_id for i in service.get("productos", [])):
                groups.setdefault(operation(service, "Yucatan"), {"lots": [], "used": 0, "bought": 0})
        for op, group in groups.items():
            remaining_use = group["used"]
            balance = group["bought"] - remaining_use
            if balance < -0.000001:
                issues.append({"tipo": "inventario_negativo", "producto": product["producto"], "operacion": op, "saldo": round(balance, 6), "unidad": product.get("unidadUso")})
            for lot in sorted(group["lots"], key=lambda l: (l["fechaOrigen"], l["id"])):
                used = min(max(0, remaining_use), lot["cantidadUso"])
                remaining_use -= used
                remaining = lot["cantidadUso"] - used
                if remaining > 0.000001:
                    after["inventarioInicial"].append({**lot, "id": "apertura_" + lot["id"], "productoId": product_id, "operacion": op, "fecha": "2026-10-15", "cantidadUso": remaining})
            new_buys = sum(number(c.get("cantidad")) * factor for c in after["compras"] if c.get("productoId") == product_id and operation(c) == op)
            new_use = sum(number(i.get("cantidad")) for v in after["servicios"] if operation(v, "Yucatan") == op for i in v.get("productos", []) if i.get("productoId") == product_id)
            reconciliation.append({"producto": product["producto"], "productoId": product_id, "operacion": op, "unidad": product.get("unidadUso"), "compradoAntes": group["bought"], "usadoAntes": group["used"], "inicial": round(balance, 6), "compradoNuevo": new_buys, "usadoNuevo": new_use, "actual": round(balance + new_buys - new_use, 6)})
    for stage in (before, after):
        stage["revisionAdministracion"] = 0
    return {"corte": CUTOFF, "huellaOrigen": fingerprint(source), "etapas": {"anterior": before, "nueva": after}, "revision": {"incidencias": issues, "inventario": reconciliation, "conteos": {k: {"original": len(source[k]), "anterior": len(before[k]), "nueva": len(after[k])} for k in COLLECTIONS}}}


def validate_stage(data, stage):
    if stage not in LABELS or data.get("administracion", {}).get("id") != stage:
        raise ValueError("El respaldo no corresponde a la administración seleccionada")
    for collection in COLLECTIONS:
        if not isinstance(data.get(collection), list):
            raise ValueError(f"Colección inválida: {collection}")
        ids = [r.get("id") for r in data[collection]]
        if None in ids or len(set(ids)) != len(ids):
            raise ValueError(f"Identificadores inválidos en {collection}")
    if stage == "nueva":
        if not isinstance(data.get("inventarioInicial"), list):
            raise ValueError("Falta el inventario inicial de la nueva administración")
        product_ids = {p["id"] for p in data["productos"]}
        for lot in data["inventarioInicial"]:
            if lot.get("productoId") not in product_ids or number(lot.get("cantidadUso")) < 0 or number(lot.get("costoUso")) < 0:
                raise ValueError("Lote de inventario inicial inválido")
    for key in ("servicios", "compras", "gastos", "programaciones"):
        for row in data[key]:
            if not valid_date(row.get("fecha")):
                raise ValueError(f"Fecha inválida en {key}")
            if (row["fecha"] >= CUTOFF) != (stage == "nueva"):
                raise ValueError(f"La fecha de {key} no pertenece a esta administración")
