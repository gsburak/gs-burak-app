# Formatos y folios de GS BURAK

Los siete formatos tienen biblioteca de documentos, guardado automático tras una pausa, guardado manual, apertura, copias de seguridad y recuperación de capturas anteriores del navegador. Verifica el mensaje Guardado antes de salir. Un error nunca se presenta como guardado exitoso; puede descargarse una copia de emergencia.

Los documentos de la administración nueva, anterior y de una instalación todavía no separada se guardan en filas independientes de app_state: formatos_gs_burak_nueva_v1, formatos_gs_burak_anterior_v1 y formatos_gs_burak_actual_v1. No se cambian los registros operativos al guardar un borrador. PESTI PRO usa otro proyecto y otras claves de aplicación.

Los folios tienen series por formato y administración: GS-N-CER, GS-A-CER, GS-N-MON, etc. Se asignan al primer guardado, no se reinician por año y no se reutilizan. Editar un documento conserva su folio. Guardados simultáneos usan revisión del documento y actualización condicional de la fila de almacenamiento; se rechaza una edición desactualizada.

Las capturas anteriores se importan explícitamente y reciben un folio de la serie nueva. Los certificados anteriores que solo guardaron campos no permiten recuperar fotografías o firmas que nunca se almacenaron. Los PDFs antiguos siguen conservando sus folios originales.

El respaldo JSON del dashboard incluye los documentos y sus contadores de la administración seleccionada. Restaurar formatos añade los documentos faltantes y conserva los ya existentes; los contadores nunca retroceden y se rechazan copias de otra administración o aplicación.

El PDF de anexos conserva un marco completo por hoja y divide el detalle en grupos de ocho filas. El botón Quitar croquis conserva los demás datos y la eliminación se guarda en la biblioteca.

Límites: 12 MB por documento, 20 MB por solicitud. Las imágenes consumen almacenamiento. La captura de emergencia en el navegador es un apoyo, no sustituye el guardado confirmado del servidor.

Validación realizada sin datos reales: 13 pruebas del servidor (incluyen separación de administraciones, concurrencia, recuperación y respaldos), regresiones de contexto del navegador y guardado de servicios, siete formatos abiertos en dos navegadores aislados, carga/eliminación de croquis y revisión visual del PDF. La confirmación en Render se realiza después de subir el commit. No requiere SQL adicional: utiliza la tabla app_state existente mediante PostgREST.

Referencia del mecanismo de filtrado y actualización condicional: https://docs.postgrest.org/en/stable/references/api/tables_views.html
