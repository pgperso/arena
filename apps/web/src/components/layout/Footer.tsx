import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-blue text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-semibold text-gray-700">Arena</span>
        </div>

        <nav className="flex gap-6">
          <Link
            href="/politique-confidentialite"
            className="text-xs text-gray-500 transition hover:text-gray-700"
          >
            Politique de confidentialité
          </Link>
        </nav>

        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Arena. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
