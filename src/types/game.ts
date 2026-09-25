export type Suit = 'denari' | 'coppe' | 'spade' | 'bastoni';

export interface Card {
  id: string; // e.g. 'denari-7'
  suit: Suit;
  value: number; // 1 to 10 (1=Asso, 8=Donna, 9=Cavallo, 10=Re)
  isSettebello?: boolean;
}

export type GameMode = '1v1' | '2v2';

export type GamePhase =
  | 'LOBBY'
  | 'DEALING'
  | 'PLAYER_TURN'
  | 'DUBITO_WINDOW'
  | 'RESOLUTION'
  | 'ROUND_OVER'
  | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  avatarSeed: string;
  team: 1 | 2;
  seat: number; // 0 to 3
  isReady: boolean;
  handCount: number;
  capturedCount: number;
  scopaCount: number;
  score: number;
  isHost?: boolean;
}

export interface Move {
  playerId: string;
  playerName: string;
  playedCard: Card; // Secret card played face down
  targetCardIds: string[]; // Cards targeted for capture on board
  isRuspa: boolean; // Asso prenditutto (real or bluff)
  isDiscardFaceUp?: boolean; // Dropped on table face-up without capture (no Dubito)
  declaredOnly?: boolean;
  timestamp: number;
}

export interface DubitoVote {
  playerId: string;
  vote: 'DUBITO' | 'PASSA';
  timestamp: number;
}

export interface DubitoState {
  active: boolean;
  move: Move;
  initiatorId: string;
  targetTeam: 1 | 2; // Team that can vote
  votes: Record<string, 'DUBITO' | 'PASSA'>;
  expiresAt: number; // Epoch timestamp for the countdown timer
  status: 'PENDING' | 'CHALLENGED' | 'PASSED' | 'RESOLVED';
  outcome?: {
    wasBluff: boolean;
    winnerPlayerId: string;
    description: string;
  };
}

export interface RoomState {
  roomId: string;
  code: string; // 6-digit room code
  mode: GameMode;
  phase: GamePhase;
  hostId: string;
  players: Record<string, Player>;
  turnOrder: string[]; // array of playerIds in order of play
  currentTurnPlayerId: string;
  board: Card[]; // Face-up cards currently on the table
  deckRemaining: number;
  deck?: Card[]; // Remaining cards in the 40-card deck to deal in 3s
  capturedPiles?: Record<string, Card[]>; // Player ID -> pile of captured cards
  dealerIndex?: number; // Index in turnOrder for rotating primo di mano
  mancheNumber?: number; // Current manche count (1, 2, ...)
  teamScores?: Record<1 | 2, number>; // Total cumulative game scores towards 21
  winner?: {
    team: 1 | 2;
    winnerNames: string[];
    score: number;
  } | null;
  lastMancheSummary?: string[];
  pendingMove: Move | null; // Currently played card face-down
  dubitoState: DubitoState | null;
  lastCapturePlayerId: string | null;
  lastActionMessage: string;
  updatedAt: number;
  
  // Private hands stored in Firestore subcollection or root document for simplicity
  privateHands?: Record<string, Card[]>;
}
