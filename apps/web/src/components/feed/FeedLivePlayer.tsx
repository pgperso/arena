'use client';

interface FeedLivePlayerProps {
  videoId: string;
  isLive: boolean;
}

export function FeedLivePlayer({ videoId, isLive }: FeedLivePlayerProps) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Badge */}
      <div className="absolute left-3 top-3 z-10">
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            EN DIRECT
          </span>
        ) : (
          <span className="rounded-full bg-gray-800/70 px-2.5 py-1 text-xs font-medium text-white">
            Replay
          </span>
        )}
      </div>

      {/* YouTube iframe — responsive 16:9 */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=${isLive ? 1 : 0}&rel=0&modestbranding=1`}
          title="Live"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}
