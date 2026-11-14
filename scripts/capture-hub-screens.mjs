import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://nanasore.web.app/?view=hub_builder';
const port = 9230;

async function run() {
  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    '--user-data-dir=C:\\Users\\Acer\\AppData\\Local\\Temp\\chrome-hub-snap'
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

  // Screenshot 1: HubBuilder Canvas
  const snap1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad\\screenshot_hubbuilder_canvas.png', Buffer.from(snap1.data, 'base64'));

  // Clic sur "Tester Overlay Plein Écran"
  await sendCommand('Runtime.evaluate', {
    expression: `
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Tester Overlay Plein'));
      if (btn) btn.click();
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot 2: Overlay ouvert
  const snap2 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad\\screenshot_hubbuilder_overlay_open.png', Buffer.from(snap2.data, 'base64'));

  // Saisir "nom de caisse"
  await sendCommand('Runtime.evaluate', {
    expression: `
      const input = document.querySelector('input[placeholder="Rechercher dans le Hub Central..."]');
      if (input) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeSetter.call(input, "nom de caisse");
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `
  });
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 3: Overlay après "nom de caisse"
  const snap3 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\Acer\\.gemini\\antigravity\\brain\\9f2026e1-ac4d-47a2-80da-62d782523fad\\screenshot_hubbuilder_overlay_typed.png', Buffer.from(snap3.data, 'base64'));

  console.log('HubBuilder screenshots pris !');
  ws.close();
  chromeProcess.kill();
  process.exit(0);
}
run();
