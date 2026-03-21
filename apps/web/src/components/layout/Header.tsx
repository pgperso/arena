'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MobileNav } from './MobileNav';

export function Header() {
  const router = useRouter();
  const { user, username, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/fanstribune.webp"
            alt="La tribune des fans"
            width={36}
            height={36}
            priority
          />
          <span className="text-xl font-bold text-gray-900">La tribune des fans</span>
        </Link>

        {/* Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200" />
          ) : user ? (
            <>
              <Link
                href="/vestiaire"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 transition hover:text-brand-blue"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
                  {(username ?? 'U')[0].toUpperCase()}
                </div>
                {username}
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-500 transition hover:text-red-600"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 transition hover:text-brand-blue"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-dark"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <svg
            className="h-6 w-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        username={username}
        onLogout={handleLogout}
      />
    </header>
  );
}
