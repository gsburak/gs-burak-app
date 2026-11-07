"""Capability links for field certificates, independent of application sessions."""
import hashlib
import hmac


def link_token(auth, stage):
    credential = auth.users.get('admin', {}).get('hash')
    if not credential or stage not in ('nueva', 'anterior'):
        return ''
    return hmac.new(bytes.fromhex(credential), ('certificate-link-v1:' + stage).encode(), hashlib.sha256).hexdigest()


def permitted(auth, headers):
    token = headers.get('X-Certificate-Access', '')
    expected = link_token(auth, headers.get('X-Burak-Administracion'))
    return bool(expected and token and hmac.compare_digest(token, expected))


def catalog(data):
    fields = {
        'clientes': 'id nombre contacto telefono email correo direccion domicilio ciudad tipo domicilios',
        'productos': 'id producto formula ingredienteActivo registroSanitario unidadUso unidadCompra factor dosis presentacion',
        'programaciones': 'id clienteId cliente fecha hora tipo tecnico tecnicos tecnicoAdicional ciudad direccion domicilio zona notas estatus servicioId domicilioId domicilioAlias contacto telefono referencia',
        'servicios': 'id folio programacionId clienteId fecha reporte',
    }
    result = {key: data[key] for key in ('administracion', 'revisionAdministracion', 'schemaVersion') if key in data}
    for collection, names in fields.items():
        allowed = names.split()
        result[collection] = [{key: row[key] for key in allowed if key in row} for row in data.get(collection, [])]
    return result
