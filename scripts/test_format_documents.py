"""All storage in these tests is simulated. No real Supabase requests."""
import sys
import unittest
from pathlib import Path
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from admin_fixture_server import cloud,storage,source
from test_administrations import Request
from administration_api import AdministrationAPI
from administrations import prepare,BUNDLE_ID
from format_api import FormatAPI
from urllib.parse import parse_qs


class DocumentTests(unittest.TestCase):
    def test_lists_and_single_documents_use_small_database_projections(self):
        self.call('POST','/api/formats',self.document('first'))
        self.call('POST','/api/formats',self.document('second'))
        calls=[]
        def tracked(method,path,payload=None,prefer=None):
            calls.append(parse_qs(path.partition('?')[2]).get('select',[''])[0])
            return cloud(method,path,payload,prefer)
        api=FormatAPI(Request('/api/formats'),tracked,'nueva',[])
        listing=api.read('anexo-monitoreo')
        self.assertEqual(len(listing['documents']),2)
        self.assertTrue(all('payload' not in doc for doc in listing['documents']))
        self.assertEqual(calls,['index:data->documentIndex'])
        calls.clear()
        opened=api.read('anexo-monitoreo','first')
        self.assertEqual(opened['payload'],self.document()['payload'])
        self.assertEqual(calls,['document:data->documents->first'])
        with self.assertRaises(ValueError):api.read('certificado','first')
        with self.assertRaises(ValueError):api.read('certificado','bad->id')

    def test_legacy_archive_remains_readable_without_index(self):
        self.call('POST','/api/formats',self.document())
        storage['formatos_gs_burak_nueva_v1'].pop('documentIndex')
        before=deepcopy(storage)
        status,listing=self.call('GET','/api/formats?kind=anexo-monitoreo')
        self.assertEqual(status,200)
        self.assertEqual(listing['documents'][0]['id'],'first')
        self.assertEqual(storage,before)

    def setUp(self):
        storage.clear();storage[BUNDLE_ID]=prepare(deepcopy(source))
        self.original=deepcopy(storage[BUNDLE_ID])

    def call(self,method,path,data=None,stage='nueva'):
        request=Request(path,data,stage,0)
        AdministrationAPI(request,lambda:deepcopy(source),cloud).handle(method)
        return request.status,request.json()

    def document(self,identifier='first',kind='anexo-monitoreo',revision=0):
        return {'kind':kind,'id':identifier,'revision':revision,'title':'Cliente de prueba',
                'payload':{'rows':3,'croquis':'data:image/png;base64,test','signatures':['test']}}

    def test_stages_have_separate_documents_folios_and_backups(self):
        status,new=self.call('POST','/api/formats',self.document());self.assertEqual(status,200)
        status,old=self.call('POST','/api/formats',self.document(),stage='anterior');self.assertEqual(status,200)
        self.assertEqual(new['folio'],'GS-N-MON-00001');self.assertEqual(old['folio'],'GS-A-MON-00001')
        self.assertEqual(storage[BUNDLE_ID],self.original)
        status,data=self.call('GET','/api/backup');self.assertEqual(status,200)
        self.assertEqual(data['data']['administracion']['id'],'nueva')
        self.assertEqual(data['formatDocuments']['administracion'],'nueva')
        self.assertEqual(self.call('POST','/api/formats/import',data['formatDocuments'],stage='anterior')[0],400)

    def test_seven_formats_reopen_and_update_without_renumbering(self):
        for kind in ['certificado','diagnostico','cebaderas','presupuesto','croquis','anexo-monitoreo','anexo-estaciones']:
            status,saved=self.call('POST','/api/formats',self.document(kind,kind));self.assertEqual(status,200)
            status,opened=self.call('GET',f'/api/formats?kind={kind}&id={kind}');self.assertEqual(status,200)
            self.assertEqual(opened['payload'],self.document()['payload'])
            status,updated=self.call('POST','/api/formats',self.document(kind,kind,1));self.assertEqual(status,200)
            self.assertEqual(updated['folio'],saved['folio'])
        self.assertEqual(storage[BUNDLE_ID],self.original)

    def test_compare_and_swap_retries_other_writer_without_lost_documents(self):
        def save(i):return self.call('POST','/api/formats',self.document('parallel'+str(i)))
        with ThreadPoolExecutor(max_workers=4) as executor:results=list(executor.map(save,range(12)))
        self.assertTrue(all(status==200 for status,_ in results),results)
        self.assertEqual(len({d['folio'] for _,d in results}),12)
        self.assertEqual(len(self.call('GET','/api/formats?kind=anexo-monitoreo')[1]['documents']),12)

    def test_stale_document_edit_cannot_overwrite_saved_revision(self):
        self.call('POST','/api/formats',self.document())
        self.assertEqual(self.call('POST','/api/formats',self.document())[0],409)
        self.assertEqual(self.call('POST','/api/formats',self.document(revision=1))[0],200)
        self.assertEqual(self.call('POST','/api/formats',self.document(revision=1))[0],409)
        self.assertEqual(self.call('POST','/api/formats',self.document('second'))[1]['folio'],'GS-N-MON-00002')

    def test_backup_import_and_operational_restore_do_not_roll_back_folios(self):
        self.call('POST','/api/formats',self.document())
        _,backup=self.call('GET','/api/backup')
        self.call('POST','/api/formats',self.document('second'))
        payload=deepcopy(backup['data']);payload['formatDocuments']=backup['formatDocuments']
        self.assertEqual(self.call('POST','/api/restore',payload)[0],200)
        self.assertEqual(self.call('POST','/api/formats',self.document('third'))[1]['folio'],'GS-N-MON-00003')

    def test_missing_or_wrong_stage_blocks_access(self):
        self.assertEqual(self.call('GET','/api/formats?kind=croquis',stage=None)[0],409)
        self.assertEqual(self.call('POST','/api/formats',self.document(),stage='other')[0],409)

    def test_unactivated_installation_uses_separate_actual_namespace(self):
        storage.clear()
        status,data=self.call('POST','/api/formats',self.document(),stage=None)
        self.assertEqual(status,200);self.assertEqual(data['folio'],'GS-MON-00001')
        self.assertNotIn(BUNDLE_ID,storage)

    def test_failed_cloud_does_not_return_local_or_other_stage_data(self):
        def offline(*args,**kwargs):raise RuntimeError('offline')
        request=Request('/api/formats?kind=croquis',stage='nueva')
        AdministrationAPI(request,lambda:deepcopy(source),offline).handle('GET')
        self.assertEqual(request.status,503)


if __name__=='__main__':unittest.main()
