"""Scoped document persistence using compare-and-swap on dedicated app_state rows."""
import json
import re
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlencode, urlparse
from format_documents import read_documents, save_document, merge_document_backup, DocumentConflict


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
            query=urlencode({'id':'eq.'+self.identifier,'data->>revision':'eq.'+str(previous)})
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
                bundle=self.load() or {}
                result=self.backup(bundle) if args.get('backup')==['1'] else read_documents(bundle,args.get('kind',[None])[0],args.get('id',[None])[0])
                self.respond(result);return True
            if method!='POST':self.respond({'error':'Método no disponible.'},405);return True
            size=int(self.request.headers.get('Content-Length','0'))
            if not 0<size<=20*1024*1024:raise ValueError('Tamaño de captura inválido (máximo 20 MB).')
            payload=json.loads(self.request.rfile.read(size).decode('utf-8'))
            if not isinstance(payload,dict):raise ValueError('Captura inválida.')
            self.respond(self.commit(payload,path.path=='/api/formats/import'))
        except DocumentConflict as error:self.respond({'error':str(error)},409)
        except (ValueError,KeyError,TypeError) as error:self.respond({'error':str(error)},400)
        except Exception:self.respond({'error':'No se pudo guardar o recuperar el documento en esta administración. Conserva una copia e intenta nuevamente.'},503)
        return True
