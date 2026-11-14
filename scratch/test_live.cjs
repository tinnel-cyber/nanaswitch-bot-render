const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const path = require('path');

async function run() {
  const tmpDir = path.join(require('os').tmpdir(), 'chrome_cdp_' + Date.now());
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    '--user-data-dir=' + tmpDir,
    '--no-first-run',
    '--no-default-browser-check',
    'https://nanasore.web.app/'
  ]);

  await new Promise(r => setTimeout(r, 2500));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9225/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

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
      console.log('[BROWSER CONSOLE]', text);
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

  console.log('Injecting auth user in localStorage and reloading...');
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

  // Navigate to dashboard
  await send('Page.navigate', { url: 'https://nanasore.web.app/?view=dashboard' });

  // Wait for load
  await new Promise(r => setTimeout(r, 7000));

  // Inspect DOM
  const evalResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const omnibars = document.querySelectorAll('[role="search"], input[placeholder*="module"], input[placeholder*="Rechercher"]');
        const overlay = document.querySelector('[role="dialog"]');
        const h1 = Array.from(document.querySelectorAll('h1, h2')).map(el => el.innerText.trim());
        const bodySnippet = document.body.innerText.replace(/\\n+/g, ' ').slice(0, 300);
        return {
          omnibarInputsCount: omnibars.length,
          hasOverlay: !!overlay,
          h1,
          bodySnippet,
          currentUrl: window.location.href
        };
      })()
    `,
    returnByValue: true
  });

  console.log('DASHBOARD STATE:', evalResult.result.value);

  // Trigger Omnibar Ctrl+K
  console.log('Dispatching Ctrl+K...');
  await send('Runtime.evaluate', {
    expression: `
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
      // Also try clicking the search bar if present
      const s = document.querySelector('[role="search"], input[placeholder*="module"], input[placeholder*="Rechercher"]');
      if (s) s.click();
    `
  });

  await new Promise(r => setTimeout(r, 2000));

  // Check dialog
  const dialogResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return { hasDialog: false };
        const headings = Array.from(dialog.querySelectorAll('h3, h4, h5')).map(el => el.innerText.trim());
        const dialogText = dialog.innerText.replace(/\\n+/g, ' ').slice(0, 500);
        return {
          hasDialog: true,
          headings,
          dialogText
        };
      })()
    `,
    returnByValue: true
  });

  console.log('DIALOG STATE:', dialogResult.result.value);

  // Take screenshot
  const scr = await send('Page.captureScreenshot', { format: 'png' });
  const scrPath = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad\\screenshot_live_run.png';
  fs.writeFileSync(scrPath, Buffer.from(scr.data, 'base64'));
  console.log('Screenshot saved to', scrPath);

  ws.close();
  chrome.kill();
}

run().catch(e => {
  console.error('Err:', e);
  process.exit(1);
});
