import type { Metadata } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveSeason, getStandings, getRosterWithStats } from '@/services/poolService';
import { PoolShell } from '../PoolShell';
import { PoolRosterStats } from '@/components/pool/PoolRosterStats';
import { TeamIdentityEditor } from './TeamIdentityEditor';
import { TeamLogo } from '@/components/pool/TeamLogo';
import { BRAND } from '@/lib/brand';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'fr' ? `Mon équipe | ${BRAND.name}` : `My team | ${BRAND.nameEn}`;
  return { title, robots: { index: false, follow: false } };
}

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
    .select('id, team_name, team_logo, is_locked, spent_cents, transactions_used')
    .eq('season_id', season.id)
    .eq('member_id', user.id)
    .maybeSingle();
  const entry = entryData as { id: number; team_name: string; team_logo: string | null; is_locked: boolean; spent_cents: number; transactions_used: number } | null;
  if (!entry) redirect('/lnh/pool/composer');

  const draftClosed = Boolean(season.lockAt && new Date(season.lockAt) <= new Date());

  const [rows, standings] = await Promise.all([
    getRosterWithStats(supabase, season.id, entry.id),
    getStandings(supabase, season.id),
  ]);
  const standing = standings.find((s) => s.entryId === entry.id);

  return (
    <PoolShell width="wide" leftAd={false}>
      {/* Narrow track for text/header/cards */}
      <div className="max-w-3xl">
        <div className="flex items-center gap-3">
          <TeamLogo logo={entry.team_logo} name={entry.team_name} size={44} />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{entry.team_name}</h1>
            <p className="text-sm text-gray-500">{season.name}{draftClosed ? ' · repêchage terminé' : ' · modifiable'}</p>
          </div>
        </div>

        <section className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Identité de l&apos;équipe</h2>
          <TeamIdentityEditor entryId={entry.id} memberId={user.id} initialName={entry.team_name} initialLogo={entry.team_logo} />
        </section>

      </div>

      {/* Stat cards — span the full width of the wide track */}
      <div className={`mt-4 grid grid-cols-2 gap-3 ${season.transactionsEnabled ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {[
          { l: 'Rang', v: standing?.rank ? `${standing.rank}ᵉ` : '—' },
          { l: 'Points', v: standing ? standing.fantasyPoints.toLocaleString('fr-CA', { maximumFractionDigits: 1 }) : '0' },
          { l: 'Masse salariale', v: fmtM(entry.spent_cents) },
          ...(season.transactionsEnabled
            ? [{ l: 'Échanges restants', v: String(Math.max(0, season.maxTransactions - entry.transactions_used)) }]
            : []),
        ].map((s) => (
          <div key={s.l} className="rounded-lg border border-gray-200 p-4 text-center dark:border-gray-700">
            <div className="text-xs uppercase tracking-wide text-gray-500">{s.l}</div>
            <div className="mt-1 text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{s.v}</div>
          </div>
        ))}
      </div>

      {(!standing || standing.gamesCounted === 0) && (
        <p className="mt-2 text-xs text-gray-400">La saison n&apos;a pas commencé — tes points s&apos;accumuleront après chaque match.</p>
      )}

      {/* Wide track: header row + rich stat tables */}
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Mon alignement</h2>
        {!draftClosed && (
          <Link href="/lnh/pool/composer" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">
            Modifier mon alignement
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700">
          Ton alignement est vide. <Link href="/lnh/pool/composer" className="underline">Compose-le.</Link>
        </div>
      ) : (
        <PoolRosterStats rows={rows} />
      )}
    </PoolShell>
  );
}
