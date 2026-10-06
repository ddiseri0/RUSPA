import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';
import WebSocket from 'ws';

const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=9225',
  '--window-size=1200,800'
]);

await new Promise((r) => setTimeout(r, 1200));

http.get('http://127.0.0.1:9225/json/version', (res) => {
  let d = '';
  res.on('data', (c) => (d += c));
  res.on('end', async () => {
    try {
      const { webSocketDebuggerUrl } = JSON.parse(d);
      const ws = new WebSocket(webSocketDebuggerUrl);
      ws.on('open', async () => {
        let id = 1;
        const send = (method, params = {}) =>
          new Promise((res) => {
            const curId = id++;
            const h = (data) => {
              const m = JSON.parse(data);
              if (m.id === curId) {
                ws.off('message', h);
                res(m.result);
              }
            };
            ws.on('message', h);
            ws.send(JSON.stringify({ id: curId, method, params }));
          });

        const { targetId } = await send('Target.createTarget', { url: 'http://localhost:3000' });
        const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
        const sendSess = (method, params = {}) =>
          new Promise((res) => {
            const curId = id++;
            const h = (data) => {
              const m = JSON.parse(data);
              if (m.id === curId) {
                ws.off('message', h);
                res(m.result);
              }
            };
            ws.on('message', h);
            ws.send(JSON.stringify({ id: curId, sessionId, method, params }));
          });

        await sendSess('Page.enable');
        await sendSess('Runtime.enable');
        await new Promise((r) => setTimeout(r, 2000));

        // Click the avatar button to open Emoji Picker Modal
        await sendSess('Runtime.evaluate', {
          expression: `
            const btn = document.querySelector('button[title="Cambia Avatar Emoji 3D"]');
            if (btn) btn.click();
          `,
        });

        await new Promise((r) => setTimeout(r, 600));

        const ss = await sendSess('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('test-emoji-picker-modal.png', Buffer.from(ss.data, 'base64'));
        console.log('Saved test-emoji-picker-modal.png');

        chromeProcess.kill();
        process.exit(0);
      });
    } catch (e) {
      console.error(e);
      chromeProcess.kill();
      process.exit(1);
    }
  });
});
