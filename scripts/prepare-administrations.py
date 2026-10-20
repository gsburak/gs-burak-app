"""Produce private draft backups and a reconciliation; never touches the live DB."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from administrations import prepare


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    destination = args.destination.resolve()
    if destination == root or root in destination.parents:
        raise SystemExit("Guarda los datos privados fuera del repositorio")
    original = json.loads(args.source.read_text(encoding="utf-8-sig"))
    draft = prepare(original)
    destination.mkdir(parents=True, exist_ok=True)
    for stage, data in draft["etapas"].items():
        (destination / f"BORRADOR-{stage}-NO-IMPORTAR.json").write_text(json.dumps({"app": "GS Burak", "borrador": True, "data": data}, ensure_ascii=False, indent=2), encoding="utf-8")
    (destination / "revision-corte.json").write_text(json.dumps({k: v for k, v in draft.items() if k != "etapas"}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(draft["revision"]["conteos"], ensure_ascii=False))
    print(f"Incidencias pendientes: {len(draft['revision']['incidencias'])}. No se ha activado ni modificado la base publicada.")


if __name__ == "__main__":
    main()
