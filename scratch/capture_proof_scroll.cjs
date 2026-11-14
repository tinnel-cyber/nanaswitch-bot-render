const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmpDir = path.join(require('os').tmpdir(), 'chrome_proof_scroll_' + Date.now());

async function main() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9260',
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
        const req = http.get('http://127.0.0.1:9260/json', res => {
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

  // Navigate to Dashboard
  console.log('Navigating to /dashboard ...');
  await send('Page.navigate', { url: 'https://nanasore.web.app/?view=dashboard' });
  await new Promise(r => setTimeout(r, 5000));

  // Dismiss welcome showcase if present
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const exploreBtn = btns.find(b => b.innerText.includes('Créer mon Business') || b.innerText.includes('Découvrir les Univers') || b.innerText.includes('Tableau de Bord'));
        if (exploreBtn) exploreBtn.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  // Unlock PIN keypad
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
  await new Promise(r => setTimeout(r, 2000));

  // Open Omnibar
  console.log('Opening Omnibar...');
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

  // Capture 7: Scroll down inside Omnibar dialog to show companion modules
  console.log('Scrolling down inside Omnibar to show companion modules...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const scrollArea = dialog.querySelector('.overflow-y-auto');
          if (scrollArea) scrollArea.scrollTop = 380;
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  let scr = await send('Page.captureScreenshot', { format: 'png' });
  let p7 = path.join(ARTIFACT_DIR, 'capture_7_omnibar_companion_modules.png');
  fs.writeFileSync(p7, Buffer.from(scr.data, 'base64'));
  console.log('Saved Companion Modules:', p7);

  // Capture 8: Scroll down further to show Services & Applications (Nanagénérateur AI)
  console.log('Scrolling further to show Nanagénérateur AI...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const scrollArea = dialog.querySelector('.overflow-y-auto');
          if (scrollArea) scrollArea.scrollTop = 900;
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p8 = path.join(ARTIFACT_DIR, 'capture_8_omnibar_nanagenerateur.png');
  fs.writeFileSync(p8, Buffer.from(scr.data, 'base64'));
  console.log('Saved Nanagénérateur:', p8);

  // Capture 9: Search for "ia" to show dynamic filtering across modules
  console.log('Searching for "ia"...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const input = dialog.querySelector('input[type="text"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(input, 'ia');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  scr = await send('Page.captureScreenshot', { format: 'png' });
  let p9 = path.join(ARTIFACT_DIR, 'capture_9_omnibar_search_ia.png');
  fs.writeFileSync(p9, Buffer.from(scr.data, 'base64'));
  console.log('Saved Search IA:', p9);

  ws.close();
  chrome.kill();
  console.log('ALL EXTENDED CAPTURES COMPLETED!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
