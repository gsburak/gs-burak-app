"""Generate credentials locally, never print or commit their values."""
import json
import secrets
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from burak_auth import derive

if __name__ == '__main__':
    destination=Path(__file__).resolve().parents[1]/'tmp'/'SEGURIDAD_GS_BURAK'
    destination.mkdir(parents=True,exist_ok=True)
    env=destination/'accesos-render.env'
    passwords=destination/'ACCESOS_PRIVADOS.txt'
    if env.exists() or passwords.exists():
        raise SystemExit('Los archivos ya existen. Se conservan sin cambios.')
    config={}; notes=['GS BURAK — accesos nuevos. Guarda este archivo en un lugar privado.',
                      'Se activan solo después de configurar Render y publicar la corrección.', '']
    for username,name,role in [('admin','VICTOR','admin'),('tecnico','PROGRAMACION','operativo'),('consulta','CONSULTA','consulta')]:
        password=secrets.token_urlsafe(18);salt=secrets.token_hex(32)
        config[username]={'name':name,'role':role,'salt':salt,'hash':derive(password,salt)}
        notes.append(f'{name}\nUsuario: {username}\nContraseña: {password}\n')
    with passwords.open('x',encoding='utf8') as file:file.write('\n'.join(notes))
    with env.open('x',encoding='utf8') as file:file.write('GS_AUTH_CONFIG='+json.dumps(config,separators=(',',':'))+'\n')
    print('Preparados archivos privados en tmp/SEGURIDAD_GS_BURAK. No se muestran contraseñas.')
