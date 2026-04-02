import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { fetchRecentNews } from '@/lib/newsSearch';

// In-memory rate limit: userId -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max generations per window
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const MAX_TOPIC_LENGTH = 200;
const MAX_INSTRUCTIONS_LENGTH = 500;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

function sanitizeInput(input: string, maxLength: number): string {
  return input.trim().slice(0, maxLength);
}

export async function POST(request: Request) {
  try {
    // Authenticate
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Rate limit
    const { allowed, remaining } = checkRateLimit(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Limite atteinte (10/heure). Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': '3600' } },
      );
    }

    const body = await request.json();
    const topic = sanitizeInput(body.topic ?? '', MAX_TOPIC_LENGTH);
    const instructions = sanitizeInput(body.instructions ?? '', MAX_INSTRUCTIONS_LENGTH);
    const communityName = sanitizeInput(body.communityName ?? '', 100);
    const authorStyle = typeof body.authorStyle === 'string' ? body.authorStyle.slice(0, 500) : '';
    const authorName = sanitizeInput(body.authorName ?? '', 100);

    if (topic.length < 2) {
      return NextResponse.json({ error: 'Sujet requis (min 2 caractères)' }, { status: 400 });
    }

    // Fetch recent news
    const news = await fetchRecentNews(topic);
    if (news === null) {
      return NextResponse.json(
        { error: 'Service de nouvelles temporairement indisponible. Réessayez.' },
        { status: 503 },
      );
    }

    const newsContext = news.length > 0
      ? news.map((n, i) => `${i + 1}. ${n.title} (${n.pubDate}) — ${n.link}`).join('\n')
      : `Aucune nouvelle trouvée. Écris un article général sur : ${topic}`;

    // Call Claude Haiku
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `Tu es un chroniqueur sportif québécois pour la tribune "${communityName || 'sportive'}".
${authorStyle ? `\nTu écris sous le pseudonyme "${authorName}". Ton style : ${authorStyle}\nAdapte TOUT l'article à ce style et cette personnalité.\n` : ''}
Écris un article d'opinion original basé sur ces nouvelles récentes :

${newsContext}

RÈGLES :
- Écris en français québécois naturel, ton éditorial/chronique (pas un article encyclopédique)
- Ne copie JAMAIS mot pour mot les titres ou le contenu des sources
- N'INVENTE JAMAIS de citations, statistiques, scores ou faits précis que tu ne peux pas confirmer à partir des titres fournis. Si tu n'es pas certain d'un fait, ne l'inclus pas ou précise que c'est à vérifier.
- Donne ton opinion, analyse, mets du contexte
- 400-600 mots
- HTML compatible TipTap : utilise <p>, <h2>, <h3>, <strong>, <em>, <ul>, <li>, <blockquote>
- PAS de <h1> (le titre est séparé)
- PAS de balises <html>, <head>, <body>
- À la fin de l'article, ajoute une section "Sources" avec les liens des nouvelles utilisées sous forme de liste HTML (<ul><li><a>)
- Termine avec un paragraphe discret en italique : <p><em>Cet article a été rédigé avec l'assistance de l'intelligence artificielle et révisé par notre équipe éditoriale.</em></p>
${instructions ? `\nINSTRUCTIONS SUPPLÉMENTAIRES :\n${instructions}\n` : ''}
Réponds en JSON strict avec cette structure :
{
  "title": "Titre accrocheur (max 200 caractères)",
  "excerpt": "Résumé SEO (120-155 caractères, pas de guillemets doubles)",
  "body": "<p>Contenu HTML ici...</p>"
}

Réponds UNIQUEMENT avec le JSON, rien d'autre.`,
        },
      ],
    });

    // Extract text from response
    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 });
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let parsed: { title?: string; excerpt?: string; body?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: 'Format de réponse IA invalide. Réessayez.' }, { status: 500 });
    }

    if (!parsed.title || !parsed.body) {
      return NextResponse.json({ error: 'Contenu généré incomplet. Réessayez.' }, { status: 500 });
    }

    return NextResponse.json(
      { title: parsed.title, excerpt: parsed.excerpt ?? '', body: parsed.body },
      { headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Génération trop lente. Réessayez.' }, { status: 504 });
    }
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
