'use client';

import { useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import type { User } from '@supabase/supabase-js';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';
import type { UserCommunitySummary } from '@/services/communityService';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  username: string | null;
  avatarUrl?: string | null;
  onLogout: () => void;
  userTribunes: UserCommunitySummary[];
  dark: boolean;
  onToggleDark: () => void;
  otherLocale: string;
  switchLocalePath: string;
}

/**
 * Side drawer for the Header burger menu on mobile/tablet. Slides from the
 * right with a dark backdrop — matches the tribune sidebar drawer pattern.
 */
export function MobileNav({
  isOpen,
  onClose,
  user,
  username,
  avatarUrl,
  onLogout,
  userTribunes,
  dark,
  onToggleDark,
  otherLocale,
  switchLocalePath,
}: MobileNavProps) {
  const t = useTranslations();
  const tc = useTranslations('common');
  const ta = useTranslations('a11y');

  // Close on ESC for keyboard users
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] transform border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 dark:border-gray-700 dark:bg-[#1e1e1e] md:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label={ta('openMenu')}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          {user && username ? (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar url={avatarUrl ?? null} name={username} size="sm" />
              <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {username}
              </span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('brand.name')}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label={tc('close')}
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col overflow-y-auto px-3 py-3" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {user ? (
            <>
              <div className="flex flex-col gap-2">
                <Link
                  href="/tribunes"
                  onClick={onClose}
                  className="block rounded-lg bg-brand-red px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-brand-red-dark"
                >
                  {t('home.allMyTribunes')}
                </Link>
                <Link
                  href="/"
                  onClick={onClose}
                  className="block rounded-lg bg-brand-blue px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-brand-blue-dark"
                >
                  {t('pressGallery.title')}
                </Link>
              </div>

              {userTribunes.length > 0 && (
                <>
                  <p className="mt-4 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {t('home.myTribunes')}
                  </p>
                  <ul>
                    {userTribunes.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/tribunes/${c.slug}`}
                          onClick={onClose}
                          className="block rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="my-3 border-t border-gray-200 dark:border-gray-700" />

              <Link
                href="/vestiaire"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={onClose}
              >
                {t('vestiaire.title')}
              </Link>

              <div className="my-3 border-t border-gray-200 dark:border-gray-700" />

              <button
                onClick={onToggleDark}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span>{dark ? ta('enableLightMode') : ta('enableDarkMode')}</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  {dark ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                  )}
                </svg>
              </button>
              <a
                href={switchLocalePath}
                onClick={onClose}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span>{ta('switchLanguage')}</span>
                <span className="text-xs font-bold text-gray-400">{otherLocale.toUpperCase()}</span>
              </a>

              <div className="my-3 border-t border-gray-200 dark:border-gray-700" />

              <button
                onClick={() => { onLogout(); onClose(); }}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950"
              >
                {t('auth.logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={onClose}
              >
                {t('auth.login')}
              </Link>
              <Link
                href="/register"
                className="mt-1 rounded-lg bg-brand-blue px-3 py-2.5 text-center text-sm font-medium text-white transition hover:bg-brand-blue-dark"
                onClick={onClose}
              >
                {t('auth.register')}
              </Link>

              <div className="my-3 border-t border-gray-200 dark:border-gray-700" />

              <button
                onClick={onToggleDark}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span>{dark ? ta('enableLightMode') : ta('enableDarkMode')}</span>
              </button>
              <a
                href={switchLocalePath}
                onClick={onClose}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span>{ta('switchLanguage')}</span>
                <span className="text-xs font-bold text-gray-400">{otherLocale.toUpperCase()}</span>
              </a>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
