'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { setIdentity, type NhlTeamOption } from '@/services/poolService';

export function TeamIdentityEditor({
  entryId, initialName, initialLogo, teams,
}: {
  entryId: number;
  initialName: string;
  initialLogo: string | null;
  teams: NhlTeamOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) { toast.error("Le nom d'équipe est requis"); return; }
    setBusy(true);
    const { error } = await setIdentity(createClient(), entryId, name.trim(), logo);
    setBusy(false);
    if (error) { toast.error(error); return; }
    toast.success('Identité enregistrée');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm font-medium text-gray-600 underline dark:text-gray-300">
        Modifier le nom / logo
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom de l&apos;équipe</label>
      <input
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-[#252525]"
      />

      <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Logo</p>
      <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-8">
        <button
          onClick={() => setLogo(null)}
          className={`flex h-10 items-center justify-center rounded-md border text-xs ${logo === null ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900' : 'border-gray-200 text-gray-400 dark:border-gray-700'}`}
          title="Aucun logo"
        >
          —
        </button>
        {teams.map((t) => (
          <button
            key={t.abbrev}
            onClick={() => setLogo(t.logoUrl)}
            title={t.name}
            className={`flex h-10 items-center justify-center rounded-md border p-1 ${logo === t.logoUrl ? 'border-gray-900 ring-2 ring-gray-900 dark:border-white dark:ring-white' : 'border-gray-200 hover:border-gray-400 dark:border-gray-700'}`}
          >
            {t.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.logoUrl} alt={t.name} className="h-7 w-7 object-contain" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={busy}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900">
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button onClick={() => setOpen(false)} disabled={busy}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600">
          Annuler
        </button>
      </div>
    </div>
  );
}
