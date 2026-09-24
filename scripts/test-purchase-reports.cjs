const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({ location: { protocol: 'file:' }, console });
vm.runInContext(fs.readFileSync('app.js', 'utf8').replace(/init\(\);\s*$/, ''), context);
const run = (code) => vm.runInContext(code, context);
run(`state = { productos: [{id:'p',producto:'Gel <especial>',unidadCompra:'tubo'}], compras: [
  {fecha:'2024-02-01',productoId:'p',cantidad:2,costoUnitario:10,ciudad:'CDMX',proveedor:'Proveedor & Cia'},
  {fecha:'2024-02-29',productoId:'p',cantidad:3,costoUnitario:10,ciudad:'CDMX'},
  {fecha:'2024-03-01',productoId:'p',cantidad:1,costoUnitario:100,ciudad:'CDMX'},
  {fecha:'2024-02-15',productoId:'p',cantidad:1,costoUnitario:999,ciudad:'Yucatan'},
  {productoId:'p',cantidad:1,costoUnitario:7,ciudad:'CDMX'}], equipos: [
  {fecha:'2024-02-29',equipo:'Bomba',unidad:3,costo:100,ciudad:'CDMX',residual:200},
  {fecha:'2024-03-01',equipo:'Bomba',unidad:2,costo:200,ciudad:'CDMX'},
  {fecha:'2024-02-01',equipo:'Otro',costo:500,ciudad:'Yucatan'}] };
  operacionFilter='CDMX'; currentUser={id:'admin'};
  var original=JSON.stringify(state); var range=executiveReportRange('month','2024-02');`);
assert.equal(run(`acquisitionReportData('compras',range).total`), 50);
assert.equal(run(`acquisitionReportData('compras',range).rows.length`), 2);
assert.equal(run(`acquisitionReportData('compras',range,'próveedor').total`), 20);
assert.equal(run(`acquisitionReportData('compras',null).total`), 157);
assert.equal(run(`acquisitionReportData('compras',null).monthly.find(r=>r.mes==='Sin fecha').total`), 7);
assert.equal(run(`acquisitionReportData('equipos',range).total`), 300);
assert.equal(run(`acquisitionReportData('equipos',executiveReportRange('months','2024-02','2024-03')).monthly.length`), 2);
assert.equal(run(`acquisitionReportData('equipos',range,'inexistente').total`), 0);
assert.equal(run(`acquisitionReportData('equipos',executiveReportRange('dates','2024-02-29','2024-02-29')).rows.length`), 1);
assert.equal(run(`JSON.stringify(state) === original`), true);
run(`operacionFilter='Todas'`);
assert.equal(run(`acquisitionReportData('compras',range).total`), 1049);
assert.equal(run(`acquisitionReportData('equipos',range).total`), 800);
run(`operacionFilter='CDMX'`);
let html = '';
context.window = { open: () => ({ document: { open() {}, write(text) { html = text; }, close() {} } }) };
run(`exportAcquisitionReport('compras',range)`);
assert.match(html, /Gel &lt;especial&gt;/);
assert.match(html, /Proveedor &amp; Cia/);
assert.match(html, /2024-02-01 al 2024-02-29/);
assert.doesNotMatch(html, /NaN|undefined|2024-03-01|Yucatan/);
run(`exportAcquisitionReport('equipos',range)`);
assert.match(html, /sin descontar depreciacion/);
assert.match(html, /Bomba/);
run(`exportAcquisitionReport('equipos',range,'inexistente')`);
assert.match(html, /Sin compras para este periodo/);
context.window.open = () => null;
assert.throws(() => run(`exportAcquisitionReport('equipos',range)`), /bloqueo/);
run(`currentUser={id:'tecnico'}`);
assert.throws(() => run(`exportAcquisitionReport('equipos',range)`), /administrador/);
assert.match(run(`renderAcquisitionReportModal('equipos')`), /data-acquisition="equipos"/);
assert.match(run(`renderAcquisitionReportModal('compras')`), /Reporte de compras de productos/);
// Both report forms share date controls; submitting purchases must dispatch to its own exporter.
const handlers = {};
const elements = { mode: {value:'month',addEventListener() {}}, start:{value:'2024-02'}, search:{value:'Bomba'} };
const form = { elements, dataset:{acquisition:'equipos'}, addEventListener(event, handler) {handlers[event]=handler;} };
const dates = {innerHTML:''}; const error = {textContent:''};
context.document = {querySelector(selector) {return ({'#executiveReportForm':form,'#reportDates':dates,'#reportError':error})[selector];}};
run(`var dispatch; exportAcquisitionReport=(...args)=>{dispatch=args}; bindExecutiveReportForm();`);
handlers.submit({preventDefault(){}});
assert.equal(run('dispatch[0]'), 'equipos');
assert.equal(run('dispatch[1].end'), '2024-02-29');
assert.equal(run('dispatch[2]'), 'Bomba');
elements.mode.value='dates'; elements.start.value='2024-03-02'; elements.end={value:'2024-03-01'};
handlers.submit({preventDefault(){}});
assert.match(error.textContent, /fecha inicial/);
console.log('Purchase reports passed: periods, operation, search, totals, equipment quantities, undated records, empty results, non-mutation, HTML escaping, permissions and form submission.');
