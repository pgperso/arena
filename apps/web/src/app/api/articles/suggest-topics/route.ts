import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { fetchRecentNews } from '@/lib/newsSearch';

export async function POST(request: Request) {
  try {
    // Authenticate
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { communityName } = await request.json();
    const topic = (communityName ?? 'sport').trim();

    // Fetch recent news for the community topic
    const news = await fetchRecentNews(topic);
    if (news === null || news.length === 0) {
      return NextResponse.json(
        { error: 'Aucune nouvelle récente trouvée. Réessayez.' },
        { status: 503 },
      );
    }

    const newsContext = news.map((n, i) => `${i + 1}. ${n.title} (${n.pubDate})`).join('\n');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Voici les nouvelles récentes pour "${topic}" :

${newsContext}

Propose exactement 4 angles d'article d'opinion sportive en français québécois.
Pour chaque angle, donne un titre accrocheur et une description de 1-2 phrases de l'angle éditorial.
Choisis les sujets les plus intéressants, controversés ou d'actualité brûlante.

Réponds UNIQUEMENT en JSON valide :
[
  {"title":"Titre accrocheur","description":"Description de l'angle","topic":"mots-clés pour recherche"},
  ...
]
N'utilise PAS de guillemets doubles dans le texte, utilise « » à la place.`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 });
    }

    let str = textBlock.text.trim();
    if (str.startsWith('```')) {
      str = str.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    // Extract array
    const arrMatch = str.match(/\[[\s\S]*\]/);
    if (!arrMatch) {
      return NextResponse.json({ error: 'Format invalide. Réessayez.' }, { status: 500 });
    }

    let topics: { title: string; description: string; topic: string }[];
    try {
      topics = JSON.parse(arrMatch[0]);
    } catch {
      return NextResponse.json({ error: 'Format invalide. Réessayez.' }, { status: 500 });
    }

    // Validate
    const valid = topics
      .filter((t) => t.title && t.description && t.topic)
      .slice(0, 4);

    if (valid.length === 0) {
      return NextResponse.json({ error: 'Aucun sujet trouvé. Réessayez.' }, { status: 500 });
    }

    return NextResponse.json({ topics: valid });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
