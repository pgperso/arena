'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { PresenceMember } from '@/hooks/usePresence';
import { Avatar } from '@/components/ui/Avatar';
import { StatusDot } from '@/components/ui/StatusDot';

interface OnlineMembersProps {
  members: PresenceMember[];
}

export function OnlineMembers({ members }: OnlineMembersProps) {
  const t = useTranslations('tribune');
  const tr = useTranslations('roles');
  const botName = tr('bot');

  // Sort: online first, then idle
  const sorted = [...members].sort((a, b) => {
    if (a.status === 'online' && b.status === 'idle') return -1;
    if (a.status === 'idle' && b.status === 'online') return 1;
    return 0;
  });

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('membersOnline')}{' '}
          <span className="text-gray-400">({members.length + 1})</span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {/* Bot — always online */}
            <li className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <div className="relative">
                <Image
                  src="/images/fanstribune.webp"
                  alt={botName}
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
                <StatusDot status="online" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">{botName}</span>
                <span className="rounded-full bg-brand-blue px-1 py-px text-[8px] font-bold text-white">Bot</span>
              </div>
            </li>

            {sorted.map((member) => (
              <li key={member.memberId} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                <div className="relative">
                  <Avatar url={member.avatarUrl} name={member.username} size="sm" />
                  <StatusDot status={member.status} />
                </div>
                <span className={`truncate text-sm ${member.status === 'idle' ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {member.username}
                </span>
              </li>
            ))}
          </ul>
      </div>
    </div>
  );
}
