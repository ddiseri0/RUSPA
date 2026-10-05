/**
 * Modulo ponte per le regole di Scopa e La Ruspa.
 * Reindirizza verso il motore puro src/logica/regoleScopa.ts.
 */

import { Card, Suit } from '../types/game';
import {
  SEMI,
  NOMI_SEMI,
  PUNTI_PRIMIERA,
  creaMazzoNapoletano,
  mescolaMazzo,
  verificaLegittimitaPresa,
  calcolaPunteggioPrimiera,
  calcolaStatisticheLive,
  ottieniEtichettaCarta,
  valutaPuntiFineManche,
} from '../logica/regoleScopa';

export * from '../logica/regoleScopa';

export const SUITS: Suit[] = SEMI;
export const SUIT_NAMES = NOMI_SEMI;
export const PRIMIERA_POINTS = PUNTI_PRIMIERA;

export function createStandardDeck(): Card[] {
  return creaMazzoNapoletano();
}

export function shuffleDeck(deck: Card[]): Card[] {
  return mescolaMazzo(deck);
}

export function getCardLabel(value: number): string {
  return ottieniEtichettaCarta(value);
}

export function calculatePrimieraScore(cards: Card[]): number {
  return calcolaPunteggioPrimiera(cards);
}

export interface LiveScopaStats {
  cardsCount: number;
  denariCount: number;
  hasSettebello: boolean;
  primieraScore: number;
}

export function computeScopaStats(cards: Card[]): LiveScopaStats {
  const stats = calcolaStatisticheLive(cards);
  return {
    cardsCount: stats.conteggioCarte,
    denariCount: stats.conteggioDenari,
    hasSettebello: stats.haSettebello,
    primieraScore: stats.punteggioPrimiera,
  };
}

export function verifyCaptureLegitimacy(
  playedCard: Card,
  targetCards: Card[],
  isRuspa: boolean,
  _totalBoardCardsCount?: number,
  currentBoard: Card[] = []
): {
  isLegal: boolean;
  reason: string;
} {
  const res = verificaLegittimitaPresa(playedCard, targetCards, isRuspa, currentBoard);
  return {
    isLegal: res.eLegittima,
    reason: res.motivo,
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
  const esito = valutaPuntiFineManche(team1Cards, team2Cards, team1Scope, team2Scope);
  return {
    p1Points: {
      scope: esito.squadra1.scope,
      carte: esito.squadra1.carte,
      denari: esito.squadra1.denari,
      settebello: esito.squadra1.settebello,
      primiera: esito.squadra1.primiera,
      totalAdded: esito.squadra1.totaleAggiunto,
    },
    p2Points: {
      scope: esito.squadra2.scope,
      carte: esito.squadra2.carte,
      denari: esito.squadra2.denari,
      settebello: esito.squadra2.settebello,
      primiera: esito.squadra2.primiera,
      totalAdded: esito.squadra2.totaleAggiunto,
    },
    summary: esito.riepilogo,
  };
}
