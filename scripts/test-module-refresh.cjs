const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app.js', 'utf8');
const start = source.indexOf('  document.querySelectorAll("[data-module]")');
const end = source.indexOf('  document.querySelectorAll("[data-programar-cliente]")', start);

async function test(loadFails) {
  let click;
  const button = { dataset: { module: 'clientes' }, addEventListener: (_, handler) => { click = handler; } };
  const alerts = [];
  const context = vm.createContext({
    document: { querySelectorAll: () => [button] },
    window: { BurakAdmin: { failed: true } },
    SERVER_MODE: true,
    state: { stale: true }, activeModule: 'programacion',
    remoteSaveQueue: Promise.resolve().then(() => { throw new Error('Otra ventana actualizó los datos'); }),
    loadInitialState: async () => { if (loadFails) throw new Error('Sin conexión'); return { fresh: true }; },
    render: () => {}, alert: message => alerts.push(message)
  });
  vm.runInContext(source.slice(start, end), context);
  await click();
  if (loadFails) {
    assert.equal(context.state.stale, true);
    assert.equal(context.window.BurakAdmin.failed, true);
    assert.equal(context.activeModule, 'programacion');
    assert.equal(button.disabled, false);
    assert.match(alerts[0], /Sin conexión/);
  } else {
    assert.equal(context.state.fresh, true);
    assert.equal(context.window.BurakAdmin.failed, false);
    assert.equal(context.activeModule, 'clientes');
    await context.remoteSaveQueue;
    assert.match(alerts[0], /no se aplicó/);
  }
}
(async () => {
  await test(false);
  await test(true);
  console.log('Module refresh: rejected saves recover from fresh state; failed reads keep writes blocked.');
})().catch(error => { console.error(error); process.exitCode = 1; });
