import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { fetchRecentNews } from '@/lib/newsSearch';

// ─── Rate Limiting ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

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

// ─── Input Sanitization ───

/** Strip characters that could break prompt structure */
function sanitize(input: string, max: number): string {
  return input
    .trim()
    .slice(0, max)
    .replace(/[`]/g, "'"); // Remove backticks (markdown injection)
}

/** Escape input that goes into prompt to prevent injection */
function escapeForPrompt(input: string): string {
  return input
    .replace(/\n/g, ' ')           // No newlines (prompt structure)
    .replace(/["""]/g, '«»')       // Replace quotes
    .replace(/\\/g, '')            // Remove backslashes
    .slice(0, 500);
}

// ─── Helpers ───

function extractText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === 'text');
  return block?.type === 'text' ? block.text.trim() : '';
}

interface ArticleJson {
  title?: string;
  excerpt?: string;
  body?: string;
}

/** Robustly extract article JSON from text */
function extractJson(raw: string): ArticleJson | null {
  let str = raw.trim();
  if (str.startsWith('```')) str = str.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  // Strategy 1: direct parse
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed.title === 'string') return parsed;
  } catch { /* fall through */ }

  // Strategy 2: extract first JSON object
  const match = str.match(/\{[\s\S]*?\}"?\s*$/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0].replace(/"\s*$/, '"}')); // Fix truncated
      if (parsed && typeof parsed.title === 'string') return parsed;
    } catch { /* fall through */ }
  }

  // Strategy 3: extract fields individually (non-greedy)
  const title = str.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\"/g, '"');
  const excerpt = str.match(/"excerpt"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1]?.replace(/\\"/g, '"');

  // For body, find "body":" then capture until the last "}
  const bodyStart = str.indexOf('"body"');
  if (bodyStart !== -1) {
    const afterBody = str.slice(bodyStart);
    const bodyContent = afterBody.match(/"body"\s*:\s*"([\s\S]*?)"\s*\}$/)?.[1];
    if (bodyContent && title) {
      return {
        title,
        excerpt: excerpt ?? '',
        body: bodyContent.replace(/\\"/g, '"').replace(/\\n/g, '\n'),
      };
    }
  }

  return null;
}

/** Deduplicate news by normalized title prefix */
function deduplicateNews(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    // Normalize: lowercase, strip lang prefix, take first 80 chars
    const key = item.replace(/^\[(FR|EN)\]\s*/i, '').toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── AGENT 1: RECHERCHISTE ───
async function agentResearch(
  client: Anthropic,
  topic: string,
  communityName: string,
): Promise<string> {
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

  const unique = deduplicateNews(allNews).slice(0, 12);

  if (unique.length === 0) {
    throw new Error('NO_NEWS');
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Tu es un RECHERCHISTE sportif pour une tribune sur le sujet suivant : ${escapeForPrompt(communityName)}.

Voici les nouvelles récentes (français et anglais) :
${unique.join('\n')}

MISSION :
- Compile un dossier de recherche structuré en français
- Extrais les FAITS VÉRIFIABLES : dates, scores, noms, événements
- Traduis les informations anglaises en français
- Identifie l'angle le plus intéressant pour un article d'opinion
- Note les SOURCES avec leurs liens
- Si une info est incertaine, marque-la comme « à vérifier »
- N'invente AUCUN fait, citation ou statistique

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
  const escapedInstructions = instructions ? escapeForPrompt(instructions) : '';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Tu es le RÉDACTEUR ${authorName ? `« ${escapeForPrompt(authorName)} »` : ''} pour une tribune sur ${escapeForPrompt(communityName)}.
${authorStyle ? `\nTon style éditorial : ${authorStyle}` : '\nTon style : chroniqueur sportif québécois engagé.'}

Voici le dossier de recherche :
---
${research}
---

MISSION :
- Écris un article d'OPINION original de 400-600 mots en français québécois
- Adapte le ton à ta personnalité d'auteur
- Varie tes tournures (pas toujours les mêmes débuts de paragraphe)
- Base-toi UNIQUEMENT sur les faits du dossier, n'invente RIEN
- Si un fait est marqué « à vérifier », ne l'inclus pas
- Utilise des guillemets français « » jamais des guillemets doubles
- N'utilise JAMAIS le tiret cadratin (—) ni le tiret demi-cadratin (–). Utilise uniquement le tiret court (-) ou reformule la phrase
- HTML : <p>, <h2>, <h3>, <strong>, <em>, <ul>, <li>, <blockquote>
- PAS de <h1>, pas de <html>/<head>/<body>
- NE PAS ajouter de section sources ni de mention IA à la fin de l'article
- L'article doit se terminer naturellement par une conclusion éditoriale forte
${escapedInstructions ? `\nConsigne supplémentaire de style : ${escapedInstructions}` : ''}

Réponds UNIQUEMENT en JSON valide, rien d'autre :
{"title":"Titre accrocheur max 200 car","excerpt":"Résumé SEO 120-155 car","body":"<p>HTML ici</p>"}`,
    }],
  });

  return extractText(message);
}

// ─── AGENT 3: VERIFICATEUR ───
async function agentVerify(
  client: Anthropic,
  articleJson: string,
  research: string,
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Tu es un VÉRIFICATEUR anti-plagiat et qualité.

ARTICLE SOUMIS :
${articleJson}

DOSSIER DE RECHERCHE :
${research}

MISSION :
1. PLAGIAT : Aucune phrase ne doit être copiée mot pour mot des sources. Reformule si nécessaire.
2. FAITS : Retire tout fait absent du dossier de recherche. Aucune invention.
3. STYLE : Le ton doit être cohérent du début à la fin.
4. QUALITÉ : Améliore les transitions, supprime les répétitions.
5. JSON : Le JSON retourné doit être VALIDE. Utilise « » pas des guillemets doubles dans le texte.

Retourne l'article corrigé en JSON strict :
{"title":"...","excerpt":"...","body":"<p>...</p>"}
Réponds UNIQUEMENT avec le JSON.`,
    }],
  });

  return extractText(message);
}

// ─── AGENT 4: EDITEUR ───
async function agentPolish(
  client: Anthropic,
  articleJson: string,
  authorName: string,
  authorStyle: string,
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Tu es l'ÉDITEUR EN CHEF. Passe finale.

ARTICLE :
${articleJson}

AUTEUR : ${escapeForPrompt(authorName || 'chroniqueur')}
STYLE : ${authorStyle || 'éditorial sportif québécois'}

MISSION :
1. Le titre est-il accrocheur et < 200 caractères ? Améliore si nécessaire.
2. L'excerpt SEO fait-il 120-155 caractères ? Ajuste.
3. L'ouverture accroche dès la première phrase ? Renforce si faible.
4. La conclusion est mémorable ? Améliore si plate.
5. Le vocabulaire est varié ? Remplace les mots répétés.
6. Le HTML est propre ? Pas de balises vides.

Retourne l'article FINAL en JSON strict :
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
    const topic = sanitize(body.topic ?? '', 200);
    const instructions = sanitize(body.instructions ?? '', 500);
    const communityName = sanitize(body.communityName ?? 'Sport', 100);
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

    // Agent 1: Recherchiste
    let research: string;
    try {
      research = await agentResearch(client, topic, communityName);
    } catch (err) {
      if (err instanceof Error && err.message === 'SERVICE_UNAVAILABLE') {
        return NextResponse.json({ error: 'Service de nouvelles indisponible.' }, { status: 503 });
      }
      if (err instanceof Error && err.message === 'NO_NEWS') {
        return NextResponse.json({ error: 'Aucune nouvelle trouvée pour ce sujet.' }, { status: 404 });
      }
      throw err;
    }

    // Agent 2: Rédacteur
    const draft = await agentWrite(client, research, authorName, authorStyle, communityName, instructions);

    // Agent 3: Vérificateur
    const verified = await agentVerify(client, draft, research);

    // Agent 4: Éditeur
    const polished = await agentPolish(client, verified, authorName, authorStyle);

    // Parse — try each agent's output from best to worst
    const parsed = extractJson(polished) ?? extractJson(verified) ?? extractJson(draft);

    if (!parsed || !parsed.title || !parsed.body) {
      return NextResponse.json({ error: 'Génération échouée. Réessayez.' }, { status: 500 });
    }

    // Strip em dashes and en dashes that AI loves to use
    const cleanBody = parsed.body.replace(/[—–]/g, '-');
    const cleanTitle = parsed.title.replace(/[—–]/g, '-');
    const cleanExcerpt = (parsed.excerpt ?? '').replace(/[—–]/g, '-');

    return NextResponse.json(
      { title: cleanTitle, excerpt: cleanExcerpt, body: cleanBody },
      { headers: { 'X-RateLimit-Remaining': String(remaining) } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
