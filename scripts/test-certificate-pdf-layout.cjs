const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();
  await page.setContent('<select id="evidencePerPage"><option selected>8</option></select><a id="openGeneratedPdf"></a><button id="sharePdf"></button>');
  await page.addScriptTag({url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'});
  const source=fs.readFileSync('netlify-sites/certificado/app.js','utf8');
  const generator=source.slice(source.indexOf('function crearPdfEditable('),source.indexOf('function descargarPdf('));
  const result=await page.evaluate(generator=>{
   window.preview=document.createElement('div');window.evidenceList=document.createElement('div');
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
   const ctx=canvas.getContext('2d');ctx.fillStyle='#c8dace';ctx.fillRect(0,0,320,240);
   ctx.fillStyle='#314e43';ctx.font='24px sans-serif';ctx.fillText('Evidencia de prueba',40,120);
   window.evidencePhotos=Array.from({length:8},(_,i)=>({src:canvas.toDataURL('image/jpeg'),width:320,height:240,caption:'Fotografía '+(i+1)+': Se recomienda evitar que se estanque el agua para prevenir la presencia de plagas. Revisar y limpiar los recipientes y retirar todos los residuos del área tratada.'}));
   window.joinList=a=>a.join(', ');window.nombreArchivoPdf=()=> 'certificado-prueba.pdf';
   window.ultimoPdf=null;window.ultimoPdfNombre='';
   const textCalls=[];const proto=window.jspdf.jsPDF;window.jspdf.jsPDF=function(opts){const doc=new proto(opts);const text=doc.text.bind(doc);doc.text=(v,x,y,...rest)=>{textCalls.push({v,x,y});return text(v,x,y,...rest);};doc.save=()=>{};window.testDoc=doc;return doc;};
   (0,eval)(generator);
   crearPdfEditable({folio:'GS-SRV-00001',fecha:'2026-11-10',cliente:'CLIENTE DE PRUEBA',tecnico:'SANTOS',plagas:[],areas:[],productos:[],observaciones:'Prueba de certificado con ocho fotografías y comentarios extensos.'});
   return {pdf:testDoc.output('datauristring').split(',')[1],captions:textCalls.filter(c=>Array.isArray(c.v)&&c.v.some(t=>/Fotografía/.test(t)))};
  },generator);
  assert.equal(result.captions.length,8);
  assert.ok(result.captions.every(c=>c.v.length>1),'Captions must remain actual multiline arrays, never comma-joined strings');
  fs.mkdirSync('tmp/pdfs',{recursive:true});fs.writeFileSync('tmp/pdfs/certificado-layout.pdf',Buffer.from(result.pdf,'base64'));
  console.log('PDF layout passed: real jsPDF output, eight photographs and eight multiline captions. Sample: tmp/pdfs/certificado-layout.pdf');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
