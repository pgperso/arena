import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSeason, getStandings, getScoringRules, SCORING_CATALOG } from '@/services/poolService';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { TeamLogo } from '@/components/pool/TeamLogo';
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
  const rules = season ? await getScoringRules(supabase, season.id) : [];

  // Barème, joined with the FR labels, only the stats that actually score.
  const ruleMap = new Map(rules.map((r) => [r.statKey, r.coefficient]));
  const baremeRows = SCORING_CATALOG.map((c) => ({ ...c, coef: ruleMap.get(c.key) ?? 0 })).filter((c) => c.coef !== 0);
  const skaterRules = baremeRows.filter((c) => c.appliesTo === 'skater');
  const goalieRules = baremeRows.filter((c) => c.appliesTo === 'goalie');
  const fmtCoef = (n: number) => (n > 0 ? '+' : '') + n.toLocaleString('fr-CA', { maximumFractionDigits: 2 });

  // Rules shown to players are derived from the season config (set in admin),
  // never hardcoded — so the explainer always matches the real rules.
  const rf = season?.rosterF ?? 12;
  const rd = season?.rosterD ?? 6;
  const rg = season?.rosterG ?? 2;
  const budgetM = season ? (season.budgetCents / 100_000_000).toLocaleString('fr-CA', { maximumFractionDigits: 1 }) : '100';
  const lockDateStr = season?.lockAt
    ? new Date(season.lockAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const txNote =
    season?.transactionsEnabled && season.maxTransactions > 0
      ? `Tu pourras faire jusqu'à ${season.maxTransactions} changement${season.maxTransactions > 1 ? 's' : ''} en cours de saison.`
      : null;

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
    : !user
      ? { href: '/login?redirect=/lnh/pool/composer', label: 'Crée ton équipe' }
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
                Compose ton alignement de {rf} attaquants, {rd} défenseurs et {rg} gardiens dans un plafond
                de {budgetM} M$, et accumule des points selon les vraies performances de la LNH.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {season && (
                  <Link
                    href={cta.href}
                    className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900"
                  >
                    {cta.label}
                  </Link>
                )}
                <Link href="/lnh/pool/classement" className="text-sm font-medium text-gray-600 underline dark:text-gray-300">
                  Voir le classement complet
                </Link>
              </div>
              {season && !user && !myEntryId && (
                <p className="mt-2 text-xs text-gray-400">Connexion requise pour composer ton équipe.</p>
              )}
            </div>

            {/* Comment ça marche */}
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Comment ça marche</h2>
              <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['1', 'Compose ton équipe', `Choisis ${rf} attaquants, ${rd} défenseurs et ${rg} gardiens sans dépasser le plafond de ${budgetM} M$.`],
                  ['2', 'Modifie quand tu veux', lockDateStr
                    ? `Ajuste ton alignement librement jusqu'à la date limite du repêchage (le ${lockDateStr}).`
                    : "Ajuste ton alignement librement jusqu'à la date limite du repêchage."],
                  ['3', 'Tes joueurs marquent', 'Chaque soir, tes joueurs accumulent des points selon leurs vrais matchs de la LNH.'],
                  ['4', 'Grimpe au classement', 'Suis ta position et bats les autres membres tout au long de la saison.'],
                ].map(([n, title, desc]) => (
                  <li key={n} className="flex gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white dark:bg-white dark:text-gray-900">{n}</span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                  </li>
                ))}
              </ol>
              {txNote && <p className="mt-3 text-xs text-gray-500">🔄 {txNote}</p>}
            </section>

            {/* Barème */}
            {baremeRows.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500">Barème de pointage</h2>
                <p className="mb-3 text-xs text-gray-400">Combien vaut chaque statistique.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[['Patineurs', skaterRules], ['Gardiens', goalieRules]].map(([title, list]) => (
                    <div key={title as string} className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:bg-[#252525] dark:text-gray-200">{title as string}</div>
                      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                        {(list as typeof skaterRules).map((c) => (
                          <li key={c.key} className="flex items-center justify-between px-3 py-1.5 text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{c.label}</span>
                            <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtCoef(c.coef)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
