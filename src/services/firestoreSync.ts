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
import { RoomState, Player, Move, GameMode, Card, DubitoState } from '../types/game';
import {
  createStandardDeck,
  shuffleDeck,
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
  syncChannel.onmessage = (event) => {
    if (event.data?.type === 'SYNC_ROOM' && event.data.room) {
      const room = event.data.room as RoomState;
      localRooms.set(room.roomId, room);
      localRooms.set(room.code, room);
      notifyLocalListeners(room.roomId, room);
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
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
    listeners.forEach((cb) => cb({ ...room }));
  }
}

function saveLocalRoom(roomId: string, code: string, room: RoomState) {
  localRooms.set(roomId, room);
  localRooms.set(code, room);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`ruspa_room_${roomId}`, JSON.stringify(room));
      localStorage.setItem(`ruspa_code_${code}`, roomId);
    } catch {}
  }
  syncChannel?.postMessage({ type: 'SYNC_ROOM', roomId, room });
  notifyLocalListeners(roomId, room);
}

function getLocalRoom(codeOrId: string): RoomState | null {
  const clean = codeOrId.trim().toUpperCase();
  if (localRooms.has(clean)) return localRooms.get(clean)!;
  if (localRooms.has('room_' + clean.toLowerCase())) return localRooms.get('room_' + clean.toLowerCase())!;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const mappedId = localStorage.getItem(`ruspa_code_${clean}`);
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
    result += chars.charAt(Math.floor(Math.random() * chars.length));
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
  const cleanKey = roomCodeOrId.trim().toUpperCase();

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
    const team: 1 | 2 = room.mode === '2v2' ? (seat % 2 === 0 ? 1 : 2) : (seat === 0 ? 1 : 2);

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
        const res = await fetch(`/__api/rooms/${cleanKey}`);
        if (res.ok) {
          room = await res.json();
        }
      } catch (err) {
        console.warn('[joinRoom] Dev server lookup error:', err);
      }
    }
    if (!room) return null;

    const currentCount = Object.keys(room.players).length;
    const seat = currentCount;
    const team: 1 | 2 = room.mode === '2v2' ? (seat % 2 === 0 ? 1 : 2) : 2;

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
    const winners = Object.values(currentRoom.players).filter((p) => p.team === winningTeam);
    const winnerNames = winners.map((w) => w.name);
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

    const updatedTurnOrder = currentRoom.turnOrder.filter((id) => id !== leavingPlayerId);
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

/**
 * Subscribes to realtime updates of a room
 */
export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: RoomState) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    return onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as RoomState);
        }
      },
      (error) => {
        console.error('Firestore listener error:', error);
        onError?.(error);
      }
    );
  } else {
    // Local subscriber
    if (!localListeners.has(roomId)) {
      localListeners.set(roomId, new Set());
    }
    localListeners.get(roomId)!.add(onUpdate);

    const room = getLocalRoom(roomId);
    if (room) {
      setTimeout(() => onUpdate({ ...room }), 0);
    } else if (typeof window !== 'undefined') {
      fetch(`/__api/rooms/${roomId}`)
        .then((r) => r.json())
        .then((r) => {
          if (r && r.roomId) {
            saveLocalRoom(r.roomId, r.code, r);
            onUpdate(r);
          }
        })
        .catch(() => {});
    }

    // Connect Server-Sent Events stream from dev server for real-time cross-window sync
    let eventSource: EventSource | null = null;
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        eventSource = new EventSource(`/__api/rooms/${roomId}/events`);
        eventSource.onmessage = (event) => {
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
      localListeners.get(roomId)?.delete(onUpdate);
      if (eventSource) {
        eventSource.close();
      }
    };
  }
}

/**
 * Deals cards to start a match
 * Neapolitan deck: 40 cards total.
 * 4 cards face-up to table, 3 cards dealt to each player.
 * Remaining cards stay in deck to be dealt in batches of 3 when hands are empty.
 */
export async function startMatch(roomId: string, currentRoom: RoomState): Promise<void> {
  const fullDeck = shuffleDeck(createStandardDeck());
  const playerIds = Object.keys(currentRoom.players);

  // 4 cards on the table
  const board = fullDeck.splice(0, 4);

  // Distribute 3 cards to each player
  const privateHands: Record<string, Card[]> = {};
  playerIds.forEach((pid) => {
    privateHands[pid] = fullDeck.splice(0, 3);
  });

  const updatedPlayers = { ...currentRoom.players };
  playerIds.forEach((pid) => {
    updatedPlayers[pid] = {
      ...updatedPlayers[pid],
      handCount: 3,
      capturedCount: 0,
      scopaCount: 0,
      score: 0,
    };
  });

  const capturedPiles: Record<string, Card[]> = {};
  playerIds.forEach((pid) => {
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
  const updatedHand = currentHand.filter((c) => c.id !== move.playedCard.id);

  const updatedPlayers = {
    ...currentRoom.players,
    [move.playerId]: {
      ...player,
      handCount: Math.max(0, player.handCount - 1),
    },
  };

  const updatedRoomWithHand: RoomState = {
    ...currentRoom,
    players: updatedPlayers,
    privateHands: {
      ...currentRoom.privateHands,
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
    expiresAt: Date.now() + 7000, // 7 seconds countdown window for Dubito
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
    (p) => p.team === currentRoom.dubitoState!.targetTeam
  );
  const allPassed = opposingPlayers.every((p) => updatedVotes[p.id] === 'PASSA');

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
    targetCards = currentRoom.board.filter((c) =>
      pendingMove.targetCardIds.includes(c.id)
    );
  }

  const verification = verifyCaptureLegitimacy(
    pendingMove.playedCard,
    targetCards,
    pendingMove.isRuspa,
    currentRoom.board.length
  );

  let newBoard = [...currentRoom.board];
  const updatedPlayers = { ...currentRoom.players };
  const updatedCapturedPiles = { ...(currentRoom.capturedPiles || {}) };
  let actionMessage = '';
  let winningTakerId = '';

  const allCapturedCards = [pendingMove.playedCard, ...targetCards];

  let captureOccurred = false;
  const cardName = `${getCardLabel(pendingMove.playedCard.value)} di ${SUIT_NAMES[pendingMove.playedCard.suit]}`;

  if (!verification.isLegal) {
    // Bluff exposed! Challenger wins +1 point / Scopa!
    // Le carte bersaglio e la carta giocata vengono rimesse a terra scoperte
    winningTakerId = challengerId;
    captureOccurred = false;
    actionMessage = `🚨 DUBITO RIUSCITO! ${challenger.name} ha smascherato il bluff di ${pendingMove.playerName} (+1 pt)! Le carte restano a terra e ${cardName} viene calata scoperta.`;
    
    updatedPlayers[challengerId] = {
      ...updatedPlayers[challengerId],
      score: updatedPlayers[challengerId].score + 1,
      scopaCount: updatedPlayers[challengerId].scopaCount + 1,
    };
    
    // Le carte a terra rimangono tutte sul tavolo e si aggiunge la carta giocata scoperta
    newBoard = [...currentRoom.board, pendingMove.playedCard];
  } else {
    // Played card was legal! Challenger loses, Mover wins and gets a Scopa!
    winningTakerId = pendingMove.playerId;
    captureOccurred = true;
    actionMessage = `❌ DUBITO FALLITO! La mossa di ${pendingMove.playerName} era valida (${cardName})! ${pendingMove.playerName} ottiene una SCOPA (+1 pt)!`;
    updatedPlayers[pendingMove.playerId] = {
      ...updatedPlayers[pendingMove.playerId],
      score: updatedPlayers[pendingMove.playerId].score + 1,
      scopaCount: updatedPlayers[pendingMove.playerId].scopaCount + 1,
      capturedCount: updatedPlayers[pendingMove.playerId].capturedCount + allCapturedCards.length,
    };
    updatedCapturedPiles[pendingMove.playerId] = [
      ...(updatedCapturedPiles[pendingMove.playerId] || []),
      ...allCapturedCards,
    ];
    if (pendingMove.isRuspa) {
      newBoard = [];
    } else {
      newBoard = newBoard.filter((c) => !pendingMove.targetCardIds.includes(c.id));
    }
  }

  const roomWithoutPending: RoomState = {
    ...currentRoom,
    pendingMove: null,
    dubitoState: null,
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
    updatedCapturedPiles[moverId] = [
      ...(updatedCapturedPiles[moverId] || []),
      ...allCapturedCards,
    ];
    updatedPlayers[moverId] = {
      ...player,
      score: player.score + 1,
      scopaCount: player.scopaCount + 1,
      capturedCount: player.capturedCount + allCapturedCards.length,
    };
    newBoard = [];
    actionMessage = `✨ RUSPA COMPLETATA! ${player.name} pulisce il tavolo senza dubbi (+1 Scopa)!`;
  } else if (pendingMove.targetCardIds.length > 0) {
    captureOccurred = true;
    const targetCards = newBoard.filter((c) => pendingMove.targetCardIds.includes(c.id));
    const allCapturedCards = [pendingMove.playedCard, ...targetCards];
    newBoard = newBoard.filter((c) => !pendingMove.targetCardIds.includes(c.id));

    updatedCapturedPiles[moverId] = [
      ...(updatedCapturedPiles[moverId] || []),
      ...allCapturedCards,
    ];

    if (newBoard.length === 0) {
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
  const lastCapturePlayerId = captureOccurred ? moverOrTakerId : (room.lastCapturePlayerId || null);

  // Check if all players have 0 cards in hand
  const allHandsEmpty = Object.values(updatedPlayers).every((p) => p.handCount === 0);

  if (!allHandsEmpty) {
    // Normal turn advance
    const turnOrder = (room.turnOrder && room.turnOrder.length > 0)
      ? room.turnOrder
      : Object.keys(updatedPlayers);
    const currentIndex = turnOrder.indexOf(room.currentTurnPlayerId);
    const nextPlayerId = currentIndex >= 0
      ? turnOrder[(currentIndex + 1) % turnOrder.length]
      : turnOrder[0];

    await updateRoomData(roomId, {
      phase: 'PLAYER_TURN',
      pendingMove: null,
      dubitoState: null,
      board: newBoard,
      players: updatedPlayers,
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

    const turnOrder = (room.turnOrder && room.turnOrder.length > 0)
      ? room.turnOrder
      : Object.keys(updatedPlayers);

    turnOrder.forEach((pid) => {
      const dealt = currentDeck.splice(0, 3);
      freshHands[pid] = dealt;
      playersWithNewHands[pid] = {
        ...playersWithNewHands[pid],
        handCount: dealt.length,
      };
    });

    const currentIndex = turnOrder.indexOf(room.currentTurnPlayerId);
    const nextPlayerId = currentIndex >= 0
      ? turnOrder[(currentIndex + 1) % turnOrder.length]
      : turnOrder[0];

    await updateRoomData(roomId, {
      phase: 'PLAYER_TURN',
      pendingMove: null,
      dubitoState: null,
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
  Object.values(finalPlayers).forEach((p) => {
    const pile = finalCapturedPiles[p.id] || [];
    if (p.team === 1) team1Cards.push(...pile);
    else team2Cards.push(...pile);
  });

  const team1Scope = Object.values(finalPlayers)
    .filter((p) => p.team === 1)
    .reduce((acc, p) => acc + (p.scopaCount || 0), 0);
  const team2Scope = Object.values(finalPlayers)
    .filter((p) => p.team === 2)
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
  const team1Players = Object.values(finalPlayers).filter((p) => p.team === 1);
  const team2Players = Object.values(finalPlayers).filter((p) => p.team === 2);

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

  if (isGameOver) {
    const winningTeam: 1 | 2 = totalScore1 > totalScore2 ? 1 : 2;
    const winners = Object.values(finalPlayers).filter((p) => p.team === winningTeam);
    const winnerData = {
      team: winningTeam,
      winnerNames: winners.map((w) => w.name),
      score: winningTeam === 1 ? totalScore1 : totalScore2,
    };

    await updateRoomData(roomId, {
      phase: 'GAME_OVER',
      pendingMove: null,
      dubitoState: null,
      board: [],
      players: finalPlayers,
      capturedPiles: finalCapturedPiles,
      winner: winnerData,
      lastMancheSummary: mancheResult.summary,
      lastActionMessage: `🏆 VITTORIA! ${winnerData.winnerNames.join(' & ')} vincono la partita con ${winnerData.score} punti! (${summaryText})`,
      updatedAt: Date.now(),
    });
    return;
  }

  // Not game over -> Start new manche!
  // Dealer rotates clockwise
  const turnOrder = room.turnOrder;
  const nextDealerIndex = ((room.dealerIndex || 0) + 1) % turnOrder.length;
  // Primo di mano ruota al giocatore successivo
  const firstPlayerId = turnOrder[(nextDealerIndex + 1) % turnOrder.length];

  const freshDeck = shuffleDeck(createStandardDeck());
  const freshBoard = freshDeck.splice(0, 4);
  const freshPrivateHands: Record<string, Card[]> = {};
  const resetCapturedPiles: Record<string, Card[]> = {};

  turnOrder.forEach((pid) => {
    freshPrivateHands[pid] = freshDeck.splice(0, 3);
    finalPlayers[pid] = {
      ...finalPlayers[pid],
      handCount: freshPrivateHands[pid].length,
      capturedCount: 0,
    };
    resetCapturedPiles[pid] = [];
  });

  const nextManche = currentManche + 1;
  const dealerName = finalPlayers[turnOrder[nextDealerIndex]]?.name || 'Mazziere';

  await updateRoomData(roomId, {
    phase: 'PLAYER_TURN',
    pendingMove: null,
    dubitoState: null,
    board: freshBoard,
    players: finalPlayers,
    privateHands: freshPrivateHands,
    deck: freshDeck,
    deckRemaining: freshDeck.length,
    capturedPiles: resetCapturedPiles,
    dealerIndex: nextDealerIndex,
    mancheNumber: nextManche,
    currentTurnPlayerId: firstPlayerId,
    lastCapturePlayerId: null,
    lastMancheSummary: mancheResult.summary,
    lastActionMessage: `Fine Manche ${currentManche}! Punti assegnati: ${summaryText}. Inizia la Manche ${nextManche}! Mazziere di turno: ${dealerName}.`,
    updatedAt: Date.now(),
  });
}

/**
 * Internal helper to update Firestore doc or local memory
 */
async function updateRoomData(roomId: string, data: Partial<RoomState>): Promise<void> {
  if (isFirebaseConfigured && db) {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(roomRef, data);
  } else {
    let current = getLocalRoom(roomId);
    if (!current && typeof window !== 'undefined') {
      try {
        const res = await fetch(`/__api/rooms/${roomId}`);
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
      saveLocalRoom(roomId, updated.code, updated);
    }
  }
}
