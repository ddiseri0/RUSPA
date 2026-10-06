import React from 'react';
import { MancheDetail, Player } from '../types/game';

interface MancheSummaryModalProps {
  detail: MancheDetail;
  currentUserId: string;
  players: Record<string, Player>;
  isHost: boolean;
  onContinue: () => void;
}

export const MancheSummaryModal: React.FC<MancheSummaryModalProps> = ({
  detail,
  currentUserId,
  players,
  isHost,
  onContinue,
}) => {
  const user = players[currentUserId];
  const isUserTeam1 = user?.team === 1;
  const isReady = Boolean(detail.readyPlayers?.[currentUserId]);
  const readyCount = Object.keys(detail.readyPlayers || {}).length;
  const totalPlayers = Object.keys(players).length;

  const s1 = detail.squadra1;
  const s2 = detail.squadra2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/90 backdrop-blur-md animate-fadeIn select-none overflow-y-auto">
      <div className="w-full max-w-lg bg-[#1C1C1E] border border-zinc-850 rounded-3xl p-5 sm:p-7 flex flex-col items-center shadow-2xl relative my-auto max-h-[95dvh] overflow-y-auto">
        
        {/* Header Tag */}
        <div className="mb-2 px-3.5 py-1 rounded-full bg-[#182310] border border-[#2e401b] flex items-center justify-center">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C6EF68]">
            Fine Manche {detail.mancheNumber}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1 text-center">
          Riepilogo Punteggio
        </h2>
        <p className="text-xs text-zinc-400 mb-4 text-center">
          {detail.isGameOver
            ? 'Una squadra ha raggiunto i 21 punti! Partita conclusa.'
            : 'Punti assegnati per questa manche verso il traguardo dei 21 punti.'}
        </p>

        {/* Squadre Header: 2 Colonne */}
        <div className="w-full grid grid-cols-2 gap-2 mb-3">
          <div className={`p-3 rounded-2xl border text-center ${isUserTeam1 ? 'bg-zinc-900 border-lime-500/40' : 'bg-zinc-950/70 border-zinc-800'}`}>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 block mb-0.5">
              {isUserTeam1 ? 'La tua Squadra' : 'Avversari'}
            </span>
            <span className="text-sm font-bold text-white truncate block">
              {s1.name}
            </span>
            <span className="text-xs font-mono text-[#C6EF68] font-bold block mt-1">
              +{s1.totaleAggiunto} pt
            </span>
          </div>

          <div className={`p-3 rounded-2xl border text-center ${!isUserTeam1 ? 'bg-zinc-900 border-lime-500/40' : 'bg-zinc-950/70 border-zinc-800'}`}>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 block mb-0.5">
              {!isUserTeam1 ? 'La tua Squadra' : 'Avversari'}
            </span>
            <span className="text-sm font-bold text-white truncate block">
              {s2.name}
            </span>
            <span className="text-xs font-mono text-[#C6EF68] font-bold block mt-1">
              +{s2.totaleAggiunto} pt
            </span>
          </div>
        </div>

        {/* Tabella Dettagliata Contatori (Carte, Denari, Settebello, Primiera, Scope) */}
        <div className="w-full bg-zinc-950/80 border border-zinc-850 rounded-2xl p-3 sm:p-4 space-y-2.5 mb-4 text-xs">
          
          {/* 1. Carte a Lungo */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-850/80">
            <span className="text-zinc-300 font-medium">Carte a Lungo</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.carte > 0 ? 'text-[#C6EF68] font-bold' : 'text-zinc-400'}`}>
                {s1.carteCount} / 40 {s1.carte > 0 && '(+1 pt)'}
              </span>
              <span className="text-zinc-600">vs</span>
              <span className={`text-xs ${s2.carte > 0 ? 'text-[#C6EF68] font-bold' : 'text-zinc-400'}`}>
                {s2.carteCount} / 40 {s2.carte > 0 && '(+1 pt)'}
              </span>
            </div>
          </div>

          {/* 2. Denari */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-850/80">
            <span className="text-zinc-300 font-medium">Denari</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.denari > 0 ? 'text-[#C6EF68] font-bold' : 'text-zinc-400'}`}>
                {s1.denariCount} / 10 {s1.denari > 0 && '(+1 pt)'}
              </span>
              <span className="text-zinc-600">vs</span>
              <span className={`text-xs ${s2.denari > 0 ? 'text-[#C6EF68] font-bold' : 'text-zinc-400'}`}>
                {s2.denariCount} / 10 {s2.denari > 0 && '(+1 pt)'}
              </span>
            </div>
          </div>

          {/* 3. Settebello */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-850/80">
            <span className="text-zinc-300 font-medium">Settebello (7 Denari)</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.settebello > 0 ? 'text-amber-300 font-bold' : 'text-zinc-600'}`}>
                {s1.settebello > 0 ? 'Preso (+1 pt)' : '-'}
              </span>
              <span className="text-zinc-600">vs</span>
              <span className={`text-xs ${s2.settebello > 0 ? 'text-amber-300 font-bold' : 'text-zinc-600'}`}>
                {s2.settebello > 0 ? 'Preso (+1 pt)' : '-'}
              </span>
            </div>
          </div>

          {/* 4. Primiera (Settanta) */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-850/80">
            <span className="text-zinc-300 font-medium">Primiera</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.primiera > 0 ? 'text-[#C6EF68] font-bold' : 'text-zinc-400'}`}>
                {s1.primieraScore} pt {s1.primiera > 0 && '(+1 pt)'}
              </span>
              <span className="text-zinc-600">vs</span>
              <span className={`text-xs ${s2.primiera > 0 ? 'text-[#C6EF68] font-bold' : 'text-zinc-400'}`}>
                {s2.primieraScore} pt {s2.primiera > 0 && '(+1 pt)'}
              </span>
            </div>
          </div>

          {/* 5. Scope della Manche */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-zinc-300 font-medium">Scope Realizzate</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.scope > 0 ? 'text-[#C6EF68] font-bold' : 'text-zinc-500'}`}>
                {s1.scope} {s1.scope > 0 && `(+${s1.scope} pt)`}
              </span>
              <span className="text-zinc-600">vs</span>
              <span className={`text-xs ${s2.scope > 0 ? 'text-[#C6EF68] font-bold' : 'text-zinc-500'}`}>
                {s2.scope} {s2.scope > 0 && `(+${s2.scope} pt)`}
              </span>
            </div>
          </div>
        </div>

        {/* Box Totale Progressivo Partita (Verso i 21 Punti) */}
        <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 mb-5 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 text-center">
            Punteggio Totale Partita (Traguardo 21 Punti)
          </span>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-2.5 text-center">
              <span className="text-xs font-semibold text-zinc-300 block truncate">
                {s1.name}
              </span>
              <span className="text-2xl font-black font-mono text-white block mt-0.5">
                {s1.totaleProgressivo}
                <span className="text-xs text-zinc-500 font-normal"> / 21 pt</span>
              </span>
            </div>

            <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-2.5 text-center">
              <span className="text-xs font-semibold text-zinc-300 block truncate">
                {s2.name}
              </span>
              <span className="text-2xl font-black font-mono text-white block mt-0.5">
                {s2.totaleProgressivo}
                <span className="text-xs text-zinc-500 font-normal"> / 21 pt</span>
              </span>
            </div>
          </div>
        </div>

        {/* Tasto Azione Continua */}
        <div className="w-full flex flex-col items-center gap-2">
          <button
            onClick={onContinue}
            disabled={isReady}
            className={`
              w-full py-4 px-8 rounded-full font-bold text-sm tracking-wide transition-all shadow-xl active:scale-95 cursor-pointer
              ${
                isReady
                  ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 cursor-not-allowed opacity-80'
                  : 'bg-white hover:bg-zinc-200 text-black'
              }
            `}
          >
            {isReady
              ? `In attesa dell'avversario... (${readyCount}/${totalPlayers})`
              : detail.isGameOver
              ? 'Continua alla Schermata Finale'
              : 'Continua'}
          </button>

          {isHost && isReady && readyCount < totalPlayers && (
            <button
              onClick={onContinue}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline mt-1 cursor-pointer transition-colors"
            >
              Forza inizio prossima manche (Host)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
