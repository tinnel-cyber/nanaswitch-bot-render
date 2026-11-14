const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmpDir = path.join(require('os').tmpdir(), 'chrome_proof_badges_' + Date.now());

async function main() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9261',
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
        const req = http.get('http://127.0.0.1:9261/json', res => {
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

  console.log('1. Navigating to dashboard...');
  await send('Page.navigate', { url: 'https://nanasore.web.app/' });
  await new Promise(r => setTimeout(r, 6000));

  // 1. Dashboard screenshot
  let scr = await send('Page.captureScreenshot', { format: 'png' });
  let p1 = path.join(ARTIFACT_DIR, 'badge_proof_1_dashboard.png');
  fs.writeFileSync(p1, Buffer.from(scr.data, 'base64'));
  console.log('Saved 1:', p1);

  // 2. Open Omnibar Modal
  console.log('2. Opening Omnibar Dialog...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const inp = document.querySelector('input[placeholder*="Tapez pour chercher"]');
        if (inp) {
          inp.click();
          inp.focus();
          return 'clicked static omnibar';
        }
        return 'omnibar input not found';
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  let scr2 = await send('Page.captureScreenshot', { format: 'png' });
  let p2 = path.join(ARTIFACT_DIR, 'badge_proof_2_omnibar_empty.png');
  fs.writeFileSync(p2, Buffer.from(scr2.data, 'base64'));
  console.log('Saved 2 (Empty Omnibar with placeholder):', p2);

  // Helper to type in the open modal
  async function typeInModal(text) {
    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          if (dialog) {
            const input = dialog.querySelector('input[type="text"]');
            if (input) {
              const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              setter.call(input, ${JSON.stringify(text)});
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return 'typed: ' + text;
            }
          }
          return 'input not found in dialog';
        })()
      `
    });
    console.log('Typing status:', res.result.value);
    await new Promise(r => setTimeout(r, 2000));

    // Inspect visible badges in dialog
    const badgesRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return [];
          const badges = Array.from(dialog.querySelectorAll('span')).map(s => s.innerText.trim()).filter(t => t.startsWith('[') && t.endsWith(']'));
          const h3 = dialog.querySelector('h3')?.innerText || '';
          return { h3, badges };
        })()
      `,
      returnByValue: true
    });
    console.log('Visible badges for query "' + text + '":', badgesRes.result.value);
  }

  // 3. Search "caisse" -> Shows [Application] + Linked Modules
  console.log('3. Searching "caisse"...');
  await typeInModal('caisse');
  let scr3 = await send('Page.captureScreenshot', { format: 'png' });
  let p3 = path.join(ARTIFACT_DIR, 'badge_proof_3_search_caisse.png');
  fs.writeFileSync(p3, Buffer.from(scr3.data, 'base64'));
  console.log('Saved 3:', p3);

  // 4. Search "sms" -> Shows [Service]
  console.log('4. Searching "sms"...');
  await typeInModal('sms');
  let scr4 = await send('Page.captureScreenshot', { format: 'png' });
  let p4 = path.join(ARTIFACT_DIR, 'badge_proof_4_search_sms.png');
  fs.writeFileSync(p4, Buffer.from(scr4.data, 'base64'));
  console.log('Saved 4:', p4);

  // 5. Search "scanner" -> Shows [Outil]
  console.log('5. Searching "scanner"...');
  await typeInModal('scanner');
  let scr5 = await send('Page.captureScreenshot', { format: 'png' });
  let p5 = path.join(ARTIFACT_DIR, 'badge_proof_5_search_scanner.png');
  fs.writeFileSync(p5, Buffer.from(scr5.data, 'base64'));
  console.log('Saved 5:', p5);

  // 6. Search "stock" -> Shows [Module]
  console.log('6. Searching "stock"...');
  await typeInModal('stock');
  let scr6 = await send('Page.captureScreenshot', { format: 'png' });
  let p6 = path.join(ARTIFACT_DIR, 'badge_proof_6_search_stock.png');
  fs.writeFileSync(p6, Buffer.from(scr6.data, 'base64'));
  console.log('Saved 6:', p6);

  ws.close();
  chrome.kill();
  console.log('Done proof captures!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
