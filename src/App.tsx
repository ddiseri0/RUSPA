import { useState } from 'react';
import { useMultiplayerGame } from './hooks/useMultiplayerGame';
import { Card as CardType } from './engine/types';
import { Card } from './components/Card';

function App() {
  const { state, error, playerId, joinRoom, submitMove, dubito } = useMultiplayerGame();
  
  const [selectedHandCard, setSelectedHandCard] = useState<CardType | null>(null);
  const [selectedTableCards, setSelectedTableCards] = useState<CardType[]>([]);
  
  const [lobbyName, setLobbyName] = useState('');
  const [lobbyRoom, setLobbyRoom] = useState('');

  if (!state) {
    return (
      <div className="game-container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', height: '100vh'}}>
        <h1 style={{color: 'var(--gold-accent)', fontSize: '3rem', margin: 0}}>RUSPA.IO</h1>
        <div style={{background: 'rgba(0,0,0,0.5)', padding: '30px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '15px', width: '300px'}}>
          {error && <div style={{color: 'red', fontWeight: 'bold'}}>{error}</div>}
          <input 
            placeholder="Il tuo nome (es. Mario)" 
            value={lobbyName} 
            onChange={e => setLobbyName(e.target.value)} 
            style={{padding: '10px', fontSize: '1.2rem', borderRadius: '5px', border: 'none'}}
          />
          <input 
            placeholder="Codice Stanza (es. 1234)" 
            value={lobbyRoom} 
            onChange={e => setLobbyRoom(e.target.value.toUpperCase())} 
            maxLength={4}
            style={{padding: '10px', fontSize: '1.2rem', borderRadius: '5px', border: 'none', letterSpacing: '5px', textAlign: 'center'}}
          />
          <button 
            className="btn btn-danger" 
            style={{fontSize: '1.2rem', padding: '15px'}} 
            onClick={() => joinRoom(lobbyRoom, lobbyName)}
            disabled={!lobbyName || lobbyRoom.length < 4}
          >
            ENTRA IN LOBBY
          </button>
        </div>
      </div>
    );
  }

  const me = state.players[playerId || ''];
  // Trova l'avversario escludendo me
  const opponentId = Object.keys(state.players).find(id => id !== playerId);
  const opponent = opponentId ? state.players[opponentId] : null;

  if (state.phase === 'IDLE' && Object.keys(state.players).length < 2) {
      return (
         <div className="game-container" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh'}}>
           <h2>Stanza: {state.roomId}</h2>
           <p style={{fontSize: '1.5rem', color: 'var(--gold-accent)'}}>In attesa che un altro giocatore si unisca...</p>
         </div>
      );
  }

  const toggleTableCard = (c: CardType) => {
    if (selectedTableCards.find(sc => sc.id === c.id)) {
      setSelectedTableCards(selectedTableCards.filter(sc => sc.id !== c.id));
    } else {
      setSelectedTableCards([...selectedTableCards, c]);
    }
  };

  const handlePlayNormal = () => {
    if (!selectedHandCard) return;
    submitMove(selectedHandCard, selectedTableCards, false);
    setSelectedHandCard(null);
    setSelectedTableCards([]);
  };

  const handleRuspa = () => {
     if (!selectedHandCard) return;
     submitMove(selectedHandCard, state.board, true);
     setSelectedHandCard(null);
     setSelectedTableCards([]);
  }

  const opponentHiddenCards = [];
  if (opponent) {
      for (let i=0; i<opponent.handCount; i++) {
         opponentHiddenCards.push({ id: `hidden-${i}`, suit: 'denari', value: 0 } as any);
      }
  }

  return (
    <div className="game-container">
      <div className="top-bar">
        <div>👤 {opponent?.name || 'Avversario'}: {opponent?.scopa || 0} Scopa | Prese: {opponent?.capturedCount || 0}</div>
        <div style={{fontWeight: '900', color: 'var(--gold-accent)', fontSize:'1.2rem', textTransform: 'uppercase'}}>{state.lastActionMessage}</div>
        <div>👤 {me?.name || 'Tu'}: {me?.scopa || 0} Scopa | Prese: {me?.capturedCount || 0}</div>
      </div>

      <div className="player-area" style={{opacity: state.currentTurn === opponentId ? 1 : 0.5}}>
        <h3 style={{margin:'0 0 10px 0'}}>{opponent?.name || 'In attesa...'}</h3>
        <div className="hand-flex" style={{transform: 'scale(0.8)'}}>
          {opponentHiddenCards.map(c => (
             <Card key={c.id} card={c} hidden={true} isSelected={false} onClick={() => {}} />
          ))}
        </div>
      </div>
      
      <div className="board-area">
        <div className="table-flex">
          {state.board.map(c => {
            const isSelectedByPlayer = !!selectedTableCards.find(sc => sc.id === c.id);
            const isTargetedByOp = state.phase === 'CHALLENGE_WINDOW' && 
                                   state.pendingMove?.playerId === opponentId && 
                                   (!!state.pendingMove?.targetCards.find(tc => tc.id === c.id) || state.pendingMove?.isRuspa);
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
            <div className={`pending-move-area`}>
                <Card card={state.pendingMove.playedCard} hidden={state.pendingMove?.playedCard?.id === 'hidden' && state.phase === 'CHALLENGE_WINDOW'} />
            </div>
        )}
      </div>

      <div className="player-area" style={{opacity: state.currentTurn === playerId ? 1 : 0.5}}>
        <h3 style={{margin:'0 0 10px 0'}}>{state.currentTurn === playerId ? "Tocca a te" : `Attendi il turno di ${opponent?.name}...`}</h3>
        <div className="hand-flex">
          {me?.hand?.map(c => (
             <Card 
              key={c.id} 
              card={c} 
              isSelected={selectedHandCard?.id === c.id}
              onClick={() => setSelectedHandCard(c)}
            />
          ))}
        </div>
        
        {state.currentTurn === playerId && state.phase === 'PLAYER_MOVE' && selectedHandCard && (
            <div style={{marginTop: '15px'}}>
               <button className="btn btn-danger" onClick={handleRuspa}>Dichiara RUSPA ✨</button>
               <button className="btn" onClick={handlePlayNormal}>Calata (Normale)</button>
            </div>
        )}
      </div>
      
      {state.phase === 'CHALLENGE_WINDOW' && state.pendingMove?.playerId !== playerId && (
      <div className="challenge-overlay">
        <div className="challenge-box">
          <h2 className="challenge-title">DUBITO!</h2>
          {state.pendingMove?.isRuspa ? (
              <p style={{fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--gold-accent)'}}>{opponent?.name} dichiara RUSPA! Vuole prendere TUTTO il tavolo.</p>
          ) : state.pendingMove?.targetCards && state.pendingMove.targetCards.length > 0 ? (
              <p>{opponent?.name} sta prendendo quelle evidenziate.</p>
          ) : (
              <p>{opponent?.name} sta scartando una carta sul tavolo.</p>
          )}
          <div className="timer-bar"><div className="timer-fill" style={{animation: 'shrink 5s linear forwards'}}></div></div>
          {state.pendingMove?.targetCards && state.pendingMove.targetCards.length > 0 && (
             <button className="btn btn-danger" onClick={dubito}>DUBITO!</button>
          )}
          <p style={{fontSize: '0.8rem', marginTop: '10px'}}>Se non fai nulla, la mossa passa.</p>
        </div>
      </div> 
      )}

      {state.phase === 'GAME_OVER' && (
      <div className="challenge-overlay">
        <div className="challenge-box" style={{width: '400px'}}>
          <h2 className="challenge-title">PARTITA FINITA</h2>
          <div style={{margin: '20px 0', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px'}}>
             <div style={{display:'flex', justifyContent: 'space-between', borderBottom: '1px solid #444', marginBottom:'10px', paddingBottom:'5px'}}>
               <span style={{fontWeight:'bold'}}>Punti Scopa Fatti:</span> <span>Tu: {me?.scopa} | {opponent?.name}: {opponent?.scopa}</span>
             </div>
             
             <div style={{display:'flex', justifyContent: 'space-between', borderTop: '2px solid var(--accent-color)', marginTop:'10px', paddingTop:'10px', fontSize:'1.2rem', fontWeight:'bold', color:'var(--gold-accent)'}}>
               Fine della partita! Controllate lo status globale sul server.
             </div>
          </div>
          <button className="btn" onClick={() => window.location.reload()}>Esci in Lobby</button>
        </div>
      </div> 
      )}
    </div>
  )
}

export default App;
