const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

(async () => {
  const nodes = new Map();
  const node = () => ({ dataset:{}, classList:{add(){}}, append(){}, add(){}, replaceChildren(){}, removeAttribute(){}, setAttribute(){}, addEventListener(){} });
  let recovery;
  const bar = { ...node(), contains(){return false;}, querySelector(selector){
    if (!nodes.has(selector)) nodes.set(selector,node());
    return nodes.get(selector);
  }, append(el){if(el.textContent==='Guardar mi captura como copia')recovery=el;} };
  const documents = new Map();
  let sequence=0, loseResponse=true, payload={text:'Certificado capturado',photos:['foto'],signatures:{cliente:'firma'}};
  const context = vm.createContext({
    console, setTimeout, clearTimeout, confirm:()=>true,
    crypto:{randomUUID:()=>`test-${++sequence}`}, Option:function(){},
    location:{protocol:'https:'}, localStorage:{getItem(){return null;},setItem(){},removeItem(){}},
    document:{documentElement:{dataset:{}},head:{append(){}},body:{prepend(){}},
      createElement(tag){return tag==='section'?bar:node();},querySelectorAll(){return [];},addEventListener(){}},
    window:{BurakAdmin:{ready:Promise.resolve(),storageKey:k=>k},addEventListener(){}},
    fetch:async(url,options={})=>{
      let status=200, data;
      if(options.method==='POST'){
        const request=JSON.parse(options.body), previous=documents.get(request.id);
        if(previous && previous.revision!==request.revision){status=409;data={error:'Otro equipo guardó cambios'};}
        else {data={...request,revision:request.revision+1,folio:previous?.folio||`GS-CER-${documents.size+1}`};documents.set(data.id,data);
          if(loseResponse){loseResponse=false;throw new Error('Conexión interrumpida');}}
      }else if(url.includes('&id=')){data=documents.get(decodeURIComponent(url.split('&id=')[1]));}
      else data={documents:[...documents.values()]};
      return {ok:status===200,status,json:async()=>data};
    }
  });
  vm.runInContext(fs.readFileSync('format-documents.js','utf8'),context);
  const library=await context.window.BurakDocuments.mount({kind:'certificado',read:()=>payload,folio(){},title:()=> 'Cliente',write(){},new(){}});
  await assert.rejects(library.save(),/interrumpida/);
  assert.equal(documents.size,1,'First request committed despite lost response');
  await library.save();
  assert.equal(documents.size,1,'Retry recognizes identical payload without a duplicate');
  assert.equal(recovery.hidden,true);
  const original=[...documents.values()][0];
  original.revision++; original.payload={text:'Edición de otro usuario'};
  payload={text:'Mi trabajo conservado',photos:['foto'],signatures:{cliente:'firma'}};
  await assert.rejects(library.save(),/Otro equipo/);
  assert.equal(recovery.hidden,false,'Real conflict exposes recovery');
  assert.equal(original.payload.text,'Edición de otro usuario','Remote edit must not be overwritten');
  await recovery.onclick();
  assert.equal(documents.size,2);
  const copy=[...documents.values()][1];
  assert.deepEqual(copy.payload,payload,'Copy preserves fields, photos and signatures');
  assert.notEqual(copy.folio,original.folio);
  await library.save();
  assert.equal(documents.size,2,'Generating after recovery updates same copy');
  console.log('Document recovery passed: lost response, identical retry, protected concurrent edit, copy with photos/signatures and stable folio.');
})().catch(error=>{console.error(error);process.exitCode=1;});
