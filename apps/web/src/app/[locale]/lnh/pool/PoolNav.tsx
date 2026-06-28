'use client';

import { Link, usePathname } from '@/i18n/navigation';

const LINKS = [
  { href: '/lnh/pool', label: 'Accueil' },
  { href: '/lnh/pool/classement', label: 'Classement' },
  { href: '/lnh/pool/moi', label: 'Mon équipe' },
];

/** Consistent pool navigation shown at the top of every pool page. */
export function PoolNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Link href="/lnh/pool" className="flex items-center gap-1.5 text-base font-bold text-gray-900 dark:text-gray-100">
        🏒 Pool LNH
      </Link>
      <div className="flex gap-1">
        {LINKS.map((l) => {
          const active = l.href === '/lnh/pool' ? path === '/lnh/pool' : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-gray-900'
                  : 'rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#252525]'
              }
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
