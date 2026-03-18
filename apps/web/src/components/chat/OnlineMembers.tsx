'use client';

import type { PresenceMember } from '@/hooks/usePresence';

interface OnlineMembersProps {
  members: PresenceMember[];
}

export function OnlineMembers({ members }: OnlineMembersProps) {
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
            {members.map((member) => (
              <li key={member.memberId} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                <div className="relative">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.username}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-[10px] font-bold text-white">
                      {member.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                </div>
                <span className="truncate text-sm text-gray-700">{member.username}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
