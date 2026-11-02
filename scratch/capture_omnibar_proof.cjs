const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9e43c2aa-1af5-47da-b101-79eeb0619e16';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmpDir = path.join(require('os').tmpdir(), 'chrome_proof_omni_react_' + Date.now());

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('[PROOF] Lancement de Chrome...');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9268',
    '--user-data-dir=' + tmpDir,
    '--window-size=1366,850',
    '--disable-web-security',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  let targets = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await sleep(1000);
      targets = await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9268/json', res => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => {
            try { resolve(JSON.parse(d)); } catch(e) { resolve(null); }
          });
        });
        req.on('error', reject);
      });
      if (targets && targets.length > 0) break;
    } catch (_) {}
  }

  const page = targets.find(t => t.type === 'page') || targets[0];
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

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    } catch (_) {}
  });

  await new Promise(r => ws.on('open', r));
  await send('Page.enable');
  await send('DOM.enable');
  await send('Runtime.enable');

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

  console.log('[PROOF] Navigation vers https://pos-app-1759a.web.app/?view=dashboard ...');
  await send('Page.navigate', { url: 'https://pos-app-1759a.web.app/?view=dashboard' });
  await sleep(6000);

  // Déverrouillage PIN
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
    await sleep(300);
  }
  await sleep(2500);

  // Ouvrir l'Omnibar
  console.log('[PROOF] Clic sur [role="search"]...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const searchBox = document.querySelector('[role="search"]');
        if (searchBox) searchBox.click();
      })()
    `
  });
  await sleep(1500);

  // Taper "cent" via le prototype React pour déclencher le state onChange
  console.log('[PROOF] Saisie réactive de "cent"...');
  const typeRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const modalInput = document.querySelector('input[placeholder*="Tapez pour chercher"]');
        if (modalInput) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(modalInput, 'cent');
          modalInput.dispatchEvent(new Event('input', { bubbles: true }));
          modalInput.dispatchEvent(new Event('change', { bubbles: true }));
          return 'REACT_SEARCH_DISPATCHED';
        }
        return 'MODAL_INPUT_NOT_FOUND';
      })()
    `
  });
  console.log('[PROOF] Résultat saisie réactive :', typeRes?.result?.value);
  await sleep(3500);

  // Capture: Omnibar ouvert avec "cent" affichant les images et blocs
  console.log('[PROOF] Prise de vue Omnibar avec les résultats et blocs...');
  const screenshotOmni = await send('Page.captureScreenshot', { format: 'png' });
  const omniFile = path.join(ARTIFACT_DIR, 'omnibar_proof_capture.png');
  fs.writeFileSync(omniFile, Buffer.from(screenshotOmni.data, 'base64'));
  console.log('[PROOF SUCCÈS] Capture enregistrée :', omniFile);

  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('[PROOF ERROR]', err);
  process.exit(1);
});
