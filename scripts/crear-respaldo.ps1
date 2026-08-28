param(
  [string]$DestinoRaiz = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'GS_BURAK_RESPALDOS')
)

$ErrorActionPreference = 'Stop'
$marca = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$destino = Join-Path $DestinoRaiz $marca
$codigo = Join-Path $destino 'codigo'
$publicados = Join-Path $destino 'formatos-publicados'
$datos = Join-Path $destino 'datos'
$raizProyecto = Split-Path -Parent $PSScriptRoot

New-Item -ItemType Directory -Force $codigo, $publicados, $datos | Out-Null

$archivosCodigo = @(
  'app.js',
  'index.html',
  'styles.css',
  'styles-20260614a.css',
  'server.py',
  'requirements.txt',
  'README.md',
  'logo-gs-burak.png',
  'login-bg-gs-burak.png'
)

foreach ($archivo in $archivosCodigo) {
  $origen = Join-Path $raizProyecto $archivo
  if (Test-Path -LiteralPath $origen) {
    Copy-Item -LiteralPath $origen -Destination $codigo
  }
}

Copy-Item -LiteralPath (Join-Path $raizProyecto 'netlify-sites') -Destination $codigo -Recurse
Copy-Item -LiteralPath (Join-Path $raizProyecto 'scripts') -Destination $codigo -Recurse

$estadoRemoto = Join-Path $datos 'gs_burak_datos_supabase.json'
try {
  Invoke-WebRequest -Uri 'https://gs-burak-app.onrender.com/api/state' -OutFile $estadoRemoto -UseBasicParsing
  $contenido = Get-Content -LiteralPath $estadoRemoto -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($null -eq $contenido) { throw 'La respuesta remota no contiene datos validos.' }
} catch {
  $estadoLocal = Join-Path $raizProyecto 'gs_burak_data.json'
  if (Test-Path -LiteralPath $estadoLocal) {
    Copy-Item -LiteralPath $estadoLocal -Destination (Join-Path $datos 'gs_burak_datos_local_emergencia.json')
  }
  Set-Content -LiteralPath (Join-Path $datos 'ADVERTENCIA_DATOS.txt') -Encoding UTF8 -Value "No se pudo descargar el estado de Supabase mediante GS BURAK. Se guardo la copia local disponible. Detalle: $($_.Exception.Message)"
}

$sitios = @{
  'certificado-publicado.html' = 'https://stirring-semolina-e8a9e3.netlify.app/'
  'presupuesto-publicado.html' = 'https://magnificent-ganache-f9c37a.netlify.app/'
}

foreach ($nombre in $sitios.Keys) {
  try {
    Invoke-WebRequest -Uri $sitios[$nombre] -OutFile (Join-Path $publicados $nombre) -UseBasicParsing
  } catch {
    Set-Content -LiteralPath (Join-Path $publicados "$nombre.ERROR.txt") -Encoding UTF8 -Value $_.Exception.Message
  }
}

$instrucciones = @"
RESPALDO GS BURAK
Creado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

Contenido:
- codigo: aplicacion y fuentes maestras de certificado y presupuesto.
- datos: copia de los registros operativos descargados desde GS BURAK/Supabase.
- formatos-publicados: copia de emergencia de las paginas visibles en Netlify.

No subas la carpeta datos a un repositorio publico: contiene informacion de clientes y operacion.
Consulta docs/RESPALDO_Y_RECUPERACION.md dentro del repositorio para recuperar cada componente.
"@
Set-Content -LiteralPath (Join-Path $destino 'LEEME.txt') -Encoding UTF8 -Value $instrucciones

$hashes = Get-ChildItem -LiteralPath $destino -Recurse -File |
  Where-Object { $_.Name -ne 'SHA256.txt' } |
  ForEach-Object {
    $hash = Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256
    $relativa = $_.FullName.Substring($destino.Length + 1)
    "$($hash.Hash)  $relativa"
  }
Set-Content -LiteralPath (Join-Path $destino 'SHA256.txt') -Encoding UTF8 -Value $hashes

$zip = "$destino.zip"
Compress-Archive -Path (Join-Path $destino '*') -DestinationPath $zip -CompressionLevel Optimal

Write-Host "Respaldo creado correctamente:"
Write-Host $zip
