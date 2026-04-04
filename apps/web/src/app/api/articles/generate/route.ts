import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { fetchRecentNews } from '@/lib/newsSearch';
import { fetchUrlContent, extractUrls } from '@/lib/fetchUrlContent';

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
function escapeForPrompt(input: string, maxLen = 1000): string {
  return input
    .replace(/["""]/g, '«»')       // Replace quotes
    .replace(/\\/g, '')            // Remove backslashes
    .slice(0, maxLen);
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
  communityName: string,
  directives: string,
  directiveUrlContents: string,
  newsLines: string[],
  isTaverne: boolean,
): Promise<string> {
  const directivesBlock = directives
    ? `\nDIRECTIVES PRIORITAIRES de l'utilisateur :\n${escapeForPrompt(directives)}\n${directiveUrlContents ? `\nContenu des liens fournis par l'utilisateur :\n${directiveUrlContents}` : ''}\n\nCes directives sont ta SOURCE PRINCIPALE. Utilise-les en priorité pour orienter ton dossier. Les nouvelles récentes ci-dessous servent de complément.\n`
    : '';

  const newsBlock = newsLines.length > 0
    ? `\nNouvelles récentes (français et anglais) :\n${newsLines.join('\n')}`
    : '';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Tu es un RECHERCHISTE ${isTaverne ? '' : 'sportif '}pour une tribune sur le sujet suivant : ${escapeForPrompt(communityName)}.
${directivesBlock}${newsBlock}

MISSION :
- Compile un dossier de recherche structuré en français
- Extrais les FAITS VÉRIFIABLES : dates, scores, noms, événements
- REFORMULE TOUT dans tes propres mots. Ne recopie JAMAIS les titres ou phrases des sources. Résume les faits, ne cite pas.
- Traduis les informations anglaises en français
- Les sources [X/Twitter] contiennent des réactions et opinions en temps réel - note les prises de position intéressantes, controverses et débats chauds
- Identifie l'angle le plus intéressant pour un article d'opinion
- Note les SOURCES avec leurs liens (mais PAS leurs titres exacts)
- Si une info est incertaine, marque-la comme « à vérifier »
- N'invente AUCUN fait, citation ou statistique

Format : texte structuré avec sections (Faits clés, Contexte, Réactions X/Twitter, Angle suggéré, Sources)
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
  directives: string,
  isTaverne: boolean,
): Promise<string> {
  const escapedDirectives = directives ? escapeForPrompt(directives) : '';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Tu es le RÉDACTEUR ${authorName ? `« ${escapeForPrompt(authorName)} »` : ''} pour une tribune sur ${escapeForPrompt(communityName)}.
${authorStyle ? `\nTon style éditorial : ${authorStyle}` : `\nTon style : chroniqueur ${isTaverne ? '' : 'sportif '}québécois engagé.`}
${escapedDirectives ? `\nDIRECTIVES PRIORITAIRES de l'utilisateur :\n${escapedDirectives}\n\nCes directives sont PRIORITAIRES. L'article DOIT respecter ces consignes (angle, sujet, ton, éléments à inclure). Combine-les avec les faits du dossier de recherche.` : ''}

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

ORIGINALITÉ (CRITIQUE) :
- JAMAIS de phrase copiée d'une source. Reformule TOUT avec ta propre voix.
- N'utilise AUCUN titre de nouvelle comme titre ou phrase de ton article.
- Maximum 3 mots consécutifs identiques à une source. Au-delà, reformule.
- Écris comme un chroniqueur qui a digéré l'info et donne SON opinion, pas comme un journaliste qui rapporte.
- Évite les formulations journalistiques génériques (« force est de constater », « il va sans dire », « à l'heure où »).

FORMAT :
- Utilise des guillemets français « » jamais des guillemets doubles
- N'utilise JAMAIS le tiret cadratin (—) ni le tiret demi-cadratin (–). Utilise uniquement le tiret court (-) ou reformule la phrase
- HTML : <p>, <h2>, <h3>, <strong>, <em>, <ul>, <li>, <blockquote>
- PAS de <h1>, pas de <html>/<head>/<body>
- NE PAS ajouter de section sources ni de mention IA à la fin de l'article
- L'article doit se terminer naturellement par une conclusion éditoriale forte

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
  newsTitles: string[],
  authorName: string,
  authorStyle: string,
): Promise<string> {
  const sourceTitles = newsTitles.length > 0
    ? `\nTITRES ORIGINAUX DES SOURCES (pour comparaison anti-plagiat) :\n${newsTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : '';

  const styleBlock = authorStyle
    ? `\nAUTEUR : ${escapeForPrompt(authorName || 'chroniqueur')}\nSTYLE ATTENDU : ${authorStyle}\n`
    : '';

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2500,
    messages: [{
      role: 'user',
      content: `Tu es un VÉRIFICATEUR anti-plagiat STRICT et qualité.

ARTICLE SOUMIS :
${articleJson}

DOSSIER DE RECHERCHE :
${research}
${sourceTitles}${styleBlock}
MISSION :
1. PLAGIAT (PRIORITÉ ABSOLUE) :
   - Compare chaque phrase de l'article avec les titres des sources ci-dessus.
   - Si plus de 3 mots consécutifs sont identiques à un titre source, REFORMULE la phrase complètement.
   - Le titre de l'article ne doit ressembler à AUCUN titre source. Change-le si c'est le cas.
   - L'article doit sonner comme une OPINION PERSONNELLE, pas comme un résumé de nouvelles.
   - Élimine les formulations journalistiques clichées.
2. FAITS : Retire tout fait absent du dossier de recherche. Aucune invention.
3. STYLE DE L'AUTEUR (IMPORTANT) :
   - L'article DOIT correspondre au style de l'auteur décrit ci-dessus.
   - Si le ton ne correspond pas (ex: un article trop sérieux pour Rex Paquette qui doit être provocateur), RÉÉCRIS les passages pour coller au personnage.
   - Le vocabulaire, le niveau de langue et l'attitude doivent refléter la personnalité de l'auteur.
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
  isTaverne: boolean,
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
STYLE ATTENDU : ${authorStyle || `éditorial ${isTaverne ? '' : 'sportif '}québécois`}

MISSION :
1. VOIX DE L'AUTEUR (PRIORITÉ) : Relis le style attendu ci-dessus. L'article doit SONNER comme cet auteur. Si Rex Paquette est provocateur et sarcastique, l'article doit être provocateur et sarcastique. Si Maika Blitz est passionnée et émotionnelle, l'article doit vibrer d'émotion. Ajuste le vocabulaire, les tournures et l'attitude pour coller au personnage.
2. ORIGINALITÉ : L'article sonne-t-il comme une chronique personnelle ou comme un résumé de nouvelles ? Si c'est trop « journalistique », injecte plus de personnalité et d'opinion dans le style de l'auteur.
3. Le titre est-il accrocheur, original et < 200 caractères ? Il doit refléter le ton de l'auteur (provocateur, analytique, passionné, critique selon le cas).
4. L'excerpt SEO fait-il 120-155 caractères ? Ajuste.
5. L'ouverture accroche dès la première phrase ? Renforce si faible.
6. La conclusion est mémorable ? Améliore si plate.
7. Le vocabulaire est varié ? Remplace les mots répétés et les clichés journalistiques.
8. Le HTML est propre ? Pas de balises vides.

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
    const directives = sanitize(body.directives ?? body.instructions ?? '', 1000);
    const communityName = sanitize(body.communityName ?? 'Sport', 100);
    const authorStyle = typeof body.authorStyle === 'string' ? body.authorStyle.slice(0, 500) : '';
    const authorName = sanitize(body.authorName ?? '', 100);
    const isTaverne = body.isTaverne === true;

    if (topic.length < 2) {
      return NextResponse.json({ error: 'Sujet requis (min 2 caractères)' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API Anthropic manquante' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Fetch URL content from directives in parallel
    const directiveUrls = directives ? extractUrls(directives) : [];
    const urlContents = await Promise.all(
      directiveUrls.slice(0, 3).map((url) => fetchUrlContent(url)),
    );
    const directiveUrlContents = urlContents
      .map((content, i) => content ? `--- ${directiveUrls[i]} ---\n${content}` : null)
      .filter(Boolean)
      .join('\n\n');

    // Fetch all news sources in parallel (used by recherchiste + vérificateur)
    const [newsFr, newsEn, newsX] = await Promise.all([
      fetchRecentNews(topic),
      fetchRecentNews(`${topic} latest news`),
      fetchRecentNews(`${topic} site:x.com OR site:twitter.com`),
    ]);

    if (newsFr === null && newsEn === null && newsX === null && !directives) {
      return NextResponse.json({ error: 'Service de nouvelles indisponible.' }, { status: 503 });
    }

    const allNewsLines = [
      ...(newsFr ?? []).map((n) => `[FR] ${n.title} (${n.pubDate}) — ${n.link}`),
      ...(newsEn ?? []).map((n) => `[EN] ${n.title} (${n.pubDate}) — ${n.link}`),
      ...(newsX ?? []).map((n) => `[X/Twitter] ${n.title} (${n.pubDate}) — ${n.link}`),
    ];
    const uniqueNews = deduplicateNews(allNewsLines).slice(0, 15);

    const newsTitles = [
      ...(newsFr ?? []).map((n) => n.title),
      ...(newsEn ?? []).map((n) => n.title),
      ...(newsX ?? []).map((n) => n.title),
    ].slice(0, 20);

    if (uniqueNews.length === 0 && !directives) {
      return NextResponse.json({ error: 'Aucune nouvelle trouvée pour ce sujet.' }, { status: 404 });
    }

    // Agent 1: Recherchiste
    const research = await agentResearch(client, communityName, directives, directiveUrlContents, uniqueNews, isTaverne);

    // Agent 2: Rédacteur
    const draft = await agentWrite(client, research, authorName, authorStyle, communityName, directives, isTaverne);

    // Agent 3: Vérificateur
    const verified = await agentVerify(client, draft, research, newsTitles, authorName, authorStyle);

    // Agent 4: Éditeur
    const polished = await agentPolish(client, verified, authorName, authorStyle, isTaverne);

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
