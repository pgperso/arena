'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CommunityCard } from './CommunityCard';
import { JoinTribuneModal } from './JoinTribuneModal';

interface Community {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  member_count: number;
  logo_url: string | null;
}

interface CommunityGridProps {
  communities: Community[];
}

export function CommunityGrid({ communities }: CommunityGridProps) {
  const { user } = useAuth();
  const t = useTranslations('home');
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set());
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setJoinedIds(new Set());
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    supabase
      .from('community_members')
      .select('community_id')
      .eq('member_id', user.id)
      .limit(500)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setJoinedIds(new Set(data.map((m) => m.community_id)));
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const joined = communities.filter((c) => joinedIds.has(c.id));
  const router = useRouter();

  function handleJoinClick() {
    if (!user) {
      router.push('/login');
      return;
    }
    setShowJoinModal(true);
  }

  return (
    <div>
      {/* Mes tribunes */}
      {joined.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{t('myTribunes')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {joined.map((community) => (
              <CommunityCard
                key={community.id}
                name={community.name}
                slug={community.slug}
                description={community.description}
                memberCount={community.member_count}
                logoUrl={community.logo_url}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rejoindre une tribune — redirects to login if not connected */}
      <div className="flex justify-center">
        <button
          onClick={handleJoinClick}
          className="flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-blue-dark"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('joinTribune')}
        </button>
      </div>

      {showJoinModal && (
        <JoinTribuneModal
          userId={user?.id ?? null}
          memberCommunityIds={Array.from(joinedIds)}
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </div>
  );
}
