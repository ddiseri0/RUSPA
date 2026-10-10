import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { registraAvviso, registraErrore } from '../lib/registro';
import { RoomState, Player, Move, GameMode, Card, DubitoState, MancheDetail } from '../types/game';
import {
  preparaDistribuzioneIniziale,
  verifyCaptureLegitimacy,
  evaluateManchePoints,
  getCardLabel,
  SUIT_NAMES,
} from '../engine/scopaRules';

const ROOMS_COLLECTION = 'rooms';

// Mock storage for local offline testing or when Firebase env is not yet filled
const localRooms: Map<string, RoomState> = new Map();
const localListeners: Map<string, Set<(room: RoomState) => void>> = new Map();

const syncChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('ruspa_local_sync')
    : null;

if (syncChannel) {
  syncChannel.onmessage = event => {
    if (event.data?.type === 'SYNC_ROOM' && event.data.room) {
      const room = event.data.room as RoomState;
      localRooms.set(room.roomId, room);
      localRooms.set(room.code, room);
      notifyLocalListeners(room.roomId, room);
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key && e.key.startsWith('ruspa_room_') && e.newValue) {
      try {
        const room = JSON.parse(e.newValue) as RoomState;
        localRooms.set(room.roomId, room);
        localRooms.set(room.code, room);
        notifyLocalListeners(room.roomId, room);
      } catch {}
    }
  });
}

function notifyLocalListeners(roomId: string, room: RoomState) {
  const listeners = localListeners.get(roomId);
  if (listeners) {
    listeners.forEach(cb => cb({ ...room }));
  }
}

function sanificaIdStanza(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
}

function calcolaSquadra(modo: GameMode, posto: number): 1 | 2 {
  if (modo === '2v2') {
    return posto % 2 === 0 ? 1 : 2;
  }
  return posto === 0 ? 1 : 2;
}

function ottieniNumeroCasualeSicuro(massimoEscluso: number): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % massimoEscluso;
  }
  return Math.floor(Math.random() * massimoEscluso);
}

function ottieniFloatCasuale(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }
  return Math.random();
}

function saveLocalRoom(roomId: string, code: string, room: RoomState) {
  const safeRoomId = sanificaIdStanza(roomId);
  const safeCode = sanificaIdStanza(code);
  if (!safeRoomId) return;

  localRooms.set(safeRoomId, room);
  if (safeCode) localRooms.set(safeCode, room);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`ruspa_room_${safeRoomId}`, JSON.stringify(room));
      if (safeCode) {
        localStorage.setItem(`ruspa_code_${safeCode}`, safeRoomId);
      }
    } catch {}
  }
  syncChannel?.postMessage({ type: 'SYNC_ROOM', roomId: safeRoomId, room });
  notifyLocalListeners(safeRoomId, room);
}

function getLocalRoom(codeOrId: string): RoomState | null {
  const safeInput = sanificaIdStanza(codeOrId);
  if (!safeInput) return null;
  const clean = safeInput.toUpperCase();
  if (localRooms.has(clean)) return localRooms.get(clean)!;
  if (localRooms.has('room_' + clean.toLowerCase()))
    return localRooms.get('room_' + clean.toLowerCase())!;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const mappedId = sanificaIdStanza(localStorage.getItem(`ruspa_code_${clean}`) || '');
      const raw =
        localStorage.getItem(`ruspa_room_${mappedId || clean}`) ||
        localStorage.getItem(`ruspa_room_room_${clean.toLowerCase()}`);
      if (raw) {
        const parsed = JSON.parse(raw) as RoomState;
        localRooms.set(parsed.roomId, parsed);
        localRooms.set(parsed.code, parsed);
        return parsed;
      }
    } catch {}
  }
  return null;
}

/**
 * Generate a clean 6-digit room code (e.g. "RUS-42" or "742891")
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(ottieniNumeroCasualeSicuro(chars.length));
  }
  return result;
}

/**
 * Creates a new room on Firestore
 */
export async function createRoom(host: Player, mode: GameMode): Promise<RoomState> {
  const code = generateRoomCode();
  const roomId = 'room_' + code.toLowerCase();

  const initialRoom: RoomState = {
    roomId,
    code,
    mode,
    phase: 'LOBBY',
    hostId: host.id,
    players: {
      [host.id]: {
        ...host,
        seat: 0,
        team: 1,
        isHost: true,
        isReady: true,
        handCount: 0,
        capturedCount: 0,
        scopaCount: 0,
        score: 0,
      },
    },
    turnOrder: [host.id],
    currentTurnPlayerId: host.id,
    board: [],
    deckRemaining: 40,
    pendingMove: null,
    dubitoState: null,
    lastCapturePlayerId: null,
    lastActionMessage: `Stanza creata con successo. Codice: ${code}`,
    updatedAt: Date.now(),
  };

  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await setDoc(roomRef, initialRoom);
  } else {
    // Sync to dev server hub so Incognito windows and other clients find it immediately
    if (typeof window !== 'undefined') {
      try {
        await fetch('/__api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialRoom),
        });
      } catch {}
    }
    saveLocalRoom(roomId, code, initialRoom);
  }

  return initialRoom;
}

/**
 * Joins an existing room by code or ID
 */
export async function joinRoom(roomCodeOrId: string, player: Player): Promise<RoomState | null> {
  const safeKey = sanificaIdStanza(roomCodeOrId);
  if (!safeKey) return null;
  const cleanKey = safeKey.toUpperCase();

  if (isFirebaseConfigured && db) {
    // Search by code or by direct document ID
    let roomRef = doc(db, ROOMS_COLLECTION, 'room_' + cleanKey.toLowerCase());
    let snap = await getDoc(roomRef);

    if (!snap.exists()) {
      // Query by code field
      const q = query(collection(db, ROOMS_COLLECTION), where('code', '==', cleanKey));
      const querySnap = await getDocs(q);
      if (querySnap.empty) {
        return null;
      }
      snap = querySnap.docs[0];
      roomRef = snap.ref;
    }

    const room = snap.data() as RoomState;
    const maxPlayers = room.mode === '2v2' ? 4 : 2;
    const currentCount = Object.keys(room.players).length;

    if (currentCount >= maxPlayers && !room.players[player.id]) {
      throw new Error('La stanza è già piena');
    }

    // Determine team and seat
    const seat = currentCount;
    const team: 1 | 2 = calcolaSquadra(room.mode, seat);

    const updatedPlayers = {
      ...room.players,
      [player.id]: {
        ...player,
        seat,
        team,
        isHost: room.hostId === player.id,
        isReady: true,
        handCount: 0,
        capturedCount: 0,
        scopaCount: 0,
        score: 0,
      },
    };

    const updatedTurnOrder = Object.keys(updatedPlayers);

    const updatedRoom: RoomState = {
      ...room,
      players: updatedPlayers,
      turnOrder: updatedTurnOrder,
      lastActionMessage: `${player.name} è entrato nella stanza.`,
      updatedAt: Date.now(),
    };

    await setDoc(roomRef, updatedRoom);

    return updatedRoom;
  } else {
    // Local memory fallback
    let room = getLocalRoom(cleanKey);
    if (!room && typeof window !== 'undefined') {
      // Fetch from dev server hub (allows Incognito window to find room created in normal window)
      try {
        const res = await fetch(`/__api/rooms/${encodeURIComponent(cleanKey)}`);
        if (res.ok) {
          room = await res.json();
        }
      } catch (err) {
        registraAvviso('[joinRoom] Dev server lookup error:', err);
      }
    }
    if (!room) return null;

    const currentCount = Object.keys(room.players).length;
    const seat = currentCount;
    const team: 1 | 2 = calcolaSquadra(room.mode, seat);

    room.players[player.id] = {
      ...player,
      seat,
      team,
      isHost: room.hostId === player.id,
      isReady: true,
      handCount: 0,
      capturedCount: 0,
      scopaCount: 0,
      score: 0,
    };
    room.turnOrder = Object.keys(room.players);
    room.lastActionMessage = `${player.name} è entrato nella stanza.`;
    room.updatedAt = Date.now();

    // Broadcast updated room to dev server
    if (typeof window !== 'undefined') {
      try {
        await fetch('/__api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(room),
        });
      } catch {}
    }

    saveLocalRoom(room.roomId, room.code, room);
    return room;
  }
}

/**
 * Handles a player leaving the room:
 * - If match is in progress (phase !== 'LOBBY' and phase !== 'GAME_OVER'):
 *   Game ends immediately by abandonment/forfeit; victory is awarded to the opponent/opposing team!
 * - If in LOBBY:
 *   Player is removed from players and turnOrder.
 */
export async function leaveRoom(
  roomId: string,
  currentRoom: RoomState,
  leavingPlayerId: string
): Promise<void> {
  const leavingPlayer = currentRoom.players[leavingPlayerId];

  // If game is in progress, forfeit immediately!
  if (currentRoom.phase !== 'LOBBY' && currentRoom.phase !== 'GAME_OVER') {
    const winningTeam: 1 | 2 = leavingPlayer?.team === 1 ? 2 : 1;
    const winners = Object.values(currentRoom.players).filter(p => p.team === winningTeam);
    const winnerNames = winners.map(w => w.name);
    const winnerScore = winners.reduce((acc, w) => acc + (w.score || 0), 0);
    const leavingName = leavingPlayer?.name || 'Un giocatore';

    const updateData: Partial<RoomState> = {
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

    await updateRoomData(roomId, updateData);
    return;
  }

  // If in LOBBY, simply remove player
  if (currentRoom.phase === 'LOBBY') {
    const updatedPlayers = { ...currentRoom.players };
    delete updatedPlayers[leavingPlayerId];

    const updatedTurnOrder = currentRoom.turnOrder.filter(id => id !== leavingPlayerId);
    let nextHostId = currentRoom.hostId;

    if (currentRoom.hostId === leavingPlayerId && updatedTurnOrder.length > 0) {
      nextHostId = updatedTurnOrder[0];
      if (updatedPlayers[nextHostId]) {
        updatedPlayers[nextHostId].isHost = true;
      }
    }

    const updateData: Partial<RoomState> = {
      players: updatedPlayers,
      turnOrder: updatedTurnOrder,
      hostId: nextHostId,
      lastActionMessage: `${leavingPlayer?.name || 'Un giocatore'} ha lasciato la stanza.`,
      updatedAt: Date.now(),
    };

    await updateRoomData(roomId, updateData);
  }
}

const RITARDO_BASE_RISOTTOSCRIZIONE_MS = 1000;
const RITARDO_MASSIMO_RISOTTOSCRIZIONE_MS = 30000;

/**
 * Subscribes to realtime updates of a room
 *
 * Ciclo di vita del listener:
 * - Un errore di `onSnapshot` è terminale (il listener viene chiuso dall'SDK, es. token Auth
 *   scaduto durante un cambio di rete): si riattiva con backoff esponenziale e jitter.
 * - Dopo la disiscrizione nessuna callback può più raggiungere la UI (flag `attivo`),
 *   evitando setState su componenti smontati e listener fantasma.
 */
function sottoscriviStanzaFirestore(
  roomId: string,
  onUpdate: (room: RoomState) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let attivo = true;
  const roomRef = doc(db!, ROOMS_COLLECTION, roomId);
  let annullaSnapshot: Unsubscribe | null = null;
  let timerRiprova: ReturnType<typeof setTimeout> | null = null;
  let tentativi = 0;

  const sottoscrivi = () => {
    if (!attivo) return;
    annullaSnapshot = onSnapshot(
      roomRef,
      snapshot => {
        if (!attivo) return;
        tentativi = 0;
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as RoomState);
        }
      },
      error => {
        if (!attivo) return;
        registraErrore('Firestore listener error:', error);
        annullaSnapshot = null;
        if (error.code === 'permission-denied' && tentativi >= 3) {
          onError?.(error);
          return;
        }
        const ritardo = Math.min(
          RITARDO_MASSIMO_RISOTTOSCRIZIONE_MS,
          RITARDO_BASE_RISOTTOSCRIZIONE_MS * 2 ** tentativi
        );
        tentativi++;
        timerRiprova = setTimeout(sottoscrivi, ritardo * (0.75 + ottieniFloatCasuale() * 0.5));
      }
    );
  };

  sottoscrivi();

  return () => {
    attivo = false;
    if (timerRiprova) clearTimeout(timerRiprova);
    annullaSnapshot?.();
    annullaSnapshot = null;
  };
}

function sottoscriviStanzaLocale(roomId: string, onUpdate: (room: RoomState) => void): Unsubscribe {
  let attivo = true;
  const onUpdateProtetto = (r: RoomState) => {
    if (attivo) onUpdate(r);
  };
  if (!localListeners.has(roomId)) {
    localListeners.set(roomId, new Set());
  }
  localListeners.get(roomId)!.add(onUpdateProtetto);

  const room = getLocalRoom(roomId);
  let timerIniziale: ReturnType<typeof setTimeout> | null = null;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  if (room) {
    timerIniziale = setTimeout(() => onUpdateProtetto({ ...room }), 0);
  } else if (typeof window !== 'undefined') {
    fetch(`/__api/rooms/${encodeURIComponent(roomId)}`, { signal: controller?.signal })
      .then(r => r.json())
      .then(r => {
        if (attivo && r?.roomId) {
          saveLocalRoom(r.roomId, r.code, r);
        }
      })
      .catch(() => {});
  }

  // Connect Server-Sent Events stream from dev server for real-time cross-window sync
  let eventSource: EventSource | null = null;
  if (typeof window !== 'undefined' && 'EventSource' in window) {
    try {
      eventSource = new EventSource(`/__api/rooms/${encodeURIComponent(roomId)}/events`);
      eventSource.onmessage = event => {
        try {
          const updated = JSON.parse(event.data);
          if (updated && updated.roomId === roomId) {
            localRooms.set(roomId, updated);
            localRooms.set(updated.code, updated);
            notifyLocalListeners(roomId, updated);
          }
        } catch {}
      };
    } catch {}
  }

  return () => {
    attivo = false;
    if (timerIniziale) clearTimeout(timerIniziale);
    controller?.abort();
    const insieme = localListeners.get(roomId);
    insieme?.delete(onUpdateProtetto);
    if (insieme?.size === 0) localListeners.delete(roomId);
    if (eventSource) {
      eventSource.close();
    }
  };
}

/**
 * Subscribes to realtime updates of a room
 *
 * Ciclo di vita del listener:
 * - Un errore di `onSnapshot` è terminale (il listener viene chiuso dall'SDK, es. token Auth
 *   scaduto durante un cambio di rete): si riattiva con backoff esponenziale e jitter.
 * - Dopo la disiscrizione nessuna callback può più raggiungere la UI (flag `attivo`),
 *   evitando setState su componenti smontati e listener fantasma.
 */
export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: RoomState) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const safeId = sanificaIdStanza(roomId);
  if (!safeId) {
    return () => {};
  }

  if (isFirebaseConfigured && db) {
    return sottoscriviStanzaFirestore(safeId, onUpdate, onError);
  }
  return sottoscriviStanzaLocale(safeId, onUpdate);
}

/**
 * Deals cards to start a match
 * Neapolitan deck: 40 cards total.
 * 4 cards face-up to table, 3 cards dealt to each player.
 * Remaining cards stay in deck to be dealt in batches of 3 when hands are empty.
 */
export async function startMatch(roomId: string, currentRoom: RoomState): Promise<void> {
  const { mazzo: fullDeck, tavolo: board } = preparaDistribuzioneIniziale();
  const playerIds = Object.keys(currentRoom.players);

  // Distribute 3 cards to each player
  const privateHands: Record<string, Card[]> = {};
  playerIds.forEach(pid => {
    privateHands[pid] = fullDeck.splice(0, 3);
  });

  const updatedPlayers = { ...currentRoom.players };
  playerIds.forEach(pid => {
    updatedPlayers[pid] = {
      ...updatedPlayers[pid],
      handCount: 3,
      capturedCount: 0,
      scopaCount: 0,
      score: 0,
    };
  });

  const capturedPiles: Record<string, Card[]> = {};
  playerIds.forEach(pid => {
    capturedPiles[pid] = [];
  });

  const updateData: Partial<RoomState> = {
    phase: 'PLAYER_TURN',
    board,
    players: updatedPlayers,
    turnOrder: playerIds,
    privateHands,
    deck: fullDeck,
    deckRemaining: fullDeck.length,
    capturedPiles,
    dealerIndex: 0,
    mancheNumber: 1,
    teamScores: { 1: 0, 2: 0 },
    winner: null,
    currentTurnPlayerId: playerIds[0],
    lastCapturePlayerId: null,
    lastActionMessage: 'Partita iniziata! Mazzo da 40 carte, 3 carte a testa e 4 a terra.',
    updatedAt: Date.now(),
  };

  await updateRoomData(roomId, updateData);
}

/**
 * Submits a move:
 * - If isDiscardFaceUp (playing a card to the table without capture):
 *   Card is played face-up directly to the board, does NOT activate Dubito, turn advances immediately.
 * - Normal capture or Ruspa:
 *   Card is played face-down and activates the Dubito challenge window.
 */
export async function submitCoveredMove(
  roomId: string,
  currentRoom: RoomState,
  move: Move
): Promise<void> {
  const player = currentRoom.players[move.playerId];
  if (!player) return;

  // Remove played card from private hand
  const currentHand = currentRoom.privateHands?.[move.playerId] || [];
  const cardIndex = currentHand.findIndex(
    c =>
      c.id === move.playedCard.id ||
      ((c.valore ?? c.value) === (move.playedCard.valore ?? move.playedCard.value) &&
        (c.seme ?? c.suit) === (move.playedCard.seme ?? move.playedCard.suit))
  );
  const updatedHand =
    cardIndex >= 0
      ? [...currentHand.slice(0, cardIndex), ...currentHand.slice(cardIndex + 1)]
      : currentHand.filter(c => c.id !== move.playedCard.id);

  const updatedPlayers = {
    ...currentRoom.players,
    [move.playerId]: {
      ...player,
      handCount: updatedHand.length,
    },
  };

  const updatedRoomWithHand: RoomState = {
    ...currentRoom,
    players: updatedPlayers,
    privateHands: {
      ...(currentRoom.privateHands || {}),
      [move.playerId]: updatedHand,
    },
  };

  // Requirement 2: Giocata a terra (Scarto)
  // Se un giocatore gioca una carta solo per lasciarla a terra (senza prendere nulla),
  // la carta NON deve essere coperta. Viene mostrata a faccia in su e NON attiva la meccanica del "Dubito".
  if (move.isDiscardFaceUp) {
    const updatedBoard = [...currentRoom.board, move.playedCard];
    const cardName = `${getCardLabel(move.playedCard.value)} di ${SUIT_NAMES[move.playedCard.suit]}`;
    const actionMessage = `${move.playerName} ha calato a terra ${cardName} (scoperta).`;

    await advanceGameAfterMove(
      roomId,
      updatedRoomWithHand,
      updatedBoard,
      updatedPlayers,
      currentRoom.capturedPiles || {},
      actionMessage,
      move.playerId,
      false
    );
    return;
  }

  // Normal capture or Ruspa: Covered move -> triggers Dubito window
  const targetTeam: 1 | 2 = player.team === 1 ? 2 : 1;

  const dubitoState: DubitoState = {
    active: true,
    move,
    initiatorId: move.playerId,
    targetTeam,
    votes: {},
    expiresAt: Date.now() + 10000, // 10 secondi di finestra per il Dubito
    status: 'PENDING',
  };

  const moveDesc = move.isRuspa
    ? `${move.playerName} ha giocato un ASSO RUSPA coperto! Pulisce il tavolo?`
    : `${move.playerName} ha giocato una carta coperta prendendo ${move.targetCardIds.length} carta/e!`;

  const updateData: Partial<RoomState> = {
    phase: 'DUBITO_WINDOW',
    pendingMove: move,
    dubitoState,
    players: updatedPlayers,
    privateHands: {
      ...currentRoom.privateHands,
      [move.playerId]: updatedHand,
    },
    scopaeEvent: null,
    dubitoEvent: null,
    lastActionMessage: moveDesc,
    updatedAt: Date.now(),
  };

  await updateRoomData(roomId, updateData);
}

/**
 * Casts a vote for Dubito or Passa
 */
export async function submitDubitoVote(
  roomId: string,
  currentRoom: RoomState,
  voterId: string,
  vote: 'DUBITO' | 'PASSA'
): Promise<void> {
  if (!currentRoom.dubitoState || !currentRoom.dubitoState.active) return;

  const updatedVotes = {
    ...currentRoom.dubitoState.votes,
    [voterId]: vote,
  };

  // If anyone called DUBITO, immediately resolve challenge
  if (vote === 'DUBITO') {
    await resolveDubitoChallenge(roomId, currentRoom, voterId);
    return;
  }

  // Check if all opposing team members have passed
  const opposingPlayers = Object.values(currentRoom.players).filter(
    p => p.team === currentRoom.dubitoState!.targetTeam
  );
  const allPassed = opposingPlayers.every(p => updatedVotes[p.id] === 'PASSA');

  if (allPassed) {
    await resolvePassMove(roomId, currentRoom);
  } else {
    await updateRoomData(roomId, {
      dubitoState: {
        ...currentRoom.dubitoState,
        votes: updatedVotes,
      },
      updatedAt: Date.now(),
    });
  }
}

/**
 * Resolves a move when Dubito is triggered: reveals the card and evaluates bluff vs truth
 * Requirement 5: Dubito = Scopa
 * Chi vince la contestazione del "Dubito" ottiene a tutti gli effetti una Scopa (+1 punto e +1 scopaCount).
 */
export async function resolveDubitoChallenge(
  roomId: string,
  currentRoom: RoomState,
  challengerId: string
): Promise<void> {
  const { pendingMove } = currentRoom;
  if (!pendingMove) return;

  const challenger = currentRoom.players[challengerId];
  const mover = currentRoom.players[pendingMove.playerId];
  if (!challenger || !mover) return;

  let targetCards: Card[] = [];
  if (pendingMove.isRuspa) {
    targetCards = [...currentRoom.board];
  } else {
    targetCards = currentRoom.board.filter(c => pendingMove.targetCardIds.includes(c.id));
  }

  const verification = verifyCaptureLegitimacy(
    pendingMove.playedCard,
    targetCards,
    pendingMove.isRuspa,
    currentRoom.board.length,
    currentRoom.board
  );

  let newBoard = [...currentRoom.board];
  const updatedPlayers = { ...currentRoom.players };
  const updatedCapturedPiles = { ...(currentRoom.capturedPiles || {}) };
  let actionMessage = '';
  let winningTakerId = '';
  const allCapturedCards = [pendingMove.playedCard, ...targetCards];
  let captureOccurred = false;
  const cardName = `${getCardLabel(pendingMove.playedCard.value)} di ${SUIT_NAMES[pendingMove.playedCard.suit]}`;

  let isScopaCapture = false;
  let pointsAwarded = 1;
  let scopaeTriggered = false;
  const wasBluff = !verification.isLegal;

  if (wasBluff) {
    // Bluff exposed! Challenger wins +1 point / Scopa!
    winningTakerId = challengerId;
    captureOccurred = false;
    pointsAwarded = 1;
    actionMessage = `🚨 DUBITO RIUSCITO! ${challenger.name} ha smascherato il bluff di ${pendingMove.playerName} (+1 pt)!`;

    updatedPlayers[challengerId] = {
      ...updatedPlayers[challengerId],
      score: updatedPlayers[challengerId].score + 1,
      scopaCount: updatedPlayers[challengerId].scopaCount + 1,
    };
    newBoard = [...currentRoom.board, pendingMove.playedCard];
  } else {
    // Played card was legal! Challenger loses, Mover wins!
    winningTakerId = pendingMove.playerId;
    captureOccurred = true;

    isScopaCapture =
      !pendingMove.isRuspa &&
      (Boolean(pendingMove.isDeclaredScopa) ||
        (targetCards.length === currentRoom.board.length && currentRoom.board.length > 0));

    if (isScopaCapture) {
      pointsAwarded = 2;
      scopaeTriggered = true;
      actionMessage = `💥 SCOPEE! ${pendingMove.playerName} ha fatto SCOPA e ${challenger.name} ha dubitato a torto (+2 Punti)!`;
    } else {
      actionMessage = `❌ DUBITO FALLITO! La mossa di ${pendingMove.playerName} era valida (${cardName})! (+1 pt per ${pendingMove.playerName})`;
    }

    updatedPlayers[pendingMove.playerId] = {
      ...updatedPlayers[pendingMove.playerId],
      score: updatedPlayers[pendingMove.playerId].score + pointsAwarded,
      scopaCount: updatedPlayers[pendingMove.playerId].scopaCount + pointsAwarded,
      capturedCount:
        (updatedPlayers[pendingMove.playerId].capturedCount || 0) + allCapturedCards.length,
    };
    updatedCapturedPiles[pendingMove.playerId] = [
      ...(updatedCapturedPiles[pendingMove.playerId] || []),
      ...allCapturedCards,
    ];
    if (pendingMove.isRuspa) {
      newBoard = [];
    } else {
      newBoard = newBoard.filter(c => !pendingMove.targetCardIds.includes(c.id));
    }
  }

  const roomWithoutPending: RoomState = {
    ...currentRoom,
    pendingMove: null,
    dubitoState: null,
    scopaeEvent: null,
    dubitoEvent: {
      result: wasBluff ? 'RIUSCITO' : 'FALLITO',
      winnerId: winningTakerId,
      winnerName: winningTakerId === challengerId ? challenger.name : pendingMove.playerName,
      points: pointsAwarded,
      isScopae: scopaeTriggered,
      timestamp: Date.now(),
    },
  };

  await advanceGameAfterMove(
    roomId,
    roomWithoutPending,
    newBoard,
    updatedPlayers,
    updatedCapturedPiles,
    actionMessage,
    winningTakerId,
    captureOccurred
  );
}

/**
 * Finalizes the resolution of a Dubito challenge and advances the game
 */
export async function finalizeDubitoResolution(
  roomId: string,
  currentRoom: RoomState
): Promise<void> {
  const { pendingMove, dubitoState } = currentRoom;
  if (!pendingMove || dubitoState?.status !== 'RESOLVED' || !dubitoState?.resolution) {
    return;
  }

  const res = dubitoState.resolution;
  let targetCards: Card[] = [];
  if (pendingMove.isRuspa) {
    targetCards = [...currentRoom.board];
  } else {
    targetCards = currentRoom.board.filter(c => pendingMove.targetCardIds.includes(c.id));
  }

  let newBoard = [...currentRoom.board];
  const updatedPlayers = { ...currentRoom.players };
  const updatedCapturedPiles = { ...(currentRoom.capturedPiles || {}) };
  const allCapturedCards = [pendingMove.playedCard, ...targetCards];
  let captureOccurred = false;

  if (res.wasBluff) {
    // Bluff exposed: challenger won +1 point / Scopa
    captureOccurred = false;
    if (updatedPlayers[res.challengerId]) {
      updatedPlayers[res.challengerId] = {
        ...updatedPlayers[res.challengerId],
        score: updatedPlayers[res.challengerId].score + res.pointsAwarded,
        scopaCount: updatedPlayers[res.challengerId].scopaCount + res.pointsAwarded,
      };
    }
    // Le carte a terra rimangono tutte sul tavolo e si aggiunge la carta giocata scoperta
    newBoard = [...currentRoom.board, pendingMove.playedCard];
  } else {
    // Legal move: mover won points
    captureOccurred = true;
    if (updatedPlayers[res.moverId]) {
      updatedPlayers[res.moverId] = {
        ...updatedPlayers[res.moverId],
        score: updatedPlayers[res.moverId].score + res.pointsAwarded,
        scopaCount: updatedPlayers[res.moverId].scopaCount + res.pointsAwarded,
        capturedCount: (updatedPlayers[res.moverId].capturedCount || 0) + allCapturedCards.length,
      };
    }
    updatedCapturedPiles[res.moverId] = [
      ...(updatedCapturedPiles[res.moverId] || []),
      ...allCapturedCards,
    ];
    if (pendingMove.isRuspa) {
      newBoard = [];
    } else {
      newBoard = newBoard.filter(c => !pendingMove.targetCardIds.includes(c.id));
    }
  }

  const roomWithoutPending: RoomState = {
    ...currentRoom,
    pendingMove: null,
    dubitoState: null,
    scopaeEvent: res.isScopae
      ? {
          winnerId: res.moverId,
          winnerName: res.moverName,
          points: 2,
          timestamp: Date.now(),
        }
      : null,
  };

  await advanceGameAfterMove(
    roomId,
    roomWithoutPending,
    newBoard,
    updatedPlayers,
    updatedCapturedPiles,
    currentRoom.lastActionMessage,
    res.winnerPlayerId,
    captureOccurred
  );
}

/**
 * Resolves a move when Dubito window expires or everyone passes: move succeeds as declared!
 */
export async function resolvePassMove(roomId: string, currentRoom: RoomState): Promise<void> {
  const { pendingMove } = currentRoom;
  if (!pendingMove) return;

  let newBoard = [...currentRoom.board];
  const updatedPlayers = { ...currentRoom.players };
  const updatedCapturedPiles = { ...(currentRoom.capturedPiles || {}) };
  const moverId = pendingMove.playerId;
  const player = updatedPlayers[moverId];
  if (!player) return;

  let actionMessage = '';
  let captureOccurred = false;

  if (pendingMove.isRuspa) {
    // Swept the entire board!
    captureOccurred = true;
    const allCapturedCards = [pendingMove.playedCard, ...newBoard];
    updatedCapturedPiles[moverId] = [...(updatedCapturedPiles[moverId] || []), ...allCapturedCards];
    // REGOLE LA RUSPA: L'Asso Ruspa prende tutto il tavolo ma NON assegna MAI punto di Scopa!
    updatedPlayers[moverId] = {
      ...player,
      capturedCount: player.capturedCount + allCapturedCards.length,
    };
    newBoard = [];
    actionMessage = `✨ RUSPA COMPLETATA! ${player.name} pulisce l'intero tavolo (nessun punto Scopa per la Ruspa).`;
  } else if (pendingMove.targetCardIds.length > 0) {
    captureOccurred = true;
    const targetCards = newBoard.filter(c => pendingMove.targetCardIds.includes(c.id));
    const allCapturedCards = [pendingMove.playedCard, ...targetCards];
    newBoard = newBoard.filter(c => !pendingMove.targetCardIds.includes(c.id));

    updatedCapturedPiles[moverId] = [...(updatedCapturedPiles[moverId] || []), ...allCapturedCards];

    // Verifica se è l'ultima mano/giocata del mazzo da 40 carte (non è scopa)
    const isLastPlayOfDeck =
      (currentRoom.deckRemaining === 0 || !currentRoom.deck || currentRoom.deck.length === 0) &&
      Object.values(updatedPlayers).every(p => p.handCount === 0);

    if (newBoard.length === 0) {
      if (!isLastPlayOfDeck) {
        updatedPlayers[moverId] = {
          ...player,
          score: player.score + 1,
          scopaCount: player.scopaCount + 1,
          capturedCount: player.capturedCount + allCapturedCards.length,
        };
        actionMessage = `✨ SCOPA! ${player.name} ha svuotato il tavolo (+1 Scopa)!`;
      } else {
        updatedPlayers[moverId] = {
          ...player,
          capturedCount: player.capturedCount + allCapturedCards.length,
        };
        actionMessage = `${player.name} ha preso tutte le carte nell'ultima mano del mazzo (nessuna Scopa).`;
      }
    } else {
      updatedPlayers[moverId] = {
        ...player,
        capturedCount: player.capturedCount + allCapturedCards.length,
      };
      actionMessage = `${player.name} ha preso ${targetCards.length} carta/e a terra indisturbato.`;
    }
  } else {
    newBoard.push(pendingMove.playedCard);
    actionMessage = `${player.name} ha lasciato la carta a terra.`;
  }

  const roomWithoutPending: RoomState = {
    ...currentRoom,
    pendingMove: null,
    dubitoState: null,
    scopaeEvent: null,
  };

  await advanceGameAfterMove(
    roomId,
    roomWithoutPending,
    newBoard,
    updatedPlayers,
    updatedCapturedPiles,
    actionMessage,
    moverId,
    captureOccurred
  );
}

/**
 * Advances game state after a move or dubito resolution:
 * - Checks if cards were captured
 * - If hands are empty: deals next 3 cards or triggers End of Manche (after 40 cards)
 * - Rotates turn or rotates dealer upon new manche
 * - Evaluates 21-point victory condition at end of manche
 */
export async function advanceGameAfterMove(
  roomId: string,
  room: RoomState,
  newBoard: Card[],
  updatedPlayers: Record<string, Player>,
  updatedCapturedPiles: Record<string, Card[]>,
  actionMessage: string,
  moverOrTakerId: string,
  captureOccurred: boolean
): Promise<void> {
  const lastCapturePlayerId = captureOccurred ? moverOrTakerId : room.lastCapturePlayerId || null;

  // Check if all players have 0 cards in hand
  const allHandsEmpty = Object.values(updatedPlayers).every(p => p.handCount === 0);

  if (!allHandsEmpty) {
    // Normal turn advance
    const turnOrder =
      room.turnOrder && room.turnOrder.length > 0 ? room.turnOrder : Object.keys(updatedPlayers);
    const currentIndex = turnOrder.indexOf(room.currentTurnPlayerId);
    const nextPlayerId =
      currentIndex >= 0 ? turnOrder[(currentIndex + 1) % turnOrder.length] : turnOrder[0];

    await updateRoomData(roomId, {
      phase: 'PLAYER_TURN',
      pendingMove: null,
      dubitoState: null,
      scopaeEvent: room.scopaeEvent || null,
      dubitoEvent: room.dubitoEvent || null,
      board: newBoard,
      players: updatedPlayers,
      privateHands: room.privateHands,
      capturedPiles: updatedCapturedPiles,
      currentTurnPlayerId: nextPlayerId,
      lastCapturePlayerId,
      lastActionMessage: actionMessage,
      updatedAt: Date.now(),
    });
    return;
  }

  // All hands are empty! Check deck
  const currentDeck = room.deck ? [...room.deck] : [];

  if (currentDeck.length > 0) {
    // Deal 3 more cards to each player
    const freshHands: Record<string, Card[]> = { ...(room.privateHands || {}) };
    const playersWithNewHands = { ...updatedPlayers };

    const turnOrder =
      room.turnOrder && room.turnOrder.length > 0 ? room.turnOrder : Object.keys(updatedPlayers);

    turnOrder.forEach(pid => {
      const dealt = currentDeck.splice(0, 3);
      freshHands[pid] = dealt;
      playersWithNewHands[pid] = {
        ...playersWithNewHands[pid],
        handCount: dealt.length,
      };
    });

    const currentIndex = turnOrder.indexOf(room.currentTurnPlayerId);
    const nextPlayerId =
      currentIndex >= 0 ? turnOrder[(currentIndex + 1) % turnOrder.length] : turnOrder[0];

    await updateRoomData(roomId, {
      phase: 'PLAYER_TURN',
      pendingMove: null,
      dubitoState: null,
      scopaeEvent: room.scopaeEvent || null,
      dubitoEvent: room.dubitoEvent || null,
      board: newBoard,
      players: playersWithNewHands,
      privateHands: freshHands,
      deck: currentDeck,
      deckRemaining: currentDeck.length,
      capturedPiles: updatedCapturedPiles,
      currentTurnPlayerId: nextPlayerId,
      lastCapturePlayerId,
      lastActionMessage: `${actionMessage} | 🂠 Nuova mano distribuita (3 carte a testa)!`,
      updatedAt: Date.now(),
    });
    return;
  }

  // currentDeck.length === 0: ALL 40 CARDS PLAYED! END OF MANCHE!
  let finalBoard = [...newBoard];
  const finalCapturedPiles = { ...updatedCapturedPiles };
  const finalPlayers = { ...updatedPlayers };

  if (finalBoard.length > 0 && lastCapturePlayerId && finalPlayers[lastCapturePlayerId]) {
    finalCapturedPiles[lastCapturePlayerId] = [
      ...(finalCapturedPiles[lastCapturePlayerId] || []),
      ...finalBoard,
    ];
    finalPlayers[lastCapturePlayerId] = {
      ...finalPlayers[lastCapturePlayerId],
      capturedCount: finalPlayers[lastCapturePlayerId].capturedCount + finalBoard.length,
    };
    actionMessage += ` | ${finalPlayers[lastCapturePlayerId].name} prende le ultime ${finalBoard.length} carte a terra.`;
    finalBoard = [];
  }

  // Tally manche classic points
  const team1Cards: Card[] = [];
  const team2Cards: Card[] = [];
  Object.values(finalPlayers).forEach(p => {
    const pile = finalCapturedPiles[p.id] || [];
    if (p.team === 1) team1Cards.push(...pile);
    else team2Cards.push(...pile);
  });

  const team1Scope = Object.values(finalPlayers)
    .filter(p => p.team === 1)
    .reduce((acc, p) => acc + (p.scopaCount || 0), 0);
  const team2Scope = Object.values(finalPlayers)
    .filter(p => p.team === 2)
    .reduce((acc, p) => acc + (p.scopaCount || 0), 0);

  const mancheResult = evaluateManchePoints(team1Cards, team2Cards, team1Scope, team2Scope);

  const team1Classic =
    mancheResult.p1Points.carte +
    mancheResult.p1Points.denari +
    mancheResult.p1Points.settebello +
    mancheResult.p1Points.primiera;

  const team2Classic =
    mancheResult.p2Points.carte +
    mancheResult.p2Points.denari +
    mancheResult.p2Points.settebello +
    mancheResult.p2Points.primiera;

  // Add classic points to players (first player of each team)
  const team1Players = Object.values(finalPlayers).filter(p => p.team === 1);
  const team2Players = Object.values(finalPlayers).filter(p => p.team === 2);

  if (team1Players[0]) {
    team1Players[0].score += team1Classic;
  }
  if (team2Players[0]) {
    team2Players[0].score += team2Classic;
  }

  const totalScore1 = team1Players.reduce((acc, p) => acc + (p.score || 0), 0);
  const totalScore2 = team2Players.reduce((acc, p) => acc + (p.score || 0), 0);

  const summaryText = mancheResult.summary.join(' • ');
  const currentManche = room.mancheNumber || 1;

  // Check victory condition: >= 21 points
  const isGameOver = (totalScore1 >= 21 || totalScore2 >= 21) && totalScore1 !== totalScore2;

  const team1Name = team1Players.map(p => p.name).join(' & ') || 'Squadra 1';
  const team2Name = team2Players.map(p => p.name).join(' & ') || 'Squadra 2';

  const mancheDetail: MancheDetail = {
    mancheNumber: currentManche,
    isGameOver,
    squadra1: {
      name: team1Name,
      scope: mancheResult.p1Points.scope,
      carte: mancheResult.p1Points.carte,
      carteCount: mancheResult.p1Points.carteCount,
      denari: mancheResult.p1Points.denari,
      denariCount: mancheResult.p1Points.denariCount,
      settebello: mancheResult.p1Points.settebello,
      haSettebello: mancheResult.p1Points.haSettebello,
      primiera: mancheResult.p1Points.primiera,
      primieraScore: mancheResult.p1Points.primieraScore,
      totaleAggiunto: mancheResult.p1Points.totalAdded,
      totaleProgressivo: totalScore1,
    },
    squadra2: {
      name: team2Name,
      scope: mancheResult.p2Points.scope,
      carte: mancheResult.p2Points.carte,
      carteCount: mancheResult.p2Points.carteCount,
      denari: mancheResult.p2Points.denari,
      denariCount: mancheResult.p2Points.denariCount,
      settebello: mancheResult.p2Points.settebello,
      haSettebello: mancheResult.p2Points.haSettebello,
      primiera: mancheResult.p2Points.primiera,
      primieraScore: mancheResult.p2Points.primieraScore,
      totaleAggiunto: mancheResult.p2Points.totalAdded,
      totaleProgressivo: totalScore2,
    },
    riepilogo: mancheResult.summary,
    readyPlayers: {},
  };

  // Transition to ROUND_OVER: display the end-of-manche summary modal to all multiplayer participants
  await updateRoomData(roomId, {
    phase: 'ROUND_OVER',
    pendingMove: null,
    dubitoState: null,
    dubitoEvent: room.dubitoEvent || null,
    board: [],
    players: finalPlayers,
    capturedPiles: finalCapturedPiles,
    mancheDetail,
    lastMancheSummary: mancheResult.summary,
    lastActionMessage: `Fine Manche ${currentManche}! Punti assegnati: ${summaryText}.`,
    updatedAt: Date.now(),
  });
}

/**
 * Handles player clicking "Continua" on the MancheSummaryModal.
 * Synchronizes readiness between multiplayer participants.
 * Once all players are ready (or host forces start), starts the next manche or ends the game.
 */
export async function continueFromMancheSummary(
  roomId: string,
  currentRoom: RoomState,
  playerId: string
): Promise<void> {
  const detail = currentRoom.mancheDetail;
  if (!detail) return;

  const currentReady = detail.readyPlayers || {};
  const isHost = currentRoom.hostId === playerId;
  const alreadyReady = Boolean(currentReady[playerId]);

  const updatedReady = {
    ...currentReady,
    [playerId]: true,
  };

  // Only count human players for multiplayer synchronization
  const humanPlayers = Object.keys(currentRoom.players).filter(pid => !pid.startsWith('bot_'));
  const readyCount = humanPlayers.filter(pid => updatedReady[pid]).length;
  const shouldProceed = readyCount >= humanPlayers.length || (isHost && alreadyReady);

  if (!shouldProceed) {
    await updateRoomData(roomId, {
      mancheDetail: {
        ...detail,
        readyPlayers: updatedReady,
      },
      updatedAt: Date.now(),
    });
    return;
  }

  // All players ready or host forced proceed!
  if (detail.isGameOver) {
    const totalScore1 = detail.squadra1.totaleProgressivo;
    const totalScore2 = detail.squadra2.totaleProgressivo;
    const winningTeam: 1 | 2 = totalScore1 > totalScore2 ? 1 : 2;
    const winners = Object.values(currentRoom.players).filter(p => p.team === winningTeam);
    const winnerData = {
      team: winningTeam,
      winnerNames: winners.map(w => w.name),
      score: winningTeam === 1 ? totalScore1 : totalScore2,
    };

    await updateRoomData(roomId, {
      phase: 'GAME_OVER',
      pendingMove: null,
      dubitoState: null,
      board: [],
      winner: winnerData,
      mancheDetail: null,
      lastActionMessage: `🏆 VITTORIA! ${winnerData.winnerNames.join(' & ')} vincono la partita con ${winnerData.score} punti!`,
      updatedAt: Date.now(),
    });
    return;
  }

  await startNextManche(roomId, currentRoom);
}

/**
 * Initializes and deals a fresh manche.
 * Rotates the dealer, resets per-manche scope counters, deals 3 cards to each player and 4 to the board.
 */
export async function startNextManche(roomId: string, room: RoomState): Promise<void> {
  const turnOrder = room.turnOrder;
  const nextDealerIndex = ((room.dealerIndex || 0) + 1) % turnOrder.length;
  // Primo di mano ruota al giocatore successivo al mazziere
  const firstPlayerId = turnOrder[(nextDealerIndex + 1) % turnOrder.length];

  const { mazzo: freshDeck, tavolo: freshBoard } = preparaDistribuzioneIniziale();
  const freshPrivateHands: Record<string, Card[]> = {};
  const resetCapturedPiles: Record<string, Card[]> = {};
  const updatedPlayers: Record<string, Player> = { ...room.players };

  turnOrder.forEach(pid => {
    freshPrivateHands[pid] = freshDeck.splice(0, 3);
    if (updatedPlayers[pid]) {
      updatedPlayers[pid] = {
        ...updatedPlayers[pid],
        handCount: freshPrivateHands[pid].length,
        capturedCount: 0,
        scopaCount: 0, // Reset scopa count per manche
      };
    }
    resetCapturedPiles[pid] = [];
  });

  const currentManche = room.mancheNumber || 1;
  const nextManche = currentManche + 1;
  const dealerName = updatedPlayers[turnOrder[nextDealerIndex]]?.name || 'Mazziere';

  await updateRoomData(roomId, {
    phase: 'PLAYER_TURN',
    pendingMove: null,
    dubitoState: null,
    board: freshBoard,
    players: updatedPlayers,
    privateHands: freshPrivateHands,
    deck: freshDeck,
    deckRemaining: freshDeck.length,
    capturedPiles: resetCapturedPiles,
    dealerIndex: nextDealerIndex,
    mancheNumber: nextManche,
    currentTurnPlayerId: firstPlayerId,
    lastCapturePlayerId: null,
    mancheDetail: null,
    lastActionMessage: `Inizia la Manche ${nextManche}! Mazziere: ${dealerName}.`,
    updatedAt: Date.now(),
  });
}

/**
 * Internal helper to update Firestore doc or local memory
 */
async function updateRoomData(roomId: string, data: Partial<RoomState>): Promise<void> {
  const safeId = sanificaIdStanza(roomId);
  if (!safeId) return;

  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, ROOMS_COLLECTION, safeId);
    await updateDoc(roomRef, data);
  } else {
    let current = getLocalRoom(safeId);
    if (!current && typeof window !== 'undefined') {
      try {
        const res = await fetch(`/__api/rooms/${encodeURIComponent(safeId)}`);
        if (res.ok) current = await res.json();
      } catch {}
    }
    if (current) {
      const updated = { ...current, ...data };
      if (typeof window !== 'undefined') {
        try {
          fetch('/__api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => {});
        } catch {}
      }
      saveLocalRoom(safeId, updated.code, updated);
    }
  }
}
