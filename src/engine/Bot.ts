import { GameState } from './types';
import { isValidCapture } from './GameLogic';

export function getBotMove(state: GameState): { cardId: string, targetIds: string[], isRuspa: boolean } | null {
  const bot = state.players['bot_1'];
  if (!bot || bot.hand.length === 0) return null;

  // 1. Controlla se il Bot ha un Asso in mano per fare RUSPA
  if (state.board.length > 0) {
      const ace = bot.hand.find(c => c.value === 1);
      if (ace) {
          // Gioca la Ruspa vera! Prende tutto il tavolo
          return { cardId: ace.id, targetIds: state.board.map(c => c.id), isRuspa: true };
      }
  }

  // 2. Cerca una presa onesta per qualsiasi carta nella sua mano
  for (const handCard of bot.hand) {
    // A. Prova a prendere carte singole che hanno lo stesso valore (Scopa standard)
    for (const boardCard of state.board) {
      if (isValidCapture(handCard.value, [boardCard.value])) {
          return { cardId: handCard.id, targetIds: [boardCard.id], isRuspa: false };
      }
    }
    
    // B. Prova a sommare esattamente DUE carte sul tavolo
    for (let i = 0; i < state.board.length; i++) {
        for (let j = i + 1; j < state.board.length; j++) {
            if (isValidCapture(handCard.value, [state.board[i].value, state.board[j].value])) {
                return { cardId: handCard.id, targetIds: [state.board[i].id, state.board[j].id], isRuspa: false };
            }
        }
    }
    
    // NOTA: Per il PoC ci fermiamo alla somma di 2 carte, nella scopa vera può sommare 'n' carte, 
    // ma la combinazione 1+2 preferisce la singola per la regola base introdotta.
  }

  // 3. Se non trova prese oneste, è costretto a "Lissiare" (calata a vuoto).
  // Ordinamento per sacrificare la carta MENO preziosa.
  const sortedHand = [...bot.hand].sort((a, b) => {
     let scoreA = 0;
     let scoreB = 0;
     if (a.suit === 'denari') scoreA += 10;
     if (b.suit === 'denari') scoreB += 10;
     if (a.isSettebello) scoreA += 50;
     if (b.isSettebello) scoreB += 50;
     if (a.value === 1) scoreA += 1000; // Mai scartare l'asso
     if (b.value === 1) scoreB += 1000;
     return scoreA - scoreB;
  });

  const cardToDrop = sortedHand[0];

  return { cardId: cardToDrop.id, targetIds: [], isRuspa: false };
}

export function shouldBotDoubt(state: GameState): boolean {
  if (!state.pendingMove) return false;
  
  // Non si dubitano mai gli scarti a vuoto
  if (state.pendingMove.targetCards.length === 0) return false;

  // Se è una chiamata RUSPA da parte del giocatore, il bot diventa molto protettivo (60% di chance)
  if (state.pendingMove.isRuspa) {
      return Math.random() < 0.6;
  }
  
  // Sulle prese normali dubita casualmente il 30% delle volte per testare il sistema
  return Math.random() < 0.3;
}
