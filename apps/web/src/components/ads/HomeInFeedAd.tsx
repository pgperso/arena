'use client';

import { AdSlot } from './AdSlot';

interface HomeInFeedAdProps {
  index: number;
}

export function HomeInFeedAd({ index }: HomeInFeedAdProps) {
  return (
    <div className="col-span-full flex justify-center py-4">
      <AdSlot slotId={`home-infeed-${index}`} format="leaderboard" className="max-w-full" />
    </div>
  );
}
