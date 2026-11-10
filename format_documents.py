"""Versioned business documents and non-resetting folios, shared by both servers."""
import json
import re
from copy import deepcopy
from datetime import datetime, timezone

KINDS = {'certificado': 'CER', 'diagnostico': 'DIA', 'cebaderas': 'CEB',
         'presupuesto': 'PRE', 'croquis': 'CRO', 'anexo-monitoreo': 'MON',
         'anexo-estaciones': 'ANE'}


class DocumentConflict(ValueError):
    pass


def valid_kind(kind):
    if kind not in KINDS:
        raise ValueError('Formato inválido.')
    return kind


def read_documents(bundle, kind, identifier=None, backup=False):
    if backup:
        return {'applicationId': 'gs-burak-formatos-v1', 'version': 1,
                'documents': deepcopy(bundle.get('documents', {})),
                'counters': deepcopy(bundle.get('counters', {}))}
    valid_kind(kind)
    rows = [d for d in bundle.get('documents', {}).values() if d['kind'] == kind]
    if identifier:
        found = next((d for d in rows if d['id'] == identifier), None)
        if found is None:
            raise ValueError('No se encontró el documento.')
        return deepcopy(found)
    return {'documents': [{k: d[k] for k in ('id', 'kind', 'folio', 'title', 'revision', 'updatedAt')}
                          for d in sorted(rows, key=lambda d: d['updatedAt'], reverse=True)]}


def save_document(bundle, request, services=(), prefix='GS-'):
    kind = valid_kind(request.get('kind'))
    if kind == 'certificado' and prefix in ('GS-N-', 'GS-A-'):
        prefix = 'GS-'
    identifier = request.get('id')
    if not isinstance(identifier, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', identifier):
        raise ValueError('Identificador de documento inválido.')
    payload = request.get('payload')
    if not isinstance(payload, dict) or len(json.dumps(payload).encode()) > 12 * 1024 * 1024:
        raise ValueError('El documento supera 12 MB o su contenido es inválido. Descarga una copia y reduce las imágenes.')
    title = request.get('title', '')
    if not isinstance(title, str) or len(title) > 300:
        raise ValueError('Nombre del documento inválido.')
    revision = request.get('revision')
    if type(revision) is not int or revision < 0:
        raise ValueError('Revisión inválida.')
    documents = bundle.setdefault('documents', {})
    old = documents.get(identifier)
    if old and old['kind'] != kind:
        raise ValueError('El documento pertenece a otro formato.')
    if (old and old['revision'] != revision) or (not old and revision != 0):
        raise DocumentConflict('Otro equipo guardó cambios en este documento. Descarga tu copia antes de abrir la versión guardada.')
    counters = bundle.setdefault('counters', {})
    if old:
        folio = old['folio']
    else:
        highest = counters.get(kind, 0)
        for doc in documents.values():
            if doc['kind'] == kind:
                match = re.fullmatch(r'GS-(?:[NA]-)?CER-(\d+)' if kind == 'certificado' else re.escape(prefix) + KINDS[kind] + r'-(\d+)', doc['folio'])
                if match:
                    highest = max(highest, int(match[1]))
        # Respect certificate numbers already used before central document storage.
        if kind == 'certificado':
            for service in services:
                old_folio = service.get('folio') or (service.get('reporte') or {}).get('folio', '')
                match = re.fullmatch(r'GS-(?:(?:[NA]-)?CER-|SRV-)?(\d+)(?:-\d{4})?', str(old_folio))
                if match:
                    highest = max(highest, int(match[1]))
        counters[kind] = highest + 1
        folio = f'{prefix}{KINDS[kind]}-{highest + 1:05d}'
    document = {'id': identifier, 'kind': kind, 'folio': folio, 'title': title,
                'revision': revision + 1, 'payload': deepcopy(payload),
                'updatedAt': datetime.now(timezone.utc).isoformat()}
    documents[identifier] = document
    return deepcopy(document)


def merge_document_backup(current, backup, prefix='GS-'):
    """Restore missing documents only; never roll back folios or overwrite newer edits."""
    if not isinstance(backup, dict) or backup.get('applicationId') != 'gs-burak-formatos-v1' or backup.get('version') != 1:
        raise ValueError('El respaldo de formatos no corresponde a GS BURAK.')
    source, counters = backup.get('documents'), backup.get('counters')
    if not isinstance(source, dict) or not isinstance(counters, dict):
        raise ValueError('Respaldo de formatos inválido.')
    merged = deepcopy(current)
    documents = merged.setdefault('documents', {})
    highest = merged.setdefault('counters', {})
    used = {(d['kind'], d['folio']): d['id'] for d in documents.values()}
    added = 0
    for identifier, doc in source.items():
        if not isinstance(doc, dict) or doc.get('id') != identifier:
            raise ValueError('Documento inválido en el respaldo.')
        kind = valid_kind(doc.get('kind'))
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', identifier):
            raise ValueError('Identificador inválido en el respaldo.')
        match = re.fullmatch(re.escape(prefix) + KINDS[kind] + r'-(\d+)', str(doc.get('folio', '')))
        if not match or type(doc.get('revision')) is not int or doc['revision'] < 1:
            raise ValueError('Folio o revisión inválidos en el respaldo.')
        if not isinstance(doc.get('payload'), dict) or len(json.dumps(doc['payload']).encode()) > 12*1024*1024:
            raise ValueError('Contenido de documento inválido en el respaldo.')
        if not isinstance(doc.get('title'), str) or len(doc['title']) > 300:
            raise ValueError('Título inválido en el respaldo.')
        datetime.fromisoformat(doc.get('updatedAt', ''))
        if identifier in documents:
            if (documents[identifier]['kind'], documents[identifier]['folio']) != (kind, doc['folio']):
                raise DocumentConflict('Un documento del respaldo tiene un folio diferente al documento existente.')
        else:
            if (kind, doc['folio']) in used:
                raise DocumentConflict('Un folio del respaldo ya pertenece a otro documento. No se importó.')
            documents[identifier] = deepcopy(doc)
            used[kind, doc['folio']] = identifier
            added += 1
        highest[kind] = max(highest.get(kind, 0), int(match[1]))
    for kind, value in counters.items():
        valid_kind(kind)
        if type(value) is not int or value < 0:
            raise ValueError('Contador inválido en el respaldo.')
        highest[kind] = max(highest.get(kind, 0), value)
    return merged, added
