import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { fetchRecentNews } from '@/lib/newsSearch';

// In-memory rate limit: userId -> { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const MAX_TOPIC_LENGTH = 200;
const MAX_INSTRUCTIONS_LENGTH = 500;

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  if (entry.count >= RATE_LIMIT) return { allowed: false, remaining: 0 };
  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

function sanitize(input: string, max: number): string {
  return input.trim().slice(0, max);
}

/** Extract text from Claude response */
function extractText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text');
  return block?.type === 'text' ? block.text.trim() : '';
}

/** Robustly extract JSON from text */
function extractJson<T>(raw: string): T | null {
  let str = raw.trim();
  if (str.startsWith('```')) str = str.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  try { return JSON.parse(str); } catch { /* */ }

  const match = str.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* */ }
  }

  // Field-by-field extraction for article JSON
  const title = str.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\"/g, '"');
  const excerpt = str.match(/"excerpt"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\"/g, '"');
  const bodyMatch = str.match(/"body"\s*:\s*"([\s\S]*)"\s*\}?\s*$/);
  const body = bodyMatch?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, '\n');
  if (title && body) return { title, excerpt: excerpt ?? '', body } as T;

  return null;
}

// ─── AGENT 1: RECHERCHISTE ───
async function agentResearch(
  client: Anthropic,
  topic: string,
  communityName: string,
): Promise<string> {
  // Fetch news in both French and English
  const [newsFr, newsEn] = await Promise.all([
    fetchRecentNews(topic),
    fetchRecentNews(`${topic} latest news`),
  ]);

  if (newsFr === null && newsEn === null) {
    throw new Error('SERVICE_UNAVAILABLE');
  }

  const allNews = [
    ...(newsFr ?? []).map((n) => `[FR] ${n.title} (${n.pubDate}) — ${n.link}`),
    ...(newsEn ?? []).map((n) => `[EN] ${n.title} (${n.pubDate}) — ${n.link}`),
  ];

  // Deduplicate by title similarity
  const unique = allNews.filter((item, i) =>
    allNews.findIndex((other) => other.slice(5, 50) === item.slice(5, 50)) === i,
  );

  const newsContext = unique.length > 0
    ? unique.slice(0, 12).join('\n')
    : `Aucune nouvelle trouvée. Sujet général : ${topic}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Tu es un RECHERCHISTE sportif pour la tribune « ${communityName} ».

Voici les nouvelles récentes (français et anglais) :
${newsContext}

MISSION :
- Compile un dossier de recherche structuré en français
- Extrais les FAITS VÉRIFIABLES : dates, scores, noms, événements
- Traduis les informations anglaises en français
- Identifie l'angle le plus intéressant pour un article d'opinion
- Note les SOURCES avec leurs liens
- Si une info est incertaine, marque-la comme « à vérifier »

Format : texte structuré avec sections (Faits clés, Contexte, Angle suggéré, Sources)
Ne fais PAS d'article, juste le dossier de recherche.`,
    }],
  });

  return extractText(message);
}

// ─── AGENT 2: REDACTEUR ───
async function agentWrite(
  client: Anthropic,
  research: string,
  authorName: string,
  authorStyle: string,
  communityName: string,
  instructions: string,
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Tu es le RÉDACTEUR « ${authorName || 'chroniqueur'} » pour la tribune « ${communityName} ».
${authorStyle ? `\nTon style : ${authorStyle}` : ''}

Voici le dossier de recherche préparé par ton recherchiste :
---
${research}
---

MISSION :
- Écris un article d'OPINION original de 400-600 mots en français québécois
- Adapte le ton et le style à ta personnalité d'auteur
- Varie tes tournures de phrases (pas toujours les mêmes débuts de paragraphe)
- Base-toi UNIQUEMENT sur les faits du dossier, n'invente RIEN
- Si un fait est marqué « à vérifier », ne l'inclus pas
- Utilise des guillemets français « » jamais des guillemets doubles "
- HTML : <p>, <h2>, <h3>, <strong>, <em>, <ul>, <li>, <blockquote>
- PAS de <h1>, pas de <html>/<head>/<body>
- Ajoute les sources en fin d'article : <h3>Sources</h3><ul><li><a href="...">...</a></li></ul>
- Termine par : <p><em>Cet article a été rédigé avec l'assistance de l'intelligence artificielle et révisé par notre équipe éditoriale.</em></p>
${instructions ? `\nINSTRUCTIONS DE L'AUTEUR : ${instructions}` : ''}

Réponds UNIQUEMENT en JSON valide :
{"title":"Titre accrocheur max 200 car","excerpt":"Résumé SEO 120-155 car","body":"<p>HTML ici</p>"}
Utilise « » pas " dans le texte.`,
    }],
  });

  return extractText(message);
}

// ─── AGENT 3: VERIFICATEUR ANTI-PLAGIAT ───
async function agentVerify(
  client: Anthropic,
  articleJson: string,
  research: string,
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Tu es un VÉRIFICATEUR anti-plagiat et qualité.

ARTICLE SOUMIS :
${articleJson}

DOSSIER DE RECHERCHE ORIGINAL :
${research}

MISSION :
1. PLAGIAT : Vérifie qu'aucune phrase n'est copiée mot pour mot des sources. Si oui, reformule.
2. FAITS : Vérifie que l'article ne contient aucun fait inventé absent du dossier. Si oui, retire-le.
3. STYLE : Vérifie que le ton est cohérent du début à la fin. Corrige les incohérences.
4. QUALITÉ : Améliore les transitions, supprime les répétitions, renforce les punchlines.
5. JSON : Assure-toi que le JSON est VALIDE (guillemets échappés, pas de retour à la ligne non-échappé dans les strings).

Retourne l'article corrigé en JSON VALIDE strict :
{"title":"...","excerpt":"...","body":"<p>...</p>"}
Utilise « » pas " dans le texte. Échappe les guillemets dans le HTML.
Réponds UNIQUEMENT avec le JSON.`,
    }],
  });

  return extractText(message);
}

// ─── AGENT 4: EDITEUR DE STYLE ───
async function agentPolish(
  client: Anthropic,
  articleJson: string,
  authorName: string,
  authorStyle: string,
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Tu es l'ÉDITEUR EN CHEF. Tu fais la passe finale.

ARTICLE :
${articleJson}

AUTEUR : ${authorName || 'chroniqueur'}
STYLE ATTENDU : ${authorStyle || 'éditorial sportif québécois'}

MISSION FINALE :
1. Le titre est-il vraiment accrocheur ? Si non, améliore-le.
2. L'excerpt SEO fait-il 120-155 caractères ? Ajuste si nécessaire.
3. L'ouverture accroche-t-elle dès la première phrase ? Renforce si faible.
4. La conclusion est-elle mémorable ? Améliore si plate.
5. Le vocabulaire est-il varié ? Remplace les mots répétés.
6. Le HTML est-il propre ? (pas de balises vides, pas de <br> inutiles)

Retourne l'article FINAL en JSON VALIDE strict :
{"title":"...","excerpt":"...","body":"<p>...</p>"}
Utilise « » pas " dans le texte.
Réponds UNIQUEMENT avec le JSON.`,
    }],
  });

  return extractText(message);
}

// ─── MAIN ROUTE ───

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { allowed, remaining } = checkRateLimit(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Limite atteinte (10/heure). Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': '3600' } },
      );
    }

    const body = await request.json();
    const topic = sanitize(body.topic ?? '', MAX_TOPIC_LENGTH);
    const instructions = sanitize(body.instructions ?? '', MAX_INSTRUCTIONS_LENGTH);
    const communityName = sanitize(body.communityName ?? '', 100);
    const authorStyle = typeof body.authorStyle === 'string' ? body.authorStyle.slice(0, 500) : '';
    const authorName = sanitize(body.authorName ?? '', 100);

    if (topic.length < 2) {
      return NextResponse.json({ error: 'Sujet requis (min 2 caractères)' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Agent 1: Recherchiste — compile les faits FR + EN
    let research: string;
    try {
      research = await agentResearch(client, topic, communityName);
    } catch (err) {
      if (err instanceof Error && err.message === 'SERVICE_UNAVAILABLE') {
        return NextResponse.json(
          { error: 'Service de nouvelles indisponible. Réessayez.' },
          { status: 503 },
        );
      }
      throw err;
    }

    // Agent 2: Rédacteur — écrit l'article dans le style de l'auteur
    const draft = await agentWrite(client, research, authorName, authorStyle, communityName, instructions);

    // Agent 3: Vérificateur — anti-plagiat + faits
    const verified = await agentVerify(client, draft, research);

    // Agent 4: Éditeur — polish final (titre, style, SEO)
    const polished = await agentPolish(client, verified, authorName, authorStyle);

    // Parse final result
    const parsed = extractJson<{ title?: string; excerpt?: string; body?: string }>(polished)
      ?? extractJson<{ title?: string; excerpt?: string; body?: string }>(verified)
      ?? extractJson<{ title?: string; excerpt?: string; body?: string }>(draft);

    if (!parsed || !parsed.title || !parsed.body) {
      return NextResponse.json({ error: 'Génération échouée. Réessayez.' }, { status: 500 });
    }

    return NextResponse.json(
      { title: parsed.title, excerpt: parsed.excerpt ?? '', body: parsed.body },
      { headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
