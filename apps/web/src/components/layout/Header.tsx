'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations, useLocale } from 'next-intl';
import { useTribune } from '@/contexts/TribuneContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import { MobileNav } from './MobileNav';

export function Header() {
  const router = useRouter();
  const { user, username, avatarUrl, loading } = useAuth();
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { tribune } = useTribune();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const otherLocale = locale === 'fr' ? 'en' : 'fr';
  const switchLocalePath = `/${otherLocale}${pathname}`;
  const dropdownRef = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push('/');
    router.refresh();
  }

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <header className="shrink-0 border-b border-gray-200 dark:border-gray-700 dark:border-gray-800 dark:bg-[#1e1e1e]">
      <div className="flex h-12 items-center justify-between px-3 sm:h-14 sm:px-4 md:h-16">
        {/* Logo — on mobile in tribune: back arrow + tribune name */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {tribune && (
            <Link
              href="/tribunes"
              className="flex items-center rounded-lg p-1 text-gray-600 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-[#1e1e1e] md:hidden"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
          )}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
            <Image
              src="/images/fanstribune.webp"
              alt="La tribune des fans"
              width={36}
              height={36}
              priority
              className="h-7 w-7 object-contain sm:h-8 sm:w-8 md:h-9 md:w-9"
            />
            {tribune ? (
              <>
                <span className="text-base font-bold text-gray-900 dark:text-gray-100 md:hidden">{tribune.name}</span>
                <span className="hidden text-lg font-bold text-gray-900 dark:text-gray-100 md:inline md:text-xl">{t('brand.name')}</span>
              </>
            ) : (
              <span className="text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg md:text-xl">{t('brand.name')}</span>
            )}
          </Link>
        </div>

        {/* Language + Desktop auth */}
        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggleDark}
            className="rounded-md p-1.5 text-gray-500 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-[#1e1e1e] hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            title={dark ? 'Mode clair' : 'Mode sombre'}
          >
            {dark ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>
          <a
            href={switchLocalePath}
            className="rounded-md px-2 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-[#1e1e1e] hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {otherLocale.toUpperCase()}
          </a>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700" />
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-gray-200" />
          ) : user ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-[#1e1e1e]"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={username ?? ''}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
                    {(username ?? 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{username}</span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] shadow-lg">
                  <Link
                    href="/vestiaire"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-[#1e1e1e]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                    {t('vestiaire.title')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                    </svg>
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 dark:text-gray-400 transition hover:text-brand-blue"
              >
                {t('auth.login')}
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-dark"
              >
                {t('auth.register')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile: dark mode + menu */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggleDark}
            className="rounded-md p-1.5 text-gray-500 dark:text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-[#1e1e1e] dark:text-gray-400 dark:hover:bg-gray-800"
          >
            {dark ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            )}
          </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          <svg
            className="h-6 w-6 text-gray-600 dark:text-gray-400"
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
