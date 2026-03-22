'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X } from 'lucide-react';
import { getMemberRank, ROLE_DISPLAY_NAMES } from '@arena/shared';
import { useSupabase } from '@/hooks/useSupabase';
import { assignRole, removeRole } from '@/services/moderationService';
import { Avatar } from './Avatar';

interface UserPopoverProps {
  memberId: string;
  username: string;
  avatarUrl?: string | null;
  messageCount: number;
  communityId: number;
  /** Current staff role code (owner/admin/moderator) or undefined */
  currentRole?: string;
  /** Whether the viewer can manage roles (is owner) */
  canManageRoles: boolean;
  anchorRect: DOMRect;
  onClose: () => void;
  onRoleChanged?: (memberId: string, newRole: string | null) => void;
}

const ASSIGNABLE_ROLES = [
  { code: 'owner', label: 'Propriétaire', color: 'text-yellow-500', desc: 'Accès total, toutes tribunes' },
  { code: 'admin', label: 'Arbitre', color: 'text-red-500', desc: 'Modération de cette tribune' },
] as const;

export function UserPopover({
  memberId,
  username,
  avatarUrl,
  messageCount,
  communityId,
  currentRole,
  canManageRoles,
  anchorRect,
  onClose,
  onRoleChanged,
}: UserPopoverProps) {
  const supabase = useSupabase();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState(currentRole ?? null);

  const rank = getMemberRank(messageCount);
  const displayRole = activeRole ? ROLE_DISPLAY_NAMES[activeRole] ?? activeRole : null;

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const handleAssignRole = useCallback(async (roleCode: string) => {
    setSaving(true);
    setError(null);
    const { error: err } = await assignRole(supabase, {
      communityId,
      memberId,
      roleCode,
    });
    if (err) {
      setError(typeof err === 'object' && 'message' in err ? err.message : 'Erreur');
    } else {
      setActiveRole(roleCode);
      onRoleChanged?.(memberId, roleCode);
    }
    setSaving(false);
  }, [supabase, communityId, memberId, onRoleChanged]);

  const handleRemoveRole = useCallback(async () => {
    setSaving(true);
    setError(null);
    const { error: err } = await removeRole(supabase, { communityId, memberId });
    if (err) {
      setError('Erreur');
    } else {
      setActiveRole(null);
      onRoleChanged?.(memberId, null);
    }
    setSaving(false);
  }, [supabase, communityId, memberId, onRoleChanged]);

  // Position: below the anchor, clamped to viewport
  const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 320);
  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 280));

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-50 w-[268px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
      style={{ top, left }}
    >
      {/* Header */}
      <div className="relative bg-gray-900 px-4 pb-10 pt-4">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full p-1 text-gray-400 transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Avatar overlapping header */}
      <div className="-mt-8 px-4">
        <div className="rounded-full border-4 border-white">
          <Avatar url={avatarUrl} name={username} size="xl" />
        </div>
      </div>

      {/* User info */}
      <div className="px-4 pb-3 pt-2">
        <h3 className="text-sm font-bold text-gray-900">{username}</h3>
        <div className="mt-0.5 flex items-center gap-2">
          <span className={`text-xs font-semibold ${rank.color}`}>{rank.label}</span>
          {displayRole && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
              {displayRole}
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-gray-400">{messageCount} messages</p>
      </div>

      {/* Role management (owners only) */}
      {canManageRoles && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <Shield className="h-3.5 w-3.5" />
            Gérer le rôle
          </div>

          {error && (
            <p className="mb-2 text-xs text-red-500">{error}</p>
          )}

          <div className="space-y-1">
            {ASSIGNABLE_ROLES.map((role) => (
              <button
                key={role.code}
                onClick={() => handleAssignRole(role.code)}
                disabled={saving || activeRole === role.code}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeRole === role.code
                    ? 'bg-gray-100 font-medium text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                <div>
                  <span className={`font-medium ${role.color}`}>{role.label}</span>
                  <p className="text-[10px] text-gray-400">{role.desc}</p>
                </div>
                {activeRole === role.code && (
                  <span className="text-[10px] font-bold text-green-500">Actif</span>
                )}
              </button>
            ))}

            {/* Remove role button */}
            {activeRole && (
              <button
                onClick={handleRemoveRole}
                disabled={saving}
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                Retirer le rôle
              </button>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
