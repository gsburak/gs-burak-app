import sys
import unittest
from copy import deepcopy
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from test_administrations import Request
from admin_fixture_server import cloud, storage, source
from administrations import prepare, BUNDLE_ID
from administration_api import AdministrationAPI

class CertificateFolios(unittest.TestCase):
    def test_short_folio_is_atomic_and_stable_on_retry(self):
        storage.clear()
        storage[BUNDLE_ID] = prepare(deepcopy(source))
        storage['formatos_gs_burak_nueva_v1'] = {'counters':{'certificado':61},'documents':{}}
        def save(identifier):
            revision = storage[BUNDLE_ID]['etapas']['nueva']['revisionAdministracion']
            record = {'id': identifier, 'fecha':'2026-11-10', 'clienteId':'client', 'subtotal':0,
                      'productos':[], 'reporte':{'folio':'GS-CAMPO-internal-uuid'}}
            request = Request('/api/record', {'collection':'servicios','record':record}, 'nueva', revision)
            AdministrationAPI(request,lambda:deepcopy(source),cloud).handle('POST')
            self.assertEqual(request.status,200,request.json())
            return request.json()['folio']
        self.assertEqual(save('first'),'GS-CER-00062')
        self.assertEqual(save('first'),'GS-CER-00062')
        self.assertEqual(save('second'),'GS-CER-00063')
        rows = storage[BUNDLE_ID]['etapas']['nueva']['servicios']
        self.assertEqual(sum(r['id']=='first' for r in rows),1)
        self.assertEqual(next(r for r in rows if r['id']=='first')['reporte']['folio'],'GS-CER-00062')
        from format_documents import save_document
        archive = {'counters':{'certificado':61},'documents':{}}
        new_doc = save_document(archive, {'kind':'certificado','id':'new-doc','revision':0,'title':'Test','payload':{}}, rows)
        self.assertEqual(new_doc['folio'],'GS-CER-00064')

if __name__=='__main__':unittest.main()
