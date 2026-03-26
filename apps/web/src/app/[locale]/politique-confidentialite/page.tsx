import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité de La tribune des fans — comment nous protégeons vos données.',
};

export default async function PolitiqueConfidentialite({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="mx-auto max-w-3xl overflow-y-auto px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-gray-900 dark:text-gray-100">
        Politique de confidentialité
      </h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Dernière mise à jour : 19 mars 2026
      </p>

      <div className="space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
            1. Collecte des données
          </h2>
          <p>
            La tribune des fans collecte les informations suivantes lors de
            votre inscription : nom d&apos;utilisateur, adresse courriel. Ces
            données sont nécessaires pour le fonctionnement de votre compte et
            la participation aux tribunes.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
            2. Utilisation des données
          </h2>
          <p>Vos données sont utilisées pour :</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>Gérer votre compte et votre profil</li>
            <li>Permettre votre participation aux tribunes sportives</li>
            <li>Afficher votre nom d&apos;utilisateur dans les discussions</li>
            <li>Vous envoyer des notifications liées à votre compte</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
            3. Publicité
          </h2>
          <p>
            Nous utilisons Google AdSense pour afficher des publicités. Google
            peut utiliser des cookies pour personnaliser les annonces en fonction
            de vos visites sur ce site et d&apos;autres sites. Vous pouvez
            désactiver la publicité personnalisée dans les{' '}
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue underline"
            >
              paramètres de publicité Google
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
            4. Hébergement et sécurité
          </h2>
          <p>
            Vos données sont hébergées par Supabase (base de données) et Vercel
            (hébergement web). Les communications sont chiffrées via HTTPS. Nous
            appliquons des politiques de sécurité strictes (CSP, en-têtes de
            sécurité) pour protéger vos données.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
            5. Vos droits
          </h2>
          <p>
            Vous pouvez à tout moment demander l&apos;accès, la modification ou
            la suppression de vos données personnelles en nous contactant à{' '}
            <a
              href="mailto:contact@fanstribune.com"
              className="text-brand-blue underline"
            >
              contact@fanstribune.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">
            6. Cookies
          </h2>
          <p>
            Ce site utilise des cookies essentiels pour l&apos;authentification
            et des cookies tiers pour la publicité (Google AdSense). Les cookies
            essentiels ne peuvent pas être désactivés car ils sont nécessaires au
            fonctionnement du site.
          </p>
        </section>
      </div>
    </div>
  );
}
