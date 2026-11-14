const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('c:/Users/Acer/Downloads/remix-nana/node_modules/ws');
const os = require('os');
const path = require('path');

const tmpDir = path.join(os.tmpdir(), 'chrome-debug-resonance-' + Date.now());

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9561',
  '--user-data-dir=' + tmpDir,
  '--autoplay-policy=no-user-gesture-required',
  '--disable-web-security',
  'about:blank'
]);

async function getJsonList(retries = 15) {
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        const req = http.get('http://127.0.0.1:9561/json', res => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
        });
        req.on('error', reject);
      });
    } catch (e) {
      await new Promise(r => setTimeout(r, 600));
    }
  }
  throw new Error("Impossible de se connecter à Chrome sur le port 9561");
}

setTimeout(async () => {
  try {
    const list = await getJsonList();
    const page = list.find(p => p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (data) => {
          const res = JSON.parse(data);
          if (res.id === msgId) {
            ws.off('message', handler);
            resolve(res.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.on('open', async () => {
      await send('Page.enable');
      await send('Runtime.enable');

      console.log("1. Navigating to https://nanasore.web.app/wameet ...");
      await send('Page.navigate', { url: 'https://nanasore.web.app/wameet' });
      await new Promise(r => setTimeout(r, 4000));

      console.log("2. Switching to Reels Screen...");
      const switchRes = await send('Runtime.evaluate', {
        expression: `(() => {
          // Find Reels button or scroll horizontally to screen index 1
          const allEls = Array.from(document.querySelectorAll('*'));
          const reelsTab = allEls.find(el => el.children.length === 0 && el.textContent.trim() === 'Reels');
          if (reelsTab) {
            (reelsTab.closest('button') || reelsTab).click();
          }
          const container = Array.from(document.querySelectorAll('div')).find(d => d.scrollWidth > d.clientWidth && d.clientWidth > 300);
          if (container) {
            container.scrollLeft = container.clientWidth;
          }
          return { scrolled: Boolean(container), clickedTab: Boolean(reelsTab) };
        })()`,
        returnByValue: true
      });
      console.log("Switch result:", switchRes.result?.value);
      await new Promise(r => setTimeout(r, 3000));

      console.log("3. Inspecting Resonance button (📡) in DOM...");
      const evalRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const resonanceBtns = Array.from(document.querySelectorAll('button[aria-label="Résonance"]'));
          const btn = resonanceBtns[0];
          if (!btn) {
            // Check any button with Radio or title resonance
            const fallback = document.querySelector('button[title*="résonance"], button[title*="Résonance"]');
            if (fallback) {
              const beforeBg = fallback.className;
              fallback.click();
              return { found: true, isFallback: true, beforeClasses: beforeBg };
            }
            return { found: false, totalButtons: document.querySelectorAll('button').length };
          }
          const beforeBg = btn.className;
          btn.click();
          return {
            found: true,
            beforeClasses: beforeBg,
            text: btn.innerText
          };
        })()`,
        returnByValue: true
      });
      console.log("Button check result:", JSON.stringify(evalRes.result?.value, null, 2));

      await new Promise(r => setTimeout(r, 1500));

      const afterRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.querySelector('button[aria-label="Résonance"]') || document.querySelector('button[title*="résonance"], button[title*="Résonance"]');
          if (!btn) return { found: false };
          return {
            found: true,
            hasBlueClass: btn.className.includes('#4169E1') || btn.className.includes('bg-[#4169E1]'),
            classesAfterClick: btn.className,
            disabled: btn.disabled
          };
        })()`,
        returnByValue: true
      });
      console.log("State after click:", JSON.stringify(afterRes.result?.value, null, 2));

      ws.close();
      chrome.kill();
      process.exit(0);
    });
  } catch (err) {
    console.error("Test failed:", err);
    chrome.kill();
    process.exit(1);
  }
}, 1000);
