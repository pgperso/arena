import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

/** Only a global owner may edit pool rules. Mirrors /api/polls/rotate. */
async function isOwner(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('community_member_roles')
    .select('id, roles!inner(code)')
    .eq('member_id', user.id)
    .eq('roles.code', 'owner')
    .limit(1);
  return Boolean((data as unknown[] | null)?.length);
}

interface SeasonPatch {
  name?: string;
  budgetCents?: number;
  rosterF?: number;
  rosterD?: number;
  rosterG?: number;
  lockAt?: string | null;
  status?: 'draft' | 'open' | 'locked' | 'final';
  transactionsEnabled?: boolean;
  maxTransactions?: number;
  transactionDeadline?: string | null;
  tiebreaker?: 'fewest_games' | 'none';
  isPublic?: boolean;
}
interface SaveBody {
  seasonId: number;
  season: SeasonPatch;
  rules: Array<{ statKey: string; appliesTo: 'skater' | 'goalie'; coefficient: number }>;
}

export async function POST(request: Request) {
  if (!(await isOwner())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 });
  }
  const admin = createServiceClient(supabaseUrl, serviceKey);

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }
  const { seasonId, season, rules } = body;
  if (!seasonId) return NextResponse.json({ error: 'seasonId requis' }, { status: 400 });

  // Map camelCase patch → DB columns; only set provided fields.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const set = <T,>(col: string, v: T | undefined) => {
    if (v !== undefined) patch[col] = v;
  };
  set('name', season.name);
  set('budget_cents', season.budgetCents);
  set('roster_f', season.rosterF);
  set('roster_d', season.rosterD);
  set('roster_g', season.rosterG);
  set('lock_at', season.lockAt);
  set('status', season.status);
  set('transactions_enabled', season.transactionsEnabled);
  set('max_transactions', season.maxTransactions);
  set('transaction_deadline', season.transactionDeadline);
  set('tiebreaker', season.tiebreaker);
  set('is_public', season.isPublic);

  const { error: seasonErr } = await admin.from('pool_seasons').update(patch).eq('id', seasonId);
  if (seasonErr) return NextResponse.json({ error: `Saison : ${seasonErr.message}` }, { status: 500 });

  // Replace the barème: drop rules with a 0/blank coefficient, upsert the rest.
  if (Array.isArray(rules)) {
    const keep = rules.filter((r) => Number.isFinite(r.coefficient) && r.coefficient !== 0);
    const drop = rules.filter((r) => !keep.includes(r));
    if (drop.length > 0) {
      await admin
        .from('pool_scoring_rules')
        .delete()
        .eq('season_id', seasonId)
        .in('stat_key', drop.map((r) => r.statKey));
    }
    if (keep.length > 0) {
      const rows = keep.map((r) => ({
        season_id: seasonId,
        stat_key: r.statKey,
        applies_to: r.appliesTo,
        coefficient: r.coefficient,
      }));
      const { error } = await admin
        .from('pool_scoring_rules')
        .upsert(rows, { onConflict: 'season_id,stat_key' });
      if (error) return NextResponse.json({ error: `Barème : ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
