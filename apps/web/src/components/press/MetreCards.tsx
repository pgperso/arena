'use client';

import { Gauge, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Two stacked sidebar cards linking to the Nordiquomètre and Exposmètre
 * voting pages. Horizontal layout: a Lucide gauge icon on the left, the
 * title in bold on the right. Rendered in the gallery sidebar between
 * the poll and "Top of the week".
 *
 * The meters used to live behind a tab inside the Nordiques / Expos
 * tribunes; surfacing them here makes them discoverable to everyone —
 * and voting requires a member account, so a logged-out visitor who
 * wants to vote is nudged to register.
 */
export function MetreCards() {
  const locale = useLocale();
  const isFr = locale === 'fr';

  const cards = [
    {
      href: '/nordiquometre',
      title: isFr ? 'Nordiquomètre' : 'Nordiquometer',
      tagline: isFr
        ? 'L’indice de confiance du retour des Nordiques'
        : 'The confidence index for the Nordiques’ return',
      accent: '#0B4870', // Nordiques blue
    },
    {
      href: '/exposmetre',
      title: isFr ? 'Exposmètre' : 'Exposmeter',
      tagline: isFr
        ? 'L’indice de confiance du retour des Expos'
        : 'The confidence index for the Expos’ return',
      accent: '#003087', // Expos blue
    },
  ];

  return (
    <div className="space-y-3">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="group flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-4 py-3 transition hover:border-brand-blue/40 hover:shadow-md"
        >
          {/* Gauge icon (Lucide) */}
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${c.accent}1a` }}
            aria-hidden="true"
          >
            <Gauge size={24} strokeWidth={1.8} style={{ color: c.accent }} />
          </span>

          {/* Title + tagline */}
          <span className="min-w-0">
            <span className="block text-base font-bold leading-tight text-gray-900 group-hover:text-brand-blue dark:text-gray-100">
              {c.title}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {c.tagline}
            </span>
          </span>

          <ChevronRight
            className="ml-auto shrink-0 text-gray-300 transition group-hover:text-brand-blue dark:text-gray-600"
            size={18}
            aria-hidden="true"
          />
        </Link>
      ))}
    </div>
  );
}
