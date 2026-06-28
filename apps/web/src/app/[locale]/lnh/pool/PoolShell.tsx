import type { ReactNode } from 'react';
import { AdSidebar } from '@/components/ads/AdSidebar';
import { AdAnchor } from '@/components/ads/AdAnchor';

type Width = 'prose' | 'standings' | 'wide';

// Text wants ~65ch; tables want room. Wide-table pages widen the track and
// keep prose narrow inside (see usage).
const MAX_W: Record<Width, string> = {
  prose: 'max-w-3xl',
  standings: 'max-w-4xl',
  wide: 'max-w-5xl 2xl:max-w-6xl',
};

/**
 * Shared 3-column shell for all pool pages: [ad left] | content | [ad right]
 * + mobile anchor. Wide-table pages pass leftAd={false} to reclaim ~190px at
 * xl (the left skyscraper is the lowest-value unit).
 */
export function PoolShell({
  children,
  width = 'prose',
  leftAd = true,
}: {
  children: ReactNode;
  width?: Width;
  leftAd?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 overflow-hidden border-t border-gray-200 dark:border-gray-700">
        {leftAd && <AdSidebar position="left" />}
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
          <div className={`mx-auto w-full ${MAX_W[width]} px-4 py-8`}>{children}</div>
        </main>
        <AdSidebar position="right" />
      </div>
      <AdAnchor />
    </div>
  );
}
