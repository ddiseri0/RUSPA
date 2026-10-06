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
      <div className="w-full max-w-lg bg-[#262626] border border-[#383838] rounded-3xl p-5 sm:p-7 flex flex-col items-center shadow-2xl relative my-auto max-h-[95dvh] overflow-y-auto">
        
        {/* Header Tag */}
        <div className="mb-2 px-3.5 py-1 rounded-full bg-[#000000] border border-[#e3e700]/40 flex items-center justify-center">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#e3e700]">
            Fine Manche {detail.mancheNumber}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#f2f2f2] mb-1 text-center">
          Riepilogo Punteggio
        </h2>
        <p className="text-xs text-[#d9d9d9] mb-4 text-center">
          {detail.isGameOver
            ? 'Una squadra ha raggiunto i 21 punti! Partita conclusa.'
            : 'Punti assegnati per questa manche verso il traguardo dei 21 punti.'}
        </p>

        {/* Squadre Header: 2 Colonne */}
        <div className="w-full grid grid-cols-2 gap-2 mb-3">
          <div className={`p-3 rounded-2xl border text-center ${isUserTeam1 ? 'bg-[#000000] border-[#e3e700]/70 ring-1 ring-[#e3e700]/30 shadow-md' : 'bg-[#000000]/60 border-[#383838]'}`}>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#d9d9d9] block mb-0.5">
              {isUserTeam1 ? 'La tua Squadra' : 'Avversari'}
            </span>
            <span className="text-sm font-bold text-[#f2f2f2] truncate block">
              {s1.name}
            </span>
            <span className="text-xs font-mono text-[#e3e700] font-bold block mt-1">
              +{s1.totaleAggiunto} pt
            </span>
          </div>

          <div className={`p-3 rounded-2xl border text-center ${!isUserTeam1 ? 'bg-[#000000] border-[#e3e700]/70 ring-1 ring-[#e3e700]/30 shadow-md' : 'bg-[#000000]/60 border-[#383838]'}`}>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-[#d9d9d9] block mb-0.5">
              {!isUserTeam1 ? 'La tua Squadra' : 'Avversari'}
            </span>
            <span className="text-sm font-bold text-[#f2f2f2] truncate block">
              {s2.name}
            </span>
            <span className="text-xs font-mono text-[#e3e700] font-bold block mt-1">
              +{s2.totaleAggiunto} pt
            </span>
          </div>
        </div>

        {/* Tabella Dettagliata Contatori (Carte, Denari, Settebello, Primiera, Scope) */}
        <div className="w-full bg-[#000000]/70 border border-[#383838] rounded-2xl p-3 sm:p-4 space-y-2.5 mb-4 text-xs">
          
          {/* 1. Carte a Lungo */}
          <div className="flex items-center justify-between pb-2 border-b border-[#383838]/60">
            <span className="text-[#f2f2f2] font-medium">Carte a Lungo</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.carte > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]'}`}>
                {s1.carteCount} / 40 {s1.carte > 0 && '(+1 pt)'}
              </span>
              <span className="text-[#d9d9d9]/60">vs</span>
              <span className={`text-xs ${s2.carte > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]'}`}>
                {s2.carteCount} / 40 {s2.carte > 0 && '(+1 pt)'}
              </span>
            </div>
          </div>

          {/* 2. Denari */}
          <div className="flex items-center justify-between pb-2 border-b border-[#383838]/60">
            <span className="text-[#f2f2f2] font-medium">Denari</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.denari > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]'}`}>
                {s1.denariCount} / 10 {s1.denari > 0 && '(+1 pt)'}
              </span>
              <span className="text-[#d9d9d9]/60">vs</span>
              <span className={`text-xs ${s2.denari > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]'}`}>
                {s2.denariCount} / 10 {s2.denari > 0 && '(+1 pt)'}
              </span>
            </div>
          </div>

          {/* 3. Settebello */}
          <div className="flex items-center justify-between pb-2 border-b border-[#383838]/60">
            <span className="text-[#f2f2f2] font-medium">Settebello (7 Denari)</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.settebello > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]/60'}`}>
                {s1.settebello > 0 ? 'Preso (+1 pt)' : '-'}
              </span>
              <span className="text-[#d9d9d9]/60">vs</span>
              <span className={`text-xs ${s2.settebello > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]/60'}`}>
                {s2.settebello > 0 ? 'Preso (+1 pt)' : '-'}
              </span>
            </div>
          </div>

          {/* 4. Primiera (Settanta) */}
          <div className="flex items-center justify-between pb-2 border-b border-[#383838]/60">
            <span className="text-[#f2f2f2] font-medium">Primiera</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.primiera > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]'}`}>
                {s1.primieraScore} pt {s1.primiera > 0 && '(+1 pt)'}
              </span>
              <span className="text-[#d9d9d9]/60">vs</span>
              <span className={`text-xs ${s2.primiera > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]'}`}>
                {s2.primieraScore} pt {s2.primiera > 0 && '(+1 pt)'}
              </span>
            </div>
          </div>

          {/* 5. Scope della Manche */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[#f2f2f2] font-medium">Scope Realizzate</span>
            <div className="flex items-center gap-4 text-right font-mono">
              <span className={`text-xs ${s1.scope > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]'}`}>
                {s1.scope} {s1.scope > 0 && `(+${s1.scope} pt)`}
              </span>
              <span className="text-[#d9d9d9]/60">vs</span>
              <span className={`text-xs ${s2.scope > 0 ? 'text-[#e3e700] font-bold' : 'text-[#d9d9d9]'}`}>
                {s2.scope} {s2.scope > 0 && `(+${s2.scope} pt)`}
              </span>
            </div>
          </div>
        </div>

        {/* Box Totale Progressivo Partita (Verso i 21 Punti) */}
        <div className="w-full bg-[#000000]/70 border border-[#383838] rounded-2xl p-4 mb-5 flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#d9d9d9] text-center">
            Punteggio Totale Partita (Traguardo 21 Punti)
          </span>

          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="bg-[#262626] border border-[#383838] rounded-xl p-2.5 text-center">
              <span className="text-xs font-semibold text-[#d9d9d9] block truncate">
                {s1.name}
              </span>
              <span className="text-2xl font-black font-mono text-[#f2f2f2] block mt-0.5">
                {s1.totaleProgressivo}
                <span className="text-xs text-[#d9d9d9]/70 font-normal"> / 21 pt</span>
              </span>
            </div>

            <div className="bg-[#262626] border border-[#383838] rounded-xl p-2.5 text-center">
              <span className="text-xs font-semibold text-[#d9d9d9] block truncate">
                {s2.name}
              </span>
              <span className="text-2xl font-black font-mono text-[#f2f2f2] block mt-0.5">
                {s2.totaleProgressivo}
                <span className="text-xs text-[#d9d9d9]/70 font-normal"> / 21 pt</span>
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
                  ? 'bg-[#262626] text-[#d9d9d9] border border-[#383838] cursor-not-allowed opacity-80'
                  : 'bg-[#e3e700] hover:bg-[#d4d800] text-[#000000] shadow-[0_0_25px_rgba(227,231,0,0.4)]'
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
              className="text-xs text-[#d9d9d9] hover:text-[#f2f2f2] underline mt-1 cursor-pointer transition-colors"
            >
              Forza inizio prossima manche (Host)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
