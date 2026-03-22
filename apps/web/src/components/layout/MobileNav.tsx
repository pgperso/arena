'use client';

import { Link } from '@/i18n/navigation';
import type { User } from '@supabase/supabase-js';
import { useTranslations } from 'next-intl';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  username: string | null;
  onLogout: () => void;
}

export function MobileNav({ isOpen, onClose, user, username, onLogout }: MobileNavProps) {
  const t = useTranslations();

  if (!isOpen) return null;

  return (
    <div className="border-t border-gray-200 bg-white md:hidden">
      <nav className="flex flex-col px-4 py-3">
        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          onClick={onClose}
        >
          Tribunes
        </Link>
        <hr className="my-2 border-gray-200" />
        {user ? (
          <>
            <Link
              href="/vestiaire"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              {username ?? 'Mon profil'}
            </Link>
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="mt-1 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            >
              {t('auth.logout')}
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              {t('auth.login')}
            </Link>
            <Link
              href="/register"
              className="mt-1 rounded-lg bg-brand-blue px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-blue-dark"
              onClick={onClose}
            >
              {t('auth.register')}
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
