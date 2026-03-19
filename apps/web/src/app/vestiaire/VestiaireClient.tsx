'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/Avatar';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

interface MemberProfile {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  description: string | null;
  created_at: string;
}

interface AdminStats {
  articles: number;
  drafts: number;
  podcasts: number;
}

interface VestiaireClientProps {
  member: MemberProfile | null;
  communities: CommunityRow[];
  roleMap: Record<number, string>;
  adminStats: Record<number, AdminStats>;
  userEmail: string;
}

export function VestiaireClient({
  member,
  communities,
  roleMap,
  adminStats,
  userEmail,
}: VestiaireClientProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(member?.description ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSaveDescription() {
    if (!member) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('members')
      .update({ description })
      .eq('id', member.id);
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (!member) {
    return (
      <div className="py-12 text-center text-gray-500">
        Profil introuvable.
      </div>
    );
  }

  const joinDate = new Date(member.created_at).toLocaleDateString('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <Avatar
            url={member.avatar_url}
            name={member.username}
            size="xl"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {member.username}
            </h1>
            <p className="text-sm text-gray-500">{userEmail}</p>
            <p className="mt-1 text-sm text-gray-400">
              Membre depuis le {joinDate}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-red-300 hover:text-red-600"
          >
            Déconnexion
          </button>
        </div>

        {/* Bio */}
        <div className="mt-4">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                rows={3}
                placeholder="Parlez-nous de vous..."
                maxLength={500}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDescription}
                  disabled={saving}
                  className="rounded-lg bg-brand-blue px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
                >
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setDescription(member.description ?? '');
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setEditing(true)}
              className="cursor-pointer rounded-lg p-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              {member.description || (
                <span className="italic text-gray-400">
                  Cliquez pour ajouter une description...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Communities */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Mes communautés
        </h2>
        {communities.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {communities.map((community) => {
              const role = roleMap[community.id];
              return (
                <Link
                  key={community.id}
                  href={`/communities/${community.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm"
                >
                  <Avatar
                    url={community.logo_url}
                    name={community.name}
                    size="lg"
                    color={community.primary_color}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-blue">
                        {community.name}
                      </h3>
                      {role && (
                        <span className="shrink-0 rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-medium text-brand-blue">
                          {role === 'admin' ? 'Admin' : 'Mod'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {community.member_count} membre
                      {community.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <svg
                    className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-brand-blue"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">
              Vous n&apos;avez rejoint aucune communauté.
            </p>
            <Link
              href="/"
              className="mt-3 inline-block text-sm font-medium text-brand-blue hover:underline"
            >
              Découvrir les communautés
            </Link>
          </div>
        )}
      </div>

      {/* Admin section */}
      {Object.keys(adminStats).length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Administration
          </h2>
          <div className="space-y-3">
            {communities
              .filter((c) => adminStats[c.id])
              .map((community) => {
                const stats = adminStats[community.id];
                const role = roleMap[community.id];
                return (
                  <div
                    key={`admin-${community.id}`}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Avatar
                        url={community.logo_url}
                        name={community.name}
                        size="sm"
                        color={community.primary_color}
                      />
                      <h3 className="text-sm font-semibold text-gray-900">{community.name}</h3>
                      <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-medium text-brand-blue">
                        {role === 'admin' ? 'Admin' : 'Mod'}
                      </span>
                    </div>
                    <div className="mb-3 flex gap-4 text-xs text-gray-500">
                      <span>{stats.articles} article{stats.articles !== 1 ? 's' : ''} publié{stats.articles !== 1 ? 's' : ''}</span>
                      <span>{stats.drafts} brouillon{stats.drafts !== 1 ? 's' : ''}</span>
                      <span>{stats.podcasts} podcast{stats.podcasts !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/communities/${community.slug}`}
                        className="rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
                      >
                        Gérer les articles
                      </Link>
                      <Link
                        href={`/communities/${community.slug}`}
                        className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:bg-orange-100"
                      >
                        Gérer les podcasts
                      </Link>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
