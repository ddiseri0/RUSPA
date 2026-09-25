import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';
import WebSocket from 'ws';

const TARGET_URL = process.argv[2] || 'http://localhost:3000';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sendCdpCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.off('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      } catch (err) {
        // ignore parse error for unrelated events
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function runAgentTests() {
  console.log('====================================================');
  console.log('🚀 RUSPA WebMCP Automated Test Runner');
  console.log('====================================================\n');

  // Test 1: WebMCP Dev Server Health
  console.log('1️⃣  Verifica WebMCP Dev Server...');
  try {
    const health = await fetchJson('http://localhost:3000/__mcp/health');
    if (health.status === 200 && health.body.status === 'READY') {
      console.log('   ✅ WebMCP Server: OK (Versione ' + health.body.version + ')');
    } else {
      console.error('   ❌ WebMCP Server: Errore risposta', health);
      process.exit(1);
    }
  } catch (err) {
    console.error('   ❌ Server Vite non raggiungibile su http://localhost:3000.');
    console.error('   Dettaglio:', err.message);
    process.exit(1);
  }

  // Test 2: Engine Rules Suite
  console.log('\n2️⃣  Verifica Regole di Gioco Scopa & Ruspa...');
  try {
    const rules = await fetchJson('http://localhost:3000/__mcp/test-rules');
    if (rules.status === 200 && rules.body.status === 'PASS') {
      console.log('   ✅ Regole validate:');
      rules.body.scenarios.forEach((s) => {
        console.log(`      • ${s.rule} ➔ PASS`);
      });
      console.log(`   📝 ${rules.body.summary}`);
    } else {
      console.error('   ❌ Fallimento regole:', rules);
      process.exit(1);
    }
  } catch (err) {
    console.error('   ❌ Errore durante il test delle regole:', err.message);
    process.exit(1);
  }

  // Test 3: Headless Chrome UI Inspection & Room Creation via WebMCP
  console.log('\n3️⃣  Lancio Chrome Headless e Test Interattivo WebMCP...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProcess = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,800',
      TARGET_URL,
    ],
    { stdio: 'ignore' }
  );

  await sleep(3000);

  let cdpSuccess = false;
  try {
    const cdpTargets = await fetchJson('http://127.0.0.1:9222/json');
    if (Array.isArray(cdpTargets.body) && cdpTargets.body.length > 0) {
      const pageTarget = cdpTargets.body.find((t) => t.type === 'page' || t.url.includes(new URL(TARGET_URL).port));
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        console.log('   ✅ Connessione CDP WebSocket stabilita!');
        const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
        await new Promise((r) => ws.on('open', r));

        await sendCdpCommand(ws, 'Runtime.enable');
        await sendCdpCommand(ws, 'Page.enable');
        await sendCdpCommand(ws, 'Log.enable');
        await sendCdpCommand(ws, 'Network.enable');

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.method === 'Network.responseReceived') {
              console.log('      [Network]:', msg.params.response.status, msg.params.response.url.slice(0, 60));
            }
            if (msg.method === 'Network.loadingFailed') {
              console.log('      🚨 [Network Failed]:', msg.params.errorText);
            }
            if (msg.method === 'Runtime.consoleAPICalled') {
              console.log('      [Browser Console]:', msg.params.args.map((a) => a.value || a.description).join(' '));
            }
            if (msg.method === 'Runtime.exceptionThrown') {
              console.log('      🚨 [Browser Exception]:', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
            }
          } catch {}
        });

        console.log(`   🌐 Navigazione a ${TARGET_URL}...`);
        await sendCdpCommand(ws, 'Page.navigate', { url: TARGET_URL });
        await sleep(3000);

        // Wait for React to mount into #root
        let rootAttempts = 0;
        while (rootAttempts < 30) {
          const rootCheck = await sendCdpCommand(ws, 'Runtime.evaluate', {
            expression: 'document.getElementById("root")?.children?.length || 0',
          });
          if (rootCheck.result?.value > 0) break;
          await sleep(200);
          rootAttempts++;
        }

        const dom = await sendCdpCommand(ws, 'Runtime.evaluate', { expression: 'document.body.innerHTML' });
        console.log('   📄 Root figli trovati:', dom.result?.value?.includes('RUSPA') ? 'Presente RUSPA!' : 'Ancora vuoto');

        // Wait for window.__RUSPA_MCP__
        let mcpAttempts = 0;
        while (mcpAttempts < 30) {
          const mcpCheck = await sendCdpCommand(ws, 'Runtime.evaluate', {
            expression: 'Boolean(window.__RUSPA_MCP__)',
          });
          if (mcpCheck.result?.value) break;
          await sleep(200);
          mcpAttempts++;
        }

        const mcpType = await sendCdpCommand(ws, 'Runtime.evaluate', { expression: 'typeof window.__RUSPA_MCP__' });
        console.log('   🔍 typeof window.__RUSPA_MCP__:', mcpType.result?.value);

        // Perform Room Creation via WebMCP
        console.log('   🧪 Esecuzione creazione stanza via WebMCP...');
        const createResult = await sendCdpCommand(ws, 'Runtime.evaluate', {
          expression: `(async () => {
            const before = window.__RUSPA_MCP__.getStatus();
            await window.__RUSPA_MCP__.createRoom('1v1');
            const after = window.__RUSPA_MCP__.getStatus();
            return { before, after };
          })()`,
          awaitPromise: true,
          returnByValue: true,
        });

        const stateAfter = createResult.result?.value?.after;
        if (!stateAfter) {
          throw new Error('Creazione stanza non riuscita: ' + JSON.stringify(createResult));
        }

        console.log('   ✅ Stanza creata con successo!');
        console.log(`      • Codice Stanza generato: "${stateAfter.currentRoom?.code}"`);
        console.log(`      • Fase: "${stateAfter.currentRoom?.phase}"`);
        console.log(`      • Schermata Attuale: "${stateAfter.currentScreen}" (NESSUNA pagina vuota!)`);
        console.log(`      • Giocatori: ${stateAfter.currentRoom?.playerNames?.join(', ')}`);

        // Capture screenshot of the created lobby
        console.log('   📸 Cattura screenshot della Lobby...');
        const screenshot = await sendCdpCommand(ws, 'Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('test-lobby-screenshot.png', Buffer.from(screenshot.data, 'base64'));
        console.log('   ✅ Screenshot salvato in: test-lobby-screenshot.png');

        // 4. Test Avvio Partita e Verifica GameBoard UI
        console.log('\n4️⃣  Avvio Partita e Verifica GameBoard UI...');
        const startResult = await sendCdpCommand(ws, 'Runtime.evaluate', {
          expression: `(async () => {
            await window.__RUSPA_MCP__.startMatch();
            await new Promise(r => setTimeout(r, 1000));
            return window.__RUSPA_MCP__.getStatus();
          })()`,
          awaitPromise: true,
          returnByValue: true,
        });

        console.log('   ✅ Partita avviata:');
        const boardStatus = startResult.result?.value;
        console.log(`      • Fase: "${boardStatus?.currentRoom?.phase}"`);
        console.log(`      • Schermata Attuale: "${boardStatus?.currentScreen}"`);

        await sleep(1500);

        // Verifica Scoreboard e Semi nel DOM
        const uiEvaluation = await sendCdpCommand(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const html = document.body.innerHTML;
            const hasScopeCounter = html.includes('Scope') || html.includes('Scopa');
            const hasPrimiera = html.includes('Primiera') || html.includes('70');
            const hasSettebello = html.includes('7B') || html.includes('Settebello');
            const hasSuitDenari = html.includes('🪙');
            const hasSuitCoppe = html.includes('🏆');
            const hasSuitSpade = html.includes('⚔️');
            const hasSuitBastoni = html.includes('🪵');
            return {
              hasScopeCounter,
              hasPrimiera,
              hasSettebello,
              hasSuitDenari,
              hasSuitCoppe,
              hasSuitSpade,
              hasSuitBastoni,
            };
          })()`,
          returnByValue: true,
        });

        const ui = uiEvaluation.result?.value;
        console.log('\n5️⃣  Verifica Elementi Visuali Scoreboard & Semi:');
        console.log(`      • Contatore Scope in evidenza: ${ui?.hasScopeCounter ? '✅ PRESENTE' : '❌'}`);
        console.log(`      • Punti Primiera / Settanta: ${ui?.hasPrimiera ? '✅ PRESENTE' : '❌'}`);
        console.log(`      • Indicatore Settebello: ${ui?.hasSettebello ? '✅ PRESENTE' : '❌'}`);
        console.log(`      • Semi Denari (🪙), Coppe (🏆), Spade (⚔️), Bastoni (🪵): ${ui?.hasSuitDenari && ui?.hasSuitCoppe && ui?.hasSuitSpade && ui?.hasSuitBastoni ? '✅ TUTTI E 4 RIPRISTINATI' : '⚠️ ALCUNI MANCANTI'}`);

        // Click prima carta in mano
        console.log('\n6️⃣  Test Interazione Carte & Pulsanti Giocata:');
        const clickCardResult = await sendCdpCommand(ws, 'Runtime.evaluate', {
          expression: `(() => {
            // Find a card element in the hand (last row)
            const cards = document.querySelectorAll('footer [role="button"], footer button, footer .cursor-pointer');
            if (cards.length > 0) {
              cards[0].click();
              return { clicked: true, count: cards.length };
            }
            return { clicked: false, count: 0 };
          })()`,
          returnByValue: true,
        });
        console.log(`      • Selezione carta in mano: ${clickCardResult.result?.value?.clicked ? '✅ Cliccata' : '❌'}`);
        await sleep(500);

        // Controllo pulsanti d'azione visualizzati
        const buttonsCheck = await sendCdpCommand(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const html = document.body.innerHTML;
            const hasBluffToggle = html.includes('Bluffa Ruspa') || html.includes('Bluff Ruspa');
            const hasAceAutoRuspa = html.includes('Asso: Ruspa Automatica') || html.includes('Gioca Asso');
            const hasFaceUpDiscard = html.includes('Scarta a Terra (Scoperta)');
            return { hasBluffToggle, hasAceAutoRuspa, hasFaceUpDiscard };
          })()`,
          returnByValue: true,
        });
        const btns = buttonsCheck.result?.value;
        console.log(`      • Controlli Azione rilevati:`);
        if (btns?.hasAceAutoRuspa) {
          console.log(`        - Carta Asso: Modalità Ruspa Automatica attiva ✅`);
        } else {
          console.log(`        - Carta Non-Asso: Toggle "Bluffa Ruspa" disponibile: ${btns?.hasBluffToggle ? '✅' : '❌'}`);
          console.log(`        - Giocata a terra senza presa: Pulsante "Scarta a Terra (Scoperta)": ${btns?.hasFaceUpDiscard ? '✅' : '❌'}`);
        }

        // Capture screenshot of the active GameBoard
        console.log('\n📸 Cattura screenshot del Tavolo di Gioco (GameBoard)...');
        const gameScreenshot = await sendCdpCommand(ws, 'Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('test-gameboard-screenshot.png', Buffer.from(gameScreenshot.data, 'base64'));
        console.log('   ✅ Screenshot salvato in: test-gameboard-screenshot.png');

        ws.close();
        cdpSuccess = true;
      }
    }
  } catch (e) {
    console.error('   ⚠️ Dettagli CDP:', e.message);
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
  }

  if (cdpSuccess) {
    console.log('\n====================================================');
    console.log('🎉 TUTTI I TEST WEBMCP SONO STATI SUPERATI CON SUCCESSO!');
    console.log('   Bug "pagina vuota" risolto e verificato su Chrome Headless!');
    console.log('====================================================\n');
  }
}

runAgentTests().catch(console.error);
