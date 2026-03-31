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

function isXTwitter(domain: string): boolean {
  return domain === 'x.com' || domain === 'twitter.com';
}

function extractXHandle(url: string): string | null {
  const match = url.match(/(?:x\.com|twitter\.com)\/(@?[\w]+)/i);
  if (match && !['home', 'search', 'explore', 'settings', 'i'].includes(match[1].toLowerCase())) {
    return '@' + match[1].replace(/^@/, '');
  }
  return null;
}

function PreviewCard({ preview }: { preview: LinkPreview }) {
  const [imgError, setImgError] = useState(false);
  const isX = isXTwitter(preview.domain);
  const xHandle = isX ? extractXHandle(preview.url) : null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#272525] transition hover:border-gray-300 dark:hover:border-gray-600"
    >
      {/* X/Twitter: branded header with author */}
      {isX && (
        <div className="flex items-center gap-2 bg-black px-3 py-2">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          {xHandle && (
            <span className="text-sm font-semibold text-white">{xHandle}</span>
          )}
        </div>
      )}

      {/* Image (non-X links) */}
      {!isX && preview.image && !imgError && (
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
        {!isX && (
          <p className="mb-0.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
            {preview.domain}
          </p>
        )}
        {preview.title && !isX && (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-brand-blue">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className={`text-xs text-gray-500 dark:text-gray-400 line-clamp-3 ${isX ? 'text-sm text-gray-700 dark:text-gray-300' : 'mt-1 line-clamp-2'}`}>
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
}
