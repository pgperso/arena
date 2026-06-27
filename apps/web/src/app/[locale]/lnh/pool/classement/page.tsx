import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSeason, getStandings } from '@/services/poolService';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { TeamLogo } from '@/components/pool/TeamLogo';
import { BRAND } from '@/lib/brand';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'fr' ? `Classement du pool LNH | ${BRAND.name}` : `NHL pool standings | ${BRAND.nameEn}`;
  return { title, alternates: { canonical: `${BRAND.url}/${locale}/lnh/pool/classement` } };
}

export default async function StandingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const season = await getActiveSeason(supabase);
  const standings = season ? await getStandings(supabase, season.id) : [];
  const fmtPts = (n: number) => n.toLocaleString('fr-CA', { maximumFractionDigits: 1 });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 overflow-hidden border-t border-gray-200 dark:border-gray-700">
        <AdSidebar position="left" />
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
          <div className="mx-auto w-full max-w-3xl px-4 py-8">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Classement — {season?.name ?? 'Pool LNH'}</h1>
              <Link href="/lnh/pool" className="text-sm text-gray-600 underline dark:text-gray-300">Retour</Link>
            </div>
            {standings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
                Aucune équipe au classement pour l’instant.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-[#252525]">
                    <tr><th className="px-4 py-2">#</th><th className="px-4 py-2">Équipe</th><th className="px-4 py-2 text-right">Matchs</th><th className="px-4 py-2 text-right">Points</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {standings.map((s) => (
                      <tr key={s.entryId} className="hover:bg-gray-50 dark:hover:bg-[#252525]">
                        <td className="px-4 py-2 tabular-nums text-gray-500">{s.rank ?? '—'}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <TeamLogo logo={s.teamLogo} name={s.teamName} size={28} />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-gray-900 dark:text-gray-100">{s.teamName}</div>
                              {s.ownerName && (
                                <Link href={`/auteurs/${s.ownerName}`} className="flex items-center gap-1 text-xs text-gray-500 hover:underline">
                                  {s.ownerAvatar && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={s.ownerAvatar} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                                  )}
                                  @{s.ownerName}
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-gray-500">{s.gamesCounted}</td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtPts(s.fantasyPoints)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
        <AdSidebar position="right" />
      </div>
      <AdAnchor />
    </div>
  );
}
