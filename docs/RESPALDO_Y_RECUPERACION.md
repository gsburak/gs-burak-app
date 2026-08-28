# Respaldo y recuperación de GS BURAK

## Dónde vive cada componente

| Componente | Ubicación principal | Respaldo |
|---|---|---|
| Código de GS BURAK | GitHub | OneDrive mediante `scripts/crear-respaldo.ps1` |
| Aplicación publicada | Render | Se reconstruye desde GitHub |
| Clientes, ventas, agenda e inventario | Supabase | JSON descargado por el script y exportaciones manuales |
| Certificado | Netlify | `netlify-sites/certificado` y copia publicada del script |
| Presupuesto | Netlify | `netlify-sites/presupuesto` y copia publicada del script |
| PDF descargados | Equipo del usuario | Guardarlos en una carpeta de OneDrive por año/cliente |

## Frecuencia recomendada

- Cada semana: ejecutar `scripts/crear-respaldo.ps1`.
- Antes de una modificación importante: ejecutar el respaldo otra vez.
- Cada fin de mes: usar también **Exportar respaldo JSON** y **Exportar respaldo Excel** desde el Dashboard.
- Conservar al menos una copia mensual en una memoria USB o disco externo.

## Cómo crear un respaldo

1. Abrir la carpeta del proyecto.
2. Hacer clic derecho en `scripts/crear-respaldo.ps1` y elegir **Ejecutar con PowerShell**.
3. Esperar el mensaje `Respaldo creado correctamente`.
4. Buscar el ZIP dentro de `Documentos/GS_BURAK_RESPALDOS`.

El ZIP incluye código, fuentes de Netlify, copia de las páginas publicadas, datos operativos y una lista de hashes SHA-256 para verificar integridad.

## Recuperación por tipo de problema

### Si una actualización rompe GS BURAK

1. En GitHub, abrir el historial de la rama `main`.
2. Identificar el último cambio estable.
3. Revertir el cambio defectuoso o volver a desplegar el commit estable en Render.
4. No importar datos si Supabase continúa funcionando correctamente.

### Si se pierde la aplicación de Render

1. Crear o reconectar un Web Service en Render.
2. Seleccionar el repositorio `gsburak/gs-burak-app`.
3. Usar el mismo comando de inicio configurado actualmente.
4. Render reconstruirá la aplicación desde GitHub.

### Si se pierden o dañan datos

1. No seguir capturando información hasta identificar el alcance.
2. Abrir el respaldo ZIP más reciente anterior al problema.
3. Localizar `datos/gs_burak_datos_supabase.json`.
4. Entrar como administrador en GS BURAK.
5. Usar **Importar respaldo** y revisar las cantidades antes de continuar.
6. Conservar también el archivo problemático para diagnóstico; no sobrescribir la única copia disponible.

### Si se pierde el certificado de Netlify

1. Abrir `netlify-sites/certificado`.
2. Publicar la carpeta completa en el proyecto correcto de Netlify: `stirring-semolina-e8a9e3`.
3. Verificar que el enlace siga siendo `https://stirring-semolina-e8a9e3.netlify.app/`.

### Si se pierde el presupuesto de Netlify

1. Abrir `netlify-sites/presupuesto`.
2. Publicar la carpeta completa en el proyecto correcto de Netlify: `magnificent-ganache-f9c37a`.
3. Verificar que el enlace siga siendo `https://magnificent-ganache-f9c37a.netlify.app/`.

## Reglas importantes

- No guardar datos de clientes dentro de GitHub porque el repositorio es público.
- No utilizar Render como almacenamiento permanente.
- No subir fotografías o PDF pesados directamente al repositorio.
- Las fotografías y documentos futuros deben almacenarse en Supabase Storage.
- Probar cualquier restauración primero con una copia, nunca sobre la única versión disponible.
