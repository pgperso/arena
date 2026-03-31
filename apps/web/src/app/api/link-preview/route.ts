import { NextResponse } from 'next/server';

const TIMEOUT_MS = 5000;
const MAX_HTML_SIZE = 100000; // 100KB max to parse

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FansTribuneBot/1.0; +https://fanstribune.com)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: 'Fetch failed' }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ url, title: null, description: null, image: null, domain: new URL(url).hostname });
    }

    const html = await response.text();
    const truncated = html.slice(0, MAX_HTML_SIZE);

    // Parse OG tags
    const title = extractMeta(truncated, 'og:title') || extractMeta(truncated, 'twitter:title') || extractTag(truncated, 'title');
    const description = extractMeta(truncated, 'og:description') || extractMeta(truncated, 'twitter:description') || extractMeta(truncated, 'description');
    const image = extractMeta(truncated, 'og:image') || extractMeta(truncated, 'twitter:image');
    const domain = new URL(url).hostname.replace(/^www\./, '');

    return NextResponse.json(
      { url, title: title?.slice(0, 200) || null, description: description?.slice(0, 300) || null, image: image || null, domain },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } },
    );
  } catch {
    return NextResponse.json({ url, title: null, description: null, image: null, domain: new URL(url).hostname.replace(/^www\./, '') });
  }
}

function extractMeta(html: string, property: string): string | null {
  // Try property="..." (OG tags)
  const propRegex = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const propMatch = html.match(propRegex);
  if (propMatch) return decodeHtmlEntities(propMatch[1]);

  // Try content="..." property="..." (reversed order)
  const revRegex = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i');
  const revMatch = html.match(revRegex);
  if (revMatch) return decodeHtmlEntities(revMatch[1]);

  // Try name="..." (standard meta)
  const nameRegex = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const nameMatch = html.match(nameRegex);
  if (nameMatch) return decodeHtmlEntities(nameMatch[1]);

  // Try reversed name
  const revNameRegex = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i');
  const revNameMatch = html.match(revNameRegex);
  if (revNameMatch) return decodeHtmlEntities(revNameMatch[1]);

  return null;
}

function extractTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = html.match(regex);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
