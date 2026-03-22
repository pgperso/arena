'use client';

import type { PresenceMember } from '@/hooks/usePresence';
import { Avatar } from '@/components/ui/Avatar';
import { StatusDot } from '@/components/ui/StatusDot';

interface OnlineMembersProps {
  members: PresenceMember[];
}

export function OnlineMembers({ members }: OnlineMembersProps) {
  // Sort: online first, then idle
  const sorted = [...members].sort((a, b) => {
    if (a.status === 'online' && b.status === 'idle') return -1;
    if (a.status === 'idle' && b.status === 'online') return 1;
    return 0;
  });

  return (
    <div className="flex flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          En ligne{' '}
          <span className="text-gray-400">({members.length})</span>
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {members.length === 0 ? (
          <p className="text-center text-xs text-gray-400">Aucun membre en ligne</p>
        ) : (
          <ul className="space-y-1">
            {sorted.map((member) => (
              <li key={member.memberId} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                <div className="relative">
                  <Avatar url={member.avatarUrl} name={member.username} size="sm" />
                  <StatusDot status={member.status} />
                </div>
                <span className={`truncate text-sm ${member.status === 'idle' ? 'text-gray-400' : 'text-gray-700'}`}>
                  {member.username}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
