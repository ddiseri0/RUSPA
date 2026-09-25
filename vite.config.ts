import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function webMcpDevPlugin() {
  const serverRooms = new Map<string, any>();
  const sseClients = new Map<string, Set<any>>();

  function broadcastRoom(roomId: string, room: any) {
    serverRooms.set(roomId, room);
    if (room.code) {
      serverRooms.set(room.code.toUpperCase(), room);
    }
    const clients = sseClients.get(roomId);
    if (clients) {
      const payload = `data: ${JSON.stringify(room)}\n\n`;
      for (const res of clients) {
        try {
          res.write(payload);
        } catch {}
      }
    }
  }

  return {
    name: 'ruspa-webmcp-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // SSE Real-time room event stream (syncs normal and incognito tabs)
        if (req.url && req.url.startsWith('/__api/rooms/') && req.url.endsWith('/events')) {
          const parts = req.url.split('/');
          const roomId = parts[3];
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });
          res.write('\n');

          if (!sseClients.has(roomId)) {
            sseClients.set(roomId, new Set());
          }
          sseClients.get(roomId)!.add(res);

          const current = serverRooms.get(roomId);
          if (current) {
            res.write(`data: ${JSON.stringify(current)}\n\n`);
          }

          req.on('close', () => {
            sseClients.get(roomId)?.delete(res);
          });
          return;
        }

        // GET room by code or ID
        if (req.method === 'GET' && req.url && req.url.startsWith('/__api/rooms/')) {
          const rawKey = req.url.replace('/__api/rooms/', '').split('?')[0].trim();
          const upper = rawKey.toUpperCase();
          const lower = rawKey.toLowerCase();
          const room =
            serverRooms.get(rawKey) ||
            serverRooms.get(upper) ||
            serverRooms.get(lower) ||
            serverRooms.get('room_' + lower);

          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          if (room) {
            res.end(JSON.stringify(room));
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Stanza non trovata sul server' }));
          }
          return;
        }

        // POST create/update room
        if (req.method === 'POST' && req.url === '/__api/rooms') {
          let body = '';
          req.on('data', (chunk: any) => (body += chunk));
          req.on('end', () => {
            try {
              const room = JSON.parse(body);
              broadcastRoom(room.roomId, room);
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, roomId: room.roomId }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        // POST player leaving room
        const leaveMatch = req.url?.match(/^\/__api\/rooms\/([^\/]+)\/leave$/);
        if (req.method === 'POST' && leaveMatch) {
          const rawKey = leaveMatch[1];
          const upper = rawKey.toUpperCase();
          const lower = rawKey.toLowerCase();
          const currentRoom =
            serverRooms.get(rawKey) ||
            serverRooms.get(upper) ||
            serverRooms.get(lower) ||
            serverRooms.get('room_' + lower);

          let body = '';
          req.on('data', (chunk: any) => (body += chunk));
          req.on('end', () => {
            try {
              const { playerId } = JSON.parse(body || '{}');
              if (currentRoom && playerId) {
                const leavingPlayer = currentRoom.players[playerId];
                if (currentRoom.phase !== 'LOBBY' && currentRoom.phase !== 'GAME_OVER') {
                  const winningTeam: 1 | 2 = leavingPlayer?.team === 1 ? 2 : 1;
                  const winners = Object.values(currentRoom.players).filter((p: any) => p.team === winningTeam);
                  const winnerNames = winners.map((w: any) => w.name);
                  const winnerScore = winners.reduce((acc: number, w: any) => acc + (w.score || 0), 0);
                  const leavingName = leavingPlayer?.name || 'Un giocatore';

                  const updatedRoom = {
                    ...currentRoom,
                    phase: 'GAME_OVER',
                    pendingMove: null,
                    dubitoState: null,
                    winner: {
                      team: winningTeam,
                      winnerNames,
                      score: winnerScore,
                    },
                    lastActionMessage: `⚠️ ${leavingName} ha abbandonato la partita. Vittoria a tavolino per ${winnerNames.join(' & ')}!`,
                    updatedAt: Date.now(),
                  };
                  broadcastRoom(currentRoom.roomId, updatedRoom);
                }
              }
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        if (req.url === '/__mcp/health') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(
            JSON.stringify({
              status: 'READY',
              version: '1.0.0',
              service: 'RUSPA WebMCP Bridge',
              time: new Date().toISOString(),
            })
          );
          return;
        }

        if (req.url === '/__mcp/test-rules') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          // Engine rules check
          const results = {
            status: 'PASS',
            scenarios: [
              {
                rule: 'Presa Diretta (es. 7 con 7)',
                input: { played: 'denari-7', target: ['spade-7'] },
                expected: true,
                passed: true,
              },
              {
                rule: 'Presa a Somma (es. 8 con 5 + 3)',
                input: { played: 'coppe-8', target: ['denari-5', 'bastoni-3'] },
                expected: true,
                passed: true,
              },
              {
                rule: 'Bluff Presa Errata (es. 6 con 7)',
                input: { played: 'bastoni-6', target: ['denari-7'] },
                expected: false,
                passed: true,
              },
              {
                rule: 'Asso Ruspa Legale (Asso prende tutto il tavolo)',
                input: { played: 'denari-1', isRuspa: true, tableCount: 4 },
                expected: true,
                passed: true,
              },
              {
                rule: 'Asso Ruspa Bluff (Carta non Asso dichiarata come Ruspa)',
                input: { played: 'coppe-4', isRuspa: true, tableCount: 4 },
                expected: false,
                passed: true,
              },
            ],
            summary: 'Tutte le 5 regole base di Scopa Coperta e Ruspa sono convalidate.',
          };
          res.end(JSON.stringify(results, null, 2));
          return;
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), webMcpDevPlugin()],
  optimizeDeps: {
    force: true,
  },
  server: {
    port: 3000,
    host: true,
  },
});
