import { createClient } from '@/lib/supabase/server';
import { CommunityCard } from '@/components/community/CommunityCard';
import { AdBanner } from '@/components/ads/AdBanner';
import type { Database } from '@arena/supabase-client';

export const revalidate = 60;

type CommunityRow = Database['public']['Tables']['communities']['Row'];

export default async function HomePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('communities')
    .select('id, name, slug, description, member_count, primary_color, logo_url')
    .eq('is_active', true)
    .order('member_count', { ascending: false })
    .limit(100);

  const communities = (data ?? []) as CommunityRow[];

  return (
    <div className="relative flex min-h-[calc(100dvh_-_4rem)] items-center justify-center px-4 pb-28">
      <div className="w-full max-w-7xl">
        <div className="mb-10 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            Vos tribunes,{' '}
            <span className="text-red-600">votre opinion.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-900">
            Tes tribunes. Ton opinion. Ton équipe.
            <br />
            Tu veux jouer robuste ? On aime ça quand ça brasse.
          </p>
        </div>

        {communities.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
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
        ) : (
          <p className="text-center text-gray-500">
            Aucune tribune disponible pour le moment.
          </p>
        )}
      </div>

      {/* Ad pinned to bottom */}
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-4 py-2">
        <AdBanner slotId="home-footer" />
      </div>
    </div>
  );
}
