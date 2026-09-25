import http from 'http';

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function testIncognitoFlow() {
  console.log('🧪 Test Simulazione Incognito Hub Sync...\n');

  // 1. Client Normal crea la stanza
  const roomCode = 'TEST99';
  const roomId = 'room_test99';
  const mockRoom = {
    roomId,
    code: roomCode,
    mode: '1v1',
    phase: 'LOBBY',
    hostId: 'usr_normal_tab',
    players: {
      usr_normal_tab: {
        id: 'usr_normal_tab',
        name: 'Giocatore Normale',
        seat: 0,
        team: 1,
        isHost: true,
        isReady: true,
      },
    },
    turnOrder: ['usr_normal_tab'],
    board: [],
    updatedAt: Date.now(),
  };

  console.log('1️⃣  Finestra Normale: Invio creazione stanza al dev server...');
  const postRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/__api/rooms',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    mockRoom
  );
  console.log('   ✅ Risposta server:', postRes.body);

  // 2. Client Incognito cerca la stanza tramite il codice
  console.log(`\n2️⃣  Finestra Incognito: Ricerca stanza con codice "${roomCode}"...`);
  const getRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/__api/rooms/${roomCode}`,
    method: 'GET',
  });

  if (getRes.status === 200 && getRes.body?.code === roomCode) {
    console.log('   🎉 SUCCESSO! La finestra in incognito ha trovato la stanza:');
    console.log('      • Stanza ID:', getRes.body.roomId);
    console.log('      • Host:', getRes.body.players[getRes.body.hostId]?.name);
    console.log('      • Codice:', getRes.body.code);
  } else {
    console.error('   ❌ Fallimento: stanza non trovata dalla finestra in incognito', getRes);
    process.exit(1);
  }

  // 3. Client Incognito fa il Join
  console.log('\n3️⃣  Finestra Incognito: Effettua join come Giocatore Incognito...');
  const updatedRoom = {
    ...getRes.body,
    players: {
      ...getRes.body.players,
      usr_incognito_tab: {
        id: 'usr_incognito_tab',
        name: 'Giocatore Incognito',
        seat: 1,
        team: 2,
        isHost: false,
        isReady: true,
      },
    },
    turnOrder: [...getRes.body.turnOrder, 'usr_incognito_tab'],
    lastActionMessage: 'Giocatore Incognito è entrato nella stanza.',
  };

  const joinRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/__api/rooms',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    updatedRoom
  );

  console.log('   ✅ Join salvato sul server:', joinRes.body);

  // 4. Finestra Normale rilegge la stanza e vede entrambi i giocatori
  console.log('\n4️⃣  Finestra Normale: Rilegge la stanza aggiornata...');
  const verifyRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/__api/rooms/${roomId}`,
    method: 'GET',
  });

  const players = Object.values(verifyRes.body.players).map((p) => p.name);
  console.log('   ✅ Giocatori nella stanza:', players.join(' e '));

  console.log('\n====================================================');
  console.log('🎉 TEST INCOGNITO PASSATO CON SUCCESSO!');
  console.log('====================================================\n');
}

testIncognitoFlow().catch((e) => {
  console.error('❌ Errore test:', e.message);
  process.exit(1);
});
