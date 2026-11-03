import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from cloud_connection import CloudConnectionError
from administration_api import AdministrationAPI
from test_administrations import Request


class ConnectionTests(unittest.TestCase):
    def test_missing_or_wrong_key_format_is_identified(self):
        with patch.object(server, 'SUPABASE_KEY', ''):
            with self.assertRaisesRegex(CloudConnectionError,'CLAVE_AUSENTE_O_FORMATO_INVALIDO'):
                server.supabase_request('GET','app_state?select=id')

    def test_http_error_reveals_only_numeric_code(self):
        with patch.object(server,'SUPABASE_KEY','sb_secret_test-only'):
            for status in (400,401,403,404,500):
                failure=HTTPError('private-url',status,'private-description',{},io.BytesIO(b'private-key-and-data'))
                with patch.object(server.urllib.request,'urlopen',side_effect=failure):
                    with self.assertRaises(CloudConnectionError) as result:server.supabase_request('GET','app_state')
                    self.assertEqual(str(result.exception),'Conexión con Supabase: HTTP_'+str(status))

    def test_public_metadata_returns_sanitized_reason(self):
        def offline(*args,**kwargs):raise CloudConnectionError('HTTP_401')
        req=Request('/api/administraciones')
        AdministrationAPI(req,lambda:{},offline).handle('GET')
        self.assertEqual(req.status,503)
        self.assertEqual(req.json(),{'error':'No se pudo conectar con Supabase. Código: HTTP_401'})


if __name__=='__main__':unittest.main()
