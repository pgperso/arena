import { createClient } from '@/lib/supabase/server';
import { CommunityCard } from '@/components/community/CommunityCard';
import { AdBanner } from '@/components/ads/AdBanner';
import { Footer } from '@/components/layout/Footer';
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
    <div className="grid h-full grid-rows-[1fr_auto_auto] overflow-y-auto">
      {/* Centered group: hero + tribunes */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-7xl">
          <div className="mb-10 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              Vos tribunes,{' '}
              <span className="text-red-600">votre opinion.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-500">
              Rejoignez le chat de votre équipe préférée. Discutez en temps réel avec
              d&apos;autres fans, écoutez des podcasts exclusifs et vivez chaque moment ensemble.
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
                  primaryColor={community.primary_color}
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
      </div>

      {/* Ads outside the centered group */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-4">
        <AdBanner slotId="home-hero" />
        <AdBanner className="mt-4" slotId="home-footer" />
      </div>

      <Footer />
    </div>
  );
}
