'use client';

import { memo, useState, useEffect } from 'react';
import Image from 'next/image';

interface FeedImageGalleryProps {
  imageUrls: string[];
}

export const FeedImageGallery = memo(function FeedImageGallery({ imageUrls }: FeedImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const count = imageUrls.length;

  if (count === 0) return null;

  function getGridClass(): string {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-2';
    return 'grid-cols-2';
  }

  function getAspect(index: number): string {
    if (count === 1) return 'aspect-[16/10]';
    if (count === 3 && index === 0) return 'row-span-2 aspect-auto h-full';
    return 'aspect-square';
  }

  function getContainerHeight(): string {
    if (count === 1) return 'max-h-[350px]';
    if (count === 2) return 'max-h-[250px]';
    return 'max-h-[300px]';
  }

  return (
    <>
      <div className={`mt-2 grid ${getGridClass()} ${getContainerHeight()} gap-1 overflow-hidden rounded-xl max-w-[420px]`}>
        {imageUrls.map((url, i) => (
          <button
            key={url}
            onClick={() => setLightboxIndex(i)}
            className={`relative overflow-hidden ${getAspect(i)} cursor-pointer`}
            aria-label={`Voir l'image ${i + 1} en plein écran`}
          >
            <Image
              src={url}
              alt={`Image ${i + 1}`}
              fill
              loading="lazy"
              className="object-cover transition hover:scale-105"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </button>
        ))}
      </div>

      {/* Lightbox with keyboard support */}
      <LightboxKeyHandler
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onPrev={() => setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
        onNext={() => setLightboxIndex((prev) => (prev !== null && prev < imageUrls.length - 1 ? prev + 1 : prev))}
      />
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-label="Visionneuse d'images"
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 text-2xl text-white hover:text-gray-300"
            aria-label="Fermer"
          >
            &times;
          </button>
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
              className="absolute left-4 text-3xl text-white hover:text-gray-300"
            >
              &lsaquo;
            </button>
          )}
          {lightboxIndex < imageUrls.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
              className="absolute right-4 text-3xl text-white hover:text-gray-300"
            >
              &rsaquo;
            </button>
          )}
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={imageUrls[lightboxIndex]}
              alt={`Image ${lightboxIndex + 1}`}
              width={1920}
              height={1080}
              className="max-h-[90vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
});

function LightboxKeyHandler({
  isOpen,
  onClose,
  onPrev,
  onNext,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, onPrev, onNext]);

  return null;
}
