/* Standalone editable report. No writes to the application's operational database. */
'use strict';
const $ = (selector) => document.querySelector(selector);
const STORAGE = 'burak-cebaderas-reports-v1';
const DRAFT = 'burak-cebaderas-draft-v1';
const keys = ['cliente','domicilio','ciudad','telefono','correo','folio','fecha','hora','responsable','tecnico','recibe','notas'];
const columns = ['numero','ubicacion','observaciones','condiciones','accion'];
const limits = {numero:20,ubicacion:400,observaciones:400,condiciones:160,accion:400};
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = () => crypto.randomUUID();
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const emptyRow = (n) => ({numero:String(n),ubicacion:'',observaciones:'',condiciones:'',accion:''});
const newReport = () => ({version:1,id:id(),clienteId:'',...Object.fromEntries(keys.map(k=>[k,''])),fecha:localDate(),estaciones:Array.from({length:5},(_,i)=>emptyRow(i+1))});
let report = newReport(), clients = [], timer, dirty = false;
function status(message,error=false){ $('#status').textContent=message; $('#status').classList.toggle('error',error); }
function validate(data){
  if(!data || data.version!==1 || !Array.isArray(data.estaciones) || data.estaciones.length<1 || data.estaciones.length>500) throw new Error('El archivo debe ser un reporte editable de cebaderas con entre 1 y 500 estaciones.');
  const result = {version:1,id:typeof data.id==='string'&&/^[\w-]{1,80}$/.test(data.id)?data.id:id(),clienteId:typeof data.clienteId==='string'?data.clienteId:''};
  for(const key of keys){
    if(typeof data[key]!=='string' || data[key].length>(key==='notas'?2000:500)) throw new Error('El archivo contiene datos invÃ¡lidos o demasiado largos.');
    result[key]=data[key];
  }
  result.estaciones=data.estaciones.map(row=>Object.fromEntries(columns.map(key=>{
    if(!row || typeof row[key]!=='string' || row[key].length>limits[key]) throw new Error('Una estaciÃ³n contiene datos invÃ¡lidos o demasiado largos.');
    return [key,row[key]];
  })));
  return result;
}
function library(){
  const data=JSON.parse(localStorage.getItem(STORAGE)||'[]');
  if(!Array.isArray(data)) throw new Error('No se pudo leer la biblioteca de reportes. Descarga el editable para conservar tus datos.');
  return data;
}
function updateLibrary(){
  try { const data=library(); $('#saved').innerHTML='<option value="">Selecciona un reporte</option>'+data.map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.cliente||'Sin cliente')} Â· ${escapeHtml(r.fecha)} Â· ${escapeHtml(r.folio||'Sin folio')}</option>`).join(''); }
  catch(e){status(e.message,true);}
}
function draft(){
  try{localStorage.setItem(DRAFT,JSON.stringify(report));}
  catch(_){status('No se pudo guardar el borrador en este navegador. Usa Descargar editable para conservarlo.',true);}
}
function changed(){ dirty=true;draft();clearTimeout(timer);timer=setTimeout(renderPreview,160); }
function renderRows(){
  $('#count').value=report.estaciones.length;
  $('#rows').innerHTML=report.estaciones.map((row,i)=>`<tr>${columns.map(key=>`<td>${key==='numero'||key==='condiciones'?`<input data-row="${i}" data-key="${key}" aria-label="${key} de estaciÃ³n ${i+1}" maxlength="${limits[key]}" ${key==='condiciones'?'list="condiciones"':''} value="${escapeHtml(row[key])}">`:`<textarea data-row="${i}" data-key="${key}" aria-label="${key} de estaciÃ³n ${i+1}" maxlength="${limits[key]}" rows="2">${escapeHtml(row[key])}</textarea>`}</td>`).join('')}<td><button type="button" class="remove" data-remove="${i}" aria-label="Eliminar estaciÃ³n ${i+1}" ${report.estaciones.length===1?'disabled':''}>Ã—</button></td></tr>`).join('');
}
function showReport(){ for(const key of keys) $('#editor').elements.namedItem(key).value=report[key];$('#catalog').value=report.clienteId;renderRows();renderPreview(); }
function save(){
  try{
    const data=library();const index=data.findIndex(r=>r.id===report.id);
    if(index<0)data.unshift(structuredClone(report));else data[index]=structuredClone(report);
    localStorage.setItem(STORAGE,JSON.stringify(data));draft();dirty=false;updateLibrary();$('#saved').value=report.id;status('Reporte guardado en este navegador. Puedes reabrirlo y seguir editando.');
  }catch(e){status('No se pudo guardar. Descarga el editable para conservar tus cambios. '+e.message,true);}
}
function canReplace(){return !dirty||confirm('Hay cambios sin guardar en la biblioteca. Â¿Quieres reemplazar el reporte abierto? Puedes cancelar y guardarlo primero.');}
function filename(){return `Cebaderas_${report.cliente||'cliente'}_${report.fecha||'sin_fecha'}`.replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,130);}
function exportReport(){
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Editable descargado. Usa Abrir editable para recuperarlo en este u otro equipo.');
}
function setClients(data){
  clients=Array.isArray(data)?data.filter(c=>c&&typeof c.nombre==='string'):[];
  $('#catalog').innerHTML='<option value="">Capturar manualmente</option>'+clients.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.nombre)}</option>`).join('');
  $('#catalog').value=report.clienteId;
}
function meta(label,value){return `<div><b>${label}</b>${escapeHtml(value||'â€”')}</div>`;}
function renderPreview(){
  clearTimeout(timer);const preview=$('#preview');preview.innerHTML='';const pages=[];
  function page(first=false){
    const sheet=document.createElement('article');sheet.className='sheet';
    sheet.innerHTML=`<div class="paper-content"><header class="report-head"><div><h2>InspecciÃ³n y servicio</h2><p>ESTACIONES CEBADERAS Â· GS BURAK</p><p>${escapeHtml(report.cliente||'Cliente por completar')} Â· Folio ${escapeHtml(report.folio||'â€”')}</p></div><img src="assets/gs-burak-logo.jpeg" alt="GS Burak"></header>${first?`<section class="client-details">${meta('Cliente',report.cliente)}${meta('Fecha / hora',`${report.fecha} ${report.hora}`.trim())}${meta('Domicilio',report.domicilio)}${meta('Ciudad',report.ciudad)}${meta('Correo',report.correo)}${meta('TelÃ©fono',report.telefono)}</section>`:''}</div><footer class="paper-footer"><span>GS BURAK Â· ${report.estaciones.length} estaciones</span><span class="page-number"></span></footer>`;
    preview.append(sheet);pages.push(sheet);return sheet.querySelector('.paper-content');
  }
  function table(content){
    const node=document.createElement('table');node.className='report-table';node.innerHTML='<thead><tr><th>N.Âº</th><th>UbicaciÃ³n</th><th>Observaciones</th><th>Condiciones</th><th>AcciÃ³n</th></tr></thead><tbody></tbody>';content.append(node);return node.querySelector('tbody');
  }
  const overflows=content=>content.scrollHeight>content.clientHeight+1;
  let content=page(true),body=table(content);
  for(const station of report.estaciones){
    const tr=document.createElement('tr');tr.innerHTML=columns.map(key=>`<td>${escapeHtml(station[key]||'â€”')}</td>`).join('');body.append(tr);
    if(overflows(content)){
      tr.remove();if(!body.children.length)body.parentElement.remove();
      content=page();body=table(content);body.append(tr);
    }
  }
  const closing=document.createElement('section');closing.className='closing';
  closing.innerHTML=`<h3>OBSERVACIONES GENERALES</h3><p>${escapeHtml(report.notas||'Sin observaciones adicionales.')}</p><div class="signatures">${[['Responsable sanitario',report.responsable],['TÃ©cnico',report.tecnico],['Cliente / recibe',report.recibe]].map(([role,name])=>`<div>${escapeHtml(name||'Nombre y firma')}<small>${role}</small></div>`).join('')}</div>`;
  content.append(closing);if(overflows(content)){closing.remove();content=page();content.append(closing);}
  pages.forEach((p,i)=>p.querySelector('.page-number').textContent=`PÃ¡gina ${i+1} de ${pages.length}`);
  const tooLong=pages.some(p=>overflows(p.querySelector('.paper-content')));
  $('#print').disabled=tooLong;
  if(tooLong)status('Hay una celda u observación que supera una página. Reduce ese texto para imprimir sin recortes.',true);
  $('#summary').textContent=`${report.estaciones.length} estaciones Â· ${pages.length} ${pages.length===1?'pÃ¡gina':'pÃ¡ginas'}`;
  document.title=filename();
}
$('#editor').addEventListener('submit',event=>event.preventDefault());
$('#editor').addEventListener('input',event=>{
  const el=event.target;
  if(el.dataset.row!==undefined){report.estaciones[Number(el.dataset.row)][el.dataset.key]=el.value;changed();}
  else if(keys.includes(el.name)){report[el.name]=el.value;changed();}
});
$('#rows').addEventListener('click',event=>{
  const button=event.target.closest('[data-remove]');if(!button||report.estaciones.length===1)return;
  const i=Number(button.dataset.remove),row=report.estaciones[i];
  if(columns.slice(1).some(k=>row[k].trim())&&!confirm(`Â¿Eliminar la estaciÃ³n ${row.numero}? Se quitarÃ¡n los datos de esta fila.`))return;
  report.estaciones.splice(i,1);renderRows();changed();
});
function resize(count){
  if(!Number.isInteger(count)||count<1||count>500){status('Introduce una cantidad entera entre 1 y 500 estaciones.',true);$('#count').value=report.estaciones.length;return;}
  if(count<report.estaciones.length&&report.estaciones.slice(count).some(r=>columns.slice(1).some(k=>r[k].trim()))&&!confirm(`Al reducir a ${count} estaciones se eliminarÃ¡n las Ãºltimas ${report.estaciones.length-count} filas y sus datos. Â¿Continuar?`)){$('#count').value=report.estaciones.length;return;}
  report.estaciones.length=Math.min(count,report.estaciones.length);
  let next=Math.max(0,...report.estaciones.map(r=>/^\d+$/.test(r.numero)?Number(r.numero):0))+1;
  while(report.estaciones.length<count)report.estaciones.push(emptyRow(next++));
  renderRows();changed();status(`${count} estaciones. La vista previa se ajusta automÃ¡ticamente.`);
}
$('#resize').addEventListener('click',()=>resize(Number($('#count').value)));
$('#add').addEventListener('click',()=>resize(report.estaciones.length+1));
$('#visit').addEventListener('click',()=>{
  if(!canReplace())return;
  report={...report,id:id(),fecha:localDate(),hora:'',folio:'',notas:'',recibe:'',estaciones:report.estaciones.map(r=>({...r,observaciones:'',condiciones:'',accion:''}))};
  dirty=true;draft();showReport();status('Nueva visita: se conservaron el cliente y las ubicaciones; captura los resultados de esta inspecciÃ³n.');
});
$('#save').addEventListener('click',save);
$('#export').addEventListener('click',exportReport);
$('#new').addEventListener('click',()=>{if(!canReplace())return;report=newReport();dirty=false;draft();showReport();status('Nuevo reporte. Selecciona al cliente y la cantidad de estaciones.');});
$('#load').addEventListener('click',()=>{
  try{const found=library().find(r=>r.id===$('#saved').value);if(!found){status('Selecciona primero un reporte guardado.',true);return;}const next=validate(found);if(!canReplace())return;report=next;dirty=false;draft();showReport();status('Reporte recuperado; puedes editar todos sus datos.');}catch(e){status(e.message,true);}
});
$('#import').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>2500000)throw new Error('El archivo es demasiado grande.');const next=validate(JSON.parse(await file.text()));if(!canReplace())return;report=next;dirty=true;draft();showReport();status('Editable abierto. Guarda el reporte para aÃ±adirlo a este navegador.');}
  catch(e){status('No se pudo abrir el editable: '+e.message,true);}finally{event.target.value='';}
});
$('#catalog').addEventListener('change',()=>{
  const client=clients.find(c=>String(c.id)===$('#catalog').value);if(!client)return;
  if((report.cliente||report.estaciones.some(r=>columns.slice(1).some(k=>r[k])))&&!confirm('Cambiar de cliente inicia un reporte con estaciones vacÃ­as. Guarda el actual si deseas conservarlo. Â¿Continuar?')){$('#catalog').value=report.clienteId;return;}
  report=newReport();report.clienteId=String(client.id);report.cliente=client.nombre||'';report.domicilio=client.direccion||'';report.telefono=client.telefono||'';report.correo=client.correo||'';showReport();changed();status('Cliente seleccionado. Indica cuÃ¡ntas estaciones tiene.');
});
$('#print').addEventListener('click',()=>{renderPreview();window.print();});
window.addEventListener('beforeprint',renderPreview);
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='burak-cebaderas-clientes')setClients(event.data.clientes);});
try{const raw=localStorage.getItem(DRAFT);if(raw){report=validate(JSON.parse(raw));dirty=true;status('Se recuperÃ³ el Ãºltimo borrador de este navegador.');}}catch(_){status('No se pudo recuperar el borrador anterior. Puedes abrir un archivo editable.',true);}
updateLibrary();showReport();
if(parent!==window)parent.postMessage({type:'burak-cebaderas-ready'},location.origin);
else if(location.protocol.startsWith('http'))fetch('/api/state',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>setClients(data.clientes||data.data?.clientes||[])).catch(()=>status('Captura el cliente manualmente o abre este formato desde la app para elegir uno registrado.'));
