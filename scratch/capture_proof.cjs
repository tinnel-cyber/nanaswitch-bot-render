const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmpDir = path.join(require('os').tmpdir(), 'chrome_proof_' + Date.now());

async function main() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9235',
    '--user-data-dir=' + tmpDir,
    '--window-size=1280,850',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'https://nanasore.web.app/'
  ]);

  await new Promise(r => setTimeout(r, 3000));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9235/json', (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });

  const page = targets.find(t => t.type === 'page' && t.url.includes('pos-app'));
  console.log('Connecting to page:', page.url);
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
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      if (text.includes('Omnibar') || text.includes('RTDB') || text.includes('Service Worker')) {
        console.log('[BROWSER]', text);
      }
    }
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

  console.log('Setting super-admin session in browser...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('nana_store_auth_user', JSON.stringify({
        id: 'usr-admin-pousbila',
        email: 'pousbila04@gmail.com',
        role: 'SUPER_ADMIN',
        name: 'Pousbila Superadmin',
        storeId: 'store-pousbila'
      }));
      localStorage.setItem('nana_admin_authenticated', 'true');
    `
  });

  // 1. NAVIGATE TO HUB BUILDER
  console.log('1. Navigating to /admin/hub-builder ...');
  await send('Page.navigate', { url: 'https://nanasore.web.app/admin/hub-builder' });
  await new Promise(r => setTimeout(r, 6000));

  // Take screenshot of HubBuilder canvas
  let scr = await send('Page.captureScreenshot', { format: 'png' });
  let p1 = path.join(ARTIFACT_DIR, 'capture_1_hubbuilder_canvas.png');
  fs.writeFileSync(p1, Buffer.from(scr.data, 'base64'));
  console.log('Saved:', p1);

  // 2. OPEN PREVIEW OVERLAY IN HUB BUILDER
  console.log('2. Opening HubBuilder Preview Overlay...');
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
  console.log('Saved:', p2);

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
  console.log('Saved:', p3);

  // 4. NAVIGATE TO DASHBOARD
  console.log('4. Navigating to /dashboard ...');
  await send('Page.navigate', { url: 'https://nanasore.web.app/?view=dashboard' });
  await new Promise(r => setTimeout(r, 6000));

  // Take screenshot of Dashboard
  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p4 = path.join(ARTIFACT_DIR, 'capture_4_dashboard.png');
  fs.writeFileSync(p4, Buffer.from(scr.data, 'base64'));
  console.log('Saved:', p4);

  // 5. CLICK OMNIBAR IN DASHBOARD
  console.log('5. Clicking Central Omnibar in dashboard...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const input = document.querySelector('input[placeholder*="module"], input[placeholder*="Rechercher"]');
        if (input) {
          input.focus();
          input.click();
        } else {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p5 = path.join(ARTIFACT_DIR, 'capture_5_omnibar_open.png');
  fs.writeFileSync(p5, Buffer.from(scr.data, 'base64'));
  console.log('Saved:', p5);

  // 6. TYPE "caisse" IN OMNIBAR DIALOG
  console.log('6. Typing "caisse" in Omnibar overlay...');
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
  console.log('Saved:', p6);

  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
  ws.close();
  chrome.kill();
}

main().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
