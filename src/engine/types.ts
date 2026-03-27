export type Suit = 'denari' | 'coppe' | 'spade' | 'bastoni';

export interface Card {
  id: string; // e.g., 'denari-7'
  suit: Suit;
  value: number; // 1 to 10
  isSettebello?: boolean;
}

export type Phase = 'IDLE' | 'PLAYER_MOVE' | 'CHALLENGE_WINDOW' | 'RESOLUTION' | 'GAME_OVER';

export interface Move {
  playerId: string;
  playedCard: Card; 
  targetCards: Card[]; 
  isRuspa: boolean;
  timestamp: number;
}

export interface PlayerState {
  id: string;
  name: string;
  hand: Card[];
  captured: Card[];
  scopa: number;
}

export interface GameState {
  board: Card[];
  players: Record<string, PlayerState>;
  turnOrder: string[]; 
  currentTurn: string;
  phase: Phase;
  pendingMove: Move | null;
  lastActionMessage: string;
  deck: Card[];
  lastCaptureBy: string | null;
}
