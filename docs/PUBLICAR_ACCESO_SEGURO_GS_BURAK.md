# Publicación del acceso seguro de GS BURAK

Estado: código probado localmente; no está activado en producción todavía.

## Configuración antes de publicar

1. Ejecutar scripts/preparar-accesos-seguros.py una sola vez. Crea tmp/SEGURIDAD_GS_BURAK/accesos-render.env y ACCESOS_PRIVADOS.txt. No subir estos archivos a GitHub. Se generan contraseñas nuevas porque las antiguas estuvieron en JavaScript público.
2. En Render, seleccionar **gs-burak-app**, no pesti-pro. En Environment importar accesos-render.env: contiene GS_AUTH_CONFIG con hashes, nunca contraseñas en texto.
3. En el proyecto Supabase **GS BURAK**, obtener una clave secreta del servidor y guardarla en Render como GS_SUPABASE_SECRET_KEY. Debe comenzar con sb_secret_. No compartirla en capturas ni pegarla en el repositorio. La clave de PESTI PRO no sirve para este proyecto.
4. Render suministra RENDER_EXTERNAL_URL automáticamente. Si no existe, configurar GS_PUBLIC_ORIGIN con la URL HTTPS exacta del servicio.
5. Solo después de configurar esas variables, publicar el commit. Sin configuración el servidor deniega el acceso; no recurre a la contraseña pública antigua ni a datos locales.
6. Tras publicar y comprobar acceso, ejecutar scripts/proteger-base-gs-burak.sql en **GS BURAK**. Revoca los permisos de las claves públicas sobre las tablas operativas y permite el acceso exclusivo del servidor. No borra registros. No ejecutar en PESTI PRO.

## Verificación de producción pendiente

- Sin sesión: /api/state, /api/backup, /api/formats y modificaciones deben responder 401.
- Archivos internos: /server.py, /.env, /.git/config, JSON locales y directorios deben responder 404.
- Iniciar sesión con las credenciales nuevas, consultar ambas administraciones y abrir formatos.
- Cerrar sesión y comprobar que la misma cookie anterior ya no permite consultar datos.
- La consulta directa a Supabase con clave pública debe ser rechazada después del SQL. No basta con probar solamente el servidor Render.
- Revalidar los totales de los registros y la descarga del respaldo autenticado. No borrar ni restaurar datos reales durante esta comprobación.

## Pruebas locales realizadas

19 pruebas Python aprobadas, incluidas seis pruebas nuevas de HTTP real con almacenamiento simulado. Cubren consultas y escrituras anónimas, archivos privados, permisos de respaldo, origen, cookies falsificadas, cierre de sesión, caducidad, cambio de credenciales, límite de intentos y fallo de nube.

Prueba en navegador aislado aprobada: no carga registros antes de iniciar sesión, carga el estado después de autenticarse, permite respaldo autenticado, rechaza otra sesión sin acceso y mantiene el cierre de sesión al recargar. También aprobaron los scripts existentes de contexto, reporte de campo y actualización de módulos.

## Límites del cambio

Se protege el perímetro del servidor GS BURAK y el acceso directo de las claves públicas mediante el SQL pendiente. No se modificó la base real ni PESTI PRO. No es una auditoría completa de permisos por campo para cada rol. No implementa todavía respaldos automáticos independientes. Las claves públicas que existieron en el historial no deben conservar permisos a las tablas privadas.
