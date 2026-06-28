'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Virtuoso } from 'react-virtuoso';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { TeamLogo } from '@/components/pool/TeamLogo';
import { PoolNav } from '../PoolNav';
import {
  saveRoster, setTeam, confirmEntry,
  type PoolPlayer, type SlotPick, type PoolPosition, type NhlTeamOption,
} from '@/services/poolService';

const M = 100_000_000;
const fmtM = (c: number) => `${(c / M).toLocaleString('fr-CA', { maximumFractionDigits: 1 })} M$`;
const POS_LABEL: Record<PoolPosition, string> = { F: 'Attaquants', D: 'Défenseurs', G: 'Gardiens' };

type Picker = PoolPosition | 'team' | null;

export function PoolComposer({
  entryId, isLocked, isConfirmed, budgetCents, need, rosterTeams, players, teams, initialPicks, initialTeam,
}: {
  entryId: number;
  isLocked: boolean; // draft deadline passed → read-only
  isConfirmed: boolean;
  budgetCents: number;
  need: { F: number; D: number; G: number };
  rosterTeams: number;
  players: PoolPlayer[];
  teams: NhlTeamOption[];
  initialPicks: SlotPick[];
  initialTeam: string | null;
}) {
  const router = useRouter();
  const locked = isLocked;
  const [picks, setPicks] = useState<SlotPick[]>(initialPicks);
  const [teamPick, setTeamPick] = useState<string | null>(initialTeam);
  const [confirmed, setConfirmed] = useState(isConfirmed);
  const [picker, setPicker] = useState<Picker>(null);
  const [busy, setBusy] = useState(false);

  const playerById = useMemo(() => new Map(players.map((p) => [p.playerId, p])), [players]);
  const chosen = useMemo(() => new Set(picks.map((p) => p.playerId)), [picks]);
  const counts = useMemo(() => {
    const c = { F: 0, D: 0, G: 0 };
    for (const p of picks) c[p.slotPosition]++;
    return c;
  }, [picks]);
  const spent = useMemo(() => picks.reduce((s, p) => s + (playerById.get(p.playerId)?.priceCents ?? 0), 0), [picks, playerById]);
  const remaining = budgetCents - spent;
  const teamObj = teams.find((t) => t.logoUrl && teamPick === t.abbrev) ?? teams.find((t) => teamPick === t.abbrev) ?? null;

  const sectionDone = (pos: PoolPosition) => counts[pos] === need[pos];
  const teamDone = rosterTeams === 0 || !!teamPick;
  const complete =
    (['F', 'D', 'G'] as PoolPosition[]).every((p) => need[p] === 0 || sectionDone(p)) && teamDone;

  const canAdd = (p: PoolPlayer) =>
    !locked && !chosen.has(p.playerId) && counts[p.position] < need[p.position] && p.priceCents <= remaining;
  const add = (p: PoolPlayer) => { if (canAdd(p)) setPicks((cur) => [...cur, { playerId: p.playerId, slotPosition: p.position }]); };
  const remove = (id: number) => { if (!locked) setPicks((cur) => cur.filter((p) => p.playerId !== id)); };

  async function persist(): Promise<boolean> {
    const c = createClient();
    const r1 = await saveRoster(c, entryId, picks);
    if (r1.error) { toast.error(r1.error); return false; }
    if (rosterTeams > 0) {
      const r2 = await setTeam(c, entryId, teamPick);
      if (r2.error) { toast.error(r2.error); return false; }
    }
    return true;
  }

  async function handleSave() {
    setBusy(true);
    const ok = await persist();
    setBusy(false);
    if (ok) { setConfirmed(false); toast.success('Progression enregistrée'); }
  }

  async function handleConfirm() {
    setBusy(true);
    if (!(await persist())) { setBusy(false); return; }
    const { error } = await confirmEntry(createClient(), entryId);
    setBusy(false);
    if (error) { toast.error(error); return; }
    setConfirmed(true);
    toast.success('Alignement confirmé — ton équipe est active!');
    router.push('/lnh/pool/moi');
  }

  // ── Section card (render fn, not a nested component) ───────────────────────
  const renderPlayerSection = (pos: PoolPosition) => {
    const rows = picks.filter((p) => p.slotPosition === pos);
    const done = sectionDone(pos);
    return (
      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {POS_LABEL[pos]}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
              {counts[pos]}/{need[pos]}
            </span>
          </h2>
          {!locked && (
            <button onClick={() => setPicker(pos)} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">
              Choisir
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">Aucun joueur choisi.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => {
              const p = playerById.get(r.playerId);
              if (!p) return null;
              return (
                <li key={r.playerId} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="truncate text-gray-900 dark:text-gray-100">{p.fullName} <span className="text-xs text-gray-400">{p.teamAbbrev}</span></span>
                  <span className="flex items-center gap-3">
                    <span className="tabular-nums text-gray-600 dark:text-gray-300">{fmtM(p.priceCents)}</span>
                    {!locked && <button onClick={() => remove(r.playerId)} className="text-xs font-medium text-red-600 hover:underline">Retirer</button>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  };

  const renderTeamSection = () => (
    <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Équipe LNH
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${teamDone ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
            {teamPick ? '1/1' : '0/1'}
          </span>
        </h2>
        {!locked && (
          <button onClick={() => setPicker('team')} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">
            Choisir
          </button>
        )}
      </div>
      {teamObj ? (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <TeamLogo logo={teamObj.logoUrl} name={teamObj.name} size={24} />
          <span className="text-gray-900 dark:text-gray-100">{teamObj.name}</span>
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-400">Aucune équipe choisie.</p>
      )}
    </section>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#1e1e1e]">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-700 dark:bg-[#1e1e1e]/95">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-2"><PoolNav /></div>
          <Link href="/lnh/pool/moi" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            ← Mon équipe
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-sm font-medium ${confirmed ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {confirmed ? '✓ Équipe confirmée (active)' : '⚠ À confirmer'}
            </span>
            <div className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {fmtM(remaining)} <span className="font-normal text-gray-400">restants / {fmtM(budgetCents)}</span>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className={`h-full ${spent > budgetCents ? 'bg-red-500' : 'bg-gray-900 dark:bg-white'}`}
              style={{ width: `${Math.min(100, (spent / budgetCents) * 100)}%` }} />
          </div>
          {!locked && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleSave} disabled={busy}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-[#252525]">
                Enregistrer
              </button>
              <button onClick={handleConfirm} disabled={busy || !complete}
                className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40 dark:bg-white dark:text-gray-900">
                Confirmer mon alignement
              </button>
            </div>
          )}
          {locked && <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-400">🔒 Le repêchage est terminé — ton alignement est figé.</p>}
        </div>
      </div>

      {/* Sections */}
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6">
        <p className="text-sm text-gray-500">
          Choisis tes joueurs section par section, puis <strong>Confirme</strong> ton alignement complet pour activer ton équipe.
        </p>
        {need.F > 0 && renderPlayerSection('F')}
        {need.D > 0 && renderPlayerSection('D')}
        {need.G > 0 && renderPlayerSection('G')}
        {rosterTeams > 0 && renderTeamSection()}
      </div>

      <AdAnchor />

      {/* Pickers */}
      {picker && picker !== 'team' && (
        <PlayerPicker
          pos={picker}
          players={players}
          chosen={chosen}
          canAdd={canAdd}
          onAdd={add}
          onRemove={remove}
          counts={counts}
          need={need}
          remaining={remaining}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'team' && (
        <TeamPicker
          teams={teams}
          selected={teamPick}
          onSelect={(abbrev) => { setTeamPick(abbrev); setConfirmed(false); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

// ── Player picker modal (filtered to one position) ──────────────────────────
function PlayerPicker({
  pos, players, chosen, canAdd, onAdd, onRemove, counts, need, remaining, onClose,
}: {
  pos: PoolPosition;
  players: PoolPlayer[];
  chosen: Set<number>;
  canAdd: (p: PoolPlayer) => boolean;
  onAdd: (p: PoolPlayer) => void;
  onRemove: (id: number) => void;
  counts: Record<PoolPosition, number>;
  need: { F: number; D: number; G: number };
  remaining: number;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'value' | 'price' | 'proj'>('value');
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let l = players.filter((p) => p.position === pos);
    if (q) l = l.filter((p) => p.fullName.toLowerCase().includes(q));
    const key = sort === 'price' ? (p: PoolPlayer) => -p.priceCents : sort === 'proj' ? (p: PoolPlayer) => p.projPoints : (p: PoolPlayer) => p.value;
    return [...l].sort((a, b) => key(b) - key(a));
  }, [players, pos, search, sort]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
      <div className="mt-auto flex max-h-[88vh] flex-col rounded-t-2xl bg-white dark:bg-[#1e1e1e] sm:mx-auto sm:mt-16 sm:mb-auto sm:max-h-[80vh] sm:w-full sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Choisir : {POS_LABEL[pos]} <span className="text-gray-400">{counts[pos]}/{need[pos]} · {fmtM(remaining)} restants</span>
          </h3>
          <button onClick={onClose} className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-gray-900">Terminé</button>
        </div>
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-700">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…"
            className="min-w-[120px] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-[#252525]" />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-[#252525]">
            <option value="value">Aubaines (pts/$)</option>
            <option value="price">Prix</option>
            <option value="proj">Points proj.</option>
          </select>
        </div>
        <div className="min-h-0 flex-1">
          <Virtuoso
            data={list}
            itemContent={(_i, p) => {
              const inRoster = chosen.has(p.playerId);
              const addable = canAdd(p);
              return (
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{p.fullName}</div>
                    <div className="text-xs text-gray-500">{p.teamAbbrev ?? '—'} · proj {p.projPoints.toLocaleString('fr-CA', { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="w-20 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtM(p.priceCents)}</div>
                  {inRoster ? (
                    <button onClick={() => onRemove(p.playerId)} className="w-20 rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">Retirer</button>
                  ) : addable ? (
                    <button onClick={() => onAdd(p)} className="w-20 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">Ajouter</button>
                  ) : (
                    <span className="w-20 text-center text-xs font-medium text-gray-400">
                      {counts[p.position] >= need[p.position] ? 'Complet' : p.priceCents > remaining ? 'Trop cher' : '—'}
                    </span>
                  )}
                </div>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Team picker modal ───────────────────────────────────────────────────────
function TeamPicker({
  teams, selected, onSelect, onClose,
}: {
  teams: NhlTeamOption[];
  selected: string | null;
  onSelect: (abbrev: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
      <div className="mt-auto flex max-h-[88vh] flex-col rounded-t-2xl bg-white dark:bg-[#1e1e1e] sm:mx-auto sm:mt-16 sm:mb-auto sm:max-h-[80vh] sm:w-full sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Choisir une équipe de la LNH</h3>
          <button onClick={onClose} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium dark:border-gray-600">Fermer</button>
        </div>
        <div className="grid grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3">
          {teams.map((t) => (
            <button
              key={t.abbrev}
              onClick={() => onSelect(t.abbrev)}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left text-sm ${selected === t.abbrev ? 'border-gray-900 ring-2 ring-gray-900 dark:border-white dark:ring-white' : 'border-gray-200 hover:border-gray-400 dark:border-gray-700'}`}
            >
              <TeamLogo logo={t.logoUrl} name={t.name} size={28} />
              <span className="truncate text-gray-900 dark:text-gray-100">{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
