export { ROLES, PERMISSIONS, ROLE_DISPLAY_NAMES } from './roles';
export { RESTRICTION_TYPES, RESTRICTION_DISPLAY_NAMES } from './restrictions';

export const CHAT_MAX_MESSAGE_LENGTH = 1000;

// Feed constants
export const FEED_INITIAL_LIMIT = 50;
export const FEED_LOAD_MORE_LIMIT = 20;
export const MAX_IMAGES_PER_MESSAGE = 4;
export const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const IMAGE_MAX_DIMENSION = 1920;
export const IMAGE_THUMB_DIMENSION = 400;

// Community constants
export const MAX_COMMUNITIES_PER_USER = 50;

// Member rank thresholds
export const MEMBER_RANKS = [
  { min: 0, label: 'Recrue', color: 'text-gray-400' },
  { min: 10, label: 'Régulier', color: 'text-blue-500' },
  { min: 50, label: 'Vétéran', color: 'text-purple-500' },
  { min: 200, label: 'Légende', color: 'text-brand-orange' },
] as const;

export function getMemberRank(messageCount: number) {
  for (let i = MEMBER_RANKS.length - 1; i >= 0; i--) {
    if (messageCount >= MEMBER_RANKS[i].min) return MEMBER_RANKS[i];
  }
  return MEMBER_RANKS[0];
}

// Ad constants
export const FEED_AD_INTERVAL = 25;
export const ARTICLE_AD_WORD_THRESHOLD = 300;
export const ADSENSE_CLIENT_ID = 'ca-pub-6197042745925907';
