import { createClient } from '@/lib/supabase/server';
import { CommunityCard } from '@/components/community/CommunityCard';
import type { Database } from '@arena/supabase-client';

type CommunityRow = Database['public']['Tables']['communities']['Row'];

export default async function HomePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('communities')
    .select('*')
    .eq('is_active', true)
    .order('member_count', { ascending: false });

  const communities = (data ?? []) as CommunityRow[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          Votre communauté sportive,{' '}
          <span className="text-brand-blue">en direct.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-500">
          Rejoignez le chat de votre équipe préférée. Discutez en temps réel avec
          d&apos;autres fans, écoutez des podcasts exclusifs et vivez chaque moment ensemble.
        </p>
      </div>

      {/* Communities */}
      <div className="mb-8">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">Communautés</h2>
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
            Aucune communauté disponible pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
