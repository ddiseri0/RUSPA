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

export interface ClientPlayerState {
  id: string;
  name: string;
  handCount: number;
  hand?: Card[]; // Only populated for the user's own state
  capturedCount: number;
  scopa: number;
}

export interface GameState {
  roomId?: string;
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

export interface ClientGameState {
  roomId: string;
  board: Card[];
  players: Record<string, ClientPlayerState>;
  turnOrder: string[]; 
  currentTurn: string;
  phase: Phase;
  pendingMove: Move | null; // For opponents, playedCard might be a hidden placeholer like {id:'hidden', suit:'denari', value:0}
  lastActionMessage: string;
  deckCount: number;
  lastCaptureBy: string | null;
}
