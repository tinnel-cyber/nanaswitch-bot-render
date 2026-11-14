import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const targetUrl = 'https://nanasore.web.app/?view=dashboard';
const port = 9222;

async function run() {
  console.log('[TEST] Lancement de Chrome headless...');
  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\Acer\\AppData\\Local\\Temp\\chrome-test-omnibar'
  ]);

  let versionJson = null;
  for (let i = 0; i < 15; i++) {
    try {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        versionJson = await res.json();
        break;
      }
    } catch (e) {}
  }

  if (!versionJson) {
    throw new Error('Chrome remote debug non accessible après 15s');
  }
  console.log('[TEST] WebSocket debugger URL:', versionJson.webSocketDebuggerUrl);

  const newTabRes = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
  const tabJson = await newTabRes.json();
  const pageWsUrl = tabJson.webSocketDebuggerUrl;
  console.log('[TEST] Page WS URL:', pageWsUrl);

  const ws = new WebSocket(pageWsUrl);

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
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  });

  await new Promise(r => ws.on('open', r));
  console.log('[TEST] Connecté via CDP.');

  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');
  await sendCommand('DOM.enable');

  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.method === 'Runtime.consoleAPICalled') {
        const text = parsed.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log('[BROWSER CONSOLE]', text);
      }
    } catch (_) {}
  });

  // Injecter l'utilisateur admin dans localStorage AVANT chargement
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

  console.log('[TEST] Navigation vers targetUrl avec auth pré-injecté...');
  await sendCommand('Page.navigate', { url: targetUrl });

  // Attendre le chargement de la page et Firebase RTDB
  console.log('[TEST] Attente du chargement initial (6s)...');
  await new Promise(r => setTimeout(r, 6000));

  const pageInfo = await sendCommand('Runtime.evaluate', {
    expression: `
      ({
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.slice(0, 300),
        hasOmnibar: !!document.querySelector('[aria-label="Rechercher un module"]'),
        allButtons: Array.from(document.querySelectorAll('button, [role="button"]')).map(b => b.textContent.trim()).filter(Boolean).slice(0, 10)
      })
    `,
    returnByValue: true
  });
  console.log('[PAGE INFO]', pageInfo.result.value);

  // 1. Déclencher l'ouverture de l'Omnibar
  console.log('[TEST] Déclenchement de l\'ouverture de l\'Omnibar...');
  await sendCommand('Runtime.evaluate', {
    expression: `
      window.dispatchEvent(new CustomEvent('nanasore_open_omnibar'));
      // Ou clic sur la barre de recherche
      const bar = document.querySelector('[aria-label="Rechercher un module"]');
      if (bar) bar.click();
    `
  });

  await new Promise(r => setTimeout(r, 1000));

  // 2. Taper "caisse" dans l'input
  console.log('[TEST] Saisie de "caisse" dans le champ de recherche...');
  const evalResult = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        const input = document.querySelector('input.w-full') || document.querySelector('input[type="text"]');
        if (!input) return { error: 'Input non trouvé', allInputs: Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, placeholder: i.placeholder, className: i.className })) };
        
        // Simuler la saisie réactive React
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, "caisse");
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        return { success: true, value: input.value, placeholder: input.placeholder };
      })()
    `,
    returnByValue: true
  });
  console.log('[TEST] Résultat saisie :', evalResult.result.value);

  // Attendre 2 secondes que React et useMemo recalculent
  await new Promise(r => setTimeout(r, 2000));

  // 3. Inspecter les éléments affichés dans l'Omnibar
  console.log('[TEST] Extraction des éléments DOM affichés...');
  const inspectionResult = await sendCommand('Runtime.evaluate', {
    expression: `
      (() => {
        try {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return { error: 'Dialog non trouvée' };

          // Tous les textes des h3
          const h3Texts = Array.from(dialog.querySelectorAll('h3')).map(h => h.textContent.trim());
          
          // Tous les liens
          const links = Array.from(dialog.querySelectorAll('a')).map(a => ({
            text: a.textContent.trim(),
            href: a.getAttribute('href')
          }));

          // Les paragraphes
          const paragraphs = Array.from(dialog.querySelectorAll('p')).map(p => p.textContent.trim()).filter(Boolean);

          // Les badges et spans
          const badges = Array.from(dialog.querySelectorAll('span')).map(s => s.textContent.trim()).filter(s => s.length > 2 && s.length < 40);

          // Les boutons
          const buttons = Array.from(dialog.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean);

          return {
            modalOpen: true,
            h3Texts,
            links,
            paragraphs: paragraphs.slice(0, 10),
            badges: Array.from(new Set(badges)).slice(0, 15),
            buttons: buttons.slice(0, 8)
          };
        } catch (err) {
          return { error: err.message };
        }
      })()
    `,
    returnByValue: true
  });

  console.log('\n================== RÉSULTAT DU TEST EN DIRECT ==================');
  console.log('inspectionResult RAW:', JSON.stringify(inspectionResult, null, 2));
  console.log('=================================================================\n');

  // Fermer la page et Chrome
  ws.close();
  chromeProcess.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
