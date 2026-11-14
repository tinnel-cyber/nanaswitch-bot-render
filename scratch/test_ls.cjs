const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const tmpDir = path.join(require('os').tmpdir(), 'chrome_ls_test_' + Date.now());

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9251',
  '--user-data-dir=' + tmpDir,
  '--disable-web-security',
  '--disable-site-isolation-trials',
  'https://nanasore.web.app/'
]);

setTimeout(async () => {
  try {
    const targets = await new Promise(r => http.get('http://127.0.0.1:9251/json', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }));
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise(res => {
      const mid = id++;
      const handler = (raw) => {
        const msg = JSON.parse(raw);
        if (msg.id === mid) { ws.off('message', handler); res(msg.result); }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id: mid, method: m, params: p }));
    });
    await new Promise(r => ws.on('open', r));
    await send('Page.navigate', { url: 'https://nanasore.web.app/' });
    await new Promise(r => setTimeout(r, 4000));
    const urlRes = await send('Runtime.evaluate', { expression: 'window.location.href' });
    console.log('Current URL:', urlRes.result.value);
    const writeRes = await send('Runtime.evaluate', { expression: 'localStorage.setItem("test_key", "123")' });
    console.log('Write:', writeRes);
    const readRes = await send('Runtime.evaluate', { expression: 'localStorage.getItem("test_key")' });
    console.log('Read:', readRes);
  } catch (e) {
    console.error(e);
  } finally {
    chrome.kill();
  }
}, 3000);
