import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';
import WebSocket from 'ws';

const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=9223',
  '--window-size=375,667'
]);

await new Promise((r) => setTimeout(r, 1200));

http.get('http://127.0.0.1:9223/json/version', (res) => {
  let d = '';
  res.on('data', (c) => (d += c));
  res.on('end', async () => {
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
      await sendSess('Runtime.evaluate', {
        expression: 'window.__RUSPA_MCP__.createRoom("1v1")',
        awaitPromise: true,
      });
      await new Promise((r) => setTimeout(r, 1000));
      await sendSess('Runtime.evaluate', {
        expression: 'window.__RUSPA_MCP__.startMatch()',
        awaitPromise: true,
      });
      await new Promise((r) => setTimeout(r, 1500));
      // Click the first card in the player hand
      await sendSess('Runtime.evaluate', {
        expression: `(() => {
          const cards = document.querySelectorAll('footer .cursor-pointer');
          if (cards.length > 0) cards[0].click();
        })()`,
      });
      await new Promise((r) => setTimeout(r, 800));
      const shot = await sendSess('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('test-mobile-375-selected.png', Buffer.from(shot.data, 'base64'));
      await send('Target.closeTarget', { targetId });
      ws.close();
      chromeProcess.kill();
      console.log('Saved test-mobile-375-gameboard.png');
    });
  });
});
