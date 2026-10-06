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
    carteCount: number;
    denari: number;
    denariCount: number;
    settebello: number;
    haSettebello: boolean;
    primiera: number;
    primieraScore: number;
    totalAdded: number;
  };
  p2Points: {
    scope: number;
    carte: number;
    carteCount: number;
    denari: number;
    denariCount: number;
    settebello: number;
    haSettebello: boolean;
    primiera: number;
    primieraScore: number;
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
      carteCount: esito.squadra1.carteCount,
      denari: esito.squadra1.denari,
      denariCount: esito.squadra1.denariCount,
      settebello: esito.squadra1.settebello,
      haSettebello: esito.squadra1.haSettebello,
      primiera: esito.squadra1.primiera,
      primieraScore: esito.squadra1.primieraScore,
      totalAdded: esito.squadra1.totaleAggiunto,
    },
    p2Points: {
      scope: esito.squadra2.scope,
      carte: esito.squadra2.carte,
      carteCount: esito.squadra2.carteCount,
      denari: esito.squadra2.denari,
      denariCount: esito.squadra2.denariCount,
      settebello: esito.squadra2.settebello,
      haSettebello: esito.squadra2.haSettebello,
      primiera: esito.squadra2.primiera,
      primieraScore: esito.squadra2.primieraScore,
      totalAdded: esito.squadra2.totaleAggiunto,
    },
    summary: esito.riepilogo,
  };
}
