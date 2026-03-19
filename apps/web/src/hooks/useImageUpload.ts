'use client';

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';
import { MAX_IMAGES_PER_MESSAGE, IMAGE_MAX_SIZE_BYTES } from '@arena/shared';

interface ImagePreview {
  id: string;
  file: File;
  previewUrl: string;
}

interface UseImageUploadReturn {
  images: ImagePreview[];
  uploading: boolean;
  addImages: (files: FileList) => Promise<void>;
  removeImage: (id: string) => void;
  clearImages: () => void;
  uploadAll: (communityId: number, memberId: string) => Promise<string[]>;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

async function validateMagicBytes(file: File): Promise<boolean> {
  const header = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(header);
  const expected = MAGIC_BYTES[file.type];
  if (!expected) return false;
  return expected.every((b, i) => bytes[i] === b);
}

export function useImageUpload(): UseImageUploadReturn {
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const supabaseRef = useRef(createClient());

  const addImages = useCallback(
    async (files: FileList) => {
      const remaining = MAX_IMAGES_PER_MESSAGE - images.length;
      if (remaining <= 0) return;

      const newImages: ImagePreview[] = [];
      for (let i = 0; i < Math.min(files.length, remaining); i++) {
        const file = files[i];
        if (!ALLOWED_TYPES.includes(file.type)) continue;
        if (file.size > IMAGE_MAX_SIZE_BYTES) continue;
        const valid = await validateMagicBytes(file);
        if (!valid) continue;

        newImages.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      setImages((prev) => [...prev, ...newImages]);
    },
    [images.length],
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearImages = useCallback(() => {
    setImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      return [];
    });
  }, []);

  const uploadAll = useCallback(
    async (communityId: number, memberId: string): Promise<string[]> => {
      if (images.length === 0) return [];

      setUploading(true);
      const urls: string[] = [];

      for (const img of images) {
        // Compress image
        const compressed = await imageCompression(img.file, {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/webp',
        });

        const timestamp = Date.now();
        const path = `${communityId}/${memberId}/${timestamp}_${img.id}.webp`;

        const { error } = await supabaseRef.current.storage
          .from('chat-images')
          .upload(path, compressed, {
            contentType: 'image/webp',
            cacheControl: '31536000',
          });

        if (!error) {
          const {
            data: { publicUrl },
          } = supabaseRef.current.storage.from('chat-images').getPublicUrl(path);
          urls.push(publicUrl);
        }
      }

      setUploading(false);
      return urls;
    },
    [images],
  );

  return { images, uploading, addImages, removeImage, clearImages, uploadAll };
}
