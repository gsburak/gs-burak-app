const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let html = '';
const context = vm.createContext({
  location: { protocol: 'file:', href: 'https://example.com/' }, URL, console,
  window: { open: () => ({ document: { open() {}, write(value) { html = value; }, close() {} } }) },
  alert: (message) => { throw new Error(message); },
});
vm.runInContext(fs.readFileSync('app.js', 'utf8').replace(/init\(\);\s*$/, ''), context);
const run = (source) => vm.runInContext(source, context);
run(`state = { clientes: [{id:'c1',nombre:'Cliente <prueba>',telefono:'9991234567',contacto:'Ana',direccion:'Dirección general'}],
  programaciones: [{id:'p1',clienteId:'c1',fecha:'2026-09-12',hora:'09:00',tecnico:'SANTOS',tecnicoAdicional:'FREDY ALEXANDER',direccion:'Sucursal correcta',tipo:'Fumigación',notas:'Primera línea\\n<script>alert(1)</script>'}],
  servicios: [{id:'venta-existente',cobrado:250}], productos: [{id:'producto',stock:10}] };
  const originalState = JSON.stringify(state);
  abrirOrdenServicio('p1');`);
assert.equal(run('JSON.stringify(state) === originalState'), true, 'Opening an order must not change any records');
for (const value of ['OS-p1', '12/09/2026', '09:00', 'SANTOS', 'FREDY ALEXANDER', 'Sucursal correcta', '9991234567', 'Cliente &lt;prueba&gt;', '&lt;script&gt;']) assert.ok(html.includes(value), value);
assert.ok(!html.includes('Dirección general'));
assert.ok(!html.includes('<script>'));
run(`state.programaciones[0].hora = '11:30'; abrirOrdenServicio('p1');`);
assert.ok(html.includes('11:30'));
run(`state.programaciones[0].clienteId = 'missing'; state.programaciones[0].notas = ''; abrirOrdenServicio('p1');`);
assert.ok(html.includes('Sin comentarios adicionales.'));
context.window.open = () => null;
assert.throws(() => run(`abrirOrdenServicio('p1')`), /ventanas emergentes/);
console.log('Service orders: data, escaping, current values, missing fields and no record mutations passed.');
