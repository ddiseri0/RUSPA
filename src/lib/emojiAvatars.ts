/**
 * Emoji Avatar helper module providing 3D Fluent / Apple-style emoji avatars
 * and native emoji rendering.
 */

export const FLUENT_EMOJI_MAP: Record<string, string> = {
  '🥳': 'Partying%20face/3D/partying_face_3d.png',
  '😎': 'Smiling%20face%20with%20sunglasses/3D/smiling_face_with_sunglasses_3d.png',
  '🤠': 'Cowboy%20hat%20face/3D/cowboy_hat_face_3d.png',
  '🦁': 'Lion/3D/lion_3d.png',
  '🦊': 'Fox/3D/fox_3d.png',
  '🥷': 'Ninja/Default/3D/ninja_3d_default.png',
  '👑': 'Crown/3D/crown_3d.png',
  '🤖': 'Robot/3D/robot_3d.png',
  '🥶': 'Cold%20face/3D/cold_face_3d.png',
  '😱': 'Face%20screaming%20in%20fear/3D/face_screaming_in_fear_3d.png',
  '🤬': 'Face%20with%20symbols%20on%20mouth/3D/face_with_symbols_on_mouth_3d.png',
  '😈': 'Smiling%20face%20with%20horns/3D/smiling_face_with_horns_3d.png',
  '👻': 'Ghost/3D/ghost_3d.png',
  '💀': 'Skull/3D/skull_3d.png',
  '🦄': 'Unicorn/3D/unicorn_3d.png',
  '🤑': 'Money-mouth%20face/3D/money-mouth_face_3d.png',
  '🤩': 'Star-struck/3D/star-struck_3d.png',
  '😏': 'Smirking%20face/3D/smirking_face_3d.png',
  '🔥': 'Fire/3D/fire_3d.png',
  '⚡': 'High%20voltage/3D/high_voltage_3d.png',
  '🃏': 'Joker/3D/joker_3d.png',
  '🏆': 'Trophy/3D/trophy_3d.png',
  '🪙': 'Coin/3D/coin_3d.png',
  '🎲': 'Game%20die/3D/game_die_3d.png',
};

export const PRESET_EMOJIS: string[] = Object.keys(FLUENT_EMOJI_MAP);

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/';

/**
 * Returns the CDN URL for the 3D version of the emoji if available
 */
export function getEmoji3DUrl(emoji: string): string | null {
  const path = FLUENT_EMOJI_MAP[emoji];
  if (!path) return null;
  return `${CDN_BASE}${path}`;
}

/**
 * Resolves a player's emoji from their seed, name, or defaults deterministically
 */
export function resolvePlayerEmoji(
  seed?: string,
  name?: string,
  isOpponent?: boolean
): string {
  // If seed is already a single emoji or in our map
  if (seed && FLUENT_EMOJI_MAP[seed]) {
    return seed;
  }

  // If seed is an emoji character
  if (seed && /\p{Extended_Pictographic}/u.test(seed)) {
    return seed;
  }

  // Bot or opponent default
  if (isOpponent || (name && (name.includes('8') || name.toLowerCase().includes('bot')))) {
    return '🤖';
  }

  // Deterministic mapping for legacy string seeds
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % PRESET_EMOJIS.length;
    return PRESET_EMOJIS[idx];
  }

  return '🥳';
}
