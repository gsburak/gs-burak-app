const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({ location: { protocol: 'file:' }, console });
vm.runInContext(fs.readFileSync('app.js', 'utf8').replace(/init\(\);\s*$/, ''), context);
const run = (code) => vm.runInContext(code, context);
assert.equal(run(`executiveReportRange('month','2024-02').end`), '2024-02-29');
assert.equal(run(`executiveReportRange('months','2025-12','2026-02').start`), '2025-12-01');
assert.throws(() => run(`executiveReportRange('dates','2026-02-30','2026-03-01')`));
assert.throws(() => run(`executiveReportRange('months','2026-03','2026-02')`));
assert.equal(run(`executiveReportRange('all')`), null);
run(`state = { productos: [], clientes: [], servicios: [
  {id:'old',fecha:'2025-12-15',ciudad:'Yucatan',subtotal:1000,productos:[],pagos:[{fecha:'2026-01-01',importe:200},{fecha:'2026-02-01',importe:800}]},
  {id:'new',fecha:'2026-01-31',ciudad:'Yucatan',subtotal:500,productos:[],pagos:[{fecha:'2026-01-31',importe:100},{fecha:'2026-02-02',importe:400}]},
  {id:'other',fecha:'2026-01-10',ciudad:'CDMX',subtotal:900,productos:[],pagos:[{fecha:'2026-01-10',importe:900}]}
], gastos: [{fecha:'2026-01-01',monto:50,ciudad:'Yucatan',pagadoPor:'VICTOR'}, {fecha:'2026-02-01',monto:100,ciudad:'Yucatan'}],
compras: [{fecha:'2026-01-31',cantidad:2,costoUnitario:10,ciudad:'Yucatan',pagadoPor:'VICTOR'}],
equipos: [{fecha:'2025-01-01',costo:365.25,vida:1,ciudad:'Yucatan'}, {fecha:'2026-01-16',costo:365.25,vida:1,ciudad:'Yucatan',pagadoPor:'VICTOR'}] };
operacionFilter = 'Yucatan';
const original = JSON.stringify(state);
const report = executivePeriodData(executiveReportRange('month','2026-01'));`);
assert.equal(run('report.m.facturado'), 500);
assert.equal(run('report.m.cobrado'), 300);
assert.equal(run('report.m.porCobrar'), 1200);
assert.equal(run('report.monthly[0].porCobrar'), 400);
assert.equal(run('report.monthly[0].gastos'), 50);
assert.equal(run('report.monthly[0].comprasInventario'), 20);
assert.equal(run('report.source.equipos.length'), 1);
assert.equal(run('report.cities.length'), 1);
assert.equal(run('report.payments.reduce((n,r)=>n+r.cobrado,0)'), 300);
assert.equal(run('inversionYGastoDetallePorPagador(report.source)[0].total'), 435.25);
assert.equal(run('JSON.stringify(state) === original'), true);
assert.equal(run(`executivePeriodData({start:'2026-01-31',end:'2026-01-31'}).m.cobrado`), 100);
assert.equal(run(`executivePeriodData({start:'2025-12-01',end:'2026-02-28'}).monthly.length`), 3);
assert.equal(run(`executivePeriodData({start:'2028-01-01',end:'2028-01-31'}).m.utilidad`), 0);
let html = '';
context.window = { open: () => ({ document: { open() {}, write(text) { html = text; }, close() {} } }) };
context.alert = (text) => { throw new Error(text); };
run(`currentUser = {id:'admin'}; exportDashboardExecutiveReport({start:'2026-01-01',end:'2026-01-31'});`);
assert.match(html, /2026-01-01 al 2026-01-31/);
assert.match(html, /Por cobrar al cierre/);
assert.doesNotMatch(html, /NaN|undefined/);
run('exportDashboardExecutiveReport();');
assert.match(html, /Todo el historial/);
assert.doesNotMatch(html, /NaN|undefined/);
console.log('Report period checks passed: dates, collections, closing balance, operation, investments, depreciation expiry, non-mutation and HTML export.');
