# Reporte de diagnóstico GS BURAK

Formulario SB-F-03 integrado en el menú **Reporte de diagnóstico** de la aplicación.

## Uso
1. Seleccionar un cliente o capturar sus datos.
2. Documentar la inspección: qué se hizo, cómo, alcance y limitaciones.
3. Agregar los hallazgos necesarios; cada uno incluye evidencia, acción, responsable, fecha y verificación.
4. Completar conclusión, prioridad, seguimiento y firmas con mouse o dedo.
5. Guardar el reporte para reabrirlo en este navegador. Descargar el editable JSON para respaldo o traslado a otro equipo.
6. Usar **Imprimir / Guardar PDF**, elegir Guardar como PDF, tamaño Carta, escala 100 %, sin encabezados y pies del navegador. Enviar ese PDF al cliente por el medio habitual.

La biblioteca y el borrador usan localStorage (`burak-diagnostico-reports-v1`, `burak-diagnostico-draft-v1`); no se sincronizan con Supabase. El formato no envía mensajes ni correos automáticamente. Las firmas sólo aparecen si se dibujan. El campo de anexos registra referencias; los archivos de evidencia se adjuntan por separado al envío.

## Publicación
Publicar `app.js`, `index.html` y la carpeta completa `netlify-sites/diagnostico/` en el repositorio/sitio existente. No es necesario crear otro sitio. El menú recibe los clientes mediante mensajes del mismo origen y la vista independiente intenta consultar `/api/state`.

## Pruebas
Con servidor estático en localhost:8766, Node, Playwright y Edge: `node scripts/test-diagnostico.cjs`. Cubre persistencia, firmas, textos extensos, paginación, editable de ida y vuelta, eliminación cancelada, escape de texto, móvil y catálogo integrado. No utiliza datos reales ni escribe a la base operativa.
