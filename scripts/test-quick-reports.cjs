const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({ location: { protocol: 'file:' }, console });
vm.runInContext(fs.readFileSync('app.js', 'utf8').replace(/init\(\);\s*$/, ''), context);
const run = (code) => vm.runInContext(code, context);
run(`currentUser={id:'admin'}; state={productos:[{id:'p',producto:'Gel <especial>'}],gastos:[
  {fecha:'2026-09-01',monto:100,pagadoPor:'VICTOR',operacion:'CDMX',descripcion:'Renta'},
  {fecha:'2026-09-30',monto:200,pagadoPor:'SISPROVISA',operacion:'Yucatan'},
  {fecha:'2026-10-01',monto:999,pagadoPor:'VICTOR',operacion:'CDMX'},
  {monto:999,pagadoPor:'VICTOR'},
  {fecha:'2026-09-15',monto:25,operacion:'CDMX'}],
  compras:[{fecha:'2026-09-15',productoId:'p',cantidad:2,costoUnitario:50,pagadoPor:'VICTOR',operacion:'CDMX'}],
  equipos:[{fecha:'2026-09-20',equipo:'Bomba',unidad:3,costo:100,residual:200,pagadoPor:'SISPROVISA',operacion:'CDMX'}]};
  var before=JSON.stringify(state);`);
assert.equal(run(`reporteRapidoData('2026-09','gastos','Todas','').total`),325);
assert.equal(run(`reporteRapidoData('2026-09','todo','Todas','').total`),725);
assert.equal(run(`reporteRapidoData('2026-09','todo','CDMX','').total`),525);
assert.equal(run(`reporteRapidoData('2026-09','todo','Todas','VICTOR').total`),200);
assert.equal(run(`reporteRapidoData('2026-09','equipos','Todas','').total`),300);
assert.equal(run(`reporteRapidoData('2026-09','compras','Todas','').total`),100);
assert.equal(run(`reporteRapidoData('2026-08','todo','Todas','').rows.length`),0);
assert.equal(run(`JSON.stringify(state)===before`),true);
run(`reporteRapidoMes='2026-09'; reporteRapidoTipo='todo';`);
const html=run(`renderReportesRapidos()`);
assert.match(html,/Gel &lt;especial&gt;/);
assert.match(html,/SISPROVISA/);
assert.match(html,/VICTOR/);
assert.match(html,/Sin dato/);
assert.ok(html.includes(run(`money(725)`)));
const handlers={};
context.document={getElementById(id){return {addEventListener(event,fn){handlers[id]=fn;}};}};
run(`var csv; downloadCsv=(...args)=>{csv=args}; render=()=>{}; bindReportesRapidos();`);
handlers.exportReporteRapido();
assert.equal(run(`csv[2].at(-1).at(-1)`),725);
handlers.reporteRapidoPagador({target:{value:'VICTOR'}});
assert.equal(run(`reporteRapidoData().total`),200);
handlers.exportReporteRapido();
assert.equal(run(`csv[2].at(-1).at(-1)`),200);
run(`currentUser={id:'tecnico'}`);
assert.throws(()=>run(`reporteRapidoData()`),/administrador/);
console.log('Quick reports passed: month boundaries, operation, payer, quantities, missing dates, escaping, empty results, CSV and admin access.');
