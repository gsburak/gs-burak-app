const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app.js', 'utf8');
const helper = source.slice(source.indexOf('let moduleRefreshPromise'), source.indexOf('function uid()'));
const start = source.indexOf('  document.querySelectorAll("[data-module]")');
const handler = source.slice(start, source.indexOf('  document.querySelectorAll("[data-programar-cliente]")', start));

async function scenario(mode) {
  let click, finish, requests = 0, renders = 0;
  const alerts = [];
  const button = { dataset: { module: 'clientes' }, addEventListener: (_, fn) => { click = fn; } };
  const response = new Promise(resolve => { finish = resolve; });
  const context = vm.createContext({
    document: { activeElement: null, querySelectorAll: () => [button] },
    window: { BurakAdmin: { failed: mode === 'recovery', revision: 1 } },
    SERVER_MODE: true, modal: null,
    state: { stale: true }, activeModule: 'programacion', remoteSaveQueue: Promise.resolve(),
    fetch: async (_, options) => { requests++; assert.equal(options.burakBackgroundRead, true); return response; },
    migrateState: data => data,
    render: () => { renders++; }, alert: message => alerts.push(message)
  });
  vm.runInContext(helper + handler, context);
  click();
  assert.equal(context.activeModule, 'clientes', 'Navigation renders before network completes');
  assert.equal(renders, 1);
  click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(requests, 1, 'Rapid navigation shares one request');
  if (mode === 'edit') context.modal = { type: 'cliente' };
  if (mode === 'save') context.remoteSaveQueue = Promise.resolve();
  if (mode === 'focus') context.document.activeElement = { matches: () => true };
  finish({ ok: mode !== 'failure', json: async () => ({ fresh: true, revisionAdministracion: 9 }) });
  await vm.runInContext('moduleRefreshPromise', context);
  if (['edit', 'save', 'focus', 'failure'].includes(mode)) {
    assert.equal(context.state.stale, true);
    assert.equal(context.window.BurakAdmin.revision, 1);
  } else {
    assert.equal(context.state.fresh, true);
    assert.equal(context.window.BurakAdmin.revision, 9);
    assert.equal(context.window.BurakAdmin.failed, false);
    click();
    await Promise.resolve();
    assert.equal(requests, 1, 'Fresh data avoids another download for 15 seconds');
  }
  if (mode === 'failure') assert.match(alerts[0], /información anterior/);
  if (mode === 'recovery') assert.match(alerts[0], /no se aplicó/);
}
(async () => {
  for (const mode of ['normal', 'edit', 'save', 'focus', 'failure', 'recovery']) await scenario(mode);
  console.log('Module refresh passed: immediate navigation, shared request, cache, protected edits and revisions, recovery and network failure.');
})().catch(error => { console.error(error); process.exitCode = 1; });
