import { useReducer, useEffect } from 'react';
import { GameState, Card, Move } from '../engine/types';
import { createDeck, shuffle, isValidCapture, isValidRuspa } from '../engine/GameLogic';

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'SUBMIT_MOVE'; playerId: string; playedCard: Card; targetCards: Card[]; isRuspa: boolean }
  | { type: 'DOUBT' }
  | { type: 'ACCEPT' }
  | { type: 'BOT_MOVE' }
  | { type: 'DEAL_CARDS' };

function initialState(): GameState {
  const fullDeck = shuffle(createDeck());
  const initialBoard = fullDeck.splice(0, 4);
  const p1Hand = fullDeck.splice(0, 3);
  const p2Hand = fullDeck.splice(0, 3);

  return {
    board: initialBoard,
    players: {
      'player_1': { id: 'player_1', name: 'Tu', hand: p1Hand, captured: [], scopa: 0 },
      'bot_1': { id: 'bot_1', name: 'Bot AI', hand: p2Hand, captured: [], scopa: 0 }
    },
    turnOrder: ['player_1', 'bot_1'],
    currentTurn: 'player_1',
    phase: 'PLAYER_MOVE',
    pendingMove: null,
    lastActionMessage: 'Partita Iniziata!',
    deck: fullDeck,
    lastCaptureBy: null
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME':
      return initialState();

    case 'SUBMIT_MOVE': {
      if (state.phase !== 'PLAYER_MOVE' || state.currentTurn !== action.playerId) return state;

      const player = state.players[action.playerId];
      const newHand = player.hand.filter(c => c.id !== action.playedCard.id);

      const pendingMove: Move = {
        playerId: action.playerId,
        playedCard: action.playedCard,
        targetCards: action.targetCards,
        isRuspa: action.isRuspa,
        timestamp: Date.now()
      };

      return {
        ...state,
        players: { ...state.players, [action.playerId]: { ...player, hand: newHand } },
        phase: 'CHALLENGE_WINDOW',
        pendingMove,
        lastActionMessage: `${player.name} ha giocato una carta coperta...`
      };
    }

    case 'ACCEPT': {
      if (state.phase !== 'CHALLENGE_WINDOW' || !state.pendingMove) return state;
      const move = state.pendingMove;
      const player = state.players[move.playerId];

      const newBoard = state.board.filter(c => !move.targetCards.find(tc => tc.id === c.id));
      
      const isCaptureSequence = move.targetCards.length > 0 || move.isRuspa;
      const newCaptured = isCaptureSequence 
          ? [...player.captured, move.playedCard, ...move.targetCards] 
          : player.captured;
      const finalBoard = isCaptureSequence ? newBoard : [...newBoard, move.playedCard];

      let newScopa = player.scopa;
      let newLastCaptureBy = state.lastCaptureBy;

      if (isCaptureSequence) {
         newLastCaptureBy = move.playerId;
         // Scopa only if there were cards to begin with
         if (newBoard.length === 0 && state.board.length > 0) newScopa++; 
      }

      const nextPlayer = state.turnOrder.find(p => p !== move.playerId)!;

      return {
        ...state,
        board: finalBoard, 
        players: {
          ...state.players,
          [move.playerId]: { ...player, captured: newCaptured, scopa: newScopa }
        },
        phase: 'IDLE', 
        currentTurn: nextPlayer,
        pendingMove: null,
        lastActionMessage: !isCaptureSequence ? `${player.name} scarta una carta.` : `${player.name} prende indisturbato.`,
        lastCaptureBy: newLastCaptureBy
      };
    }

    case 'DOUBT': {
      if (state.phase !== 'CHALLENGE_WINDOW' || !state.pendingMove) return state;
      
      const move = state.pendingMove;
      const player = state.players[move.playerId];
      const opponentId = state.turnOrder.find(p => p !== move.playerId)!;
      const opponent = state.players[opponentId];
      
      let isTruth = false;
      if (move.isRuspa) {
        isTruth = isValidRuspa(move.playedCard.value, move.targetCards.length, state.board.length);
      } else if (move.targetCards.length === 0) {
        isTruth = true;
      } else {
        isTruth = isValidCapture(move.playedCard.value, move.targetCards.map(c => c.value));
      }

      const isCaptureSequence = move.targetCards.length > 0 || move.isRuspa;

      if (isTruth) {
        let newScopa = player.scopa + 1; 
        const newBoard = state.board.filter(c => !move.targetCards.find(tc => tc.id === c.id));
        let newLastCaptureBy = state.lastCaptureBy;

        if (isCaptureSequence) {
           newLastCaptureBy = move.playerId;
           if (newBoard.length === 0 && state.board.length > 0) newScopa++; 
        }

        const newCaptured = isCaptureSequence 
             ? [...player.captured, move.playedCard, ...move.targetCards] 
             : player.captured;
        const finalBoard = isCaptureSequence ? newBoard : [...newBoard, move.playedCard];

        return {
          ...state,
          board: finalBoard,
          players: {
            ...state.players,
            [player.id]: { ...player, captured: newCaptured, scopa: newScopa }
          },
          phase: 'IDLE',
          currentTurn: opponentId,
          pendingMove: null,
          lastActionMessage: `DUBITO FALLITO! La carta era un ${move.playedCard.value === 1 ? 'A' : move.playedCard.value}. ${player.name} ottiene la mossa e 1 Scopa!`,
          lastCaptureBy: newLastCaptureBy
        };
      } else {
        const penaltyPoints = move.isRuspa ? 2 : 1;
        return {
          ...state,
          board: [...state.board, move.playedCard], 
          players: {
           ...state.players,
           [opponentId]: { ...opponent, scopa: opponent.scopa + penaltyPoints }
          },
          phase: 'IDLE',
          currentTurn: opponentId,
          pendingMove: null,
          lastActionMessage: `BLUFF SMASCHERATO! La carta era un ${move.playedCard.value === 1 ? 'A' : move.playedCard.value}. ${opponent.name} incassa ${penaltyPoints} pt.`
        };
      }
    }

    case 'DEAL_CARDS': {
        const p1 = state.players['player_1'];
        const p2 = state.players['bot_1'];
        if (p1.hand.length === 0 && p2.hand.length === 0) {
            if (state.deck.length === 0) {
                let finalP1Captured = [...p1.captured];
                let finalP2Captured = [...p2.captured];
                if (state.lastCaptureBy === 'player_1') finalP1Captured.push(...state.board);
                else if (state.lastCaptureBy === 'bot_1') finalP2Captured.push(...state.board);

                return { 
                  ...state, 
                  board: [],
                  players: {
                    ...state.players,
                    'player_1': { ...p1, captured: finalP1Captured },
                    'bot_1': { ...p2, captured: finalP2Captured }
                  },
                  phase: 'GAME_OVER' 
                };
            }
            const newDeck = [...state.deck];
            const p1Hand = newDeck.splice(0, 3);
            const p2Hand = newDeck.splice(0, 3);
            return {
                ...state,
                deck: newDeck,
                phase: 'PLAYER_MOVE',
                players: {
                    ...state.players,
                    'player_1': { ...p1, hand: p1Hand },
                    'bot_1': { ...p2, hand: p2Hand }
                }
            };
        }
        return { ...state, phase: 'PLAYER_MOVE' };
    }

    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, Object.create(null), initialState);

  useEffect(() => {
    if (state.phase === 'IDLE') {
        const t = setTimeout(() => {
            dispatch({ type: 'DEAL_CARDS' });
        }, 3000); 
        return () => clearTimeout(t);
    }
  }, [state.phase]);

  return { state, dispatch };
}
