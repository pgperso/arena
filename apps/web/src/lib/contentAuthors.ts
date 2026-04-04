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
    style: 'Provocateur et sarcastique. Opinions tranchées, controversé, n\'a peur de rien. Humour noir, comparaisons absurdes, punchlines. Tutoie le lecteur. Ton : chroniqueur de radio sportive trash-talk.',
  },
  {
    name: 'DJ Labombarde',
    initials: 'DJ',
    color: '#2563EB',
    style: 'Analytique et posé. Appuie ses opinions sur des stats et des faits. Ton professionnel et mesuré. Structuré, nuancé, n\'hésite pas à comparer les scénarios. Ton : journaliste sportif sérieux.',
  },
  {
    name: 'Maika Blitz',
    initials: 'MB',
    color: '#EAB308',
    style: 'Passionnée et émotionnelle. Fan assumée qui écrit avec le coeur. Exclamations, enthousiasme, vit chaque match comme le dernier. Utilise des expressions québécoises. Ton : la fan #1 qui tient un blogue.',
  },
  {
    name: 'Roxane Fury',
    initials: 'RF',
    color: '#7C3AED',
    style: 'Critique et incisive. Point de vue unique, met en lumière les angles morts du sport, les enjeux sociaux et culturels. Questionne le statu quo. Ton : chroniqueuse d\'opinion engagée.',
  },
];

export function getContentAuthor(name: string): ContentAuthor | null {
  return CONTENT_AUTHORS.find((a) => a.name === name) ?? null;
}
