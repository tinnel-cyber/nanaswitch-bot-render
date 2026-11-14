const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmpDir = path.join(require('os').tmpdir(), 'chrome_proof_auth_' + Date.now());

async function main() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9245',
    '--user-data-dir=' + tmpDir,
    '--window-size=1280,850',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'https://nanasore.web.app/'
  ]);

  let targets = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await new Promise(r => setTimeout(r, 1000));
      targets = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9245/json', (res) => {
          let d = '';
          res.on('data', chunk => d += chunk);
          res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
      });
      if (targets && targets.length > 0) break;
    } catch (_) {}
  }
  if (!targets) throw new Error('Could not connect to Chrome CDP after 10 attempts');

  const page = targets.find(t => t.type === 'page' && t.url.includes('pos-app'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      callbacks.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) cb.reject(msg.error);
      else cb.resolve(msg.result);
    }
  });

  await new Promise(r => ws.on('open', r));
  await send('Runtime.enable');
  await send('Page.enable');

  console.log('Injecting full super-admin unlock in localStorage...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('nana_is_superadmin', 'true');
      localStorage.setItem('nana_superadmin_unlocked', 'true');
      localStorage.setItem('nana_registered_role', 'admin');
      localStorage.setItem('nana_store_auth_user', JSON.stringify({
        id: 'rgLiIgFUFjQLfjzPlmSY9jy6mBE3',
        uid: 'rgLiIgFUFjQLfjzPlmSY9jy6mBE3',
        email: 'pousbila04@gmail.com',
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        name: 'Pousbila Superadmin',
        storeId: 'store-pousbila'
      }));
    `
  });

  // 1. NAVIGATE TO HUB BUILDER
  console.log('1. Navigating to /admin/hub-builder ...');
  await send('Page.navigate', { url: 'https://nanasore.web.app/admin/hub-builder' });
  await new Promise(r => setTimeout(r, 6000));

  let scr = await send('Page.captureScreenshot', { format: 'png' });
  let p1 = path.join(ARTIFACT_DIR, 'capture_1_hubbuilder_canvas.png');
  fs.writeFileSync(p1, Buffer.from(scr.data, 'base64'));
  console.log('Saved Canvas:', p1);

  // 2. OPEN OVERLAY IN HUB BUILDER
  console.log('2. Clicking "Tester Overlay Plein Écran"...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Tester Overlay') || b.innerText.includes('Plein Écran'));
        if (btn) btn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p2 = path.join(ARTIFACT_DIR, 'capture_2_hubbuilder_overlay_initial.png');
  fs.writeFileSync(p2, Buffer.from(scr.data, 'base64'));
  console.log('Saved HubBuilder Overlay Initial:', p2);

  // 3. TYPE "caisse" IN HUB BUILDER OVERLAY
  console.log('3. Typing "caisse" in HubBuilder overlay...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const input = document.querySelector('input[placeholder*="Hub Central"]');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'caisse');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p3 = path.join(ARTIFACT_DIR, 'capture_3_hubbuilder_overlay_caisse.png');
  fs.writeFileSync(p3, Buffer.from(scr.data, 'base64'));
  console.log('Saved HubBuilder Overlay Caisse:', p3);

  // 4. NAVIGATE TO DASHBOARD
  console.log('4. Navigating to /dashboard ...');
  await send('Page.navigate', { url: 'https://nanasore.web.app/?view=dashboard' });
  await new Promise(r => setTimeout(r, 6000));

  // 5. OPEN OMNIBAR IN DASHBOARD VIA nanasore_open_omnibar or click
  console.log('5. Opening Omnibar in Dashboard...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        window.dispatchEvent(new Event('nanasore_open_omnibar'));
        const input = document.querySelector('input[placeholder*="module"], input[placeholder*="Rechercher"]');
        if (input) input.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p5 = path.join(ARTIFACT_DIR, 'capture_5_omnibar_open.png');
  fs.writeFileSync(p5, Buffer.from(scr.data, 'base64'));
  console.log('Saved Dashboard Omnibar Open:', p5);

  // 6. TYPE "caisse" IN OMNIBAR DIALOG
  console.log('6. Typing "caisse" in Dashboard Omnibar dialog...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const input = dialog.querySelector('input[type="text"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, 'caisse');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p6 = path.join(ARTIFACT_DIR, 'capture_6_omnibar_search_caisse.png');
  fs.writeFileSync(p6, Buffer.from(scr.data, 'base64'));
  console.log('Saved Dashboard Omnibar Caisse:', p6);

  ws.close();
  chrome.kill();
  console.log('DONE!');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
