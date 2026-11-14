import { spawn } from 'child_process';
import WebSocket from 'ws';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://nanasore.web.app/?view=hub_builder';
const port = 9229;

async function run() {
  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\Acer\\AppData\\Local\\Temp\\chrome-hub-exact'
  ]);

  let versionJson = null;
  for (let i = 0; i < 15; i++) {
    try {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) { versionJson = await res.json(); break; }
    } catch (e) {}
  }
  const newTabRes = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
  const tabJson = await newTabRes.json();
  const ws = new WebSocket(tabJson.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();
  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  ws.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error); else resolve(data.result);
    }
  });
  await new Promise(r => ws.on('open', r));
  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');

  await sendCommand('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem('nana_is_superadmin', 'true');
      localStorage.setItem('nana_superadmin_unlocked', 'true');
      localStorage.setItem('nana_registered_role', 'admin');
      localStorage.setItem('nana_kyc_status', 'verified');
      localStorage.setItem('nana_store_approval_status', 'APPROVED');
      localStorage.setItem('nana_store_auth_user', JSON.stringify({
        id: 'usr-admin',
        storeId: 'store-pousbila',
        email: 'pousbila04@gmail.com',
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        kycStatus: 'verified',
        storeApprovalStatus: 'APPROVED',
        name: 'Pousbila SuperAdmin'
      }));
    `
  });

  await sendCommand('Page.navigate', { url: targetUrl });
  await new Promise(r => setTimeout(r, 6000));

  // Clic sur "Tester Overlay Plein Écran"
  await sendCommand('Runtime.evaluate', {
    expression: `
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tester Overlay Plein'));
      if (btn) btn.click();
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  // Saisie de "nom de caisse"
  const searchResult = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const input = document.querySelector('input[placeholder="Rechercher dans le Hub Central..."]');
        if (!input) return { error: 'Input non trouvé' };
        
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeSetter.call(input, "nom de caisse");
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        return { inputValue: input.value };
      })()
    `,
    returnByValue: true
  });
  console.log('Search input status:', searchResult.result.value);

  await new Promise(r => setTimeout(r, 2000));

  // Inspecter ce qui sort
  const results = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const dialog = document.querySelector('.fixed.inset-0.bg-slate-950\\/80');
        if (!dialog) return { error: 'Overlay non trouvé' };
        const h3List = Array.from(dialog.querySelectorAll('h3')).map(h => h.textContent.trim());
        const links = Array.from(dialog.querySelectorAll('a')).map(a => a.textContent.trim());
        const paragraphs = Array.from(dialog.querySelectorAll('p')).map(p => p.textContent.trim()).filter(Boolean);
        return {
          h3List,
          links,
          paragraphs: paragraphs.slice(0, 5)
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Results in HubBuilder overlay:', results.result.value);

  ws.close();
  chromeProcess.kill();
  process.exit(0);
}
run();
