'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';

/**
 * Two stacked sidebar cards linking to the Nordiquomètre and Exposmètre
 * voting pages. Each card shows a thumbnail of the actual gauge so a
 * visitor instantly recognises the tool. Rendered in the gallery
 * sidebar between the poll and "Top of the week".
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
      image: '/images/nordiquometre.png',
      title: isFr ? 'Nordiquomètre' : 'Nordiquometer',
      tagline: isFr ? 'Crois-tu au retour des Nordiques ?' : 'Will the Nordiques return?',
    },
    {
      href: '/exposmetre',
      image: '/images/exposmetre.png',
      title: isFr ? 'Exposmètre' : 'Exposmeter',
      tagline: isFr ? 'Crois-tu au retour des Expos ?' : 'Will the Expos return?',
    },
  ];

  return (
    <div className="space-y-3">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="group block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] transition hover:border-brand-blue/40 hover:shadow-md"
        >
          <div className="relative aspect-[16/9] w-full bg-gray-50 dark:bg-[#181818]">
            <Image
              src={c.image}
              alt={c.title}
              fill
              className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
              sizes="320px"
            />
          </div>
          <div className="px-4 py-3">
            <span className="block text-sm font-bold text-gray-900 group-hover:text-brand-blue dark:text-gray-100">
              {c.title}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {c.tagline}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
