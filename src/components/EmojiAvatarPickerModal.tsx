import React, { useState } from 'react';
import { PRESET_EMOJIS, getEmoji3DUrl } from '../lib/emojiAvatars';

interface EmojiAvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmoji: string;
  onSelectEmoji: (emoji: string) => void;
}

export const EmojiAvatarPickerModal: React.FC<EmojiAvatarPickerModalProps> = ({
  isOpen,
  onClose,
  selectedEmoji,
  onSelectEmoji,
}) => {
  const [customEmoji, setCustomEmoji] = useState('');

  if (!isOpen) return null;

  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEmoji.trim()) {
      // Pick first emoji character
      const match = customEmoji.match(/\p{Extended_Pictographic}/u);
      if (match) {
        handleSelect(match[0]);
      } else {
        handleSelect(customEmoji.trim().slice(0, 2));
      }
    }
  };

  const current3DUrl = getEmoji3DUrl(selectedEmoji);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#262626] border border-[#383838] rounded-3xl p-5 sm:p-6 flex flex-col items-center shadow-2xl relative my-auto max-h-[92dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-[#383838]">
          <div className="flex flex-col">
            <h3 className="text-base sm:text-lg font-bold text-[#f2f2f2] tracking-tight">
              Scegli Avatar Emoji 3D
            </h3>
            <span className="text-[11px] text-[#d9d9d9]">
              Stile iPhone & 3D Emojis
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#000000] border border-[#383838] text-[#d9d9d9] hover:text-[#f2f2f2] flex items-center justify-center text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Current Avatar Highlight */}
        <div className="flex flex-col items-center my-4">
          <div className="w-20 h-20 rounded-full bg-[#000000] border-2 border-[#e3e700] ring-4 ring-[#e3e700]/30 p-2 shadow-[0_0_25px_rgba(227,231,0,0.45)] flex items-center justify-center relative">
            {current3DUrl ? (
              <img
                src={current3DUrl}
                alt={selectedEmoji}
                className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
              />
            ) : (
              <span
                className="text-4xl"
                style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
              >
                {selectedEmoji}
              </span>
            )}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#e3e700] text-[#000000] text-[11px] font-black flex items-center justify-center shadow">
              ✓
            </span>
          </div>
          <span className="text-xs font-semibold text-[#f2f2f2] mt-2">
            Avatar Selezionato
          </span>
        </div>

        {/* 3D Emoji Preset Grid */}
        <div className="w-full">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#d9d9d9] block mb-2.5">
            Raccolta 3D Consigliata ({PRESET_EMOJIS.length})
          </span>
          <div className="grid grid-cols-6 gap-2 bg-[#000000]/60 p-3 rounded-2xl border border-[#383838] max-h-56 overflow-y-auto">
            {PRESET_EMOJIS.map((emoji) => {
              const url = getEmoji3DUrl(emoji);
              const isSelected = emoji === selectedEmoji;
              return (
                <button
                  key={emoji}
                  onClick={() => handleSelect(emoji)}
                  className={`
                    w-full aspect-square rounded-xl p-1.5 flex items-center justify-center transition-all duration-150 cursor-pointer
                    ${
                      isSelected
                        ? 'bg-[#262626] border-2 border-[#e3e700] shadow-[0_0_15px_rgba(227,231,0,0.6)] scale-110 z-10'
                        : 'bg-[#262626]/50 hover:bg-[#383838] hover:scale-105 border border-transparent'
                    }
                  `}
                  title={emoji}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={emoji}
                      className="w-full h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] pointer-events-none"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xl">{emoji}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Emoji Input Form */}
        <form onSubmit={handleCustomSubmit} className="w-full mt-4 pt-3 border-t border-[#383838] flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#d9d9d9]">
            Oppure digita da tastiera (qualsiasi emoji):
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={customEmoji}
              onChange={(e) => setCustomEmoji(e.target.value)}
              placeholder="Es: 🃏, 🥷, 🍕..."
              maxLength={4}
              className="flex-1 bg-[#000000] border border-[#383838] rounded-2xl px-4 py-2.5 text-center text-lg text-[#f2f2f2] placeholder-[#d9d9d9]/40 focus:outline-none focus:ring-2 focus:ring-[#e3e700] focus:border-[#e3e700] transition-all"
            />
            <button
              type="submit"
              disabled={!customEmoji.trim()}
              className="px-5 py-2.5 rounded-2xl bg-[#e3e700] text-[#000000] font-bold text-xs hover:bg-[#d4d800] transition-all disabled:opacity-40 cursor-pointer shadow"
            >
              Usa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
