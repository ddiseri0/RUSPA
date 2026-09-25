import { Card, Suit } from '../types/game';

export const SUITS: Suit[] = ['denari', 'coppe', 'spade', 'bastoni'];

export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let value = 1; value <= 10; value++) {
      deck.push({
        id: `${suit}-${value}`,
        suit,
        value,
        isSettebello: suit === 'denari' && value === 7,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Checks if the played card legally captures the target cards under Scopa rules.
 */
export function verifyCaptureLegitimacy(
  playedCard: Card,
  targetCards: Card[],
  isRuspa: boolean,
  _totalBoardCardsCount?: number
): {
  isLegal: boolean;
  reason: string;
} {
  // Ruspa check: Played card must be an Asso (value 1) and target all board cards
  if (isRuspa) {
    if (playedCard.value === 1) {
      return { isLegal: true, reason: "Mossa Asso Ruspa legittima: L'Asso prende l'intero tavolo!" };
    } else {
      return { isLegal: false, reason: `BLUFF SCOPERTO: Ha dichiarato Ruspa ma ha giocato un ${playedCard.value} di ${playedCard.suit}!` };
    }
  }

  // Dropping card on table without capture
  if (targetCards.length === 0) {
    return { isLegal: true, reason: 'Carta scartata sul tavolo senza presa.' };
  }

  // Value sum check
  const targetSum = targetCards.reduce((acc, c) => acc + c.value, 0);

  // Single card direct match
  if (targetCards.length === 1) {
    if (targetCards[0].value === playedCard.value) {
      return { isLegal: true, reason: `Presa diretta di valore ${playedCard.value} valida!` };
    }
    return {
      isLegal: false,
      reason: `BLUFF SCOPERTO: Ha tentato di prendere un ${targetCards[0].value} con un ${playedCard.value} di ${playedCard.suit}!`,
    };
  }

  // Multi-card sum match
  if (targetSum === playedCard.value) {
    return { isLegal: true, reason: `Presa a somma valida: somma ${targetSum} = valore giocato ${playedCard.value}.` };
  }

  return {
    isLegal: false,
    reason: `BLUFF SCOPERTO: La somma delle carte selezionate (${targetSum}) non corrisponde al valore reale (${playedCard.value})!`,
  };
}

/**
 * Card suit display names in Italian
 */
export const SUIT_NAMES: Record<Suit, string> = {
  denari: 'Denari',
  coppe: 'Coppe',
  spade: 'Spade',
  bastoni: 'Bastoni',
};

/**
 * Card values display names in Italian
 */
export function getCardLabel(value: number): string {
  switch (value) {
    case 1:
      return 'Asso';
    case 8:
      return 'Donna';
    case 9:
      return 'Cavallo';
    case 10:
      return 'Re';
    default:
      return value.toString();
  }
}

/**
 * Traditional Neapolitan Primiera Points
 * 7=21, 6=18, Asso=16, 5=15, 4=14, 3=13, 2=12, Figure=10
 */
export const PRIMIERA_POINTS: Record<number, number> = {
  7: 21,
  6: 18,
  1: 16,
  5: 15,
  4: 14,
  3: 13,
  2: 12,
  8: 10,
  9: 10,
  10: 10,
};

export function calculatePrimieraScore(cards: Card[]): number {
  const bestBySuit: Record<Suit, number> = {
    denari: 0,
    coppe: 0,
    spade: 0,
    bastoni: 0,
  };
  for (const card of cards) {
    const pts = PRIMIERA_POINTS[card.value] || 0;
    if (pts > bestBySuit[card.suit]) {
      bestBySuit[card.suit] = pts;
    }
  }
  return bestBySuit.denari + bestBySuit.coppe + bestBySuit.spade + bestBySuit.bastoni;
}

export interface LiveScopaStats {
  cardsCount: number;
  denariCount: number;
  hasSettebello: boolean;
  primieraScore: number;
}

export function computeScopaStats(cards: Card[]): LiveScopaStats {
  const cardsCount = cards.length;
  const denariCount = cards.filter((c) => c.suit === 'denari').length;
  const hasSettebello = cards.some((c) => c.suit === 'denari' && c.value === 7);
  const primieraScore = calculatePrimieraScore(cards);

  return {
    cardsCount,
    denariCount,
    hasSettebello,
    primieraScore,
  };
}

export interface ManchePointsResult {
  p1Points: {
    scope: number;
    carte: number;
    denari: number;
    settebello: number;
    primiera: number;
    totalAdded: number;
  };
  p2Points: {
    scope: number;
    carte: number;
    denari: number;
    settebello: number;
    primiera: number;
    totalAdded: number;
  };
  summary: string[];
}

export function evaluateManchePoints(
  team1Cards: Card[],
  team2Cards: Card[],
  team1Scope: number,
  team2Scope: number
): ManchePointsResult {
  const s1 = computeScopaStats(team1Cards);
  const s2 = computeScopaStats(team2Cards);

  // Carte (> 20)
  const p1Carte = s1.cardsCount > s2.cardsCount ? 1 : 0;
  const p2Carte = s2.cardsCount > s1.cardsCount ? 1 : 0;

  // Denari (> 5)
  const p1Denari = s1.denariCount > s2.denariCount ? 1 : 0;
  const p2Denari = s2.denariCount > s1.denariCount ? 1 : 0;

  // Settebello
  const p1Settebello = s1.hasSettebello ? 1 : 0;
  const p2Settebello = s2.hasSettebello ? 1 : 0;

  // Primiera
  const p1Primiera = s1.primieraScore > s2.primieraScore ? 1 : 0;
  const p2Primiera = s2.primieraScore > s1.primieraScore ? 1 : 0;

  const totalAdded1 = team1Scope + p1Carte + p1Denari + p1Settebello + p1Primiera;
  const totalAdded2 = team2Scope + p2Carte + p2Denari + p2Settebello + p2Primiera;

  const summary: string[] = [];
  if (p1Carte) summary.push(`Carte: Squadra 1 (${s1.cardsCount} vs ${s2.cardsCount})`);
  else if (p2Carte) summary.push(`Carte: Squadra 2 (${s2.cardsCount} vs ${s1.cardsCount})`);
  else summary.push(`Carte: Parità (${s1.cardsCount} - ${s2.cardsCount})`);

  if (p1Denari) summary.push(`Denari: Squadra 1 (${s1.denariCount} vs ${s2.denariCount})`);
  else if (p2Denari) summary.push(`Denari: Squadra 2 (${s2.denariCount} vs ${s1.denariCount})`);
  else summary.push(`Denari: Parità (${s1.denariCount} - ${s2.denariCount})`);

  if (p1Settebello) summary.push('Settebello: Squadra 1 (★ 7 Denari)');
  else if (p2Settebello) summary.push('Settebello: Squadra 2 (★ 7 Denari)');

  if (p1Primiera) summary.push(`Primiera: Squadra 1 (${s1.primieraScore} vs ${s2.primieraScore} pt)`);
  else if (p2Primiera) summary.push(`Primiera: Squadra 2 (${s2.primieraScore} vs ${s1.primieraScore} pt)`);
  else summary.push(`Primiera: Parità (${s1.primieraScore} pt)`);

  return {
    p1Points: {
      scope: team1Scope,
      carte: p1Carte,
      denari: p1Denari,
      settebello: p1Settebello,
      primiera: p1Primiera,
      totalAdded: totalAdded1,
    },
    p2Points: {
      scope: team2Scope,
      carte: p2Carte,
      denari: p2Denari,
      settebello: p2Settebello,
      primiera: p2Primiera,
      totalAdded: totalAdded2,
    },
    summary,
  };
}
