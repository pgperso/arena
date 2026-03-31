'use client';

import { useState } from 'react';
import type { LinkPreview } from '@arena/shared';

interface FeedLinkPreviewProps {
  previews: LinkPreview[];
}

export function FeedLinkPreview({ previews }: FeedLinkPreviewProps) {
  if (!previews || previews.length === 0) return null;

  return (
    <div className="mt-2 flex max-w-md flex-col gap-2">
      {previews.map((preview, idx) => (
        <PreviewCard key={idx} preview={preview} />
      ))}
    </div>
  );
}

function PreviewCard({ preview }: { preview: LinkPreview }) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#272525] transition hover:border-gray-300 dark:hover:border-gray-600"
    >
      {preview.image && !imgError && (
        <div className="overflow-hidden bg-gray-100 dark:bg-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.image}
            alt={preview.title || ''}
            className="h-36 w-full object-cover transition group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      )}
      <div className="p-3">
        <p className="mb-0.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
          {preview.domain}
        </p>
        {preview.title && (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-brand-blue">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
