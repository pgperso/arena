import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';
import { BOT_MEMBER_ID } from '@arena/shared';

// ── Join announcements (already used in communityService) ──

const JOIN_ANNOUNCEMENTS = [
  (u: string, c: string) => `🏟️ ${u} débarque dans ${c} ! La foule est en délire !`,
  (u: string, c: string) => `🔥 ${u} vient de rejoindre ${c}. Ça va chauffer !`,
  (u: string, c: string) => `📢 Attention ! ${u} entre dans l'arène de ${c} !`,
  (u: string, c: string) => `💪 ${u} s'amène dans ${c}. Un de plus dans la tribune !`,
  (u: string, c: string) => `🎯 ${u} a rejoint ${c}. Bienvenue dans le vestiaire !`,
  (u: string, c: string) => `⚡ ${u} est maintenant dans ${c}. Let's go !`,
  (u: string, c: string) => `🏒 ${u} saute sur la glace de ${c} !`,
  (u: string, c: string) => `📣 ${u} prend place dans les estrades de ${c} !`,
  (u: string, c: string) => `🙌 ${u} rejoint la gang de ${c}. On est de plus en plus !`,
  (u: string, c: string) => `🚨 Nouveau fan alert ! ${u} est dans ${c} !`,
  (u: string, c: string) => `👊 ${u} embarque avec ${c}. Ça va brasser !`,
  (u: string, c: string) => `🎙️ ${u} a son siège dans ${c}. Fais-toi entendre !`,
  (u: string, c: string) => `🔔 ${u} vient d'arriver dans ${c}. La tribune s'agrandit !`,
  (u: string, c: string) => `💥 Boom ! ${u} est officiellement dans ${c} !`,
  (u: string, c: string) => `🏆 ${u} rejoint l'équipe de ${c}. Champion !`,
];

// ── Article announcements ──

const ARTICLE_ANNOUNCEMENTS = [
  (u: string, c: string, t: string) => `📰 Nouvel article dans ${c} : "${t}" par ${u}. À lire !`,
  (u: string, c: string, t: string) => `✍️ ${u} vient de publier "${t}" dans ${c}. Ça vaut le détour !`,
  (u: string, c: string, t: string) => `📝 "${t}" — nouvel article de ${u} dans ${c}. Allez voir ça !`,
  (u: string, c: string, t: string) => `🗞️ ${u} a écrit quelque chose dans ${c} : "${t}". Check ça !`,
  (u: string, c: string, t: string) => `💡 Nouvel article signé ${u} dans ${c} : "${t}"`,
];

// ── Podcast announcements ──

const PODCAST_ANNOUNCEMENTS = [
  (u: string, c: string, t: string) => `🎙️ Nouveau podcast dans ${c} : "${t}" par ${u}. Bonne écoute !`,
  (u: string, c: string, t: string) => `🎧 ${u} a sorti un nouveau podcast dans ${c} : "${t}"`,
  (u: string, c: string, t: string) => `🔊 "${t}" — nouveau podcast de ${u} dans ${c}. Montez le son !`,
  (u: string, c: string, t: string) => `📻 ${u} est au micro dans ${c} : "${t}". Écoutez ça !`,
  (u: string, c: string, t: string) => `🎤 Nouveau épisode dans ${c} ! "${t}" par ${u}`,
];

// ── Live announcements ──

const LIVE_ANNOUNCEMENTS = [
  (c: string, t: string) => `🔴 EN DIRECT dans ${c} : "${t}" — Rejoignez le live maintenant !`,
  (c: string, t: string) => `🔴 Ça commence ! "${t}" est en direct dans ${c} !`,
  (c: string, t: string) => `🔴 Live en cours dans ${c} : "${t}". Venez jaser en direct !`,
  (c: string, t: string) => `🔴 "${t}" — le live est parti dans ${c} ! On vous attend !`,
  (c: string, t: string) => `🔴 C'est live ! "${t}" dans ${c}. Manquez pas ça !`,
];

// ── Milestone announcements ──

const MILESTONE_ANNOUNCEMENTS = [
  (c: string, n: number) => `🎉 ${c} atteint ${n} membres ! La communauté grandit !`,
  (c: string, n: number) => `🙌 ${n} fans dans ${c} ! On lâche pas !`,
  (c: string, n: number) => `🏟️ ${c} a maintenant ${n} membres. L'arène se remplit !`,
  (c: string, n: number) => `🔥 ${n} dans ${c} ! Ça chauffe en estrade !`,
  (c: string, n: number) => `💪 ${c} vient de passer le cap des ${n} membres !`,
];

// ── Content promotions (existing articles/podcasts) ──

const ARTICLE_PROMOS = [
  (t: string) => `📖 T'as lu "${t}" ? C'est dans l'onglet Contenu. Check ça !`,
  (t: string) => `💡 Petit rappel : l'article "${t}" est dispo. Bonne lecture !`,
  (t: string) => `📰 Si t'as manqué "${t}", c'est encore là ! Va voir ça.`,
  (t: string) => `✍️ "${t}" — un article à (re)découvrir dans le contenu.`,
  (t: string) => `🗞️ Savais-tu qu'on a "${t}" dans nos articles ? Jette un oeil !`,
];

const PODCAST_PROMOS = [
  (t: string) => `🎧 T'as écouté "${t}" ? C'est dans les podcasts. Bonne écoute !`,
  (t: string) => `🎙️ Le podcast "${t}" est dispo. Monte le son !`,
  (t: string) => `🔊 Petit rappel : "${t}" est dans les podcasts. À écouter !`,
  (t: string) => `📻 Si t'as manqué "${t}", c'est encore là ! Va l'écouter.`,
  (t: string) => `🎤 "${t}" — un podcast à (re)découvrir !`,
];

const PROMO_CHANCE = 1; // always promote after a join

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Public API ──

/** Send bot message to ALL active tribunes via SECURITY DEFINER RPC */
async function broadcastBot(
  supabase: SupabaseClient<Database>,
  content: string,
) {
  const { data: allCommunities } = await supabase
    .from('communities')
    .select('id')
    .eq('is_active', true);

  if (!allCommunities) return;

  await Promise.all(
    (allCommunities as { id: number }[]).map((c) =>
      supabase.rpc('send_bot_message' as never, {
        p_community_id: c.id,
        p_content: content,
      } as never)
    )
  );
}

/** Send bot message to a SINGLE tribune via SECURITY DEFINER RPC */
async function sendBotToTribune(
  supabase: SupabaseClient<Database>,
  communityId: number,
  content: string,
) {
  await supabase.rpc('send_bot_message' as never, {
    p_community_id: communityId,
    p_content: content,
  } as never);
}

/** Announce a new member joined (broadcasts to ALL tribunes) */
export async function announceJoin(
  supabase: SupabaseClient<Database>,
  username: string,
  communityName: string,
) {
  const message = pick(JOIN_ANNOUNCEMENTS)(username, communityName);
  await broadcastBot(supabase, message);
}

/** Announce a new article published (broadcasts to ALL tribunes) */
export async function announceArticle(
  supabase: SupabaseClient<Database>,
  username: string,
  communityName: string,
  articleTitle: string,
) {
  const message = pick(ARTICLE_ANNOUNCEMENTS)(username, communityName, articleTitle);
  await broadcastBot(supabase, message);
}

/** Announce a new podcast published (broadcasts to ALL tribunes) */
export async function announcePodcast(
  supabase: SupabaseClient<Database>,
  username: string,
  communityName: string,
  podcastTitle: string,
) {
  const message = pick(PODCAST_ANNOUNCEMENTS)(username, communityName, podcastTitle);
  await broadcastBot(supabase, message);
}

/** Announce a live started (broadcasts to ALL tribunes) */
export async function announceLive(
  supabase: SupabaseClient<Database>,
  communityName: string,
  liveTitle: string,
) {
  const message = pick(LIVE_ANNOUNCEMENTS)(communityName, liveTitle);
  await broadcastBot(supabase, message);
}

/** Occasionally promote a random article or podcast from the community */
export async function promoteContent(
  supabase: SupabaseClient<Database>,
  communityId: number,
) {
  if (Math.random() > PROMO_CHANCE) return;

  // Pick randomly between article and podcast
  const type = Math.random() < 0.5 ? 'article' : 'podcast';

  if (type === 'article') {
    const { data } = await supabase
      .from('articles')
      .select('title')
      .eq('community_id', communityId)
      .eq('is_published', true)
      .eq('is_removed', false)
      .limit(20);

    const articles = data as { title: string }[] | null;
    if (articles && articles.length > 0) {
      const article = pick(articles);
      const message = pick(ARTICLE_PROMOS)(article.title);
      await sendBotToTribune(supabase, communityId, message);
    }
  } else {
    const { data } = await supabase
      .from('podcasts')
      .select('title')
      .eq('community_id', communityId)
      .eq('is_published', true)
      .or('is_removed.eq.false,is_removed.is.null')
      .limit(20);

    const podcasts = data as { title: string }[] | null;
    if (podcasts && podcasts.length > 0) {
      const podcast = pick(podcasts);
      const message = pick(PODCAST_PROMOS)(podcast.title);
      await sendBotToTribune(supabase, communityId, message);
    }
  }
}

/** Check and announce member milestone for a community */
export async function checkMilestone(
  supabase: SupabaseClient<Database>,
  communityId: number,
  communityName: string,
) {
  const { count } = await supabase
    .from('community_members')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId);

  if (count === null) return;

  // Check if current count hits a milestone
  if (MILESTONES.includes(count)) {
    const message = pick(MILESTONE_ANNOUNCEMENTS)(communityName, count);
    await broadcastBot(supabase, message);
  }
}
