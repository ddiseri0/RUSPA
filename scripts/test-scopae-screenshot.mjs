import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';
import WebSocket from 'ws';

const chromeProcess = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--disable-gpu',
  '--remote-debugging-port=9224',
  '--window-size=1200,800'
]);

await new Promise((r) => setTimeout(r, 1200));

http.get('http://127.0.0.1:9224/json/version', (res) => {
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

        await sendSess('Runtime.evaluate', {
          expression: 'window.__RUSPA_MCP__.createRoom("1v1")',
          awaitPromise: true,
        });
        await new Promise((r) => setTimeout(r, 800));

        await sendSess('Runtime.evaluate', {
          expression: 'window.__RUSPA_MCP__.startMatch()',
          awaitPromise: true,
        });
        await new Promise((r) => setTimeout(r, 800));

        // Inject scopaeEvent into server room state and trigger broadcast
        const statusRes = await sendSess('Runtime.evaluate', {
          expression: 'JSON.stringify(window.__RUSPA_MCP__.getStatus())',
          returnByValue: true,
        });
        const status = JSON.parse(statusRes.result.value);
        const roomId = status.currentRoom.roomId;

        // Fetch current room from server API, add scopaeEvent, POST back
        const roomData = await fetch(`http://localhost:3000/__api/rooms/${roomId}`).then(r => r.json());
        roomData.scopaeEvent = {
          winnerId: status.currentUserId,
          winnerName: status.playerName,
          points: 2,
          timestamp: Date.now(),
        };
        await fetch('http://localhost:3000/__api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(roomData),
        });

        await new Promise((r) => setTimeout(r, 500));

        const ss = await sendSess('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('test-scopae-animation-screenshot.png', Buffer.from(ss.data, 'base64'));
        console.log('Saved test-scopae-animation-screenshot.png');

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
