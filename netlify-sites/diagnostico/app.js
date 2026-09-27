/* Standalone editable report. No writes to the application's operational database. */
'use strict';
const $ = (selector) => document.querySelector(selector);
const STORAGE = 'burak-diagnostico-reports-v1';
const DRAFT = 'burak-diagnostico-draft-v1';
const fields = [["cliente", "Cliente / razón social", "text"], ["establecimiento", "Nombre del establecimiento", "text"], ["domicilio", "Domicilio completo", "area"], ["giro", "Giro o actividad", "text"], ["superficie", "Superficie y unidad", "text"], ["contacto", "Contacto y cargo", "text"], ["telefono", "Teléfono", "tel"], ["correo", "Correo", "email"], ["folio", "Folio de diagnóstico", "text"], ["servicio", "Folio de servicio relacionado", "text"], ["fecha", "Fecha de inspección", "date"], ["hora", "Hora de inicio", "time"], ["fin", "Hora de término", "time"], ["tecnico", "Inspector / técnico", "text"], ["acompanante", "Acompañante del cliente", "text"], ["tipo", "Tipo de visita", "Inicial|Seguimiento|Por incidencia|Otra"], ["antecedentes", "Motivo y antecedentes reportados por el cliente", "area"], ["areas", "Áreas inspeccionadas", "area"], ["limitaciones", "Áreas no inspeccionadas y motivo", "area"], ["actividades", "Qué se hizo durante la visita", "area"], ["metodo", "Cómo se hizo y equipo utilizado", "area"], ["esfuerzo", "Tiempo, puntos revisados, dispositivos y días de exposición", "area"], ["restricciones", "Personas vulnerables, alimentos, animales y otras restricciones", "area"], ["resultado", "Resultado de la inspección", "Actividad observada|Indicios sin actividad confirmada|Sin evidencia en las áreas revisadas|Identificación pendiente"], ["diagnostico", "Conclusión y fundamento del diagnóstico", "area"], ["prioridad", "Prioridad global", "Alta|Media|Baja|Por determinar"], ["justificacion", "Justificación de la prioridad", "area"], ["inmediatas", "Medidas realizadas durante la visita y resultado", "area"], ["estrategia", "Estrategia propuesta y objetivo esperado", "area"], ["seguimiento", "Fecha de seguimiento", "date"], ["responsableSeguimiento", "Responsable del seguimiento", "text"], ["criterio", "Cómo se verificó el diagnóstico", "area"], ["anexos", "Referencias de fotografías, croquis y otros anexos", "area"], ["acuerdos", "Acuerdos y observaciones del cliente", "area"], ["responsable", "Nombre de quien revisó el diagnóstico", "text"], ["recibe", "Nombre de quien recibe", "text"]];
const keys=fields.map(f=>f[0]);
const columns=["numero", "zona", "plaga", "origen", "evidencia", "condicion", "prioridad", "accion", "responsable", "plazo", "verificacion"];
const columnLabels=["ID", "Área o zona", "Plaga o grupo identificado", "Origen de la información", "Evidencia y cantidad con unidad", "Condición favorable y riesgo", "Prioridad", "Acción recomendada", "Responsable de la acción", "Fecha compromiso", "Cómo se verificó el hallazgo"];
const limits=Object.fromEntries(columns.map(k=>[k,k==="numero"?30:1200]));
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = () => crypto.randomUUID();
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const emptyRow = n => Object.fromEntries(columns.map(k=>[k,k==='numero'?String(n):'']));
const newReport = () => ({kind:'burak-diagnostico',version:1,id:id(),clienteId:'',...Object.fromEntries(keys.map(k=>[k,''])),fecha:localDate(),hallazgos:[emptyRow(1)],firmas:{tecnico:'',responsable:'',recibe:''}});
let report = newReport(), clients = [], timer, dirty = false;
function status(message,error=false){ $('#status').textContent=message; $('#status').classList.toggle('error',error); }
function validate(data){
  if(!data || data.kind!=='burak-diagnostico' || data.version!==1 || !Array.isArray(data.hallazgos) || data.hallazgos.length<1 || data.hallazgos.length>100) throw new Error('El archivo debe ser un reporte editable de diagnostico con entre 1 y 100 hallazgos.');
  const result = {kind:'burak-diagnostico',version:1,id:typeof data.id==='string'&&/^[\w-]{1,80}$/.test(data.id)?data.id:id(),clienteId:typeof data.clienteId==='string'?data.clienteId:''};
  for(const key of keys){
    if(typeof data[key]!=='string' || data[key].length>(fields.find(f=>f[0]===key)[2]==='area'?4000:300)) throw new Error('El archivo contiene datos inválidos o demasiado largos.');
    result[key]=data[key];
  }
  result.hallazgos=data.hallazgos.map(row=>Object.fromEntries(columns.map(key=>{
    if(!row || typeof row[key]!=='string' || row[key].length>limits[key]) throw new Error('Un hallazgo contiene datos inválidos o demasiado largos.');
    return [key,row[key]];
  })));
  result.firmas={};
  for(const key of ['tecnico','responsable','recibe']){
    const value=data.firmas?.[key]||'';
    if(typeof value!=='string'||value.length>250000||(value&&!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)))throw new Error('Firma inválida.');
    result.firmas[key]=value;
  }
  return result;
}
function library(){
  const data=JSON.parse(localStorage.getItem(STORAGE)||'[]');
  if(!Array.isArray(data)) throw new Error('No se pudo leer la biblioteca de reportes. Descarga el editable para conservar tus datos.');
  return data;
}
function updateLibrary(){
  try { const data=library(); $('#saved').innerHTML='<option value="">Selecciona un reporte</option>'+data.map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.cliente||'Sin cliente')} · ${escapeHtml(r.fecha)} · ${escapeHtml(r.folio||'Sin folio')}</option>`).join(''); }
  catch(e){status(e.message,true);}
}
function draft(){
  try{localStorage.setItem(DRAFT,JSON.stringify(report));}
  catch(_){status('No se pudo guardar el borrador en este navegador. Usa Descargar editable para conservarlo.',true);}
}
function changed(){ dirty=true;draft();clearTimeout(timer);timer=setTimeout(renderPreview,160); }
function renderRows(){
 $('#rows').innerHTML=report.hallazgos.map((row,i)=>`<fieldset class="finding"><legend>Hallazgo ${i+1}</legend><div class="grid">${columns.map((key,j)=>{
 const attr=`data-row="${i}" data-key="${key}" aria-label="${columnLabels[j]} del hallazgo ${i+1}"`;
 let control;
 if(key==='origen'||key==='prioridad'){
 const options=key==='origen'?['Observado','Reportado por el cliente','Pendiente de confirmar']:['Alta','Media','Baja','Por determinar'];
 control=`<select ${attr}><option value="">Seleccionar</option>${options.map(v=>`<option ${v===row[key]?'selected':''}>${v}</option>`).join('')}</select>`;
 }else if(key==='plazo'||key==='numero')control=`<input ${attr} type="${key==='plazo'?'date':'text'}" maxlength="${limits[key]}" value="${escapeHtml(row[key])}">`;
 else control=`<textarea ${attr} maxlength="${limits[key]}" rows="2">${escapeHtml(row[key])}</textarea>`;
 return `<label>${columnLabels[j]}${control}</label>`;
 }).join('')}</div><button type="button" class="remove-finding" data-remove="${i}">Eliminar hallazgo</button></fieldset>`).join('');
}
function showReport(){for(const key of keys){const input=$('#editor').elements.namedItem(key);if(input)input.value=report[key];}$('#catalog').value=report.clienteId;renderRows();drawSignatures();renderPreview();}
function save(){
  try{
    const data=library();const index=data.findIndex(r=>r.id===report.id);
    if(index<0)data.unshift(structuredClone(report));else data[index]=structuredClone(report);
    localStorage.setItem(STORAGE,JSON.stringify(data));draft();dirty=false;updateLibrary();$('#saved').value=report.id;status('Reporte guardado en este navegador. Puedes reabrirlo y seguir editando.');
  }catch(e){status('No se pudo guardar. Descarga el editable para conservar tus cambios. '+e.message,true);}
}
function canReplace(){return !dirty||confirm('Hay cambios sin guardar en la biblioteca. ¿Quieres reemplazar el reporte abierto? Puedes cancelar y guardarlo primero.');}
function filename(){return `Diagnostico_${report.cliente||'cliente'}_${report.fecha||'sin_fecha'}`.replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,130);}
function exportReport(){
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Editable descargado. Usa Abrir editable para recuperarlo en este u otro equipo.');
}
function setClients(data){
  clients=Array.isArray(data)?data.filter(c=>c&&typeof c.nombre==='string'):[];
  $('#catalog').innerHTML='<option value="">Capturar manualmente</option>'+clients.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.nombre)}</option>`).join('');
  $('#catalog').value=report.clienteId;
}
function renderPreview(){
 clearTimeout(timer);const preview=$('#preview');preview.replaceChildren();const pages=[];let content,heading='';
 const overflow=()=>content.scrollHeight>content.clientHeight+1;
 function page(){const el=document.createElement('article');el.className='sheet';el.innerHTML=`<div class="paper-content"><header class="report-head"><div><h2>Reporte de diagnóstico</h2><p>GS BURAK · Inspección e identificación de plagas</p><p>${escapeHtml(report.cliente||'Cliente por completar')} · Folio ${escapeHtml(report.folio||'—')} · ${escapeHtml(report.fecha||'Sin fecha')}</p></div><img src="assets/gs-burak-logo.jpeg" alt="GS BURAK"></header></div><footer class="paper-footer"><span>SB-F-03 · Revisión 2.1</span><span class="page-number"></span></footer>`;preview.append(el);pages.push(el);content=el.querySelector('.paper-content');}
 function add(node){let h;if(heading){h=document.createElement('h3');h.className='report-section';h.textContent=heading;content.append(h);}content.append(node);if(overflow()){node.remove();h?.remove();page();if(h)content.append(h);content.append(node);}heading='';}
 function block(label,value){
  const text=value||'No registrado';
  // Split long narrative fields into bounded pieces so all text survives pagination.
  const chunks=text.match(/[\s\S]{1,800}/g)||[''];
  chunks.forEach((chunk,i)=>{const n=document.createElement('div');n.className='report-block';n.innerHTML=`<b>${escapeHtml(label)}${i?' (continuación)':''}</b>${escapeHtml(chunk)}`;add(n);});
 }
 page();heading='Datos del cliente y del establecimiento';
 fields.slice(0,10).forEach(([key,label])=>block(label,report[key]));
 heading='Qué se hizo y cómo se hizo';fields.slice(10,23).forEach(([key,label])=>block(label,report[key]));
 for(const row of report.hallazgos){heading=`Hallazgo ${row.numero||'sin ID'} y acciones recomendadas`;columns.slice(1).forEach(key=>block(columnLabels[columns.indexOf(key)],row[key]));}
 heading='Diagnóstico y seguimiento';fields.slice(23).filter(([k])=>!['responsable','recibe','anexos'].includes(k)).forEach(([key,label])=>block(label,report[key]));
 const evidenceNote=document.createElement('p');evidenceNote.className='report-block';evidenceNote.textContent='* Se adjunta evidencia fotográfica.';add(evidenceNote);
 heading='Elaboración revisión y recepción';
 const signs=document.createElement('section');signs.className='closing';signs.innerHTML=`<div class="signatures">${[['tecnico','Inspector'],['responsable','Revisó'],['recibe','Cliente / recibe']].map(([key,label])=>`<div>${report.firmas[key]?`<img src="${report.firmas[key]}" alt="Firma de ${label}">`:'<div style="height:56px"></div>'}${escapeHtml(report[key]||'Nombre y firma')}<small>${label}</small></div>`).join('')}</div><p class="hint">La firma del cliente acredita la recepción del diagnóstico y las recomendaciones. La ejecución de las acciones se documentará en el seguimiento.</p>`;add(signs);
 pages.forEach((p,i)=>p.querySelector('.page-number').textContent=`Página ${i+1} de ${pages.length}`);
 const tooLong=pages.some(p=>{const c=p.querySelector('.paper-content');return c.scrollHeight>c.clientHeight+1;});
 $('#print').disabled=tooLong;if(tooLong)status('Hay contenido que supera una página. Acorta los campos antes de imprimir.',true);
 $('#summary').textContent=`${report.hallazgos.length} hallazgos · ${pages.length} páginas`;document.title=filename();
}
function drawSignatures(){document.querySelectorAll('[data-sign]').forEach(canvas=>{const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);const value=report.firmas[canvas.dataset.sign];if(value){const im=new Image();im.onload=()=>{if(report.firmas[canvas.dataset.sign]===value)ctx.drawImage(im,0,0,canvas.width,canvas.height);};im.src=value;}});}
document.querySelectorAll('[data-sign]').forEach(canvas=>{
 const ctx=canvas.getContext('2d');let drawing=false;
 const point=e=>{const rect=canvas.getBoundingClientRect();return [(e.clientX-rect.left)*canvas.width/rect.width,(e.clientY-rect.top)*canvas.height/rect.height];};
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);drawing=true;ctx.strokeStyle='#15365e';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...point(e));});
 canvas.addEventListener('pointermove',e=>{if(drawing){ctx.lineTo(...point(e));ctx.stroke();}});
 const finish=()=>{if(!drawing)return;drawing=false;report.firmas[canvas.dataset.sign]=canvas.toDataURL('image/png');changed();};
 canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
});
document.querySelectorAll('[data-clear]').forEach(button=>button.addEventListener('click',()=>{report.firmas[button.dataset.clear]='';drawSignatures();changed();}));
$('#editor').addEventListener('submit',e=>e.preventDefault());
$('#editor').addEventListener('input',e=>{const el=e.target;if(el.dataset.row!==undefined){report.hallazgos[Number(el.dataset.row)][el.dataset.key]=el.value;changed();}else if(keys.includes(el.name)){report[el.name]=el.value;changed();}});
$('#add').addEventListener('click',()=>{if(report.hallazgos.length>=100){status('El límite es 100 hallazgos por reporte.',true);return;}const n=Math.max(0,...report.hallazgos.map(r=>/^\d+$/.test(r.numero)?Number(r.numero):0))+1;report.hallazgos.push(emptyRow(n));renderRows();changed();});
$('#rows').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;const i=Number(b.dataset.remove);if(!confirm(`¿Eliminar el hallazgo ${report.hallazgos[i].numero} y su acción?`))return;if(report.hallazgos.length===1)report.hallazgos=[emptyRow(1)];else report.hallazgos.splice(i,1);renderRows();changed();});
$('#save').addEventListener('click',save);$('#export').addEventListener('click',exportReport);
$('#new').addEventListener('click',()=>{if(!canReplace())return;report=newReport();dirty=false;draft();showReport();status('Nuevo diagnóstico. Selecciona un cliente o captura sus datos.');});
$('#load').addEventListener('click',()=>{try{const found=library().find(r=>r.id===$('#saved').value);if(!found){status('Selecciona primero un reporte guardado.',true);return;}const next=validate(found);if(!canReplace())return;report=next;dirty=false;draft();showReport();status('Diagnóstico recuperado.');}catch(e){status(e.message,true);}});
$('#import').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>3000000)throw new Error('El archivo supera 3 MB.');const next=validate(JSON.parse(await file.text()));if(!canReplace())return;report=next;dirty=true;draft();showReport();status('Editable abierto. Guarda el reporte para incorporarlo a este navegador.');}catch(error){status('No se pudo abrir: '+error.message,true);}finally{e.target.value='';}});
$('#catalog').addEventListener('change',()=>{const c=clients.find(c=>String(c.id)===$('#catalog').value);if(!c){report.clienteId='';changed();return;}if((dirty||report.cliente)&&!confirm('Cambiar de cliente inicia un diagnóstico vacío. Guarda el actual para conservarlo. ¿Continuar?')){$('#catalog').value=report.clienteId;return;}report=newReport();report.clienteId=String(c.id);report.cliente=c.nombre||'';report.domicilio=c.direccion||'';report.telefono=c.telefono||'';report.correo=c.correo||'';showReport();changed();status('Cliente seleccionado. Completa la inspección.');});
$('#print').addEventListener('click',()=>{renderPreview();if($('#print').disabled)return;if(!report.cliente.trim()||!report.fecha||!report.diagnostico.trim()){status('Completa cliente, fecha y conclusión del diagnóstico antes de generar la copia para el cliente.',true);return;}window.print();});
window.addEventListener('beforeprint',renderPreview);
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='burak-diagnostico-clientes')setClients(e.data.clientes);});
try{const raw=localStorage.getItem(DRAFT);if(raw){report=validate(JSON.parse(raw));dirty=true;status('Se recuperó el último borrador de este navegador.');}}catch(_){status('No se pudo recuperar el borrador. Puedes abrir un archivo editable.',true);}
updateLibrary();showReport();
if(parent!==window)parent.postMessage({type:'burak-diagnostico-ready'},location.origin);
else if(location.protocol.startsWith('http'))fetch('/api/state',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>setClients(data.clientes||data.data?.clientes||[])).catch(()=>status('Captura los datos manualmente o abre el diagnóstico desde la app para elegir un cliente.'));
