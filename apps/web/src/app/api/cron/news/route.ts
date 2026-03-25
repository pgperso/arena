import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NEWS_FEEDS, MAX_NEWS_PER_TRIBUNE, NEWS_EMOJI } from '@/lib/newsFeeds';

const BOT_ID = '00000000-0000-0000-0000-000000000001';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface RSSItem {
  title: string;
  link: string;
}

async function parseRSS(url: string): Promise<RSSItem[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: RSSItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        ?? block.match(/<title>(.*?)<\/title>/)?.[1]
        ?? '';
      const link = block.match(/<link>(.*?)<\/link>/)?.[1]
        ?? block.match(/<guid.*?>(.*?)<\/guid>/)?.[1]
        ?? '';
      if (title && link) {
        items.push({ title: title.trim(), link: link.trim() });
      }
    }
    return items;
  } catch {
    return [];
  }
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get community IDs by slug
  const { data: communities } = await supabaseAdmin
    .from('communities')
    .select('id, slug')
    .eq('is_active', true);

  if (!communities) {
    return NextResponse.json({ error: 'No communities' }, { status: 500 });
  }

  const slugToId: Record<string, number> = {};
  for (const c of communities) {
    slugToId[c.slug] = c.id;
  }

  // Get recent bot news messages to avoid duplicates (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentMessages } = await supabaseAdmin
    .from('chat_messages')
    .select('content')
    .eq('member_id', BOT_ID)
    .gte('created_at', since)
    .like('content', `${NEWS_EMOJI}%`);

  const postedLinks = new Set(
    (recentMessages ?? [])
      .map((m) => {
        const match = (m.content as string).match(/https?:\/\/[^\s]+/);
        return match ? match[0] : null;
      })
      .filter(Boolean),
  );

  let totalPosted = 0;

  for (const config of NEWS_FEEDS) {
    const communityId = slugToId[config.communitySlug];
    if (!communityId) continue;

    let posted = 0;

    for (const feed of config.feeds) {
      if (posted >= MAX_NEWS_PER_TRIBUNE) break;

      const items = await parseRSS(feed.url);

      for (const item of items) {
        if (posted >= MAX_NEWS_PER_TRIBUNE) break;
        if (postedLinks.has(item.link)) continue;
        if (!matchesKeywords(item.title, config.keywords)) continue;

        const content = `${NEWS_EMOJI} ${item.title} ${item.link}`;

        await supabaseAdmin.from('chat_messages').insert({
          community_id: communityId,
          member_id: BOT_ID,
          content,
        });

        postedLinks.add(item.link);
        posted++;
        totalPosted++;
      }
    }
  }

  return NextResponse.json({ success: true, posted: totalPosted });
}
