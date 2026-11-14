const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tmpDir = path.join(require('os').tmpdir(), 'chrome_proof_button_' + Date.now());

async function main() {
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9288',
    '--user-data-dir=' + tmpDir,
    '--window-size=1400,950',
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
        const req = http.get('http://127.0.0.1:9288/json', res => {
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
          storeId: 'store-pousbila',
          pinCode: '1234'
        }));
      } catch(e) {}
    `
  });

  console.log('Navigating to Central Hub...');
  await send('Page.navigate', { url: 'https://nanasore.web.app/' });
  await new Promise(r => setTimeout(r, 4500));

  // If PIN keypad is visible, click 1, 2, 3, 4 with a delay between digits to unlock
  console.log('Checking for PIN Keypad...');
  for (const digit of ['1', '2', '3', '4']) {
    await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '${digit}');
          if (btn) btn.click();
        })()
      `
    });
    await new Promise(r => setTimeout(r, 200));
  }

  await new Promise(r => setTimeout(r, 3000));

  // 1. Capture Dashboard with Sidebar showing the new magnificent button
  let scr1 = await send('Page.captureScreenshot', { format: 'png' });
  let p1 = path.join(ARTIFACT_DIR, 'button_proof_1_sidebar_magnificent_button.png');
  fs.writeFileSync(p1, Buffer.from(scr1.data, 'base64'));
  console.log('Saved 1:', p1);

  // 2. Click the magnificent button to open & déballer the list
  const clickRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent.includes('Liste de nos Services') || 
          b.getAttribute('title')?.includes('Liste de nos Services')
        );
        if (btn) {
          btn.click();
          return { found: true, text: btn.textContent };
        }
        return { found: false };
      })()
    `,
    returnByValue: true
  });
  console.log('Click button result:', clickRes.result.value);

  await new Promise(r => setTimeout(r, 1500));

  // Capture screenshot 2: Unpacked catalog open with illuminated blue links and badges
  let scr2 = await send('Page.captureScreenshot', { format: 'png' });
  let p2 = path.join(ARTIFACT_DIR, 'button_proof_2_unfolded_catalog_open.png');
  fs.writeFileSync(p2, Buffer.from(scr2.data, 'base64'));
  console.log('Saved 2:', p2);

  // 3. Inspect items in the unpacked drawer
  const drawerCheck = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const headings = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim());
        const blueLinks = Array.from(document.querySelectorAll('span')).filter(s => 
          s.style.textShadow && s.style.textShadow.includes('rgba(59, 130, 246')
        ).map(s => s.textContent.trim());
        const badges = Array.from(document.querySelectorAll('span')).filter(s => 
          s.textContent.startsWith('[') && s.textContent.endsWith(']')
        ).map(s => s.textContent.trim());
        return { headings, blueLinksCount: blueLinks.length, blueLinksSample: blueLinks.slice(0, 10), badgesSample: badges.slice(0, 10) };
      })()
    `,
    returnByValue: true
  });
  console.log('Drawer inspect result:', drawerCheck.result.value);

  // 4. Click filter pill [Application]
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const appPill = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('[Application]'));
        if (appPill) appPill.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 800));

  let scr3 = await send('Page.captureScreenshot', { format: 'png' });
  let p3 = path.join(ARTIFACT_DIR, 'button_proof_3_filter_applications.png');
  fs.writeFileSync(p3, Buffer.from(scr3.data, 'base64'));
  console.log('Saved 3:', p3);

  // 5. Test typing in search input: "caisse"
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const input = document.querySelector('input[placeholder*="Tapez pour chercher un Service"]');
        if (input) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(input, 'caisse');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 800));

  let scr4 = await send('Page.captureScreenshot', { format: 'png' });
  let p4 = path.join(ARTIFACT_DIR, 'button_proof_4_search_caisse.png');
  fs.writeFileSync(p4, Buffer.from(scr4.data, 'base64'));
  console.log('Saved 4:', p4);

  ws.close();
  chrome.kill();
  console.log('All proofs saved successfully!');
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
