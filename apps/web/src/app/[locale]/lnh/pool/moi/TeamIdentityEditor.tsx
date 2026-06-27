'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { createClient } from '@/lib/supabase/client';
import { setIdentity } from '@/services/poolService';
import { TeamLogo } from '@/components/pool/TeamLogo';

export function TeamIdentityEditor({
  entryId, memberId, initialName, initialLogo,
}: {
  entryId: number;
  memberId: string;
  initialName: string;
  initialLogo: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Ce fichier n’est pas une image.'); return; }
    setUploading(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.2, maxWidthOrHeight: 256, useWebWorker: false, fileType: 'image/webp',
      });
      const supabase = createClient();
      // Subfolder keeps it separate from the profile avatar (which lives at the
      // member-id root and gets cleaned up on profile-avatar changes).
      const path = `${memberId}/pool/${Date.now()}.webp`;
      const { error } = await supabase.storage.from('avatars').upload(path, compressed, {
        contentType: 'image/webp', cacheControl: '31536000',
      });
      if (error) { toast.error('Échec du téléversement : ' + error.message); return; }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setLogo(data.publicUrl);
      toast.success('Logo téléversé');
    } finally {
      setUploading(false);
    }
  }

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
      <div className="mt-2 flex items-center gap-4">
        {/* Live preview — uploaded image, or the default initial monogram. */}
        <TeamLogo logo={logo} name={name || '?'} size={56} />
        <div className="flex flex-col gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-[#252525]"
          >
            {uploading ? 'Téléversement…' : 'Téléverser une image'}
          </button>
          {logo && (
            <button
              type="button"
              onClick={() => setLogo(null)}
              className="text-left text-xs text-gray-500 underline"
            >
              Utiliser l&apos;initiale par défaut
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={busy || uploading}
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
