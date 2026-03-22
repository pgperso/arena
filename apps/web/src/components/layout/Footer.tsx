'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <div className="flex items-center gap-2">
          <Image
            src="/images/fanstribune.webp"
            alt="La tribune des fans"
            width={28}
            height={28}
          />
          <span className="text-sm font-semibold text-gray-700">La tribune des fans</span>
        </div>

        <nav className="flex gap-6">
          <Link
            href="/politique-confidentialite"
            className="text-xs text-gray-500 transition hover:text-gray-700"
          >
            {t('footer.privacy')}
          </Link>
        </nav>

        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} La tribune des fans. {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
