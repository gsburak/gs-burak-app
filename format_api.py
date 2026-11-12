"""Scoped document persistence using compare-and-swap on dedicated app_state rows."""
import json
import re
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlencode, urlparse
from format_documents import read_documents, save_document, merge_document_backup, DocumentConflict, valid_kind
from cloud_connection import CloudConnectionError


class FormatAPI:
    def __init__(self, request, cloud, stage, services):
        self.request, self.cloud, self.stage, self.services = request, cloud, stage, services
        self.identifier = 'formatos_gs_burak_' + stage + '_v1'
        self.prefix = {'nueva':'GS-N-', 'anterior':'GS-A-', 'actual':'GS-'}[stage]

    def respond(self, data, status=200):
        self.request.send_response(status)
        self.request.send_header('Content-Type', 'application/json; charset=utf-8')
        self.request.end_headers()
        self.request.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def load(self):
        rows=self.cloud('GET','app_state?id=eq.'+self.identifier+'&select=data')
        return rows[0]['data'] if rows else None

    def backup(self, bundle):
        result=read_documents(bundle,None,backup=True)
        result['administracion']=self.stage
        return result

    def read(self, kind, identifier=None):
        valid_kind(kind)
        if identifier:
            if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', identifier):
                raise ValueError('Identificador de documento inválido.')
            fields = 'document:data->documents->' + identifier
            rows = self.cloud('GET', 'app_state?' + urlencode({'id':'eq.'+self.identifier,'select':fields}))
            document = rows[0].get('document') if rows else None
            if not document or document.get('kind') != kind:
                raise ValueError('No se encontró el documento.')
            return document
        rows = self.cloud('GET', 'app_state?' + urlencode({'id':'eq.'+self.identifier,'select':'index:data->documentIndex'}))
        index = rows[0].get('index') if rows else []
        if index is None:
            # Older archives have no index. Preserve access until their next
            # normal save creates it, without changing data during a read.
            return read_documents(self.load() or {}, kind)
        return {'documents': sorted([d for d in index if d['kind'] == kind], key=lambda d:d['updatedAt'], reverse=True)}

    def merge(self, bundle, incoming):
        if incoming.get('administracion') != self.stage:
            raise ValueError('La copia pertenece a otra administración.')
        return merge_document_backup(bundle,incoming,self.prefix)

    def commit(self, payload, importing=False):
        for attempt in range(10):
            bundle=self.load()
            if bundle is None:
                seed={'revision':0,'documents':{},'counters':{},'administracion':self.stage}
                self.cloud('POST','app_state?on_conflict=id',[{'id':self.identifier,'data':seed}],
                           prefer='resolution=ignore-duplicates,return=representation')
                bundle=self.load()
            if bundle.get('administracion')!=self.stage:raise ValueError('Almacenamiento de otra administración.')
            previous=bundle['revision']
            if importing:
                bundle,added=self.merge(bundle,payload);result={'added':added}
            else:result=save_document(bundle,payload,self.services,self.prefix)
            bundle['revision']=previous+1
            bundle['documentIndex'] = [
                {key: doc[key] for key in ('id','kind','folio','title','revision','updatedAt')}
                for doc in bundle.get('documents', {}).values()
            ]
            # Return only the row identifier: echoing all saved photos/documents can
            # time out after the database has already committed the write.
            query=urlencode({'id':'eq.'+self.identifier,'data->>revision':'eq.'+str(previous),'select':'id'})
            rows=self.cloud('PATCH','app_state?'+query,{'data':bundle,'updated_at':datetime.now(timezone.utc).isoformat()})
            if rows:return result
        raise DocumentConflict('Otra ventana está guardando. Conserva la captura e intenta nuevamente.')

    def handle(self, method):
        path=urlparse(self.request.path)
        if path.path not in ('/api/formats','/api/formats/import'):
            return False
        try:
            site=self.request.headers.get('Sec-Fetch-Site')
            origin=self.request.headers.get('Origin')
            host=self.request.headers.get('Host')
            if site=='cross-site' or (origin and urlparse(origin).netloc != host):
                self.respond({'error':'Origen no autorizado.'},403);return True
            args=parse_qs(path.query)
            if method=='GET':
                result=self.backup(self.load() or {}) if args.get('backup')==['1'] else self.read(args.get('kind',[None])[0],args.get('id',[None])[0])
                self.respond(result);return True
            if method!='POST':self.respond({'error':'Método no disponible.'},405);return True
            size=int(self.request.headers.get('Content-Length','0'))
            if not 0<size<=20*1024*1024:raise ValueError('Tamaño de captura inválido (máximo 20 MB).')
            payload=json.loads(self.request.rfile.read(size).decode('utf-8'))
            if not isinstance(payload,dict):raise ValueError('Captura inválida.')
            if getattr(self.request, 'certificate_access', False) and payload.get('kind') != 'certificado':
                self.respond({'error':'Solo certificados.'},403);return True
            self.respond(self.commit(payload,path.path=='/api/formats/import'))
        except DocumentConflict as error:self.respond({'error':str(error)},409)
        except (ValueError,KeyError,TypeError) as error:self.respond({'error':str(error)},400)
        except CloudConnectionError as error:
            print('Format storage unavailable: '+error.code, flush=True)
            self.respond({'error':'No se pudo guardar en la nube. Puedes generar el PDF sin guardar y conservar una copia. Código: '+error.code},503)
        except Exception as error:
            print('Format storage failure: '+type(error).__name__, flush=True)
            self.respond({'error':'No se pudo guardar o recuperar el documento. Puedes generar el PDF sin guardar y conservar una copia. Código: FORMATO_INTERNO'},503)
        return True
