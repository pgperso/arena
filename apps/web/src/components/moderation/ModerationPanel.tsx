'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { RESTRICTION_DISPLAY_NAMES } from '@arena/shared';
import {
  findMemberByUsername,
  checkCommunityMembership,
  applyRestriction,
  removeRestriction as removeRestrictionApi,
  fetchRestrictions,
} from '@/services/moderationService';

interface Restriction {
  id: number;
  member_id: string;
  restriction_type: string;
  reason: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
  member_username?: string;
}

interface ModerationPanelProps {
  communityId: number;
  onClose: () => void;
}

export function ModerationPanel({ communityId, onClose }: ModerationPanelProps) {
  const supabase = useSupabase();
  const [activeTab, setActiveTab] = useState<'restrict' | 'active'>('restrict');
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(false);

  // New restriction form
  const [targetUsername, setTargetUsername] = useState('');
  const [restrictionType, setRestrictionType] = useState('chat:mute');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('permanent');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Escape key to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const loadRestrictions = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchRestrictions(supabase, communityId);

    if (data) {
      setRestrictions(
        (data as (Restriction & { members: { username: string } | null })[]).map((r) => ({
          ...r,
          member_username: r.members?.username ?? 'Inconnu',
        })),
      );
    }
    setLoading(false);
  }, [supabase, communityId]);

  useEffect(() => {
    if (activeTab === 'active') {
      loadRestrictions();
    }
  }, [activeTab, loadRestrictions]);

  async function handleSubmit() {
    if (!targetUsername.trim()) {
      setError("Nom d'utilisateur requis");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    // Find member by username
    const { data: member } = await findMemberByUsername(supabase, targetUsername.trim());

    if (!member) {
      setError('Utilisateur introuvable');
      setSubmitting(false);
      return;
    }

    const memberId = (member as { id: string }).id;

    // Check if member is part of the community
    const { data: membership } = await checkCommunityMembership(supabase, communityId, memberId);

    if (!membership) {
      setError("Cet utilisateur n'est pas membre de la communauté");
      setSubmitting(false);
      return;
    }

    // Validate restriction type
    const validTypes = ['chat:mute', 'community:ban'];
    if (!validTypes.includes(restrictionType)) {
      setError('Type de restriction invalide');
      setSubmitting(false);
      return;
    }

    // Calculate end time
    const validDurations = ['1', '24', '168', '720', 'permanent'];
    if (!validDurations.includes(duration)) {
      setError('Durée invalide');
      setSubmitting(false);
      return;
    }

    let endsAt: string | null = null;
    if (duration !== 'permanent') {
      const now = new Date();
      const hours = parseInt(duration, 10);
      now.setHours(now.getHours() + hours);
      endsAt = now.toISOString();
    }

    const { error: insertError } = await applyRestriction(supabase, {
      communityId,
      memberId,
      restrictionType,
      reason: reason.trim() || null,
      endsAt,
    });

    if (insertError) {
      console.error('Restriction error:', insertError);
      setError("Impossible d'appliquer la restriction. Veuillez réessayer.");
    } else {
      setSuccess(`Restriction appliquée à @${targetUsername}`);
      setTargetUsername('');
      setReason('');
    }
    setSubmitting(false);
  }

  async function handleRemoveRestriction(restrictionId: number) {
    const { error: removeError } = await removeRestrictionApi(supabase, restrictionId);
    if (removeError) {
      setError('Impossible de retirer la restriction');
      return;
    }
    setRestrictions((prev) => prev.filter((r) => r.id !== restrictionId));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Modération</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('restrict')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'restrict'
                ? 'border-b-2 border-brand-blue text-brand-blue'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Restreindre
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'active'
                ? 'border-b-2 border-brand-blue text-brand-blue'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Restrictions actives
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {activeTab === 'restrict' && (
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              {success && (
                <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Utilisateur</label>
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="Nom d'utilisateur"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Type de restriction</label>
                <select
                  value={restrictionType}
                  onChange={(e) => setRestrictionType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
                >
                  <option value="chat:mute">Muter (chat)</option>
                  <option value="community:ban">Bannir (communauté)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Durée</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
                >
                  <option value="1">1 heure</option>
                  <option value="24">24 heures</option>
                  <option value="168">7 jours</option>
                  <option value="720">30 jours</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Raison (optionnel)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Raison de la restriction..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-lg bg-red-600 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Application...' : 'Appliquer la restriction'}
              </button>
            </div>
          )}

          {activeTab === 'active' && (
            <div>
              {loading ? (
                <div className="py-8 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
                </div>
              ) : restrictions.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">Aucune restriction active</p>
              ) : (
                <div className="space-y-3">
                  {restrictions.map((r) => {
                    const isExpired = r.ends_at && new Date(r.ends_at) < new Date();
                    return (
                      <div
                        key={r.id}
                        className={`rounded-lg border p-3 ${isExpired ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              @{r.member_username}
                            </span>
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.restriction_type === 'community:ban'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {RESTRICTION_DISPLAY_NAMES[r.restriction_type] ?? r.restriction_type}
                            </span>
                            {isExpired && (
                              <span className="ml-1 text-xs text-gray-400">(expirée)</span>
                            )}
                          </div>
                          {!isExpired && (
                            <button
                              onClick={() => handleRemoveRestriction(r.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Retirer
                            </button>
                          )}
                        </div>
                        {r.reason && (
                          <p className="mt-1 text-xs text-gray-500">Raison: {r.reason}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {r.ends_at
                            ? `Expire le ${new Date(r.ends_at).toLocaleDateString('fr-FR')}`
                            : 'Permanent'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
