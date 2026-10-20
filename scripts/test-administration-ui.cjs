const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const child = spawn(process.env.BURAK_TEST_PYTHON || 'python', ['-u', 'scripts/admin_fixture_server.py'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let browser;
  try {
    const port = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('Fixture did not start')), 15000);
      child.on('error', reject);
      child.on('exit', code => reject(new Error('Fixture exited: ' + code)));
      child.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/^(\d+)\r?\n/);
        if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
      });
    });
    const base = `http://127.0.0.1:${port}`;
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const password = fs.readFileSync('app.js', 'utf8').match(/id: "admin"[^\n]+password: "([^"]+)"/)[1];
    await page.goto(base);
    await page.locator('[name=password]').fill(password);
    await page.locator('#loginForm button[type=submit]').click();
    await page.locator('#administrationSelect').waitFor();
    assert.equal(await page.locator('#administrationSelect').inputValue(), 'nueva');
    assert.match(await page.locator('.administration-banner').innerText(), /Nueva administración/);
    await page.locator('[data-module=servicios]').click();
    assert.ok((await page.locator('body').innerText()).includes('Cliente de prueba'));
    const read = async stage => {
      const response = await page.request.get(base + '/api/state', { headers: { 'X-Burak-Administracion': stage } });
      assert.equal(response.status(), 200); return response.json();
    };
    let current = await read('nueva'), old = await read('anterior');
    assert.equal(current.servicios.length, 1); assert.equal(old.servicios.length, 1);
    assert.equal(old.servicios[0].pagos[0].fecha, '2026-10-17');
    // Switching must retain the login and use the other data, not duplicate the menus.
    await page.locator('#administrationSelect').selectOption('anterior');
    await page.locator('.administration-old').first().waitFor();
    assert.equal(await page.locator('#loginForm').count(), 0);
    assert.equal(await page.locator('#administrationSelect').inputValue(), 'anterior');
    assert.equal(await page.locator('.sidebar').count(), 1);
    await page.locator('[data-module=servicios]').click();
    await page.locator('[data-edit=servicio]').first().click();
    await page.locator('[name=pagoImporte0]').fill('450');
    await page.locator('[name=pagoFecha0]').fill('2026-10-20');
    const saved = page.waitForResponse(r => r.url().endsWith('/api/record') && r.request().method() === 'POST');
    await page.locator('#entityForm button[type=submit]').click();
    assert.equal((await saved).status(), 200);
    old = await read('anterior'); current = await read('nueva');
    assert.equal(old.servicios[0].pagos[0].importe, 450);
    assert.equal(old.servicios[0].pagos[0].fecha, '2026-10-20');
    assert.equal(current.servicios[0].pagos?.length || 0, 0);
    await page.locator('#administrationSelect').selectOption('nueva');
    await page.locator('#administrationSelect').waitFor();
    await page.locator('[data-module=certificados]').click();
    const frame = page.frameLocator('iframe');
    await frame.locator('#imagenFirmaTecnico').waitFor();
    assert.match(await page.locator('iframe').getAttribute('src'), /administracion=nueva/);
    await frame.locator('.product-select option[value=p]').first().waitFor({ state: 'attached' });
    // An unscheduled field report must become visible without reloading the app.
    await frame.locator('[name=fecha]').fill('2026-10-20');
    await frame.locator('[name=hora]').fill('10:00');
    await frame.locator('[name=horaFin]').fill('11:00');
    await frame.locator('[name=tecnico]').selectOption({ label: 'VICTOR' });
    await frame.locator('#clienteNombre').fill('Servicio inesperado de prueba');
    await frame.locator('#clienteDomicilio').fill('Domicilio de prueba');
    await frame.locator('[name=tiempoReentrada]').fill('4 horas');
    await frame.locator('body').evaluate(() => { window.print = () => {}; window.jspdf = undefined; });
    const fieldSaved = page.waitForResponse(r => r.url().endsWith('/api/record') && r.request().method() === 'POST');
    await frame.locator('#generateReport').click();
    assert.equal((await fieldSaved).status(), 200);
    await frame.locator('#reportStatus').filter({ hasText: 'Servicio guardado' }).waitFor();
    current = await read('nueva');
    assert.equal(current.servicios.length, 2);
    assert.equal(current.servicios.find(s => s.cliente === 'Servicio inesperado de prueba').programacionId, '');
    await page.locator('[data-module=servicios]').click();
    await page.locator('td[data-label=Cliente]').filter({ hasText: 'Servicio inesperado de prueba' }).first().waitFor();
    assert.equal((await read('anterior')).servicios.length, 1);
    await page.locator('[data-module=dashboard]').click();
    fs.mkdirSync('tmp/admin-ui', { recursive: true });
    await page.screenshot({ path: path.resolve('tmp/admin-ui/desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#administrationSelect').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('#administrationSelect').isVisible());
    await page.screenshot({ path: path.resolve('tmp/admin-ui/mobile.png') });
    assert.deepEqual(errors, []);
    console.log('Administration UI passed: login, default stage, switching without login, old collection dates, isolated new data, certificate context and mobile selector.');
  } finally {
    if (browser) await browser.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

