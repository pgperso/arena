'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useSupabase } from '@/hooks/useSupabase';
import { leaveCommunity } from '@/services/communityService';
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
  const tco = useTranslations('common');
  const router = useRouter();
  const supabase = useSupabase();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState<CommunityRow | null>(null);
  const [leaving, setLeaving] = useState(false);

  async function handleLeave(community: CommunityRow) {
    setLeaving(true);
    const { error } = await leaveCommunity(supabase, community.id, userId);
    if (!error) {
      router.refresh();
    }
    setLeaving(false);
    setLeaveConfirm(null);
  }

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
              <div
                key={community.id}
                className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"
              >
                <div className="mb-3 flex items-center gap-3">
                  <Image
                    src={community.logo_url || '/images/fanstribune.webp'}
                    alt={community.name}
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-lg object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900 sm:text-base">
                      {community.name}
                    </h3>
                    <p className="text-xs text-gray-500 sm:text-sm">
                      {community.member_count} membre{community.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {community.description && (
                  <p className="mb-3 line-clamp-2 text-xs text-gray-400">{community.description}</p>
                )}
                <div className="flex gap-2">
                  <Link
                    href={`/tribunes/${community.slug}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-dark"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                    {tc('join')}
                  </Link>
                  <button
                    onClick={() => setLeaveConfirm(community)}
                    title={tc('leave')}
                    className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-gray-400 transition hover:border-red-500 hover:bg-red-500 hover:text-white"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                    </svg>
                  </button>
                </div>
              </div>
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

      {/* Leave confirmation modal */}
      {leaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-bold text-gray-900">
              {tc('leaveTitle', { name: leaveConfirm.name })}
            </h3>
            <p className="mb-5 text-sm text-gray-500">
              {tc('leaveMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLeaveConfirm(null)}
                disabled={leaving}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {tco('cancel')}
              </button>
              <button
                onClick={() => handleLeave(leaveConfirm)}
                disabled={leaving}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {leaving ? tco('loading') : tc('leave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
