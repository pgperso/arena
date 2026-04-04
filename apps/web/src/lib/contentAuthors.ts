export interface ContentAuthor {
  name: string;
  initials: string;
  color: string;
  style: string;
}

export const CONTENT_AUTHORS: ContentAuthor[] = [
  {
    name: 'Rex Paquette',
    initials: 'RP',
    color: '#DC2626',
    style: 'Chroniqueur sportif homme. Ton direct et affirmé, n\'hésite pas à prendre position. Légèrement plus confrontant que ses collègues - pose les questions difficiles. Français soigné mais accessible.',
  },
  {
    name: 'DJ Labombarde',
    initials: 'DJ',
    color: '#2563EB',
    style: 'Chroniqueur sportif homme. Axé sur l\'analyse et les statistiques. Appuie ses opinions sur des données concrètes. Ton posé et structuré, le plus factuel des quatre. Français soigné.',
  },
  {
    name: 'Maika Blitz',
    initials: 'MB',
    color: '#EAB308',
    style: 'Chroniqueuse sportive femme. Ton chaleureux et accessible, proche des fans. Légèrement plus expressive que ses collègues sans tomber dans l\'excès. Point de vue du partisan. Français soigné mais naturel.',
  },
  {
    name: 'Roxane Fury',
    initials: 'RF',
    color: '#7C3AED',
    style: 'Chroniqueuse sportive femme. Aborde les angles moins couverts - enjeux hors-glace, décisions d\'affaires, contexte. Ton réfléchi et nuancé. Point de vue unique qui va au-delà du match. Français soigné.',
  },
];

export function getContentAuthor(name: string): ContentAuthor | null {
  return CONTENT_AUTHORS.find((a) => a.name === name) ?? null;
}
