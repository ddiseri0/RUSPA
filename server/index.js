"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var http_1 = require("http");
var socket_io_1 = require("socket.io");
var GameLogic_js_1 = require("../src/engine/GameLogic.js");
var app = (0, express_1.default)();
var httpServer = (0, http_1.createServer)(app);
var io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
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
        pendingMove: gameState.pendingMove ? __assign(__assign({}, gameState.pendingMove), { playedCard: gameState.pendingMove.playerId === playerId || gameState.phase === 'RESOLUTION'
                ? gameState.pendingMove.playedCard
                : { id: 'hidden', suit: 'denari', value: 0 } }) : null,
        players: Object.fromEntries(Object.entries(gameState.players).map(function (_a) {
            var id = _a[0], p = _a[1];
            return [
                id,
                {
                    id: p.id,
                    name: p.name,
                    handCount: p.hand.length,
                    hand: id === playerId || gameState.phase === 'GAME_OVER' ? p.hand : undefined,
                    capturedCount: p.captured.length,
                    scopa: p.scopa
                }
            ];
        }))
    };
}
function broadcastState(roomId) {
    var room = rooms[roomId];
    if (!room)
        return;
    io.to(roomId).socketsJoin(roomId); // Ensure they are in the room just in case
    io.in(roomId).fetchSockets().then(function (sockets) {
        for (var _i = 0, sockets_1 = sockets; _i < sockets_1.length; _i++) {
            var socket = sockets_1[_i];
            if (room.players[socket.id]) {
                socket.emit('game_state', sanitizeState(room, socket.id));
            }
        }
    });
}
function dealCards(room) {
    if (room.deck.length === 0)
        return false;
    // Deal 3 to each
    for (var i = 0; i < 3; i++) {
        for (var _i = 0, _a = room.turnOrder; _i < _a.length; _i++) {
            var pid = _a[_i];
            if (room.deck.length > 0) {
                room.players[pid].hand.push(room.deck.pop());
            }
        }
    }
    return true;
}
function initGame(roomId) {
    var room = rooms[roomId];
    room.deck = (0, GameLogic_js_1.shuffle)((0, GameLogic_js_1.createDeck)());
    room.board = [];
    // Try to put 4 cards on board
    for (var i = 0; i < 4; i++) {
        room.board.push(room.deck.pop());
    }
    dealCards(room);
    room.phase = 'PLAYER_MOVE';
    room.currentTurn = room.turnOrder[0];
    room.lastActionMessage = 'First round started.';
}
function processCapture(room, move) {
    var _a;
    var player = room.players[move.playerId];
    // Remove captured cards from board
    room.board = room.board.filter(function (c) { return !move.targetCards.find(function (rc) { return rc.id === c.id; }); });
    // Move captured + played to user capture pile
    (_a = player.captured).push.apply(_a, __spreadArray(__spreadArray([], move.targetCards, false), [move.playedCard], false));
    room.lastCaptureBy = move.playerId;
    if (move.isRuspa) {
        player.scopa += 1; // Basic ruspa point
    }
    room.lastActionMessage = "".concat(player.name, " ha preso carte.");
}
function checkNextRound(room) {
    var _a;
    var allHandsEmpty = room.turnOrder.every(function (pid) { return room.players[pid].hand.length === 0; });
    if (allHandsEmpty) {
        if (room.deck.length > 0) {
            dealCards(room);
            room.lastActionMessage += ' Nuove carte distribuite.';
        }
        else {
            // Game Over, give remaining board to last capture
            if (room.lastCaptureBy && room.board.length > 0) {
                (_a = room.players[room.lastCaptureBy].captured).push.apply(_a, room.board);
                room.board = [];
            }
            room.phase = 'GAME_OVER';
            room.lastActionMessage += ' Partita terminata!';
            return;
        }
    }
    room.phase = 'PLAYER_MOVE';
    // next player
    room.currentTurn = room.turnOrder.find(function (id) { return id !== room.currentTurn; }) || room.turnOrder[0];
}
function resolvePendingMove(roomId) {
    var room = rooms[roomId];
    if (!room || !room.pendingMove)
        return;
    var move = room.pendingMove;
    var player = room.players[move.playerId];
    if (move.targetCards.length > 0) {
        processCapture(room, move);
    }
    else {
        // Just a discard
        room.board.push(move.playedCard);
        room.lastActionMessage = "".concat(player.name, " ha scartato una carta.");
    }
    // Remove from hand
    player.hand = player.hand.filter(function (c) { return c.id !== move.playedCard.id; });
    room.pendingMove = null;
    checkNextRound(room);
    broadcastState(roomId);
}
function handleDubito(roomId, accuserId) {
    var room = rooms[roomId];
    if (!room || !room.pendingMove || room.phase !== 'CHALLENGE_WINDOW')
        return;
    clearTimeout(roomTimers[roomId]);
    room.phase = 'RESOLUTION';
    var move = room.pendingMove;
    var player = room.players[move.playerId];
    var accuser = room.players[accuserId];
    // Remove the card from player hand anyway as it was played
    player.hand = player.hand.filter(function (c) { return c.id !== move.playedCard.id; });
    var playedValue = move.playedCard.value;
    var targetValues = move.targetCards.map(function (c) { return c.value; });
    var isCaptureValid = move.targetCards.length === 0 ? true : (0, GameLogic_js_1.isValidCapture)(playedValue, targetValues);
    var isRuspaClaimedAndValid = move.isRuspa ? (0, GameLogic_js_1.isValidRuspa)(playedValue, targetValues.length, room.board.length) : true;
    var isValid = isCaptureValid && isRuspaClaimedAndValid;
    if (isValid) {
        // DUBITO ERRATO
        if (move.targetCards.length > 0) {
            processCapture(room, move);
        }
        else {
            room.board.push(move.playedCard);
        }
        // penalty: player gets +1 scopa
        player.scopa += 1;
        room.lastActionMessage = "DUBITO errato di ".concat(accuser.name, "! ").concat(player.name, " guadagna 1 punto bonus.");
    }
    else {
        // DUBITO CORRETTO (BLUFF)
        // forced discard
        room.board.push(move.playedCard);
        // Penalties
        if (move.isRuspa) {
            var isAsso = playedValue === 1; // Asso
            if (isAsso) {
                accuser.scopa += 2;
                room.lastActionMessage = "DUBITO corretto di ".concat(accuser.name, " contro Asso! +2 punti. Carta scartata.");
            }
            else {
                accuser.scopa += 1;
                room.lastActionMessage = "DUBITO corretto di ".concat(accuser.name, "! +1 punto. Carta scartata.");
            }
        }
        else {
            room.lastActionMessage = "DUBITO corretto di ".concat(accuser.name, "! Bluff sventato, carta scartata.");
        }
    }
    room.pendingMove = null;
    checkNextRound(room);
    broadcastState(roomId);
}
io.on('connection', function (socket) {
    console.log('User connected:', socket.id);
    socket.on('join_room', function (_a) {
        var roomId = _a.roomId, playerName = _a.playerName;
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = {
                roomId: roomId,
                board: [],
                players: {},
                turnOrder: [],
                currentTurn: '',
                phase: 'IDLE',
                pendingMove: null,
                lastActionMessage: 'Waiting for opponent...',
                deck: [],
                lastCaptureBy: null
            };
        }
        var room = rooms[roomId];
        if (room.turnOrder.length >= 2 && !room.turnOrder.includes(socket.id)) {
            socket.emit('error', 'Room is full');
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
        if (room.turnOrder.length === 2 && room.phase === 'IDLE') {
            initGame(roomId);
        }
        broadcastState(roomId);
    });
    socket.on('play_move', function (move) {
        // Find room the player is in
        var roomId = Object.keys(rooms).find(function (r) { return rooms[r].turnOrder.includes(socket.id); });
        if (!roomId)
            return;
        var room = rooms[roomId];
        if (room.currentTurn !== socket.id || room.phase !== 'PLAYER_MOVE')
            return;
        room.pendingMove = move;
        room.phase = 'CHALLENGE_WINDOW';
        room.lastActionMessage = "".concat(room.players[socket.id].name, " ha giocato...");
        broadcastState(roomId);
        // 5 seconds challenge window
        roomTimers[roomId] = setTimeout(function () {
            resolvePendingMove(roomId);
        }, 5000);
    });
    socket.on('dubito', function () {
        var _a;
        var roomId = Object.keys(rooms).find(function (r) { return rooms[r].turnOrder.includes(socket.id); });
        if (!roomId)
            return;
        var room = rooms[roomId];
        if (room.phase !== 'CHALLENGE_WINDOW' || ((_a = room.pendingMove) === null || _a === void 0 ? void 0 : _a.playerId) === socket.id)
            return;
        handleDubito(roomId, socket.id);
    });
    socket.on('disconnect', function () {
        console.log('User disconnected:', socket.id);
        // Cleanup if needed, simplified for this POC
    });
});
var PORT = 3001;
httpServer.listen(PORT, function () {
    console.log("Server listening on port ".concat(PORT));
});
