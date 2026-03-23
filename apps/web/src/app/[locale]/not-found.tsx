import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="mb-2 text-5xl font-bold text-gray-300">404</p>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Page introuvable
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
