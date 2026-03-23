'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1.5 sm:gap-4 sm:px-4 sm:py-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Image
            src="/images/fanstribune.webp"
            alt="La tribune des fans"
            width={20}
            height={20}
            className="h-5 w-5 sm:h-7 sm:w-7"
          />
          <span className="hidden text-sm font-semibold text-gray-700 sm:inline">La tribune des fans</span>
        </div>

        <nav className="flex gap-3 sm:gap-4">
          <a
            href="mailto:info@fanstribune.com"
            className="text-[10px] text-gray-500 transition hover:text-gray-700 sm:text-xs"
          >
            {t('footer.contact')}
          </a>
          <Link
            href="/politique-confidentialite"
            className="text-[10px] text-gray-500 transition hover:text-gray-700 sm:text-xs"
          >
            {t('footer.privacy')}
          </Link>
        </nav>

        <p className="text-[10px] text-gray-400 sm:text-xs">
          &copy; {new Date().getFullYear()} {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
