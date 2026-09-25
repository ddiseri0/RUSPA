"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
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
exports.SUITS = ['denari', 'coppe', 'spade', 'bastoni'];
function createDeck() {
    var deck = [];
    for (var _i = 0, SUITS_1 = exports.SUITS; _i < SUITS_1.length; _i++) {
        var suit = SUITS_1[_i];
        for (var value = 1; value <= 10; value++) {
            deck.push({
                id: "".concat(suit, "-").concat(value),
                suit: suit,
                value: value,
                isSettebello: suit === 'denari' && value === 7
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
    var sum = targetValues.reduce(function (a, b) { return a + b; }, 0);
    return sum === playedValue;
}
function isValidRuspa(playedValue, targetCount, boardCount) {
    return playedValue === 1 && targetCount === boardCount;
}
var PRIMIERA_VALUES = {
    7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10
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
    var details = { carte: 'Pareggio', denari: 'Pareggio', settebello: 'Nessuno', primiera: 'Pareggio' };
    if (p1Cards.length > 20) {
        p1Points++;
        details.carte = 'Tu';
    }
    else if (p2Cards.length > 20) {
        p2Points++;
        details.carte = 'Bot';
    }
    var p1Denari = p1Cards.filter(function (c) { return c.suit === 'denari'; }).length;
    var p2Denari = p2Cards.filter(function (c) { return c.suit === 'denari'; }).length;
    if (p1Denari > 5) {
        p1Points++;
        details.denari = 'Tu';
    }
    else if (p2Denari > 5) {
        p2Points++;
        details.denari = 'Bot';
    }
    if (p1Cards.find(function (c) { return c.id === 'denari-7'; })) {
        p1Points++;
        details.settebello = 'Tu';
    }
    else if (p2Cards.find(function (c) { return c.id === 'denari-7'; })) {
        p2Points++;
        details.settebello = 'Bot';
    }
    var p1Primiera = calculatePrimiera(p1Cards);
    var p2Primiera = calculatePrimiera(p2Cards);
    if (p1Primiera > p2Primiera) {
        p1Points++;
        details.primiera = 'Tu';
    }
    else if (p2Primiera > p1Primiera) {
        p2Points++;
        details.primiera = 'Bot';
    }
    return { player1Points: p1Points, botPoints: p2Points, details: details };
}
