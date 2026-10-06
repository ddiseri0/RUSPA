/**
 * Modelli e Tipi di Dominio per "La Ruspa" (Scopa Moderna con Meccaniche Dubito e Asso Ruspa)
 * Nomenclatura in lingua italiana con supporto interoperabile completo.
 */

export type Seme = 'denari' | 'coppe' | 'spade' | 'bastoni';
export type Suit = Seme;

export interface Carta {
  id: string; // es. 'denari-7'
  suit: Seme;
  value: number; // 1 (Asso) a 10 (Re)
  isSettebello?: boolean;
  // Accessori italiani
  seme?: Seme;
  valore?: number;
  eSettebello?: boolean;
}

export type Card = Carta;
export type ModalitaGioco = '1v1' | '2v2';
export type GameMode = ModalitaGioco;

export type FaseGioco =
  | 'LOBBY'
  | 'DEALING'
  | 'DISTRIBUZIONE'
  | 'PLAYER_TURN'
  | 'TURNO_GIOCATORE'
  | 'DUBITO_WINDOW'
  | 'FINESTRA_DUBITO'
  | 'RESOLUTION'
  | 'RISOLUZIONE'
  | 'ROUND_OVER'
  | 'FINE_MANCHE'
  | 'GAME_OVER'
  | 'FINE_PARTITA';

export type GamePhase = FaseGioco;

export interface Giocatore {
  id: string;
  name: string;
  avatarSeed: string;
  team: 1 | 2;
  seat: number; // 0 a 3
  isReady: boolean;
  handCount: number;
  capturedCount: number;
  scopaCount: number;
  score: number;
  isHost?: boolean;
  // Accessori opzionali in italiano
  nome?: string;
  semeAvatar?: string;
  squadra?: 1 | 2;
  posto?: number;
  ePronto?: boolean;
  conteggioMano?: number;
  conteggioPrese?: number;
  conteggioScope?: number;
  punteggio?: number;
  eHost?: boolean;
}

export type Player = Giocatore;

export interface Mossa {
  playerId: string;
  playerName: string;
  idGiocatore?: string;
  nomeGiocatore?: string;
  playedCard: Carta;
  cartaGiocata?: Carta;
  targetCardIds: string[];
  idCarteBersaglio?: string[];
  isRuspa: boolean;
  eRuspa?: boolean;
  isDiscardFaceUp?: boolean;
  eScartoScoperto?: boolean;
  isDeclaredScopa?: boolean;
  declaredOnly?: boolean;
  timestamp: number;
}

export type Move = Mossa;

export interface VotoDubito {
  idGiocatore: string;
  playerId?: string;
  vote: 'DUBITO' | 'PASSA';
  voto?: 'DUBITO' | 'PASSA';
  timestamp: number;
}

export type DubitoVote = VotoDubito;

export interface StatoDubito {
  active: boolean;
  attivo?: boolean;
  move: Mossa;
  mossa?: Mossa;
  initiatorId: string;
  idIniziatore?: string;
  targetTeam: 1 | 2;
  squadraAvversaria?: 1 | 2;
  votes: Record<string, 'DUBITO' | 'PASSA'>;
  voti?: Record<string, 'DUBITO' | 'PASSA'>;
  expiresAt: number;
  scadenza?: number;
  status: 'PENDING' | 'CHALLENGED' | 'PASSED' | 'RESOLVED' | 'IN_ATTESA' | 'DUBITATO' | 'PASSATO' | 'RISOLTO';
  stato?: 'IN_ATTESA' | 'DUBITATO' | 'PASSATO' | 'RISOLTO';
  outcome?: {
    wasBluff: boolean;
    winnerPlayerId: string;
    description: string;
  };
  esito?: {
    eraBluff: boolean;
    idVincitore: string;
    descrizione: string;
  };
}

export type DubitoState = StatoDubito;

export interface StatisticheScopaLive {
  conteggioCarte: number;
  conteggioDenari: number;
  haSettebello: boolean;
  punteggioPrimiera: number;
}

export interface EsitoPuntiManche {
  squadra1: {
    scope: number;
    carte: number;
    carteCount: number;
    denari: number;
    denariCount: number;
    settebello: number;
    haSettebello: boolean;
    primiera: number;
    primieraScore: number;
    totaleAggiunto: number;
  };
  squadra2: {
    scope: number;
    carte: number;
    carteCount: number;
    denari: number;
    denariCount: number;
    settebello: number;
    haSettebello: boolean;
    primiera: number;
    primieraScore: number;
    totaleAggiunto: number;
  };
  riepilogo: string[];
}

export interface MancheDetail {
  mancheNumber: number;
  isGameOver: boolean;
  squadra1: {
    name: string;
    scope: number;
    carte: number;
    carteCount: number;
    denari: number;
    denariCount: number;
    settebello: number;
    haSettebello: boolean;
    primiera: number;
    primieraScore: number;
    totaleAggiunto: number;
    totaleProgressivo: number;
  };
  squadra2: {
    name: string;
    scope: number;
    carte: number;
    carteCount: number;
    denari: number;
    denariCount: number;
    settebello: number;
    haSettebello: boolean;
    primiera: number;
    primieraScore: number;
    totaleAggiunto: number;
    totaleProgressivo: number;
  };
  riepilogo: string[];
  readyPlayers?: Record<string, boolean>;
}

export interface RoomState {
  roomId: string;
  code: string;
  mode: GameMode;
  phase: GamePhase;
  hostId: string;
  players: Record<string, Player>;
  turnOrder: string[];
  currentTurnPlayerId: string;
  board: Card[];
  deckRemaining: number;
  deck?: Card[];
  capturedPiles?: Record<string, Card[]>;
  dealerIndex?: number;
  mancheNumber?: number;
  teamScores?: Record<1 | 2, number>;
  winner?: {
    team: 1 | 2;
    winnerNames: string[];
    score: number;
  } | null;
  lastMancheSummary?: string[];
  mancheDetail?: MancheDetail | null;
  pendingMove: Move | null;
  dubitoState: DubitoState | null;
  scopaeEvent?: {
    winnerId: string;
    winnerName: string;
    points: 2;
    timestamp: number;
  } | null;
  lastCapturePlayerId: string | null;
  lastActionMessage: string;
  updatedAt: number;
  privateHands?: Record<string, Card[]>;
}

export type StatoPartita = RoomState;
