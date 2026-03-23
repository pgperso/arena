export const CONTENT_AUTHORS = [
  { name: 'Rex Paquette', initials: 'RP', color: '#DC2626' },
  { name: 'DJ Labombarde', initials: 'DJ', color: '#2563EB' },
  { name: 'Maika Blitz', initials: 'MB', color: '#EAB308' },
  { name: 'Roxane Fury', initials: 'RF', color: '#7C3AED' },
] as const;

export function getContentAuthor(name: string) {
  return CONTENT_AUTHORS.find((a) => a.name === name) ?? null;
}
