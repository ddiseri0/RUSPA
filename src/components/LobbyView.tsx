import React, { useState } from 'react';
import { GameMode, RoomState } from '../types/game';
import { PlayerAvatar } from './PlayerAvatar';

interface LobbyViewProps {
  currentRoom: RoomState | null;
  currentUser: { uid: string };
  playerName: string;
  setPlayerName: (name: string) => void;
  onCreateRoom: (mode: GameMode) => void;
  onJoinRoom: (code: string) => void;
  onStartMatch: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  currentRoom,
  currentUser,
  playerName,
  setPlayerName,
  onCreateRoom,
  onJoinRoom,
  onStartMatch,
  isLoading = false,
  errorMessage = null,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('1v1');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const isHost = currentRoom && currentUser ? currentRoom.hostId === currentUser.uid : false;
  const playersList = currentRoom?.players ? Object.values(currentRoom.players) : [];
  const requiredPlayers = currentRoom?.mode === '2v2' ? 4 : 2;
  const canStart = isHost && playersList.length >= (currentRoom?.mode === '2v2' ? 2 : 2);

  const handleCopyCode = () => {
    if (currentRoom?.code) {
      navigator.clipboard.writeText(currentRoom.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If already in a room lobby, show room details & waiting slots
  if (currentRoom && currentRoom.phase === 'LOBBY') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-between p-6 sm:p-10 select-none">
        {/* Top Header */}
        <div className="w-full max-w-2xl flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center font-black text-xs text-white">
              R
            </div>
            <h1 className="text-xl font-light tracking-wide text-white">RUSPA</h1>
          </div>
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
            Modalità {currentRoom.mode}
          </span>
        </div>

        {/* Center Pastel Highlight Box (Style Offsuit) */}
        <div className="w-full max-w-xl my-8">
          <div className="w-full bg-gradient-to-br from-teal-100 via-emerald-100 to-blue-200 text-zinc-900 rounded-3xl p-8 sm:p-10 shadow-2xl transition-all relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-700">
                  Codice Stanza
                </span>
                <h2 className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-zinc-950 mt-1">
                  {currentRoom.code}
                </h2>
                <p className="text-xs font-medium text-zinc-600 mt-2">
                  Condividi questo codice per invitare gli amici a giocare.
                </p>
              </div>

              <button
                onClick={handleCopyCode}
                className="px-6 py-3 rounded-full bg-zinc-900 text-white text-xs font-semibold tracking-wider uppercase hover:bg-zinc-800 active:scale-95 transition-all shadow-md"
              >
                {copied ? 'Copiato!' : 'Copia Codice'}
              </button>
            </div>
          </div>
        </div>

        {/* Player Grid */}
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Giocatori Connessi ({playersList.length}/{requiredPlayers})
            </span>
            <span className="text-xs text-zinc-500">
              {currentRoom.mode === '2v2' ? 'Sfida 2 contro 2' : 'Testa a testa 1v1'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full justify-items-center">
            {playersList.map((player) => (
              <PlayerAvatar
                key={player.id}
                player={player}
                isSelf={player.id === currentUser.uid}
                mode={currentRoom.mode}
              />
            ))}

            {/* Empty Slots */}
            {Array.from({ length: Math.max(0, requiredPlayers - playersList.length) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center justify-center p-3 text-zinc-600"
                >
                  <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center mb-1 text-xs">
                    +
                  </div>
                  <span className="text-[11px]">In attesa</span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Start Game or Waiting Action */}
        <div className="w-full max-w-xl mt-8 flex flex-col items-center">
          {isHost ? (
            <button
              onClick={onStartMatch}
              disabled={isLoading || !canStart}
              className={`
                w-full py-4 px-8 rounded-full font-semibold text-base transition-all duration-200
                bg-white text-black shadow-lg hover:bg-zinc-200 active:scale-98
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {isLoading ? 'Avvio in corso...' : 'Avvia Partita'}
            </button>
          ) : (
            <div className="py-4 px-8 rounded-full bg-zinc-900 border border-zinc-800 text-sm text-zinc-400 animate-pulse text-center w-full">
              In attesa che l'host avvii la partita...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Initial Screen: Choose Mode & Create / Join Room
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-between p-6 sm:p-10 select-none">
      {/* Top Brand Bar */}
      <div className="w-full max-w-xl flex items-center justify-between border-b border-zinc-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-sm text-white">
            R
          </div>
          <div>
            <h1 className="text-xl font-normal tracking-tight text-white">RUSPA</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
              Scopa Coperta Multiplayer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs text-zinc-400 font-mono">Firestore Realtime</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl flex flex-col items-center gap-6 my-auto">
        {/* Error message banner */}
        {errorMessage && (
          <div className="w-full p-4 rounded-2xl bg-rose-950/80 border border-rose-800/60 text-rose-200 text-xs text-center">
            {errorMessage}
          </div>
        )}

        {/* Player Name Input */}
        <div className="w-full bg-[#1C1C1E] border border-zinc-800/80 rounded-3xl p-5 shadow-xl">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Il tuo Nome Giocatore
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={18}
            placeholder="Inserisci il tuo nome..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white transition-all text-sm font-medium"
          />
        </div>

        {/* Featured Pastel Box for Room Creation (Specifiche: Linee Guida UI/UX n.6) */}
        <div className="w-full bg-gradient-to-br from-teal-100 via-cyan-100 to-blue-200 text-zinc-900 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-700">
              Crea Nuova Stanza
            </span>
            <span className="text-[11px] font-semibold bg-white/70 px-2.5 py-1 rounded-full text-zinc-800">
              Host
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 mb-3">
            Inizia una nuova sfida
          </h2>
          <p className="text-xs text-zinc-700 mb-6">
            Genera un codice stanza univoco e invita i tuoi amici in tempo reale.
          </p>

          {/* Mode Switcher */}
          <div className="flex gap-2 p-1.5 bg-black/10 rounded-2xl mb-6">
            <button
              onClick={() => setSelectedMode('1v1')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedMode === '1v1'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              1v1 (2 Giocatori)
            </button>
            <button
              onClick={() => setSelectedMode('2v2')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedMode === '2v2'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              2v2 (A Squadre)
            </button>
          </div>

          <button
            onClick={() => onCreateRoom(selectedMode)}
            disabled={isLoading || !playerName.trim()}
            className="w-full py-4 rounded-full bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 active:scale-98 transition-all shadow-lg disabled:opacity-40"
          >
            {isLoading ? 'Creazione stanza...' : 'Crea Stanza Ora'}
          </button>
        </div>

        {/* Join by Code Box */}
        <div className="w-full bg-[#1C1C1E] border border-zinc-800/80 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Oppure Entra con Codice Stanza
          </span>
          <div className="flex gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="ES: RSP492"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-white uppercase tracking-widest font-mono placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white transition-all text-sm"
            />
            <button
              onClick={() => onJoinRoom(joinCode)}
              disabled={isLoading || !joinCode.trim() || !playerName.trim()}
              className="px-6 py-3 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-40"
            >
              Entra
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-xl flex items-center justify-between text-[11px] text-zinc-600 pt-6">
        <span>Stile UI: Minimal Offsuit</span>
        <span>Pronto per Vercel & Firebase</span>
      </div>
    </div>
  );
};
