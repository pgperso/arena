import type { Metadata } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSeason, type PoolPosition } from '@/services/poolService';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { TeamIdentityEditor } from './TeamIdentityEditor';
import { TeamLogo } from '@/components/pool/TeamLogo';
import { BRAND } from '@/lib/brand';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'fr' ? `Mon équipe | ${BRAND.name}` : `My team | ${BRAND.nameEn}`;
  return { title, robots: { index: false, follow: false } };
}

const POS_LABEL: Record<PoolPosition, string> = { F: 'Attaquants', D: 'Défenseurs', G: 'Gardiens' };
const M = 100_000_000;
const fmtM = (c: number) => `${(c / M).toLocaleString('fr-CA', { maximumFractionDigits: 1 })} M$`;

export default async function MyTeamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/lnh/pool/moi');

  const season = await getActiveSeason(supabase);
  if (!season) redirect('/lnh/pool');
  const db = supabase as unknown as SupabaseClient;

  const { data: entryData } = await db
    .from('pool_entries')
    .select('id, team_name, team_logo, is_locked, spent_cents')
    .eq('season_id', season.id)
    .eq('member_id', user.id)
    .maybeSingle();
  const entry = entryData as { id: number; team_name: string; team_logo: string | null; is_locked: boolean; spent_cents: number } | null;
  if (!entry) redirect('/lnh/pool/composer');

  const { data: slotData } = await db
    .from('pool_roster_slots')
    .select('player_id, slot_position, price_cents, nhl_players!inner(full_name, team_abbrev)')
    .eq('entry_id', entry.id)
    .is('effective_to', null);
  const slots = (slotData ?? []) as unknown as Array<{
    player_id: number; slot_position: PoolPosition; price_cents: number;
    nhl_players: { full_name: string; team_abbrev: string | null };
  }>;

  const { data: standingData } = await db
    .from('pool_standings')
    .select('rank, fantasy_points, games_counted')
    .eq('season_id', season.id)
    .eq('entry_id', entry.id)
    .maybeSingle();
  const standing = standingData as { rank: number | null; fantasy_points: number; games_counted: number } | null;

  const byPos = (pos: PoolPosition) => slots.filter((s) => s.slot_position === pos);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 overflow-hidden border-t border-gray-200 dark:border-gray-700">
        <AdSidebar position="left" />
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
          <div className="mx-auto w-full max-w-3xl px-4 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <TeamLogo logo={entry.team_logo} name={entry.team_name} size={40} />
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{entry.team_name}</h1>
                  <p className="text-sm text-gray-500">{season.name}{entry.is_locked ? ' · verrouillé' : ' · brouillon'}</p>
                </div>
              </div>
              {!entry.is_locked && (
                <Link href="/lnh/pool/composer" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">
                  Modifier l&apos;alignement
                </Link>
              )}
            </div>

            <div className="mt-3">
              <TeamIdentityEditor
                entryId={entry.id}
                memberId={user.id}
                initialName={entry.team_name}
                initialLogo={entry.team_logo}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { l: 'Rang', v: standing?.rank ? `${standing.rank}ᵉ` : '—' },
                { l: 'Points', v: standing ? standing.fantasy_points.toLocaleString('fr-CA', { maximumFractionDigits: 1 }) : '0' },
                { l: 'Masse salariale', v: fmtM(entry.spent_cents) },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border border-gray-200 p-3 text-center dark:border-gray-700">
                  <div className="text-xs uppercase tracking-wide text-gray-500">{s.l}</div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">{s.v}</div>
                </div>
              ))}
            </div>

            {!entry.is_locked && slots.length > 0 && (
              <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-[#252525]">
                <strong>Brouillon</strong> — tu peux modifier ton alignement jusqu&apos;à ce que tu le verrouilles.
              </p>
            )}
            {slots.length > 0 && (!standing || standing.games_counted === 0) && (
              <p className="mt-2 text-xs text-gray-400">
                La saison n&apos;a pas commencé — tes points s&apos;accumuleront après chaque match.
              </p>
            )}

            {slots.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
                Ton alignement est vide. <Link href="/lnh/pool/composer" className="underline">Compose-le.</Link>
              </div>
            ) : (
              (['F', 'D', 'G'] as PoolPosition[]).map((pos) => (
                <section key={pos} className="mt-6">
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{POS_LABEL[pos]}</h2>
                  <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    {byPos(pos).map((s) => (
                      <div key={s.player_id} className="flex items-center justify-between border-b border-gray-100 px-4 py-2 last:border-0 dark:border-gray-800">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.nhl_players.full_name}</span>
                        <span className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{s.nhl_players.team_abbrev ?? '—'}</span>
                          <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtM(s.price_cents)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </main>
        <AdSidebar position="right" />
      </div>
      <AdAnchor />
    </div>
  );
}
