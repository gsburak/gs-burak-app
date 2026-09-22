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
// Exercise the mobile navigation without replacing the application document.
const elements = [];
const listeners = new Map();
let restoredFocus = false;
const trigger = { isConnected: true, focus() { restoredFocus = true; } };
context.document = {
  activeElement: trigger,
  body: { style: { overflow: 'auto' }, appendChild(element) { elements.push(element); } },
  getElementById(id) { return elements.find(element => element.id === id && !element.removed); },
  createElement(tag) {
    return {
      tag, style: {}, children: [], events: {},
      setAttribute() {}, appendChild(child) { this.children.push(child); },
      addEventListener(type, callback) { this.events[type] = callback; },
      removeEventListener(type) { delete this.events[type]; },
      focus() { context.document.activeElement = this; }, remove() { this.removed = true; },
    };
  },
};
context.window.matchMedia = () => ({ matches: true });
context.window.open = () => { throw new Error('Mobile must not open a new window'); };
context.window.addEventListener = (type, callback) => listeners.set(type, callback);
context.window.removeEventListener = type => listeners.delete(type);
const initialHistoryState = { module: 'programacion' };
context.window.history = {
  state: initialHistoryState,
  pushState(state) { this.state = state; },
  back() { this.state = initialHistoryState; listeners.get('popstate')?.(); },
};
const mobileState = run('JSON.stringify(state)');
run("abrirOrdenServicio('p1')");
let preview = context.document.getElementById('orden-servicio-preview');
assert.ok(preview);
assert.ok(preview.children[1].srcdoc.includes('OS-p1'));
assert.ok(preview.children[1].srcdoc.includes('window.print()'));
assert.equal(context.document.body.style.overflow, 'hidden');
run("abrirOrdenServicio('p1')");
assert.equal(elements.length, 1, 'Do not stack duplicate previews or history entries');
preview.children[0].children[0].events.click();
assert.equal(context.document.getElementById('orden-servicio-preview'), undefined);
assert.equal(context.document.body.style.overflow, 'auto');
assert.equal(context.window.history.state, initialHistoryState);
assert.equal(listeners.size, 0);
assert.ok(restoredFocus);
run("abrirOrdenServicio('p1')");
context.window.history.back();
assert.equal(context.document.getElementById('orden-servicio-preview'), undefined, 'Browser Back closes the order');
assert.equal(run('JSON.stringify(state)'), mobileState, 'Mobile navigation preserves all records');
console.log('Service orders: desktop preview, mobile return button, browser Back, printing, data and escaping passed.');

// Planned collection instructions must stay separate from actual payments.
for (const method of ['Efectivo', 'Transferencia']) {
  const planned = run(`normalize('programacion', {montoACobrar:'1250.50', formaPagoPrevista:'${method}'})`);
  assert.equal(planned.montoACobrar, 1250.50);
  assert.equal(planned.formaPagoPrevista, method);
  assert.equal(planned.cobrado, undefined);
  assert.equal(planned.pagos, undefined);
  const order = run(`ordenServicioHtml({id:'cobro', montoACobrar:1250.50, formaPagoPrevista:'${method}'})`);
  assert.ok(order.includes('1,250.50'));
  assert.ok(order.includes(method === 'Efectivo' ? 'Efectivo al tecnico' : 'Transferencia'));
}
assert.equal(run(`normalize('programacion', {montoACobrar:''}).montoACobrar`), null);
assert.equal(run(`montoProgramacionTexto({})`), 'Sin especificar');
assert.equal(run(`formaPagoProgramacionTexto({})`), 'Por confirmar');
assert.ok(run(`montoProgramacionTexto({montoACobrar:0})`).includes('0.00'));
console.log('Programacion: collection amount, methods, legacy records and zero amount passed.');
