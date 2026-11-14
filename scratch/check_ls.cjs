const { spawn } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9228',
  '--no-first-run',
  '--no-default-browser-check',
  'https://nanasore.web.app/?view=dashboard'
]);

setTimeout(async () => {
  try {
    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9228/json', (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('pos-app'));
    console.log('Connecting to:', pageTarget.url);
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    ws.on('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            JSON.stringify({
              lsUser: localStorage.getItem('nana_store_auth_user'),
              keys: Object.keys(localStorage)
            })
          `
        }
      }));
    });
    ws.on('message', (m) => {
      const data = JSON.parse(m);
      if (data.id === 1) {
        console.log('LS RESULT:', data.result.result.value);
        ws.close();
        chrome.kill();
      }
    });
  } catch (e) {
    console.error('Err:', e);
    chrome.kill();
  }
}, 3000);
