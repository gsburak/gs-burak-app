const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync('netlify-sites/certificado/app.js','utf8');
const start=source.indexOf('form.addEventListener("submit"');
const end=source.indexOf('await initReady;',start);
(async()=>{
 let handler, pdfs=0, saves=0, archiveCalls=0, fail=false;
 const folio={value:''};
 const nodes={}; const get=id=>nodes[id]||={disabled:false,textContent:'',classList:{add(){},remove(){}},scrollIntoView(){}};
 const context=vm.createContext({
   console:{error(){}},crypto:{randomUUID:()=> 'unique-id'},evidenceLoading:false,reporteEnProceso:false,
   form:{elements:{folio},reportValidity:()=>true,addEventListener(event,fn){handler=fn;}},
   document:{querySelector:get},alert(){},
   documentLibrary:{save(){archiveCalls++;throw new Error('Archivo no disponible');}},
   dataFromForm:()=>({folio:folio.value,productos:[{productoId:'p',cantidad:20}]}),
   FIRMA_RESPONSABLE_DEFAULT:'responsable',signaturePads:{firmaTecnico:{data:()=> 'firma'},firmaCliente:{data:()=> 'firma'}},
   renderCertificate(){},nombreArchivoPdf:()=> 'certificado.pdf',ultimoPdf:null,ultimoPdfNombre:'',
   saveReporteComoServicio:async data=>{saves++;if(fail)throw new Error('No se guardó el servicio');return {mensaje:'Servicio guardado'};},
   crearPdfEditable(){pdfs++;}
 });
 vm.runInContext(source.slice(start,end),context);
 await handler({preventDefault(){}});
 assert.equal(archiveCalls,0,'Broken archive must not block service');
 assert.equal(saves,1);assert.equal(pdfs,1);
 assert.equal(folio.value,'GS-CAMPO-unique-id');
 await handler({preventDefault(){}});
 assert.equal(folio.value,'GS-CAMPO-unique-id','Retry retains stable service identity');
 assert.equal(pdfs,2);
 fail=true;await handler({preventDefault(){}});
 assert.equal(pdfs,2,'Normal workflow must never report success after service write failure');
 assert.match(get('#reportStatus').textContent,/No se guardó el servicio/);
 assert.equal(get('#generateReport').disabled,false);
 assert.equal(vm.runInContext('reporteEnProceso',context),false);
 assert.match(source,/kind:'certificado',autosave:false/);
 console.log('Certificate direct submit passed: unavailable archive, service-first persistence, PDF, retry identity, truthful errors and button recovery.');
})().catch(error=>{console.error(error);process.exitCode=1;});
