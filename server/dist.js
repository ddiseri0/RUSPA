// server/index.ts
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

// src/engine/GameLogic.js
var __spreadArray = function(to, from, pack) {
  if (pack || arguments.length === 2)
    for (var i = 0, l = from.length, ar; i < l; i++) {
      if (ar || !(i in from)) {
        if (!ar)
          ar = Array.prototype.slice.call(from, 0, i);
        ar[i] = from[i];
      }
    }
  return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUITS = void 0;
exports.createDeck = createDeck;
exports.shuffle = shuffle;
exports.isValidCapture = isValidCapture;
exports.isValidRuspa = isValidRuspa;
exports.calculatePrimiera = calculatePrimiera;
exports.calculateRoundScore = calculateRoundScore;
exports.SUITS = ["denari", "coppe", "spade", "bastoni"];
function createDeck() {
  var deck = [];
  for (var _i = 0, SUITS_1 = exports.SUITS; _i < SUITS_1.length; _i++) {
    var suit = SUITS_1[_i];
    for (var value = 1; value <= 10; value++) {
      deck.push({
        id: "".concat(suit, "-").concat(value),
        suit,
        value,
        isSettebello: suit === "denari" && value === 7
      });
    }
  }
  return deck;
}
function shuffle(deck) {
  var _a;
  var newDeck = __spreadArray([], deck, true);
  for (var i = newDeck.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    _a = [newDeck[j], newDeck[i]], newDeck[i] = _a[0], newDeck[j] = _a[1];
  }
  return newDeck;
}
function isValidCapture(playedValue, targetValues) {
  if (targetValues.length === 0)
    return false;
  var sum = targetValues.reduce(function(a, b) {
    return a + b;
  }, 0);
  return sum === playedValue;
}
function isValidRuspa(playedValue, targetCount, boardCount) {
  return playedValue === 1 && targetCount === boardCount;
}
var PRIMIERA_VALUES = {
  7: 21,
  6: 18,
  1: 16,
  5: 15,
  4: 14,
  3: 13,
  2: 12,
  8: 10,
  9: 10,
  10: 10
};
function calculatePrimiera(cards) {
  var bestPerSuit = { denari: 0, coppe: 0, spade: 0, bastoni: 0 };
  for (var _i = 0, cards_1 = cards; _i < cards_1.length; _i++) {
    var c = cards_1[_i];
    var pVal = PRIMIERA_VALUES[c.value];
    if (pVal > bestPerSuit[c.suit]) {
      bestPerSuit[c.suit] = pVal;
    }
  }
  return bestPerSuit.denari + bestPerSuit.coppe + bestPerSuit.spade + bestPerSuit.bastoni;
}
function calculateRoundScore(p1Cards, p2Cards, p1Scopa, p2Scopa) {
  var p1Points = p1Scopa;
  var p2Points = p2Scopa;
  var details = { carte: "Pareggio", denari: "Pareggio", settebello: "Nessuno", primiera: "Pareggio" };
  if (p1Cards.length > 20) {
    p1Points++;
    details.carte = "Tu";
  } else if (p2Cards.length > 20) {
    p2Points++;
    details.carte = "Bot";
  }
  var p1Denari = p1Cards.filter(function(c) {
    return c.suit === "denari";
  }).length;
  var p2Denari = p2Cards.filter(function(c) {
    return c.suit === "denari";
  }).length;
  if (p1Denari > 5) {
    p1Points++;
    details.denari = "Tu";
  } else if (p2Denari > 5) {
    p2Points++;
    details.denari = "Bot";
  }
  if (p1Cards.find(function(c) {
    return c.id === "denari-7";
  })) {
    p1Points++;
    details.settebello = "Tu";
  } else if (p2Cards.find(function(c) {
    return c.id === "denari-7";
  })) {
    p2Points++;
    details.settebello = "Bot";
  }
  var p1Primiera = calculatePrimiera(p1Cards);
  var p2Primiera = calculatePrimiera(p2Cards);
  if (p1Primiera > p2Primiera) {
    p1Points++;
    details.primiera = "Tu";
  } else if (p2Primiera > p1Primiera) {
    p2Points++;
    details.primiera = "Bot";
  }
  return { player1Points: p1Points, botPoints: p2Points, details };
}

// server/index.ts
var app = express();
var httpServer = createServer(app);
var io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
var rooms = {};
var roomTimers = {};
function sanitizeState(gameState, playerId) {
  return {
    roomId: gameState.roomId,
    board: gameState.board,
    turnOrder: gameState.turnOrder,
    currentTurn: gameState.currentTurn,
    phase: gameState.phase,
    lastActionMessage: gameState.lastActionMessage,
    deckCount: gameState.deck.length,
    lastCaptureBy: gameState.lastCaptureBy,
    pendingMove: gameState.pendingMove ? {
      ...gameState.pendingMove,
      playedCard: gameState.pendingMove.playerId === playerId || gameState.phase === "RESOLUTION" ? gameState.pendingMove.playedCard : { id: "hidden", suit: "denari", value: 0 }
    } : null,
    players: Object.fromEntries(
      Object.entries(gameState.players).map(([id, p]) => [
        id,
        {
          id: p.id,
          name: p.name,
          handCount: p.hand.length,
          hand: id === playerId || gameState.phase === "GAME_OVER" ? p.hand : void 0,
          capturedCount: p.captured.length,
          scopa: p.scopa
        }
      ])
    )
  };
}
function broadcastState(roomId) {
  const room = rooms[roomId];
  if (!room)
    return;
  io.to(roomId).socketsJoin(roomId);
  io.in(roomId).fetchSockets().then((sockets) => {
    for (const socket of sockets) {
      if (room.players[socket.id]) {
        socket.emit("game_state", sanitizeState(room, socket.id));
      }
    }
  });
}
function dealCards(room) {
  if (room.deck.length === 0)
    return false;
  for (let i = 0; i < 3; i++) {
    for (const pid of room.turnOrder) {
      if (room.deck.length > 0) {
        room.players[pid].hand.push(room.deck.pop());
      }
    }
  }
  return true;
}
function initGame(roomId) {
  const room = rooms[roomId];
  room.deck = (void 0)((void 0)());
  room.board = [];
  for (let i = 0; i < 4; i++) {
    room.board.push(room.deck.pop());
  }
  dealCards(room);
  room.phase = "PLAYER_MOVE";
  room.currentTurn = room.turnOrder[0];
  room.lastActionMessage = "First round started.";
}
function processCapture(room, move) {
  const player = room.players[move.playerId];
  room.board = room.board.filter((c) => !move.targetCards.find((rc) => rc.id === c.id));
  player.captured.push(...move.targetCards, move.playedCard);
  room.lastCaptureBy = move.playerId;
  if (move.isRuspa) {
    player.scopa += 1;
  }
  room.lastActionMessage = `${player.name} ha preso carte.`;
}
function checkNextRound(room) {
  const allHandsEmpty = room.turnOrder.every((pid) => room.players[pid].hand.length === 0);
  if (allHandsEmpty) {
    if (room.deck.length > 0) {
      dealCards(room);
      room.lastActionMessage += " Nuove carte distribuite.";
    } else {
      if (room.lastCaptureBy && room.board.length > 0) {
        room.players[room.lastCaptureBy].captured.push(...room.board);
        room.board = [];
      }
      room.phase = "GAME_OVER";
      room.lastActionMessage += " Partita terminata!";
      return;
    }
  }
  room.phase = "PLAYER_MOVE";
  room.currentTurn = room.turnOrder.find((id) => id !== room.currentTurn) || room.turnOrder[0];
}
function resolvePendingMove(roomId) {
  const room = rooms[roomId];
  if (!room || !room.pendingMove)
    return;
  const move = room.pendingMove;
  const player = room.players[move.playerId];
  if (move.targetCards.length > 0) {
    processCapture(room, move);
  } else {
    room.board.push(move.playedCard);
    room.lastActionMessage = `${player.name} ha scartato una carta.`;
  }
  player.hand = player.hand.filter((c) => c.id !== move.playedCard.id);
  room.pendingMove = null;
  checkNextRound(room);
  broadcastState(roomId);
}
function handleDubito(roomId, accuserId) {
  const room = rooms[roomId];
  if (!room || !room.pendingMove || room.phase !== "CHALLENGE_WINDOW")
    return;
  clearTimeout(roomTimers[roomId]);
  room.phase = "RESOLUTION";
  const move = room.pendingMove;
  const player = room.players[move.playerId];
  const accuser = room.players[accuserId];
  player.hand = player.hand.filter((c) => c.id !== move.playedCard.id);
  const playedValue = move.playedCard.value;
  const targetValues = move.targetCards.map((c) => c.value);
  const isCaptureValid = move.targetCards.length === 0 ? true : (void 0)(playedValue, targetValues);
  const isRuspaClaimedAndValid = move.isRuspa ? (void 0)(playedValue, targetValues.length, room.board.length) : true;
  const isValid = isCaptureValid && isRuspaClaimedAndValid;
  if (isValid) {
    if (move.targetCards.length > 0) {
      processCapture(room, move);
    } else {
      room.board.push(move.playedCard);
    }
    player.scopa += 1;
    room.lastActionMessage = `DUBITO errato di ${accuser.name}! ${player.name} guadagna 1 punto bonus.`;
  } else {
    room.board.push(move.playedCard);
    if (move.isRuspa) {
      const isAsso = playedValue === 1;
      if (isAsso) {
        accuser.scopa += 2;
        room.lastActionMessage = `DUBITO corretto di ${accuser.name} contro Asso! +2 punti. Carta scartata.`;
      } else {
        accuser.scopa += 1;
        room.lastActionMessage = `DUBITO corretto di ${accuser.name}! +1 punto. Carta scartata.`;
      }
    } else {
      room.lastActionMessage = `DUBITO corretto di ${accuser.name}! Bluff sventato, carta scartata.`;
    }
  }
  room.pendingMove = null;
  checkNextRound(room);
  broadcastState(roomId);
}
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("join_room", ({ roomId, playerName }) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        roomId,
        board: [],
        players: {},
        turnOrder: [],
        currentTurn: "",
        phase: "IDLE",
        pendingMove: null,
        lastActionMessage: "Waiting for opponent...",
        deck: [],
        lastCaptureBy: null
      };
    }
    const room = rooms[roomId];
    if (room.turnOrder.length >= 2 && !room.turnOrder.includes(socket.id)) {
      socket.emit("error", "Room is full");
      return;
    }
    if (!room.turnOrder.includes(socket.id)) {
      room.players[socket.id] = {
        id: socket.id,
        name: playerName,
        hand: [],
        captured: [],
        scopa: 0
      };
      room.turnOrder.push(socket.id);
    }
    if (room.turnOrder.length === 2 && room.phase === "IDLE") {
      initGame(roomId);
    }
    broadcastState(roomId);
  });
  socket.on("play_move", (move) => {
    const roomId = Object.keys(rooms).find((r) => rooms[r].turnOrder.includes(socket.id));
    if (!roomId)
      return;
    const room = rooms[roomId];
    if (room.currentTurn !== socket.id || room.phase !== "PLAYER_MOVE")
      return;
    room.pendingMove = move;
    room.phase = "CHALLENGE_WINDOW";
    room.lastActionMessage = `${room.players[socket.id].name} ha giocato...`;
    broadcastState(roomId);
    roomTimers[roomId] = setTimeout(() => {
      resolvePendingMove(roomId);
    }, 5e3);
  });
  socket.on("dubito", () => {
    const roomId = Object.keys(rooms).find((r) => rooms[r].turnOrder.includes(socket.id));
    if (!roomId)
      return;
    const room = rooms[roomId];
    if (room.phase !== "CHALLENGE_WINDOW" || room.pendingMove?.playerId === socket.id)
      return;
    handleDubito(roomId, socket.id);
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
var PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
