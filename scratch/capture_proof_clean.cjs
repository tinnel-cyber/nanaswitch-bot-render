const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmpDir = path.join(require('os').tmpdir(), 'chrome_proof_clean_' + Date.now());

async function main() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9258',
    '--user-data-dir=' + tmpDir,
    '--window-size=1280,850',
    '--disable-web-security',
    '--no-first-run',
    '--no-default-browser-check',
    'https://nanasore.web.app/'
  ]);

  let targets = null;
  for (let attempt = 0; attempt < 25; attempt++) {
    try {
      await new Promise(r => setTimeout(r, 1000));
      targets = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9258/json', res => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => {
            try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
          });
        });
        req.on('error', reject);
      });
      if (targets && targets.length > 0) break;
    } catch (_) {}
  }

  const page = targets.find(t => t.type === 'page');
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

  // Inject SuperAdmin & bypass welcome before any page loads
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      try {
        localStorage.setItem('nana_is_superadmin', 'true');
        localStorage.setItem('nana_superadmin_unlocked', 'true');
        localStorage.setItem('nana_registered_role', 'admin');
        localStorage.setItem('nana_kyc_status', 'verified');
        localStorage.setItem('nana_store_approval_status', 'APPROVED');
        localStorage.setItem('nana_user_plan', 'elite');
        localStorage.setItem('nana_skip_welcome', 'true');
        localStorage.setItem('nana_store_auth_user', JSON.stringify({
          id: 'rgLiIgFUFjQLfjzPlmSY9jy6mBE3',
          uid: 'rgLiIgFUFjQLfjzPlmSY9jy6mBE3',
          email: 'pousbila04@gmail.com',
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
          name: 'Pousbila Superadmin',
          storeId: 'store-pousbila'
        }));
      } catch(e) {}
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
  await new Promise(r => setTimeout(r, 5000));

  // If welcome screen is visible, click explore button to dismiss it
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const exploreBtn = btns.find(b => b.innerText.includes('Créer mon Business') || b.innerText.includes('Découvrir les Univers') || b.innerText.includes('Tableau de Bord'));
        if (exploreBtn) exploreBtn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  // If PIN keypad is visible, type 1 2 3 4 to unlock with small delay between digits
  for (const digit of ['1', '2', '3', '4']) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const b = btns.find(btn => btn.innerText.trim() === '${digit}');
          if (b) b.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 2500));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p4 = path.join(ARTIFACT_DIR, 'capture_4_dashboard.png');
  fs.writeFileSync(p4, Buffer.from(scr.data, 'base64'));
  console.log('Saved Dashboard:', p4);

  // 5. OPEN OMNIBAR IN DASHBOARD
  console.log('5. Opening Omnibar in Dashboard...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.getElementById('btn-header-open-hub-omnibar');
        if (btn) btn.click();
        window.dispatchEvent(new Event('nanasore_open_omnibar'));
        const searchBox = document.querySelector('[role="search"]');
        if (searchBox) searchBox.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2500));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p5 = path.join(ARTIFACT_DIR, 'capture_5_omnibar_open.png');
  fs.writeFileSync(p5, Buffer.from(scr.data, 'base64'));
  console.log('Saved Dashboard Omnibar Open:', p5);

  // 6. TYPE "caisse" IN DASHBOARD OMNIBAR DIALOG
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

  // 7. TYPE "whatsapp" IN DASHBOARD OMNIBAR DIALOG
  console.log('7. Typing "whatsapp" in Dashboard Omnibar dialog...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const input = dialog.querySelector('input[type="text"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, 'whatsapp');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p7 = path.join(ARTIFACT_DIR, 'capture_7_omnibar_search_whatsapp.png');
  fs.writeFileSync(p7, Buffer.from(scr.data, 'base64'));
  console.log('Saved Dashboard Omnibar WhatsApp:', p7);

  // 8. TYPE "stock" IN DASHBOARD OMNIBAR DIALOG
  console.log('8. Typing "stock" in Dashboard Omnibar dialog...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const input = dialog.querySelector('input[type="text"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, 'stock');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p8 = path.join(ARTIFACT_DIR, 'capture_8_omnibar_search_stock.png');
  fs.writeFileSync(p8, Buffer.from(scr.data, 'base64'));
  console.log('Saved Dashboard Omnibar Stock:', p8);

  ws.close();
  chrome.kill();
  console.log('SUCCESS: ALL CAPTURES COMPLETED!');
}

main().catch(err => {
  console.error('Clean capture error:', err);
  process.exit(1);
});
