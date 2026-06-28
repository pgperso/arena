import type { RosterPlayerStats, PoolPosition } from '@/services/poolService';

const M = 100_000_000;
const fmtM = (c: number) => `${(c / M).toLocaleString('fr-CA', { maximumFractionDigits: 1 })} M$`;
const fmtPts = (n: number) => n.toLocaleString('fr-CA', { maximumFractionDigits: 1 });
const toiPerGame = (sec: number, gp: number) => {
  if (gp === 0) return '—';
  const s = Math.round(sec / gp);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const svPct = (saves: number, sa: number) => (sa > 0 ? (saves / sa).toFixed(3).replace(/^0/, '') : '—');
const gaa = (ga: number, sec: number) => (sec > 0 ? (ga / (sec / 3600)).toFixed(2) : '—');

// Tailwind helpers shared by both tables.
const wrap = 'overflow-x-auto overscroll-x-contain rounded-lg border border-gray-200 dark:border-gray-700';
const thBase = 'px-3 py-2 text-right font-medium whitespace-nowrap';
const tdNum = 'px-3 py-2 text-right tabular-nums text-gray-600 dark:text-gray-300';
const stickyTh = 'sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium dark:bg-[#252525]';
const stickyTd =
  'sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium text-gray-900 group-hover:bg-gray-50 dark:bg-[#1e1e1e] dark:text-gray-100 dark:group-hover:bg-[#252525]';
const ptsTd = 'px-3 py-2 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100';

function PlayerName({ p }: { p: RosterPlayerStats }) {
  return (
    <span className="block">
      <span className="block truncate">{p.fullName}</span>
      <span className="text-xs font-normal text-gray-400">{p.teamAbbrev ?? '—'}</span>
    </span>
  );
}

function SkaterTable({ rows }: { rows: RosterPlayerStats[] }) {
  const sum = (k: keyof RosterPlayerStats) => rows.reduce((a, r) => a + (r[k] as number), 0);
  return (
    <div className={wrap}>
      <table className="w-full min-w-[680px] text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-[#252525]">
          <tr>
            <th className={stickyTh}>Joueur</th>
            <th className={`${thBase} text-right`} title="Points du pool">Pts</th>
            <th className={`${thBase} hidden md:table-cell`} title="Parties jouées">PJ</th>
            <th className={`${thBase} hidden sm:table-cell`} title="Buts">B</th>
            <th className={`${thBase} hidden sm:table-cell`} title="Aides">A</th>
            <th className={`${thBase} hidden md:table-cell`} title="Points (B+A)">PTS</th>
            <th className={`${thBase} hidden md:table-cell`} title="Différentiel">+/−</th>
            <th className={`${thBase} hidden lg:table-cell`} title="Punitions (min)">PUN</th>
            <th className={`${thBase} hidden lg:table-cell`} title="Tirs au but">T</th>
            <th className={`${thBase} hidden lg:table-cell`} title="Buts en avantage numérique">BAN</th>
            <th className={`${thBase}`}>Sal.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((p) => (
            <tr key={p.playerId} className="group hover:bg-gray-50 dark:hover:bg-[#252525]">
              <td className={stickyTd}><PlayerName p={p} /></td>
              <td className={ptsTd}>{fmtPts(p.fantasyPoints)}</td>
              <td className={`${tdNum} hidden md:table-cell`}>{p.gp}</td>
              <td className={`${tdNum} hidden sm:table-cell`}>{p.goals}</td>
              <td className={`${tdNum} hidden sm:table-cell`}>{p.assists}</td>
              <td className={`${tdNum} hidden md:table-cell`}>{p.points}</td>
              <td className={`${tdNum} hidden md:table-cell`}>{p.plusMinus > 0 ? `+${p.plusMinus}` : p.plusMinus}</td>
              <td className={`${tdNum} hidden lg:table-cell`}>{p.pim}</td>
              <td className={`${tdNum} hidden lg:table-cell`}>{p.shots}</td>
              <td className={`${tdNum} hidden lg:table-cell`}>{p.ppGoals}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtM(p.priceCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-200 bg-gray-50 text-xs dark:border-gray-700 dark:bg-[#252525]">
          <tr>
            <td className="sticky left-0 z-10 bg-gray-50 px-3 py-2 font-semibold text-gray-700 dark:bg-[#252525] dark:text-gray-200">Total</td>
            <td className="px-3 py-2 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100">{fmtPts(sum('fantasyPoints'))}</td>
            <td className="hidden px-3 py-2 md:table-cell"></td>
            <td className="hidden px-3 py-2 text-right tabular-nums text-gray-500 sm:table-cell">{sum('goals')}</td>
            <td className="hidden px-3 py-2 text-right tabular-nums text-gray-500 sm:table-cell">{sum('assists')}</td>
            <td className="hidden px-3 py-2 text-right tabular-nums text-gray-500 md:table-cell">{sum('points')}</td>
            <td className="hidden px-3 py-2 md:table-cell"></td>
            <td className="hidden px-3 py-2 lg:table-cell"></td>
            <td className="hidden px-3 py-2 lg:table-cell"></td>
            <td className="hidden px-3 py-2 lg:table-cell"></td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-700 dark:text-gray-200">{fmtM(sum('priceCents'))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function GoalieTable({ rows }: { rows: RosterPlayerStats[] }) {
  return (
    <div className={wrap}>
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-[#252525]">
          <tr>
            <th className={stickyTh}>Gardien</th>
            <th className={`${thBase}`} title="Points du pool">Pts</th>
            <th className={`${thBase} hidden md:table-cell`} title="Parties jouées">PJ</th>
            <th className={`${thBase} hidden sm:table-cell`} title="Victoires">V</th>
            <th className={`${thBase} hidden sm:table-cell`} title="Défaites">D</th>
            <th className={`${thBase} hidden lg:table-cell`} title="Défaites en prolongation">DP</th>
            <th className={`${thBase} hidden md:table-cell`} title="Moyenne de buts alloués">MOY</th>
            <th className={`${thBase} hidden md:table-cell`} title="Pourcentage d'arrêts">%ARR</th>
            <th className={`${thBase} hidden lg:table-cell`} title="Blanchissages">BL</th>
            <th className={`${thBase}`}>Sal.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((p) => (
            <tr key={p.playerId} className="group hover:bg-gray-50 dark:hover:bg-[#252525]">
              <td className={stickyTd}><PlayerName p={p} /></td>
              <td className={ptsTd}>{fmtPts(p.fantasyPoints)}</td>
              <td className={`${tdNum} hidden md:table-cell`}>{p.gp}</td>
              <td className={`${tdNum} hidden sm:table-cell`}>{p.wins}</td>
              <td className={`${tdNum} hidden sm:table-cell`}>{p.losses}</td>
              <td className={`${tdNum} hidden lg:table-cell`}>{p.otLosses}</td>
              <td className={`${tdNum} hidden md:table-cell`}>{gaa(p.goalsAgainst, p.toiSeconds)}</td>
              <td className={`${tdNum} hidden md:table-cell`}>{svPct(p.saves, p.shotsAgainst)}</td>
              <td className={`${tdNum} hidden lg:table-cell`}>{p.shutouts}</td>
              <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900 dark:text-gray-100">{fmtM(p.priceCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const POS_LABEL: Record<PoolPosition, string> = { F: 'Attaquants', D: 'Défenseurs', G: 'Gardiens' };

/** Renders the full roster as rich stat tables, grouped F / D / G. */
export function PoolRosterStats({ rows }: { rows: RosterPlayerStats[] }) {
  const f = rows.filter((r) => r.slotPosition === 'F');
  const d = rows.filter((r) => r.slotPosition === 'D');
  const g = rows.filter((r) => r.slotPosition === 'G');
  const section = (pos: PoolPosition, list: RosterPlayerStats[]) =>
    list.length === 0 ? null : (
      <section key={pos} className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{POS_LABEL[pos]}</h2>
        {pos === 'G' ? <GoalieTable rows={list} /> : <SkaterTable rows={list} />}
      </section>
    );
  return (
    <>
      {section('F', f)}
      {section('D', d)}
      {section('G', g)}
    </>
  );
}
