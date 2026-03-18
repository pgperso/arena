'use client';

import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  username: string | null;
  onLogout: () => void;
}

export function MobileNav({ isOpen, onClose, user, username, onLogout }: MobileNavProps) {
  if (!isOpen) return null;

  return (
    <div className="border-t border-gray-200 bg-white md:hidden">
      <nav className="flex flex-col px-4 py-3">
        <Link
          href="/"
          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          onClick={onClose}
        >
          Communautés
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
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="mt-1 rounded-lg bg-brand-blue px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-blue-dark"
              onClick={onClose}
            >
              S&apos;inscrire
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}
