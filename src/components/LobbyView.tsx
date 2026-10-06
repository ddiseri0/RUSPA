import React, { useState } from 'react';
import { GameMode, RoomState, Player } from '../types/game';
import { PlayerAvatar, AvatarFace } from './PlayerAvatar';
import { EmojiAvatarPickerModal } from './EmojiAvatarPickerModal';
import { CoveredCardIcon } from './CoveredCardIcon';
import { joinRoom } from '../services/firestoreSync';

interface LobbyViewProps {
  currentRoom: RoomState | null;
  currentUser: { uid: string };
  playerName: string;
  setPlayerName: (name: string) => void;
  playerEmoji?: string;
  setPlayerEmoji?: (emoji: string) => void;
  onCreateRoom: (mode: GameMode) => void;
  onJoinRoom: (code: string) => void;
  onStartMatch: () => void;
  onLeaveRoom?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  currentRoom,
  currentUser,
  playerName,
  setPlayerName,
  playerEmoji = '🥳',
  setPlayerEmoji,
  onCreateRoom,
  onJoinRoom,
  onStartMatch,
  onLeaveRoom,
  isLoading = false,
  errorMessage = null,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('1v1');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

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

  const handleAddBot = async () => {
    if (!currentRoom) return;
    const botPlayer: Player = {
      id: 'bot_8_' + Math.random().toString(36).substring(2, 6),
      name: 'Giocatore 8',
      avatarSeed: '🤖',
      team: 2,
      seat: playersList.length,
      isReady: true,
      handCount: 0,
      capturedCount: 0,
      scopaCount: 0,
      score: 0,
    };
    try {
      await joinRoom(currentRoom.code, botPlayer);
    } catch (e) {
      console.warn('Error adding bot:', e);
    }
  };

  // If already in a room lobby, show room details & waiting slots
  if (currentRoom && currentRoom.phase === 'LOBBY') {
    return (
      <div className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] bg-[#000000] text-[#f2f2f2] flex flex-col items-center justify-between p-4 sm:p-8 select-none overflow-hidden">
        {/* Top Header */}
        <div className="w-full max-w-2xl flex items-center justify-between border-b border-[#262626] pb-4">
          <div className="flex items-center gap-3">
            <CoveredCardIcon size="sm" />
            <h1 className="text-xl font-light tracking-wide text-[#f2f2f2]">RUSPA</h1>
          </div>
          <span className="text-xs uppercase tracking-widest text-[#d9d9d9] font-mono">
            Modalità {currentRoom.mode}
          </span>
        </div>

        {/* Space between Header and Room Code Box: Back button */}
        {onLeaveRoom && (
          <div className="w-full max-w-xl flex items-center justify-start mt-4 sm:mt-6 -mb-4 sm:-mb-6 px-1">
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 rounded-full bg-[#262626] border border-[#383838] text-xs font-semibold text-[#d9d9d9] hover:text-[#f2f2f2] hover:border-[#e3e700] active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>←</span>
              <span>Torna indietro</span>
            </button>
          </div>
        )}

        {/* Center Room Code Box */}
        <div className="w-full max-w-xl my-8">
          <div className="w-full bg-[#262626] border border-[#383838] text-[#f2f2f2] rounded-3xl p-8 sm:p-10 shadow-2xl transition-all relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#d9d9d9]">
                  Codice Stanza
                </span>
                <h2 className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-[#f2f2f2] mt-1">
                  {currentRoom.code}
                </h2>
                <p className="text-xs font-medium text-[#d9d9d9] mt-2">
                  Condividi questo codice per invitare gli amici a giocare.
                </p>
              </div>

              <button
                onClick={handleCopyCode}
                className={`px-6 py-3 rounded-full text-xs font-semibold tracking-wider uppercase active:scale-95 transition-all shadow-md cursor-pointer ${
                  copied
                    ? 'bg-[#e3e700] text-[#000000] shadow-[0_0_15px_rgba(227,231,0,0.5)] font-bold'
                    : 'bg-[#f2f2f2] text-[#000000] hover:bg-[#e6e6e6]'
                }`}
              >
                {copied ? 'Copiato!' : 'Copia Codice'}
              </button>
            </div>
          </div>
        </div>

        {/* Player Grid */}
        <div className="w-full max-w-2xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[#d9d9d9]">
              Giocatori Connessi ({playersList.length}/{requiredPlayers})
            </span>
            <span className="text-xs text-[#d9d9d9]">
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
                  className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border border-dashed border-[#383838] flex flex-col items-center justify-center p-3 text-[#d9d9d9]/60"
                >
                  <div className="w-8 h-8 rounded-full border border-[#383838] flex items-center justify-center mb-1 text-xs">
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
          {isHost && playersList.length < requiredPlayers && (
            <button
              onClick={handleAddBot}
              className="mb-3 px-5 py-2.5 rounded-full bg-[#262626] border border-[#383838] text-xs font-semibold text-[#e6e6e6] hover:text-[#f2f2f2] hover:bg-[#333333] transition-all active:scale-95 flex items-center gap-2 shadow-md cursor-pointer"
            >
              <span>+</span>
              <span>Aggiungi Avversario (Giocatore 8)</span>
            </button>
          )}

          {isHost ? (
            <button
              onClick={onStartMatch}
              disabled={isLoading || !canStart}
              className={`
                w-full py-4 px-8 rounded-full font-semibold text-base transition-all duration-200
                bg-[#f2f2f2] text-[#000000] shadow-lg hover:bg-[#e6e6e6] active:scale-98
                disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer
              `}
            >
              {isLoading ? 'Avvio in corso...' : 'Avvia Partita'}
            </button>
          ) : (
            <div className="py-4 px-8 rounded-full bg-[#262626] border border-[#383838] text-sm text-[#d9d9d9] animate-pulse text-center w-full">
              In attesa che l'host avvii la partita...
            </div>
          )}

          {onLeaveRoom && (
            <button
              onClick={onLeaveRoom}
              className="mt-3.5 py-2.5 px-6 rounded-full font-medium text-xs text-[#d9d9d9] hover:text-[#f2f2f2] border border-[#383838] hover:border-[#555] active:scale-95 transition-all cursor-pointer"
            >
              Esci dalla stanza / Torna indietro
            </button>
          )}
        </div>

        <EmojiAvatarPickerModal
          isOpen={isEmojiPickerOpen}
          onClose={() => setIsEmojiPickerOpen(false)}
          selectedEmoji={playerEmoji || '🥳'}
          onSelectEmoji={(emoji) => setPlayerEmoji?.(emoji)}
        />
      </div>
    );
  }

  // Initial Screen: Choose Mode & Create / Join Room
  return (
    <div className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] bg-[#000000] text-[#f2f2f2] flex flex-col items-center justify-between p-4 sm:p-8 select-none overflow-hidden">
      {/* Top Brand Bar */}
      <div className="w-full max-w-xl flex items-center justify-between border-b border-[#262626] pb-4">
        <div className="flex items-center gap-3">
          <CoveredCardIcon size="sm" />
          <div>
            <h1 className="text-xl font-normal tracking-tight text-[#f2f2f2]">RUSPA</h1>
            <p className="text-[10px] text-[#d9d9d9] uppercase tracking-widest">
              Scopa Coperta Multiplayer
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl flex flex-col items-center gap-6 my-auto">
        {/* Error message banner */}
        {errorMessage && (
          <div className="w-full p-4 rounded-2xl bg-[#262626] border border-red-500/50 text-[#f2f2f2] text-xs text-center">
            {errorMessage}
          </div>
        )}

        {/* Player Profile: Avatar 3D & Name Input */}
        <div className="w-full bg-[#262626] border border-[#383838] rounded-3xl p-5 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#d9d9d9]">
              Il tuo Profilo Giocatore
            </label>
            <span className="text-[10px] text-[#d9d9d9]/70">
              Tocca l'avatar per cambiare emoji 3D
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Clickable 3D Avatar Circle */}
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(true)}
              className="relative group shrink-0 rounded-full p-1 bg-[#000000] border-2 border-[#383838] hover:border-[#e3e700] transition-all cursor-pointer shadow-md active:scale-95"
              title="Cambia Avatar Emoji 3D"
            >
              <AvatarFace
                name={playerName}
                seed={playerEmoji || '🥳'}
                isOpponent={false}
                className="w-12 h-12 sm:w-14 sm:h-14"
              />
              <span className="absolute -bottom-1 -right-1 bg-[#000000] border border-[#e3e700]/80 text-[9px] rounded-full px-1.5 py-0.5 text-[#e3e700] shadow">
                ✏️
              </span>
            </button>

            {/* Name Input */}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={18}
                placeholder="Inserisci il tuo nome..."
                className="w-full bg-[#000000] border border-[#383838] rounded-2xl px-4 py-3 text-[#f2f2f2] placeholder-[#d9d9d9]/40 focus:outline-none focus:ring-2 focus:ring-[#e3e700] focus:border-[#e3e700] transition-all text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {/* Featured Box for Room Creation */}
        <div className="w-full bg-[#262626] border border-[#383838] text-[#f2f2f2] rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#d9d9d9]">
              Crea Nuova Stanza
            </span>
            <span className="text-[11px] font-semibold bg-[#000000] border border-[#383838] px-2.5 py-1 rounded-full text-[#e6e6e6]">
              Host
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#f2f2f2] mb-3">
            Inizia una nuova sfida
          </h2>
          <p className="text-xs text-[#d9d9d9] mb-6">
            Genera un codice stanza univoco e invita i tuoi amici in tempo reale.
          </p>

          {/* Mode Switcher */}
          <div className="flex gap-2 p-1.5 bg-[#000000] border border-[#383838] rounded-2xl mb-6">
            <button
              onClick={() => setSelectedMode('1v1')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedMode === '1v1'
                  ? 'bg-[#262626] text-[#e3e700] border border-[#e3e700]/70 shadow-[0_0_12px_rgba(227,231,0,0.18)]'
                  : 'text-[#d9d9d9] hover:text-[#f2f2f2]'
              }`}
            >
              1v1 (2 Giocatori)
            </button>
            <button
              onClick={() => setSelectedMode('2v2')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedMode === '2v2'
                  ? 'bg-[#262626] text-[#e3e700] border border-[#e3e700]/70 shadow-[0_0_12px_rgba(227,231,0,0.18)]'
                  : 'text-[#d9d9d9] hover:text-[#f2f2f2]'
              }`}
            >
              2v2 (A Squadre)
            </button>
          </div>

          <button
            onClick={() => onCreateRoom(selectedMode)}
            disabled={isLoading || !playerName.trim()}
            className="w-full py-4 rounded-full bg-[#f2f2f2] text-[#000000] font-semibold text-sm hover:bg-[#e6e6e6] active:scale-98 transition-all shadow-lg disabled:opacity-40 cursor-pointer"
          >
            {isLoading ? 'Creazione stanza...' : 'Crea Stanza Ora'}
          </button>
        </div>

        {/* Join by Code Box */}
        <div className="w-full bg-[#262626] border border-[#383838] rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#d9d9d9]">
            Oppure Entra con Codice Stanza
          </span>
          <div className="flex gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="ES: RSP492"
              className="flex-1 bg-[#000000] border border-[#383838] rounded-2xl px-4 py-3 text-[#f2f2f2] uppercase tracking-widest font-mono placeholder-[#d9d9d9]/40 focus:outline-none focus:ring-2 focus:ring-[#e3e700] focus:border-[#e3e700] transition-all text-sm"
            />
            <button
              onClick={() => onJoinRoom(joinCode)}
              disabled={isLoading || !joinCode.trim() || !playerName.trim()}
              className="px-6 py-3 rounded-full bg-[#f2f2f2] text-[#000000] font-semibold text-sm hover:bg-[#e6e6e6] active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
            >
              Entra
            </button>
          </div>
        </div>
      </div>

      <EmojiAvatarPickerModal
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        selectedEmoji={playerEmoji || '🥳'}
        onSelectEmoji={(emoji) => setPlayerEmoji?.(emoji)}
      />
    </div>
  );
};
