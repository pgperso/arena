'use client';

import { useRef } from 'react';
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
}

export function FeedImagePicker({ images, onAdd, onRemove, disabled }: FeedImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onAdd(e.target.files);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  }

  return (
    <div>
      {/* Image previews */}
      {images.length > 0 && (
        <div className="mb-2 flex gap-2 overflow-x-auto">
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

      {/* Add button */}
      {images.length < MAX_IMAGES_PER_MESSAGE && (
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
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            title="Ajouter des images"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Zm16.5-13.5h.008v.008h-.008V7.5Zm0 0a1.125 1.125 0 1 0-2.25 0 1.125 1.125 0 0 0 2.25 0Z"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
