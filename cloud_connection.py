"""Safe connection diagnostics: never include API keys or response bodies."""
class CloudConnectionError(RuntimeError):
    def __init__(self, code):
        self.code = code
        super().__init__('Conexión con Supabase: ' + code)
