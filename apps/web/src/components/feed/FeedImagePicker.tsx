'use client';

import { useRef } from 'react';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import { MAX_IMAGES_PER_MESSAGE } from '@arena/shared';

interface ImagePreview {
  id: string;
  previewUrl: string;
}

interface FeedImagePickerProps {
  images: ImagePreview[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  buttonOnly?: boolean;
}

export function FeedImagePicker({ images, onAdd, onRemove, disabled, buttonOnly }: FeedImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onAdd(e.target.files);
      e.target.value = '';
    }
  }

  // Button-only mode: just the + trigger inside the input bar
  if (buttonOnly) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleChange}
          className="hidden"
        />
        <button
          onClick={handleClick}
          disabled={disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-l-lg text-gray-400 transition hover:text-gray-600 disabled:opacity-50"
          title="Ajouter des images"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </button>
      </>
    );
  }

  // Preview mode: show image thumbnails
  return (
    <div>
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img) => (
            <div key={img.id} className="relative flex-shrink-0">
              <Image
                src={img.previewUrl}
                alt="Aperçu"
                width={80}
                height={80}
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                onClick={() => onRemove(img.id)}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-xs text-white hover:bg-red-600"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < MAX_IMAGES_PER_MESSAGE && images.length > 0 && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleChange}
            className="hidden"
          />
          <button
            onClick={handleClick}
            disabled={disabled}
            className="mt-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 disabled:opacity-50"
            title="Ajouter plus d'images"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  );
}
