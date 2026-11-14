const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmpDir = path.join(require('os').tmpdir(), 'chrome_proof_nocards_' + Date.now());

async function main() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9263',
    '--user-data-dir=' + tmpDir,
    '--window-size=1280,1050',
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
        const req = http.get('http://127.0.0.1:9263/json', res => {
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

  console.log('Navigating to Central Hub...');
  await send('Page.navigate', { url: 'https://nanasore.web.app/' });
  await new Promise(r => setTimeout(r, 6000));

  // 1. Capture Central Hub Dashboard (Top)
  let scr = await send('Page.captureScreenshot', { format: 'png' });
  let p1 = path.join(ARTIFACT_DIR, 'hub_proof_1_dashboard_top.png');
  fs.writeFileSync(p1, Buffer.from(scr.data, 'base64'));
  console.log('Saved 1:', p1);

  // Scroll down to where the modules are listed without cards
  await send('Runtime.evaluate', {
    expression: `window.scrollBy(0, 700);`
  });
  await new Promise(r => setTimeout(r, 1500));

  let scr2 = await send('Page.captureScreenshot', { format: 'png' });
  let p2 = path.join(ARTIFACT_DIR, 'hub_proof_2_cardless_links.png');
  fs.writeFileSync(p2, Buffer.from(scr2.data, 'base64'));
  console.log('Saved 2 (Cardless links):', p2);

  // Check how many .border-2 or cards are present in Section 4
  const checkCards = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const links = Array.from(document.querySelectorAll('a')).filter(a => a.innerText && (a.innerText.includes('Caisse') || a.innerText.includes('Vitrine') || a.innerText.includes('Stock') || a.innerText.includes('Factur')));
        const badges = Array.from(document.querySelectorAll('span')).map(s => s.innerText.trim()).filter(t => t.startsWith('[') && t.endsWith(']'));
        return {
          foundModuleLinks: links.map(l => l.innerText.trim()),
          visibleBadges: badges.slice(0, 10)
        };
      })()
    `,
    returnByValue: true
  });
  console.log('DOM Link Check:', checkCards.result.value);

  ws.close();
  chrome.kill();
  console.log('Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
