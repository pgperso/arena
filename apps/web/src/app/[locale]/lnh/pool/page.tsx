import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSeason, getStandings } from '@/services/poolService';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { BRAND } from '@/lib/brand';

// Public, content-rich, indexable — this is monetized inventory (sidebars +
// anchor) and an SEO surface. The lineup builder (the tool) stays ad-light.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFr = locale === 'fr';
  const title = isFr ? `Pool LNH — classement en direct | ${BRAND.name}` : `NHL Pool — live standings | ${BRAND.nameEn}`;
  const description = isFr
    ? "Le pool de hockey de La tribune des fans. Compose ton alignement à plafond salarial et grimpe au classement."
    : 'The hockey pool from Fans Tribune. Build a salary-cap roster and climb the standings.';
  return {
    title,
    description,
    openGraph: { title, description, url: `${BRAND.url}/${locale}/lnh/pool`, siteName: BRAND.name },
    alternates: { canonical: `${BRAND.url}/${locale}/lnh/pool` },
  };
}

export default async function PoolHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();

  const season = await getActiveSeason(supabase);
  const standings = season ? await getStandings(supabase, season.id) : [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Tailor the CTA: existing entry → "Mon équipe", else "Crée ton équipe".
  let myEntryId: number | null = null;
  if (user && season) {
    const { data } = await supabase
      .from('pool_entries')
      .select('id')
      .eq('season_id', season.id)
      .eq('member_id', user.id)
      .maybeSingle();
    myEntryId = (data as { id: number } | null)?.id ?? null;
  }

  const fmtPts = (n: number) => n.toLocaleString('fr-CA', { maximumFractionDigits: 1 });
  const cta = myEntryId
    ? { href: '/lnh/pool/moi', label: 'Mon équipe' }
    : { href: '/lnh/pool/composer', label: 'Crée ton équipe' };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 overflow-hidden border-t border-gray-200 dark:border-gray-700">
        <AdSidebar position="left" />

        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
          <div className="mx-auto w-full max-w-3xl px-4 py-8">
            {/* Hero / CTA */}
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 dark:border-gray-700 dark:from-[#252525] dark:to-[#1e1e1e]">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pool LNH</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                {season?.name ?? 'Pool LNH'}
              </h1>
              <p className="mt-2 max-w-prose text-sm text-gray-600 dark:text-gray-300">
                Compose ton alignement de 12 attaquants, 6 défenseurs et 2 gardiens dans le plafond salarial,
                et accumule des points selon les vraies performances de la LNH.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={cta.href}
                  className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                >
                  {cta.label}
                </Link>
                <Link href="/lnh/pool/classement" className="text-sm font-medium text-gray-600 underline dark:text-gray-300">
                  Voir le classement complet
                </Link>
              </div>
            </div>

            {/* Standings preview */}
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Classement</h2>
              {standings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
                  {season
                    ? "Aucune équipe inscrite pour l'instant — sois le premier à composer la tienne."
                    : 'Le pool ouvre bientôt. Reviens t’inscrire.'}
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-[#252525]">
                      <tr>
                        <th className="px-4 py-2 font-medium">#</th>
                        <th className="px-4 py-2 font-medium">Équipe</th>
                        <th className="px-4 py-2 text-right font-medium">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {standings.slice(0, 20).map((s) => (
                        <tr key={s.entryId} className="hover:bg-gray-50 dark:hover:bg-[#252525]">
                          <td className="px-4 py-2 tabular-nums text-gray-500">{s.rank ?? '—'}</td>
                          <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">{s.teamName}</td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                            {fmtPts(s.fantasyPoints)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>

        <AdSidebar position="right" />
      </div>

      <AdAnchor />
    </div>
  );
}
