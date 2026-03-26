/**
 * RSS feeds mapped to community slugs.
 * Keywords are used to match articles to the right tribune.
 * Each feed can serve multiple tribunes via keyword matching.
 *
 * Sources: Sportsnet (Canadian), CBS Sports, Fox Sports (no CloudFront block)
 */

export interface FeedSource {
  url: string;
  lang: 'fr' | 'en';
}

export interface TribuneNewsConfig {
  communitySlug: string;
  keywords: string[];
  feeds: FeedSource[];
}

export const NEWS_FEEDS: TribuneNewsConfig[] = [
  // Hockey - Canadiens de Montréal
  {
    communitySlug: 'canadiens-de-montreal',
    keywords: ['canadiens', 'canadien', 'habs', 'montreal', 'ch ', 'caufield', 'suzuki', 'montembeault'],
    feeds: [
      { url: 'https://www.sportsnet.ca/hockey/nhl/feed', lang: 'en' },
      { url: 'https://www.cbssports.com/rss/headlines/nhl', lang: 'en' },
    ],
  },
  // Hockey - Remparts de Québec
  {
    communitySlug: 'remparts-de-quebec',
    keywords: ['remparts', 'québec', 'quebec', 'lhjmq', 'qmjhl'],
    feeds: [
      { url: 'https://www.sportsnet.ca/hockey/nhl/feed', lang: 'en' },
    ],
  },
  // Baseball - Expos de Montréal
  {
    communitySlug: 'expos-de-montreal',
    keywords: ['expos', 'montreal baseball', 'mlb montreal', 'peanut project', 'expansion'],
    feeds: [
      { url: 'https://www.sportsnet.ca/baseball/mlb/feed', lang: 'en' },
      { url: 'https://www.cbssports.com/rss/headlines/mlb', lang: 'en' },
    ],
  },
  // Baseball - Blue Jays
  {
    communitySlug: 'blue-jays-toronto',
    keywords: ['blue jays', 'jays', 'toronto', 'rogers centre'],
    feeds: [
      { url: 'https://www.sportsnet.ca/baseball/mlb/feed', lang: 'en' },
      { url: 'https://www.cbssports.com/rss/headlines/mlb', lang: 'en' },
    ],
  },
  // Baseball - Red Sox
  {
    communitySlug: 'red-sox-boston',
    keywords: ['red sox', 'boston', 'fenway'],
    feeds: [
      { url: 'https://www.cbssports.com/rss/headlines/mlb', lang: 'en' },
    ],
  },
  // Football - Patriots
  {
    communitySlug: 'patriots',
    keywords: ['patriots', 'new england', 'drake maye', 'foxborough'],
    feeds: [
      { url: 'https://www.sportsnet.ca/football/nfl/feed', lang: 'en' },
      { url: 'https://www.cbssports.com/rss/headlines/nfl', lang: 'en' },
    ],
  },
];

/** Max news items to post per tribune per cron run */
export const MAX_NEWS_PER_TRIBUNE = 2;

/** Emoji for news posts */
export const NEWS_EMOJI = '📰';
