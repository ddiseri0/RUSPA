import { Card, Suit } from './types';

export const SUITS: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 10; value++) {
      deck.push({
        id: `${suit}-${value}`,
        suit,
        value,
        isSettebello: suit === 'denari' && value === 7
      });
    }
  }
  return deck;
}

export function shuffle(deck: Card[]): Card[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export function isValidCapture(playedValue: number, targetValues: number[]): boolean {
  if (targetValues.length === 0) return false;
  const sum = targetValues.reduce((a, b) => a + b, 0);
  return sum === playedValue;
}

export function isValidRuspa(playedValue: number, targetCount: number, boardCount: number): boolean {
  return playedValue === 1 && targetCount === boardCount;
}

const PRIMIERA_VALUES: Record<number, number> = {
  7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10
};

export function calculatePrimiera(cards: Card[]): number {
  const bestPerSuit: Record<Suit, number> = { denari: 0, coppe: 0, spade: 0, bastoni: 0 };
  for (const c of cards) {
    const pVal = PRIMIERA_VALUES[c.value];
    if (pVal > bestPerSuit[c.suit]) {
      bestPerSuit[c.suit] = pVal;
    }
  }
  return bestPerSuit.denari + bestPerSuit.coppe + bestPerSuit.spade + bestPerSuit.bastoni;
}

export interface RoundScore {
  player1Points: number;
  botPoints: number;
  details: { carte: string, denari: string, settebello: string, primiera: string };
}

export function calculateRoundScore(p1Cards: Card[], p2Cards: Card[], p1Scopa: number, p2Scopa: number): RoundScore {
  let p1Points = p1Scopa;
  let p2Points = p2Scopa;
  
  const details = { carte: 'Pareggio', denari: 'Pareggio', settebello: 'Nessuno', primiera: 'Pareggio' };

  if (p1Cards.length > 20) { p1Points++; details.carte = 'Tu'; }
  else if (p2Cards.length > 20) { p2Points++; details.carte = 'Bot'; }

  const p1Denari = p1Cards.filter(c => c.suit === 'denari').length;
  const p2Denari = p2Cards.filter(c => c.suit === 'denari').length;
  if (p1Denari > 5) { p1Points++; details.denari = 'Tu'; }
  else if (p2Denari > 5) { p2Points++; details.denari = 'Bot'; }

  if (p1Cards.find(c => c.id === 'denari-7')) { p1Points++; details.settebello = 'Tu'; }
  else if (p2Cards.find(c => c.id === 'denari-7')) { p2Points++; details.settebello = 'Bot'; }

  const p1Primiera = calculatePrimiera(p1Cards);
  const p2Primiera = calculatePrimiera(p2Cards);
  if (p1Primiera > p2Primiera) { p1Points++; details.primiera = 'Tu'; }
  else if (p2Primiera > p1Primiera) { p2Points++; details.primiera = 'Bot'; }

  return { player1Points: p1Points, botPoints: p2Points, details };
}
