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

async function testAbandonFlow() {
  console.log('🧪 Test Simulazione Abbandono Partita (Vittoria a Tavolino)...\n');

  const roomId = 'room_abandon_test';
  const initialRoom = {
    roomId,
    code: 'ABANDON',
    mode: '1v1',
    phase: 'PLAYER_TURN',
    hostId: 'p1_id',
    players: {
      p1_id: {
        id: 'p1_id',
        name: 'Giocatore 1',
        seat: 0,
        team: 1,
        isHost: true,
        score: 5,
        handCount: 3,
      },
      p2_id: {
        id: 'p2_id',
        name: 'Giocatore 2',
        seat: 1,
        team: 2,
        isHost: false,
        score: 4,
        handCount: 3,
      },
    },
    turnOrder: ['p1_id', 'p2_id'],
    currentTurnPlayerId: 'p1_id',
    board: [],
    updatedAt: Date.now(),
  };

  // 1. Salva la stanza attiva sul server dev
  console.log('1️⃣  Inizializzazione partita attiva con Giocatore 1 e Giocatore 2...');
  await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/__api/rooms',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    initialRoom
  );

  // 2. Giocatore 1 abbandona la partita (chiamata leave)
  console.log('2️⃣  Giocatore 1 abbandona la partita (uscita o chiusura scheda)...');
  const leaveRes = await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: `/__api/rooms/${roomId}/leave`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { playerId: 'p1_id' }
  );

  console.log('   ✅ Risposta endpoint leave:', leaveRes.body);

  // 3. Rileggi lo stato della stanza
  console.log('3️⃣  Verifica stato stanza dopo l\'abbandono...');
  const roomRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/__api/rooms/${roomId}`,
    method: 'GET',
  });

  const updatedRoom = roomRes.body;
  console.log(`   • Fase Partita: "${updatedRoom.phase}"`);
  console.log(`   • Vincitore registrato: Squadra ${updatedRoom.winner?.team} (${updatedRoom.winner?.winnerNames?.join(', ')})`);
  console.log(`   • Messaggio Notifica: "${updatedRoom.lastActionMessage}"`);

  if (
    updatedRoom.phase === 'GAME_OVER' &&
    updatedRoom.winner?.winnerNames?.includes('Giocatore 2') &&
    updatedRoom.lastActionMessage?.includes('abbandonato')
  ) {
    console.log('\n🎉 TEST SUPERATO: La partita si è conclusa automaticamente e la vittoria è stata assegnata al giocatore rimasto!');
  } else {
    console.error('❌ ERRORE: La partita non si è conclusa come previsto:', updatedRoom);
    process.exit(1);
  }
}

testAbandonFlow().catch((err) => {
  console.error(err);
  process.exit(1);
});
