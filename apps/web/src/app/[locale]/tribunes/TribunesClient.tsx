'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { JoinTribuneModal } from '@/components/community/JoinTribuneModal';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

interface TribunesClientProps {
  communities: CommunityRow[];
  userId: string;
  memberCommunityIds: number[];
}

export function TribunesClient({ communities, userId, memberCommunityIds }: TribunesClientProps) {
  const t = useTranslations('home');
  const tc = useTranslations('community');
  const [showJoinModal, setShowJoinModal] = useState(false);

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-4">
        {/* Header — sticky on mobile */}
        <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between bg-gray-50/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:mb-8 sm:mt-8 sm:bg-transparent sm:px-0 sm:py-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('myTribunes')}</h1>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-blue-dark"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('joinNewTribune')}
          </button>
        </div>

        {/* Tribunes list */}
        {communities.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Link
                key={community.id}
                href={`/tribunes/${community.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-blue/30 hover:shadow-md sm:p-5"
              >
                <Image
                  src={community.logo_url || '/images/fanstribune.webp'}
                  alt={community.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-lg object-contain"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-blue sm:text-base">
                    {community.name}
                  </h3>
                  <p className="text-xs text-gray-500 sm:text-sm">
                    {community.member_count} membre{community.member_count !== 1 ? 's' : ''}
                  </p>
                  {community.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-gray-400">{community.description}</p>
                  )}
                </div>
                <svg
                  className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-brand-blue"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16">
            <Image
              src="/images/fanstribune.webp"
              alt="La tribune des fans"
              width={48}
              height={48}
              className="mb-4 opacity-40"
            />
            <p className="mb-1 text-sm font-medium text-gray-500">{t('noTribunesYet')}</p>
            <p className="mb-6 text-xs text-gray-400">{t('discoverTribunes')}</p>
            <button
              onClick={() => setShowJoinModal(true)}
              className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue-dark"
            >
              {t('joinNewTribune')}
            </button>
          </div>
        )}
      </div>

      {showJoinModal && (
        <JoinTribuneModal
          userId={userId}
          memberCommunityIds={memberCommunityIds}
          onClose={() => setShowJoinModal(false)}
        />
      )}
    </div>
  );
}
