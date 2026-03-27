import { useEffect, useState } from 'react';
import { useGame } from './hooks/useGame';
import { Card as CardType } from './engine/types';
import { Card } from './components/Card';
import { getBotMove, shouldBotDoubt } from './engine/Bot';
import { calculateRoundScore } from './engine/GameLogic';

function App() {
  const { state, dispatch } = useGame();
  const [selectedHandCard, setSelectedHandCard] = useState<CardType | null>(null);
  const [selectedTableCards, setSelectedTableCards] = useState<CardType[]>([]);

  const player = state.players['player_1'];
  const bot = state.players['bot_1'];

  let finalScore = null;
  if (state.phase === 'GAME_OVER') {
     finalScore = calculateRoundScore(player.captured, bot.captured, player.scopa, bot.scopa);
  }

  // Gestione Turno Bot
  useEffect(() => {
    if (state.phase === 'PLAYER_MOVE' && state.currentTurn === 'bot_1') {
      const wait = setTimeout(() => {
        const move = getBotMove(state);
        if (move) {
            const playedCard = bot.hand.find(c => c.id === move.cardId)!;
            const targetCards = move.targetIds.map(id => state.board.find(c => c.id === id)!);
            dispatch({ type: 'SUBMIT_MOVE', playerId: 'bot_1', playedCard, targetCards, isRuspa: false });
        }
      }, 1500);
      return () => clearTimeout(wait);
    }
  }, [state.phase, state.currentTurn, state, dispatch, bot]);

  // Gestione IA che dubita
  useEffect(() => {
    if (state.phase === 'CHALLENGE_WINDOW' && state.pendingMove?.playerId === 'player_1') {
      const wait = setTimeout(() => {
          if (shouldBotDoubt(state)) {
              dispatch({ type: 'DOUBT' });
          } else {
              dispatch({ type: 'ACCEPT' });
          }
      }, 2000);
      return () => clearTimeout(wait);
    }
  }, [state.phase, state.pendingMove, state, dispatch]);

  const toggleTableCard = (c: CardType) => {
    if (selectedTableCards.find(sc => sc.id === c.id)) {
      setSelectedTableCards(selectedTableCards.filter(sc => sc.id !== c.id));
    } else {
      setSelectedTableCards([...selectedTableCards, c]);
    }
  };

  const handlePlayNormal = () => {
    if (!selectedHandCard) return;
    dispatch({
      type: 'SUBMIT_MOVE',
      playerId: 'player_1',
      playedCard: selectedHandCard,
      targetCards: selectedTableCards,
      isRuspa: false
    });
    setSelectedHandCard(null);
    setSelectedTableCards([]);
  };

  const handleRuspa = () => {
     if (!selectedHandCard) return;
     dispatch({
        type: 'SUBMIT_MOVE',
        playerId: 'player_1',
        playedCard: selectedHandCard,
        targetCards: state.board, // Prende tutto
        isRuspa: true
      });
      setSelectedHandCard(null);
      setSelectedTableCards([]);
  }


  return (
    <div className="game-container">
      <div className="top-bar">
        <div>🤖 Bot AI: {bot?.scopa} Scopa | Prese: {bot?.captured.length}</div>
        <div style={{fontWeight: '900', color: 'var(--gold-accent)', fontSize:'1.2rem', textTransform: 'uppercase'}}>{state.lastActionMessage}</div>
        <div>Dom: {player?.scopa} Scopa | Prese: {player?.captured.length}</div>
      </div>
      
      <div className="board-area">
        <div className="table-flex">
          {state.board.map(c => {
            const isSelectedByPlayer = !!selectedTableCards.find(sc => sc.id === c.id);
            const isTargetedByOp = state.phase === 'CHALLENGE_WINDOW' && 
                                   state.pendingMove?.playerId === 'bot_1' && 
                                   (!!state.pendingMove.targetCards.find(tc => tc.id === c.id) || state.pendingMove.isRuspa);
            return (
              <Card 
                key={c.id} 
                card={c} 
                isSelected={isSelectedByPlayer}
                isTargeted={isTargetedByOp}
                onClick={() => toggleTableCard(c)}
              />
            );
          })}
        </div>
        
        {state.pendingMove && (
            <div className={`pending-move-area ${state.phase === 'IDLE' ? 'shake' : ''}`}>
                <Card card={state.pendingMove.playedCard} hidden={state.phase === 'CHALLENGE_WINDOW' /* only hide if unresolved */} />
            </div>
        )}
      </div>

      <div className="player-area">
        <h3 style={{margin:'0 0 10px 0'}}>{state.currentTurn === 'player_1' ? "Tocca a te" : "Attendi il turno del bot..."}</h3>
        <div className="hand-flex">
          {player?.hand.map(c => (
             <Card 
              key={c.id} 
              card={c} 
              isSelected={selectedHandCard?.id === c.id}
              onClick={() => setSelectedHandCard(c)}
            />
          ))}
        </div>
        
        {state.currentTurn === 'player_1' && state.phase === 'PLAYER_MOVE' && selectedHandCard && (
            <div style={{marginTop: '15px'}}>
               <button className="btn btn-danger" onClick={handleRuspa}>Dichiara RUSPA ✨</button>
               <button className="btn" onClick={handlePlayNormal}>Calata (Normale)</button>
            </div>
        )}
      </div>
      
      {state.phase === 'CHALLENGE_WINDOW' && state.pendingMove?.playerId === 'bot_1' && (
      <div className="challenge-overlay">
        <div className="challenge-box">
          <h2 className="challenge-title">DUBITO!</h2>
          {state.pendingMove.isRuspa ? (
              <p style={{fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--gold-accent)'}}>L'IA dichiara RUSPA! Vuole prendere TUTTO il tavolo.</p>
          ) : state.pendingMove.targetCards.length > 0 ? (
              <p>L'IA vuole prendere: <strong>{state.pendingMove.targetCards.map(c => `${c.value === 1 ? 'A' : c.value}${c.suit === 'denari' ? '🪙' : c.suit === 'coppe' ? '🏆' : c.suit === 'spade' ? '⚔️' : '🪵'}`).join(', ')}</strong></p>
          ) : (
              <p>L'IA sta scartando una carta sul tavolo.</p>
          )}
          <div className="timer-bar"><div className="timer-fill" style={{animation: 'shrink 3s linear forwards'}}></div></div>
          {state.pendingMove.targetCards.length > 0 && (
             <button className="btn btn-danger" onClick={() => dispatch({type: 'DOUBT'})}>DUBITO!</button>
          )}
          <button className="btn" onClick={() => dispatch({type: 'ACCEPT'})}>LASCIA PASSARE</button>
        </div>
      </div> 
      )}

      {state.phase === 'GAME_OVER' && finalScore && (
      <div className="challenge-overlay">
        <div className="challenge-box" style={{width: '400px'}}>
          <h2 className="challenge-title">PARTITA FINITA</h2>
          
          <div style={{margin: '20px 0', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px'}}>
             <div style={{display:'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', marginBottom:'10px', paddingBottom:'5px'}}>
               <span style={{fontWeight:'bold'}}>Punti Scopa Fatti:</span> <span>Tu: {player.scopa} | Bot: {bot.scopa}</span>
             </div>
             
             <div style={{display:'flex', justifyContent: 'space-between'}}><span>🏆 Carte:</span> <span>{finalScore.details.carte}</span></div>
             <div style={{display:'flex', justifyContent: 'space-between'}}><span>💰 Denari:</span> <span>{finalScore.details.denari}</span></div>
             <div style={{display:'flex', justifyContent: 'space-between'}}><span>🃏 Settebello:</span> <span>{finalScore.details.settebello}</span></div>
             <div style={{display:'flex', justifyContent: 'space-between'}}><span>👑 Primiera:</span> <span>{finalScore.details.primiera}</span></div>
             
             <div style={{display:'flex', justifyContent: 'space-between', borderTop: '2px solid var(--accent-color)', marginTop:'10px', paddingTop:'10px', fontSize:'1.2rem', fontWeight:'bold', color:'var(--gold-accent)'}}>
               <span>TOTALE:</span> <span>Tu: {finalScore.player1Points} - Bot: {finalScore.botPoints}</span>
             </div>
          </div>
          
          <button className="btn btn-danger" onClick={() => dispatch({type: 'START_GAME'})}>Nuova Partita</button>
        </div>
      </div> 
      )}
    </div>
  )
}

export default App;
