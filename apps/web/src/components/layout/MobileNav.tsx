'use client';

import { useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import type { User } from '@supabase/supabase-js';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/ui/Avatar';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  username: string | null;
  avatarUrl?: string | null;
  onLogout: () => void;
}

/**
 * Side drawer for the Header burger menu on mobile/tablet. Slides from the
 * right with a dark backdrop — matches the tribune sidebar drawer pattern.
 */
export function MobileNav({ isOpen, onClose, user, username, avatarUrl, onLogout }: MobileNavProps) {
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
        <nav className="flex flex-col px-3 py-3">
          <Link
            href={user ? '/tribunes' : '/login'}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={onClose}
          >
            Tribunes
          </Link>

          {user ? (
            <>
              <Link
                href="/vestiaire"
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={onClose}
              >
                {t('vestiaire.title')}
              </Link>
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => { onLogout(); onClose(); }}
                className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950"
              >
                {t('auth.logout')}
              </button>
            </>
          ) : (
            <>
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
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
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
