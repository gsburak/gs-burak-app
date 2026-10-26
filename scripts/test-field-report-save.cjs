const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('netlify-sites/certificado/app.js', 'utf8');
const save = source.slice(source.indexOf('async function saveReporteComoServicio('), source.indexOf('function nombreArchivoPdf('));

(async () => {
  const calls = [];
  const context = vm.createContext({
    window: { BurakAdmin: { stage: 'nueva' } },
    buildServicioPendiente: data => ({ id: 'report-a', ...data }),
    fetch: async () => { calls.push('refresh'); return { ok: true, json: async () => ({ revisionAdministracion: 10 }) }; },
    saveSupabaseRecord: async (table, record) => calls.push({ table, record }),
    programacionesCatalogo: [{ id: 'a', notas: 'Conservar' }]
  });
  vm.runInContext(save, context);
  await context.saveReporteComoServicio({ programacionId: 'a', clienteId: 'c' });
  assert.equal(calls[0], 'refresh');
  assert.equal(calls.length, 2, 'Stage uses one atomic write after refreshing');
  assert.equal(calls[1].table, 'app_servicios');
  calls.length = 0;
  context.window.BurakAdmin.stage = null;
  await context.saveReporteComoServicio({ programacionId: 'a' });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].table, 'app_programaciones');
  assert.equal(calls[1].record.estatus, 'Realizado');
  assert.equal(calls[1].record.notas, 'Conservar');
  calls.length = 0;
  context.window.BurakAdmin.stage = 'nueva';
  context.fetch = async () => { throw new Error('Datos cambiados'); };
  await assert.rejects(context.saveReporteComoServicio({ programacionId: 'a' }), /Datos cambiados/);
  assert.equal(calls.length, 0);
  console.log('Field report: revision refresh, atomic stage write, legacy completion and failure handling passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
