'use client';

import { useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import imageCompression from 'browser-image-compression';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

interface UseAvatarUploadReturn {
  uploading: boolean;
  uploadAvatar: (file: File, memberId: string) => Promise<string | null>;
}

export function useAvatarUpload(): UseAvatarUploadReturn {
  const [uploading, setUploading] = useState(false);
  const supabase = useSupabase();

  const uploadAvatar = useCallback(async (file: File, memberId: string): Promise<string | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) return null;
    if (file.size > MAX_SIZE) return null;

    setUploading(true);

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true,
        fileType: 'image/webp',
      });

      const path = `${memberId}/${Date.now()}.webp`;

      // Delete old avatars (only files at root, not subfolders like /creator)
      const { data: existing } = await supabase.storage
        .from('avatars')
        .list(memberId);

      if (existing && existing.length > 0) {
        const files = existing.filter((f) => f.name.includes('.'));
        if (files.length > 0) {
          await supabase.storage.from('avatars').remove(files.map((f) => `${memberId}/${f.name}`));
        }
      }

      // Upload new avatar
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });

      if (error) return null;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Update member profile
      await supabase
        .from('members')
        .update({ avatar_url: publicUrl })
        .eq('id', memberId);

      return publicUrl;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploading, uploadAvatar };
}
