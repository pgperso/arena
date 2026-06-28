'use client';

import { useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { AdAnchor } from '@/components/ads/AdAnchor';
import { PoolNav } from '../PoolNav';
import {
  buildQuickLineup, saveRoster,
  type PoolPlayer, type SlotPick, type PoolPosition,
} from '@/services/poolService';

const M = 100_000_000; // cents per 1 M$
const fmtM = (cents: number) => `${(cents / M).toLocaleString('fr-CA', { maximumFractionDigits: 1 })} M$`;

const POS_LABEL: Record<PoolPosition, string> = { F: 'Att', D: 'Déf', G: 'Gardien' };

export function PoolComposer({
  entryId, isLocked, budgetCents, need, players, initialPicks,
}: {
  entryId: number;
  // True once the draft deadline has passed — the roster is frozen, read-only.
  isLocked: boolean;
  budgetCents: number;
  need: { F: number; D: number; G: number };
  players: PoolPlayer[];
  initialPicks: SlotPick[];
}) {
  const locked = isLocked;
  const [picks, setPicks] = useState<SlotPick[]>(initialPicks);
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<'ALL' | PoolPosition>('ALL');
  const [sort, setSort] = useState<'value' | 'price' | 'proj'>('value');
  const [busy, setBusy] = useState(false);

  const priceOf = useMemo(() => new Map(players.map((p) => [p.playerId, p.priceCents])), [players]);
  const chosen = useMemo(() => new Set(picks.map((p) => p.playerId)), [picks]);
  const counts = useMemo(() => {
    const c = { F: 0, D: 0, G: 0 };
    for (const p of picks) c[p.slotPosition]++;
    return c;
  }, [picks]);
  const spent = useMemo(() => picks.reduce((s, p) => s + (priceOf.get(p.playerId) ?? 0), 0), [picks, priceOf]);
  const remaining = budgetCents - spent;

  const canAdd = (p: PoolPlayer) =>
    !locked && !chosen.has(p.playerId) && counts[p.position] < need[p.position] && p.priceCents <= remaining;

  const add = (p: PoolPlayer) => { if (canAdd(p)) setPicks((cur) => [...cur, { playerId: p.playerId, slotPosition: p.position }]); };
  const remove = (id: number) => { if (!locked) setPicks((cur) => cur.filter((p) => p.playerId !== id)); };

  const autopick = () => {
    if (locked) return;
    setPicks(buildQuickLineup(players, need, budgetCents, entryId));
    toast.success('Équipe instantanée générée — ajuste-la à ton goût');
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = players;
    if (posFilter !== 'ALL') list = list.filter((p) => p.position === posFilter);
    if (q) list = list.filter((p) => p.fullName.toLowerCase().includes(q));
    const key = sort === 'price' ? (p: PoolPlayer) => -p.priceCents : sort === 'proj' ? (p: PoolPlayer) => p.projPoints : (p: PoolPlayer) => p.value;
    return [...list].sort((a, b) => key(b) - key(a));
  }, [players, search, posFilter, sort]);

  async function handleSave() {
    setBusy(true);
    const { error } = await saveRoster(createClient(), entryId, picks);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success('Alignement enregistré');
  }

  const slotPill = (pos: PoolPosition) => {
    const done = counts[pos] === need[pos];
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
        {POS_LABEL[pos]} {counts[pos]}/{need[pos]}
      </span>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white dark:bg-[#1e1e1e]">
      {/* Sticky budget + actions */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-700 dark:bg-[#1e1e1e]/95">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-2">
            <PoolNav />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">{slotPill('F')}{slotPill('D')}{slotPill('G')}</div>
            <div className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {fmtM(remaining)} <span className="font-normal text-gray-400">restants / {fmtM(budgetCents)}</span>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className={`h-full ${spent > budgetCents ? 'bg-red-500' : 'bg-gray-900 dark:bg-white'}`}
              style={{ width: `${Math.min(100, (spent / budgetCents) * 100)}%` }} />
          </div>
          {!locked && (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={autopick} disabled={busy}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-[#252525]">
                  ⚡ Équipe instantanée
                </button>
                <button onClick={handleSave} disabled={busy}
                  className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900">
                  Enregistrer
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                ⚡ <strong>Équipe instantanée</strong> remplit une équipe valide que tu peux ajuster · <strong>Enregistre</strong> tes choix — tu peux les modifier jusqu&apos;à la date limite du repêchage.
              </p>
            </>
          )}

          {locked && (
            <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-400">
              🔒 Le repêchage est terminé — ton alignement est figé pour la saison.
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un joueur…"
            className="min-w-[160px] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-[#252525]" />
          <div className="flex gap-1">
            {(['ALL', 'F', 'D', 'G'] as const).map((p) => (
              <button key={p} onClick={() => setPosFilter(p)}
                className={`rounded-md px-2.5 py-1.5 text-sm font-medium ${posFilter === p ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'border border-gray-300 dark:border-gray-600'}`}>
                {p === 'ALL' ? 'Tous' : POS_LABEL[p]}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-[#252525]">
            <option value="value">Tri : Aubaines (pts/$)</option>
            <option value="price">Tri : Prix</option>
            <option value="proj">Tri : Points projetés</option>
          </select>
        </div>
      </div>

      {/* Player list */}
      <div className="mx-auto w-full max-w-5xl flex-1">
        <Virtuoso
          data={visible}
          itemContent={(_i, p) => {
            const inRoster = chosen.has(p.playerId);
            const addable = canAdd(p);
            return (
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{p.fullName}</div>
                  <div className="text-xs text-gray-500">
                    {p.teamAbbrev ?? '—'} · {POS_LABEL[p.position]} · proj {p.projPoints.toLocaleString('fr-CA', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="w-20 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtM(p.priceCents)}</div>
                {inRoster ? (
                  <button onClick={() => remove(p.playerId)} disabled={locked}
                    className="w-20 rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40">
                    Retirer
                  </button>
                ) : addable ? (
                  <button onClick={() => add(p)}
                    className="w-20 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900">
                    Ajouter
                  </button>
                ) : (
                  // Reason shown inline (a title tooltip is invisible on touch).
                  <span className="w-20 text-center text-xs font-medium text-gray-400">
                    {locked ? 'Verrouillé' : counts[p.position] >= need[p.position] ? 'Complet' : p.priceCents > remaining ? 'Trop cher' : '—'}
                  </span>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* The single allowed ad on the tool screen */}
      <AdAnchor />
    </div>
  );
}
