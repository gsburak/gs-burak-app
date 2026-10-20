# Separación de administraciones — 16 de octubre de 2026

## Estado de la preparación

La implementación está preparada localmente. No activa la separación al instalarse,
iniciar el servidor ni consultar una revisión. Hasta la activación explícita,
la aplicación sigue utilizando los registros actuales. No se han borrado tablas.

El respaldo previo está fuera del repositorio, en Documentos/GS_BURAK_RESPALDOS.
Los archivos marcados BORRADOR no deben importarse en la aplicación actual.

## Reglas del corte

- Ventas/servicios anteriores al 16 permanecen en `anterior`, con todos sus pagos,
  incluyendo los recibidos después del corte. No se cambia la fecha de ningún pago.
- Ventas, compras y gastos desde el 16 pasan a `nueva` conservando identificadores.
- Se copian clientes, productos y tipos de servicio a ambas etapas.
- Los equipos anteriores al corte conservan su fecha, costo, vida y residual.
  En la nueva se identifican como activos recibidos, no adquisiciones nuevas.
- La agenda desde el 16 pasa a la nueva con sus campos originales, anticipos,
  vínculos y eventos existentes. La migración no crea eventos en Google Calendar.
- Los pendientes abiertos se copian a la nueva; la copia histórica se marca como
  trasladada y se excluye de las alertas de la etapa anterior.
- El inventario inicial se reconstruye solo con compras y consumos hasta el 15.
  Se conserva el remanente de cada lote, su costo de uso y su operación/ciudad.
  Son entradas de apertura independientes: no aparecen como compras nuevas.
- Se bloquea la activación ante inventario negativo por ciudad, fechas inválidas,
  identificadores repetidos y productos inexistentes. Referencias a clientes ya
  inexistentes se reportan como avisos; se conservan los datos históricos.

## Persistencia y protección de datos

Una fila nueva en `app_state`, `administraciones_20261016_v1`, contiene ambas
etapas. Las tablas originales quedan intactas como fuente histórica. Antes de
activar se guarda otra fila con el respaldo completo `respaldo_pre_corte_20261016_v1`.
El corte no se implementa borrando o reimportando las tablas compartidas.

Cada pestaña lleva una administración fija en su URL y en la cabecera de las
solicitudes. Los borradores y respaldos locales usan claves distintas por etapa.
Los formularios de campo guardan a través de la aplicación, no directamente en
las tablas originales de Supabase. Las revisiones detectan escrituras de ventanas
desactualizadas y requieren recargar antes de continuar.

El respaldo JSON contiene los datos de una sola etapa, incluidos los lotes
iniciales. La importación comprueba a qué administración pertenece. El respaldo
Excel identifica la etapa y añade el detalle del inventario inicial; el JSON es
el formato para restaurar datos. Los borradores de diagnóstico, cebaderas y
presupuesto guardados en un navegador no forman parte del respaldo de la base:
conservar además sus editables y PDF. No se borran sus claves originales.

## Publicación y activación

1. Resolver y revisar las diferencias de inventario al cierre del 15. No registrar
   una compra ficticia para ocultarlas ni trasladar un saldo negativo como stock.
2. Actualizar el respaldo privado con la información más reciente y ejecutar la
   revisión nuevamente. Se puede seguir trabajando mientras se prepara.
3. Publicar el código desde el repositorio habitual y comprobar el despliegue.
4. Antes de activar, terminar los guardados pendientes y cerrar las ventanas
   antiguas de la aplicación/certificado en todas las computadoras y teléfonos.
   Esto evita capturas simultáneas mediante versiones previas del formulario.
5. Como administrador, abrir «Revisar separación del 16 de octubre» y comprobar
   cantidades, avisos y conteos. Si cambian los registros desde la revisión,
   el servidor exige revisarlos otra vez. La activación es idempotente.
6. Activar solo cuando la revisión no tenga diferencias pendientes. Entrar en la
   nueva por defecto y probar ventas, cobros anteriores, inventario, agenda,
   reportes y un respaldo de cada etapa. El selector permite cambiar sin volver
   a introducir la contraseña durante la sesión de esa pestaña.

## Verificación técnica

- `python scripts/test_administrations.py`
- `node scripts/test-administration-context.cjs`
- `node scripts/test-administration-inventory.cjs`
- `node scripts/test-administration-ui.cjs` (Playwright y Python en las rutas del runtime)
- Pruebas existentes de productos, órdenes, periodos y reportes de compras/rápidos.

`scripts/prepare-administrations.py origen.json carpeta-privada` produce borradores
y conciliación sin escribir en la nube. Rechaza guardar datos dentro del repositorio.
El cálculo de FIFO de apertura se realiza por operación; la separación no debe
activarse sin conciliar movimientos registrados en una ciudad equivocada.

La prueba de interfaz arranca un servidor aislado con datos ficticios y comprueba
el inicio de sesión, cambio de etapa sin nueva contraseña, cobros anteriores con
fecha real, aislamiento de datos, catálogo del certificado y selector móvil.
No conecta con la base real ni con Google Calendar. Las revisiones de los datos
reales se realizan por separado antes de activar el corte.
