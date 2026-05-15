'use client';

import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Two sidebar cards linking to the Nordiquomètre and Exposmètre voting
 * pages. Rendered in the gallery sidebar between the poll and "Top of
 * the week". The meters used to live inside the Nordiques / Expos
 * tribunes; surfacing them here makes them discoverable to every
 * visitor — and voting requires a member account, so a logged-out
 * visitor who wants to vote is nudged to register.
 */
export function MetreCards() {
  const locale = useLocale();
  const isFr = locale === 'fr';

  const cards = [
    {
      href: '/nordiquometre',
      title: isFr ? 'Nordiquomètre' : 'Nordiquometer',
      tagline: isFr ? 'Le retour des Nordiques ?' : 'Will the Nordiques return?',
      // Nordiques blue.
      accent: '#0B4870',
      emoji: '🏒',
    },
    {
      href: '/exposmetre',
      title: isFr ? 'Exposmètre' : 'Exposmeter',
      tagline: isFr ? 'Le retour des Expos ?' : 'Will the Expos return?',
      // Expos blue.
      accent: '#003087',
      emoji: '⚾',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="group flex flex-col gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] p-3 transition hover:border-brand-blue/40 hover:shadow-md"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
            style={{ backgroundColor: `${c.accent}1a` }}
            aria-hidden="true"
          >
            {c.emoji}
          </span>
          <span className="text-sm font-bold leading-tight text-gray-900 group-hover:text-brand-blue dark:text-gray-100">
            {c.title}
          </span>
          <span className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
            {c.tagline}
          </span>
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-blue">
            {isFr ? 'Voter' : 'Vote'}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </Link>
      ))}
    </div>
  );
}
