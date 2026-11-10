const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('netlify-sites/certificado/app.js','utf8');
const start=source.indexOf('document.querySelector("#downloadPdf").addEventListener');
const end=source.indexOf('document.querySelector("#sharePdf").addEventListener',start);
const handlers={}; let rendered,generated,requests=0,valid=true;
const nodes={};
const get=id=>nodes[id]||=( {textContent:'',classList:{remove(){}},addEventListener(type,fn){handlers[id]=fn;},click(){handlers[id]();}} );
const data={cliente:'Cliente',productos:[{productoId:'p',cantidad:20}]};
const context=vm.createContext({
  document:{querySelector:get},evidenceLoading:false,alert(){},
  form:{reportValidity:()=>valid},dataFromForm:()=>data,
  FIRMA_RESPONSABLE_DEFAULT:'responsable',signaturePads:{firmaTecnico:{data:()=> 'firma-tecnico'},firmaCliente:{data:()=> 'firma-cliente'}},
  renderCertificate:(...args)=>{rendered=args;},crearPdfEditable:d=>{generated=d;},
  fetch:()=>{requests++;throw new Error('offline');}
});
vm.runInContext(source.slice(start,end),context);
handlers['#generatePdfOnly']();
assert.equal(requests,0,'PDF must work without cloud requests');
assert.equal(generated,data);
assert.equal(rendered[1].cliente,'firma-cliente');
assert.match(nodes['#reportStatus'].textContent,/no registra ni confirma/);
assert.match(source,/hide:\['#saveDraft','#resetForm'\],exports:\[\]/,'Download/share must not be intercepted by mandatory cloud save');
generated=null;valid=false;handlers['#generatePdfOnly']();assert.equal(generated,null);
valid=true;context.evidenceLoading=true;handlers['#generatePdfOnly']();assert.equal(generated,null);
context.evidenceLoading=false;context.crearPdfEditable=()=>{throw new Error('pdf-error');};
handlers['#generatePdfOnly']();assert.match(nodes['#reportStatus'].textContent,/No se pudo generar el PDF/);
console.log('Certificate offline PDF passed: zero cloud requests, signatures, validation, image readiness, truthful status and PDF failures.');
