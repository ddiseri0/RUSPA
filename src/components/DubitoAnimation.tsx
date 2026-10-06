import React, { useEffect, useState } from 'react';
import { DubitoEvent } from '../types/game';

interface DubitoAnimationProps {
  event: DubitoEvent;
  currentUserId?: string;
  onDismiss?: () => void;
}

export const DubitoAnimation: React.FC<DubitoAnimationProps> = ({
  event,
  onDismiss,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [event.timestamp, onDismiss]);

  if (!visible) return null;

  const isRiuscito = event.result === 'RIUSCITO';

  return (
    <div
      onClick={() => {
        setVisible(false);
        onDismiss?.();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm select-none cursor-pointer animate-fadeIn"
    >
      <div className="relative flex flex-col items-center justify-center p-6 animate-scopae-pop">
        {/* Floating animated ambient icons */}
        {isRiuscito ? (
          <>
            <span className="absolute -top-10 -left-8 text-3xl sm:text-5xl animate-bounce text-[#e3e700] drop-shadow-[0_0_15px_#e3e700]">
              ✨
            </span>
            <span className="absolute -top-12 right-2 text-3xl sm:text-4xl animate-pulse text-[#e3e700] drop-shadow-[0_0_15px_#e3e700]">
              ⭐
            </span>
            <span className="absolute -bottom-8 -left-10 text-3xl sm:text-4xl animate-pulse text-[#e3e700] drop-shadow-[0_0_15px_#e3e700]">
              🌟
            </span>
            <span className="absolute -bottom-10 right-0 text-3xl sm:text-5xl animate-bounce text-[#e3e700] drop-shadow-[0_0_15px_#e3e700]">
              ✨
            </span>
            <span className="absolute top-1/2 -left-14 -translate-y-1/2 text-2xl sm:text-3xl text-[#e3e700] drop-shadow-[0_0_12px_#e3e700]">
              ⭐
            </span>
            <span className="absolute top-1/2 -right-14 -translate-y-1/2 text-2xl sm:text-3xl text-[#e3e700] drop-shadow-[0_0_12px_#e3e700]">
              ⭐
            </span>
          </>
        ) : (
          <>
            <span className="absolute -top-10 -left-8 text-3xl sm:text-5xl animate-bounce text-[#de1212] drop-shadow-[0_0_15px_#de1212]">
              💥
            </span>
            <span className="absolute -top-12 right-2 text-3xl sm:text-4xl animate-pulse text-[#de1212] drop-shadow-[0_0_15px_#de1212]">
              ⚡
            </span>
            <span className="absolute -bottom-8 -left-10 text-3xl sm:text-4xl animate-pulse text-[#de1212] drop-shadow-[0_0_15px_#de1212]">
              ⚠️
            </span>
            <span className="absolute -bottom-10 right-0 text-3xl sm:text-5xl animate-bounce text-[#de1212] drop-shadow-[0_0_15px_#de1212]">
              💥
            </span>
            <span className="absolute top-1/2 -left-14 -translate-y-1/2 text-2xl sm:text-3xl text-[#de1212] drop-shadow-[0_0_12px_#de1212]">
              ⚡
            </span>
            <span className="absolute top-1/2 -right-14 -translate-y-1/2 text-2xl sm:text-3xl text-[#de1212] drop-shadow-[0_0_12px_#de1212]">
              ⚡
            </span>
          </>
        )}

        {/* Word DUBITO RIUSCITO / DUBITO FALLITO */}
        <div className="relative flex items-center gap-3 sm:gap-4">
          <span className={`text-3xl sm:text-5xl animate-pulse ${isRiuscito ? 'text-[#e3e700]' : 'text-[#de1212]'}`}>
            {isRiuscito ? '✨' : '💥'}
          </span>
          <h1
            className={`text-5xl sm:text-7xl md:text-8xl font-black tracking-wider uppercase font-sans text-center leading-none ${
              isRiuscito
                ? 'text-[#e3e700] drop-shadow-[0_0_40px_rgba(227,231,0,0.95)]'
                : 'text-[#de1212] drop-shadow-[0_0_40px_rgba(222,18,18,0.95)]'
            }`}
          >
            {isRiuscito ? 'DUBITO RIUSCITO' : 'DUBITO FALLITO'}
          </h1>
          <span className={`text-3xl sm:text-5xl animate-pulse ${isRiuscito ? 'text-[#e3e700]' : 'text-[#de1212]'}`}>
            {isRiuscito ? '✨' : '💥'}
          </span>
        </div>

        {/* Minimal subtitle badge */}
        <span
          className={`mt-4 text-sm sm:text-lg font-black tracking-widest uppercase font-mono ${
            isRiuscito
              ? 'text-[#e3e700] drop-shadow-[0_0_12px_rgba(227,231,0,0.7)]'
              : 'text-[#de1212] drop-shadow-[0_0_12px_rgba(222,18,18,0.7)]'
          }`}
        >
          {isRiuscito
            ? '★ BLUFF SMASCHERATO (+1 PT) ★'
            : event.isScopae
            ? '★ SCOPEE (+2 PUNTI) ★'
            : '★ PRESA VALIDA (+1 PT) ★'}
        </span>
      </div>
    </div>
  );
};
