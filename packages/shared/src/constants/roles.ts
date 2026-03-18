export const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
} as const;

export const PERMISSIONS = {
  CHAT_MODERATE: 'chat:moderate',
  PODCAST_UPLOAD: 'podcast:upload',
  MEMBER_MANAGE: 'member:manage',
  MEMBER_RESTRICT: 'member:restrict',
  COMMUNITY_MANAGE: 'community:manage',
  ARTICLE_PUBLISH: 'article:publish',
} as const;

export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: 'Administrateur',
  moderator: 'Modérateur',
  member: 'Membre',
};
