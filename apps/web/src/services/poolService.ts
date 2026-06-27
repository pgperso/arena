import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';
import { poolPosition } from './nhlService';

// Pool tables were added in migration 00067 — the generated Database type
// doesn't know them yet, so queries are cast through unknown (same pattern
// as pollService / nhlService).
type AnyClient = SupabaseClient<Database>;
type Db = SupabaseClient;

export type PoolPosition = 'F' | 'D' | 'G';

export interface PoolSeason {
  id: number;
  nhlSeason: number;
  name: string;
  budgetCents: number;
  rosterF: number;
  rosterD: number;
  rosterG: number;
  lockAt: string | null;
  status: 'draft' | 'open' | 'locked' | 'final';
  transactionsEnabled: boolean;
  maxTransactions: number;
  transactionDeadline: string | null;
  tiebreaker: 'fewest_games' | 'none';
  isPublic: boolean;
  timezone: string;
}

/** A single barème line: how many points a stat is worth this season. */
export interface ScoringRule {
  statKey: string;
  appliesTo: 'skater' | 'goalie';
  coefficient: number;
}

/** Every configurable stat, in display order, with FR labels for the admin UI. */
export const SCORING_CATALOG: Array<{ key: string; appliesTo: 'skater' | 'goalie'; label: string }> = [
  { key: 'goals', appliesTo: 'skater', label: 'But' },
  { key: 'assists', appliesTo: 'skater', label: 'Passe' },
  { key: 'plus_minus', appliesTo: 'skater', label: 'Différentiel (+/-)' },
  { key: 'pim', appliesTo: 'skater', label: 'Minute de pénalité' },
  { key: 'shots', appliesTo: 'skater', label: 'Tir au but' },
  { key: 'pp_goals', appliesTo: 'skater', label: 'But en avantage numérique' },
  { key: 'hits', appliesTo: 'skater', label: 'Mise en échec' },
  { key: 'blocked_shots', appliesTo: 'skater', label: 'Tir bloqué' },
  { key: 'takeaways', appliesTo: 'skater', label: 'Revirement provoqué' },
  { key: 'giveaways', appliesTo: 'skater', label: 'Revirement causé' },
  { key: 'win', appliesTo: 'goalie', label: 'Victoire' },
  { key: 'loss', appliesTo: 'goalie', label: 'Défaite' },
  { key: 'ot_loss', appliesTo: 'goalie', label: 'Défaite en prolongation' },
  { key: 'shutout', appliesTo: 'goalie', label: 'Blanchissage' },
  { key: 'save', appliesTo: 'goalie', label: 'Arrêt' },
  { key: 'goal_against', appliesTo: 'goalie', label: 'But alloué' },
];

export interface PoolPlayer {
  playerId: number;
  fullName: string;
  position: PoolPosition;
  teamAbbrev: string | null;
  priceCents: number;
  projPoints: number;
  /** Projected points per million $ — the default "bargain" sort. */
  value: number;
}

export interface StandingRow {
  entryId: number;
  teamName: string;
  teamLogo: string | null;
  memberId: string;
  fantasyPoints: number;
  rank: number | null;
  gamesCounted: number;
}

export interface NhlTeamOption {
  abbrev: string;
  name: string;
  logoUrl: string | null;
}

type SeasonRow = {
  id: number;
  nhl_season: number;
  name: string;
  budget_cents: number;
  roster_f: number;
  roster_d: number;
  roster_g: number;
  lock_at: string | null;
  status: PoolSeason['status'];
  transactions_enabled: boolean;
  max_transactions: number;
  transaction_deadline: string | null;
  tiebreaker: PoolSeason['tiebreaker'];
  is_public: boolean;
  timezone: string;
};

const SEASON_COLS =
  'id, nhl_season, name, budget_cents, roster_f, roster_d, roster_g, lock_at, status, ' +
  'transactions_enabled, max_transactions, transaction_deadline, tiebreaker, is_public, timezone';

function mapSeason(r: SeasonRow): PoolSeason {
  return {
    id: r.id,
    nhlSeason: r.nhl_season,
    name: r.name,
    budgetCents: r.budget_cents,
    rosterF: r.roster_f,
    rosterD: r.roster_d,
    rosterG: r.roster_g,
    lockAt: r.lock_at,
    status: r.status,
    transactionsEnabled: r.transactions_enabled,
    maxTransactions: r.max_transactions,
    transactionDeadline: r.transaction_deadline,
    tiebreaker: r.tiebreaker,
    isPublic: r.is_public,
    timezone: r.timezone,
  };
}

/** The single active pool season (most recent non-final, else most recent). */
export async function getActiveSeason(client: AnyClient): Promise<PoolSeason | null> {
  const db = client as unknown as Db;
  const { data } = await db
    .from('pool_seasons')
    .select(SEASON_COLS)
    .order('nhl_season', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapSeason(data as unknown as SeasonRow) : null;
}

/** The barème for a season, as configured rows (admin reads/edits these). */
export async function getScoringRules(client: AnyClient, seasonId: number): Promise<ScoringRule[]> {
  const db = client as unknown as Db;
  const { data } = await db
    .from('pool_scoring_rules')
    .select('stat_key, applies_to, coefficient')
    .eq('season_id', seasonId);
  return ((data ?? []) as unknown as Array<{ stat_key: string; applies_to: 'skater' | 'goalie'; coefficient: number }>).map(
    (r) => ({ statKey: r.stat_key, appliesTo: r.applies_to, coefficient: Number(r.coefficient) }),
  );
}

/**
 * The draftable player pool for a season: prices joined with player identity,
 * pre-computed `value` (proj points per M$) for the default bargain sort.
 * The full list (~700 players) is small enough to ship to the client and
 * filter/sort there for an instant builder UX.
 */
export async function getPlayerPool(client: AnyClient, seasonId: number): Promise<PoolPlayer[]> {
  const db = client as unknown as Db;
  const { data } = await db
    .from('pool_player_prices')
    .select(
      'player_id, price_cents, position, proj_points, is_draftable, nhl_players!inner(full_name, team_abbrev)',
    )
    .eq('season_id', seasonId)
    .eq('is_draftable', true);

  const rows = (data ?? []) as unknown as Array<{
    player_id: number;
    price_cents: number;
    position: PoolPosition;
    proj_points: number;
    nhl_players: { full_name: string; team_abbrev: string | null };
  }>;

  return rows.map((r) => ({
    playerId: r.player_id,
    fullName: r.nhl_players.full_name,
    position: r.position,
    teamAbbrev: r.nhl_players.team_abbrev,
    priceCents: r.price_cents,
    projPoints: r.proj_points,
    value: r.price_cents > 0 ? r.proj_points / (r.price_cents / 1_000_000_00) : 0,
  }));
}

/**
 * Public standings for a season. Driven by ENTRIES (not the materialized
 * standings table) so a team appears the moment it's built — points come from
 * pool_standings when the nightly refresh has run, else 0. Rank is computed
 * here (ties share a rank) so it's consistent before and after the refresh.
 * Only teams that have actually built a roster (spent > 0) are listed.
 */
export async function getStandings(client: AnyClient, seasonId: number): Promise<StandingRow[]> {
  const db = client as unknown as Db;
  const { data } = await db
    .from('pool_entries')
    .select('id, team_name, team_logo, member_id, pool_standings(fantasy_points, games_counted)')
    .eq('season_id', seasonId)
    .gt('spent_cents', 0);

  const raw = (data ?? []) as unknown as Array<{
    id: number;
    team_name: string;
    team_logo: string | null;
    member_id: string;
    pool_standings: Array<{ fantasy_points: number; games_counted: number }> | { fantasy_points: number; games_counted: number } | null;
  }>;

  const rows: StandingRow[] = raw.map((e) => {
    const st = Array.isArray(e.pool_standings) ? e.pool_standings[0] : e.pool_standings;
    return {
      entryId: e.id,
      teamName: e.team_name,
      teamLogo: e.team_logo,
      memberId: e.member_id,
      fantasyPoints: Number(st?.fantasy_points ?? 0),
      gamesCounted: st?.games_counted ?? 0,
      rank: null,
    };
  });

  rows.sort((a, b) => b.fantasyPoints - a.fantasyPoints || a.teamName.localeCompare(b.teamName));
  let rank = 0;
  let seen = 0;
  let prev: number | null = null;
  for (const r of rows) {
    seen++;
    if (r.fantasyPoints !== prev) {
      rank = seen;
      prev = r.fantasyPoints;
    }
    r.rank = rank;
  }
  return rows;
}

/** The 32 NHL teams as logo options for a pool team's identity. */
export async function getNhlTeamOptions(client: AnyClient): Promise<NhlTeamOption[]> {
  const db = client as unknown as Db;
  const { data } = await db.from('nhl_teams').select('abbrev, full_name, name, logo_url').order('full_name');
  return ((data ?? []) as unknown as Array<{ abbrev: string; full_name: string | null; name: string; logo_url: string | null }>).map(
    (t) => ({ abbrev: t.abbrev, name: t.full_name ?? t.name, logoUrl: t.logo_url }),
  );
}

/** Set the caller's team name + logo (allowed any time, even post-lock). */
export async function setIdentity(
  client: AnyClient,
  entryId: number,
  name: string,
  logo: string | null,
): Promise<{ error: string | null }> {
  const db = client as unknown as Db;
  const { error } = await db.rpc('pool_set_identity' as never, {
    p_entry_id: entryId,
    p_name: name,
    p_logo: logo,
  } as never);
  return { error: error?.message ?? null };
}

/** Create the caller's entry for a season (one per member, enforced by UNIQUE). */
export async function createEntry(
  client: AnyClient,
  seasonId: number,
  memberId: string,
  teamName: string,
): Promise<{ entryId: number | null; error: string | null }> {
  const db = client as unknown as Db;
  const { data, error } = await db
    .from('pool_entries')
    .insert({ season_id: seasonId, member_id: memberId, team_name: teamName })
    .select('id')
    .single();
  if (error) return { entryId: null, error: error.message };
  return { entryId: (data as { id: number }).id, error: null };
}

export interface SlotPick {
  playerId: number;
  slotPosition: PoolPosition;
}

/**
 * Replace the entry's roster (pre-lock). Goes through the pool_save_roster
 * RPC so the whole replace is one atomic transaction with budget/cap checks
 * under a row lock — a failed insert can never wipe the prior roster.
 */
export async function saveRoster(
  client: AnyClient,
  entryId: number,
  picks: SlotPick[],
): Promise<{ error: string | null }> {
  const db = client as unknown as Db;
  const { error } = await db.rpc('pool_save_roster' as never, {
    p_entry_id: entryId,
    p_picks: picks.map((p) => ({ player_id: p.playerId, slot_position: p.slotPosition })),
  } as never);
  return { error: error?.message ?? null };
}

/** Lock the entry for the season (validates 12/6/2 + budget atomically). */
export async function lockEntry(client: AnyClient, entryId: number): Promise<{ error: string | null }> {
  const db = client as unknown as Db;
  const { error } = await db.rpc('pool_lock_entry' as never, { p_entry_id: entryId } as never);
  return { error: error?.message ?? null };
}

/** Make an in-season transaction: drop one player, add another (post-lock). */
export async function makeTransaction(
  client: AnyClient,
  entryId: number,
  dropPlayerId: number,
  addPlayerId: number,
): Promise<{ error: string | null }> {
  const db = client as unknown as Db;
  const { error } = await db.rpc('pool_make_transaction' as never, {
    p_entry_id: entryId,
    p_drop_player: dropPlayerId,
    p_add_player: addPlayerId,
  } as never);
  return { error: error?.message ?? null };
}

/**
 * "Équipe instantanée" — autopick a valid, on-budget roster the user can then
 * tweak. The antidote to blank-roster paralysis (top UX priority).
 *
 * Greedy by value (proj points per $), but every pick is guarded so we can
 * still afford the cheapest fill of all remaining slots — guaranteeing the
 * result is always a legal, within-budget 12F/6D/2G roster. A little
 * variation (skipping the very top pick sometimes) keeps teams from being
 * identical for everyone; the caller passes a `seed` (e.g. entry id) so it's
 * deterministic per user.
 */
export function buildQuickLineup(
  players: PoolPlayer[],
  need: { F: number; D: number; G: number },
  budgetCents: number,
  seed = 0,
): SlotPick[] {
  const byPos: Record<PoolPosition, PoolPlayer[]> = { F: [], D: [], G: [] };
  for (const p of players) byPos[p.position]?.push(p);
  // Cheapest-first per position, used to reserve budget for unfilled slots.
  const cheapest: Record<PoolPosition, PoolPlayer[]> = {
    F: [...byPos.F].sort((a, b) => a.priceCents - b.priceCents),
    D: [...byPos.D].sort((a, b) => a.priceCents - b.priceCents),
    G: [...byPos.G].sort((a, b) => a.priceCents - b.priceCents),
  };
  // Best-value-first per position, the order we try to draft from.
  const byValue: Record<PoolPosition, PoolPlayer[]> = {
    F: [...byPos.F].sort((a, b) => b.value - a.value),
    D: [...byPos.D].sort((a, b) => b.value - a.value),
    G: [...byPos.G].sort((a, b) => b.value - a.value),
  };

  const chosen = new Set<number>();
  const remaining: Record<PoolPosition, number> = { F: need.F, D: need.D, G: need.G };

  // Cheapest cost to fill `count` more slots at `pos`, excluding chosen players.
  const reserveFor = (pos: PoolPosition, count: number): number => {
    let sum = 0;
    let n = 0;
    for (const p of cheapest[pos]) {
      if (n >= count) break;
      if (chosen.has(p.playerId)) continue;
      sum += p.priceCents;
      n++;
    }
    return sum;
  };

  const picks: SlotPick[] = [];
  let spent = 0;
  const order: PoolPosition[] = ['G', 'D', 'F']; // scarcest pools first

  for (const pos of order) {
    let skip = seed % 2; // tiny per-user variation on the top pick
    for (const cand of byValue[pos]) {
      if (remaining[pos] === 0) break;
      if (chosen.has(cand.playerId)) continue;
      // Budget left after this pick must still cover the cheapest fill of all
      // other still-empty slots (this position minus one, plus other positions).
      const others =
        reserveFor(pos, remaining[pos] - 1) +
        (['F', 'D', 'G'] as PoolPosition[])
          .filter((o) => o !== pos)
          .reduce((acc, o) => acc + reserveForExcluding(o, remaining[o], cand.playerId), 0);
      if (spent + cand.priceCents + others > budgetCents) continue;
      if (skip > 0) {
        skip--;
        continue;
      }
      chosen.add(cand.playerId);
      picks.push({ playerId: cand.playerId, slotPosition: pos });
      spent += cand.priceCents;
      remaining[pos]--;
    }
    // Safety net: if value-guarding left slots unfilled, fill cheapest available
    // — still budget-guarded so we never hand back an over-cap roster.
    for (const p of cheapest[pos]) {
      if (remaining[pos] === 0) break;
      if (chosen.has(p.playerId)) continue;
      const others =
        reserveFor(pos, remaining[pos] - 1) +
        (['F', 'D', 'G'] as PoolPosition[])
          .filter((o) => o !== pos)
          .reduce((acc, o) => acc + reserveForExcluding(o, remaining[o], p.playerId), 0);
      if (spent + p.priceCents + others > budgetCents) continue;
      chosen.add(p.playerId);
      picks.push({ playerId: p.playerId, slotPosition: pos });
      spent += p.priceCents;
      remaining[pos]--;
    }
  }

  // reserveFor variant that also excludes a candidate being considered.
  function reserveForExcluding(pos: PoolPosition, count: number, excludeId: number): number {
    let sum = 0;
    let n = 0;
    for (const p of cheapest[pos]) {
      if (n >= count) break;
      if (chosen.has(p.playerId) || p.playerId === excludeId) continue;
      sum += p.priceCents;
      n++;
    }
    return sum;
  }

  return picks;
}

// ===========================================================================
// Salary CSV import — set real cap-hit prices from a snapshot we compile
// ourselves (the numbers are facts; we never scrape or redistribute a feed).
// The risky part is matching CSV names to NHL player_ids, so matching is
// accent/punctuation tolerant and reports anything it can't resolve rather
// than guessing.
// ===========================================================================

/** Normalize a name for matching: strip accents, punctuation, suffixes, case. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritics
    .toLowerCase()
    .replace(/[.,'’`\-]/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "$12,500,000" / "12500000" / "12.5M" / "925000" → integer cents. */
export function parseMoneyCents(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/[$,\s]/g, '');
  if (!s) return null;
  const m = s.match(/^([\d.]+)(m)?$/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (Number.isNaN(num)) return null;
  const dollars = m[2] === 'm' ? num * 1_000_000 : num;
  return Math.round(dollars * 100);
}

/** Quote-aware split of a single CSV line. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

export interface SalaryCsvRow {
  name: string;
  team: string;
  capHit: string;
}

/** Parse CSV text into rows. Accepts headers: name/player, team, cap_hit/salary. */
export function parseSalaryCsv(text: string): SalaryCsvRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const ni = idx('name', 'player', 'joueur');
  const ti = idx('team', 'equipe', 'équipe', 'tm');
  const ci = idx('cap_hit', 'caphit', 'salary', 'salaire', 'cap');
  return lines.slice(1).map((line) => {
    const c = splitCsvLine(line);
    return { name: (c[ni] ?? '').trim(), team: (c[ti] ?? '').trim(), capHit: (c[ci] ?? '').trim() };
  });
}

export interface MatchablePlayer {
  playerId: number;
  fullName: string;
  teamAbbrev: string | null;
  position: string;
}

export interface SalaryMatchResult {
  matched: Array<{ playerId: number; priceCents: number; position: PoolPosition; name: string }>;
  unmatched: SalaryCsvRow[];
  ambiguous: Array<{ row: SalaryCsvRow; candidates: number }>;
  invalidPrice: SalaryCsvRow[];
}

/**
 * Match CSV salary rows to NHL players. Pure + unit-testable. Strategy, in
 * order: exact normalized full name (unique) → full name disambiguated by
 * team → unique last-name + team. Anything still unresolved is reported,
 * never guessed.
 */
export function matchSalaryRows(players: MatchablePlayer[], rows: SalaryCsvRow[]): SalaryMatchResult {
  const byFull = new Map<string, MatchablePlayer[]>();
  const byLastTeam = new Map<string, MatchablePlayer[]>();
  const push = (m: Map<string, MatchablePlayer[]>, k: string, p: MatchablePlayer) => {
    const a = m.get(k);
    if (a) a.push(p);
    else m.set(k, [p]);
  };
  for (const p of players) {
    const nf = normalizeName(p.fullName);
    push(byFull, nf, p);
    const last = nf.split(' ').slice(1).join(' ');
    if (last) push(byLastTeam, `${last}|${(p.teamAbbrev ?? '').toUpperCase()}`, p);
  }

  const res: SalaryMatchResult = { matched: [], unmatched: [], ambiguous: [], invalidPrice: [] };

  // "Last, First" → "First Last", then normalize. Precompute per row so we can
  // count duplicate names: a name listed twice in the snapshot means real
  // homonyms (e.g. the two Sebastian Ahos), for which we must NOT match on
  // name alone — otherwise a row for the twin who isn't on a roster would
  // hijack the one who is. Those require an exact team match.
  const normOf = (name: string) =>
    normalizeName(name.includes(',') ? name.split(',').map((s) => s.trim()).reverse().join(' ') : name);
  const nameCount = new Map<string, number>();
  for (const r of rows) nameCount.set(normOf(r.name), (nameCount.get(normOf(r.name)) ?? 0) + 1);

  for (const row of rows) {
    const priceCents = parseMoneyCents(row.capHit);
    if (priceCents === null || priceCents <= 0) {
      res.invalidPrice.push(row);
      continue;
    }
    const norm = normOf(row.name);
    const team = row.team.trim().toUpperCase();
    const isHomonym = (nameCount.get(norm) ?? 0) > 1 || (byFull.get(norm)?.length ?? 0) > 1;

    let candidates = byFull.get(norm) ?? [];
    if (isHomonym) {
      // Disambiguate strictly by team; no team match → don't guess.
      candidates = team ? candidates.filter((c) => (c.teamAbbrev ?? '').toUpperCase() === team) : [];
    } else if (candidates.length === 0) {
      const last = norm.split(' ').slice(1).join(' ');
      candidates = byLastTeam.get(`${last}|${team}`) ?? [];
    }

    if (candidates.length === 1) {
      const p = candidates[0];
      res.matched.push({
        playerId: p.playerId,
        priceCents,
        position: poolPosition(p.position),
        name: p.fullName,
      });
    } else if (candidates.length > 1) {
      res.ambiguous.push({ row, candidates: candidates.length });
    } else {
      res.unmatched.push(row);
    }
  }
  return res;
}

export interface SalaryImportReport {
  total: number;
  matched: number;
  unmatched: SalaryCsvRow[];
  ambiguous: Array<{ row: SalaryCsvRow; candidates: number }>;
  invalidPrice: SalaryCsvRow[];
  budgetCents: number | null;
}

/**
 * Import a salary snapshot into pool_player_prices for a season. Idempotent.
 *
 * Two modes:
 *  - incremental (default): only the listed players are upserted — safe for a
 *    post-trade touch-up that updates a handful of salaries.
 *  - fullSnapshot: every other priced player for the season is first marked
 *    non-draftable, so a complete season snapshot can't leave stale players
 *    draftable. Use this for the start-of-season load.
 *
 * Optionally sets the season budget to the real NHL cap.
 */
export async function importSalaries(
  client: AnyClient,
  seasonId: number,
  csvText: string,
  opts: { budgetCents?: number; fullSnapshot?: boolean } = {},
): Promise<SalaryImportReport> {
  const db = client as unknown as Db;
  const rows = parseSalaryCsv(csvText);

  const { data: playersData } = await db.from('nhl_players').select('player_id, full_name, team_abbrev, position');
  const players: MatchablePlayer[] = (
    (playersData ?? []) as unknown as Array<{
      player_id: number;
      full_name: string;
      team_abbrev: string | null;
      position: string;
    }>
  ).map((r) => ({
    playerId: r.player_id,
    fullName: r.full_name,
    teamAbbrev: r.team_abbrev,
    position: r.position,
  }));
  const result = matchSalaryRows(players, rows);

  if (opts.fullSnapshot) {
    await db.from('pool_player_prices').update({ is_draftable: false }).eq('season_id', seasonId);
  }

  // De-dupe by player_id (two CSV rows can resolve to the same player, e.g. a
  // player listed twice, or a homonym whose twin isn't on a current roster).
  // Last occurrence wins; Postgres upsert rejects a batch that touches the
  // same conflict key twice, so this must happen before the write.
  const byPlayer = new Map<number, (typeof result.matched)[number]>();
  for (const m of result.matched) byPlayer.set(m.playerId, m);
  const deduped = [...byPlayer.values()];

  if (deduped.length > 0) {
    const priceRows = deduped.map((m) => ({
      season_id: seasonId,
      player_id: m.playerId,
      price_cents: m.priceCents,
      position: m.position,
      is_draftable: true,
    }));
    const { error } = await db.from('pool_player_prices').upsert(priceRows, { onConflict: 'season_id,player_id' });
    if (error) throw new Error(`upsert prices: ${error.message}`);
  }

  if (opts.budgetCents) {
    await db.from('pool_seasons').update({ budget_cents: opts.budgetCents }).eq('id', seasonId);
  }

  return {
    total: rows.length,
    matched: deduped.length,
    unmatched: result.unmatched,
    ambiguous: result.ambiguous,
    invalidPrice: result.invalidPrice,
    budgetCents: opts.budgetCents ?? null,
  };
}
