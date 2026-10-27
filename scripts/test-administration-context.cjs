const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

async function tab(stage) {
  const calls = [];
  const location = new URL(`https://example.com/?administracion=${stage}`);
  const window = { fetch: async (input, options = {}) => {
    const path = new URL(input, location).pathname;
    calls.push({ path, options });
    if (path === '/api/administraciones') return Response.json({ activa: true });
    if (path === '/api/fail') return Response.json({ error: 'Datos cambiados' }, { status: 409 });
    return Response.json({ revisionAdministracion: 7 });
  } };
  const context = vm.createContext({ window, location, URL, URLSearchParams, Headers, Response, document: { addEventListener() {} } });
  vm.runInContext(fs.readFileSync('administration-context.js', 'utf8'), context);
  await window.BurakAdmin.ready;
  return { window, calls };
}

(async () => {
  const old = await tab('anterior'), current = await tab('nueva');
  await old.window.fetch('/api/state'); await current.window.fetch('/api/state');
  assert.equal(old.calls.at(-1).options.headers.get('X-Burak-Administracion'), 'anterior');
  assert.equal(current.calls.at(-1).options.headers.get('X-Burak-Administracion'), 'nueva');
  assert.notEqual(old.window.BurakAdmin.storageKey('state'), current.window.BurakAdmin.storageKey('state'));
  assert.match(old.window.BurakAdmin.url('netlify-sites/certificado/index.html'), /administracion=anterior/);
  await current.window.fetch('/api/record', { method: 'POST', body: '{}' });
  assert.equal(current.calls.at(-1).options.headers.get('X-Burak-Revision'), '7');
  await assert.rejects(current.window.fetch('/api/restore', { method: 'POST', body: JSON.stringify({ administracion: { id: 'anterior' } }) }), /otra administración/);
  await assert.rejects(old.window.fetch('/api/fail'), /Datos cambiados/);
  await assert.rejects(old.window.fetch('/api/record', { method: 'POST' }), /Recarga/);
  await old.window.fetch('/api/state');
  assert.equal(old.calls.at(-1).path, '/api/state', 'A rejected write does not block navigation reads');
  assert.equal(old.window.BurakAdmin.failed, true, 'Reading alone must not unlock stale writes');
  await assert.rejects(old.window.fetch('/api/record', { method: 'POST' }), /Recarga/);
  await current.window.fetch('/api/state');
  assert.equal(current.window.BurakAdmin.failed, false, 'A stale old tab does not affect a new tab');
  console.log('Administration browser context: separate tabs, local keys, document URLs, revisions and stale-write rejection passed.');
})();
