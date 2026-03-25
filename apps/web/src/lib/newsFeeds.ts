/**
 * RSS feeds mapped to community slugs.
 * Keywords are used to match articles to the right tribune.
 * Each feed can serve multiple tribunes via keyword matching.
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
    keywords: ['canadiens', 'canadien', 'habs', 'montreal', 'ch ', 'cole caufield', 'nick suzuki', 'montembeault', 'drake maye'],
    feeds: [
      { url: 'https://www.espn.com/espn/rss/nhl/news', lang: 'en' },
    ],
  },
  // Hockey - Remparts de Québec
  {
    communitySlug: 'remparts-de-quebec',
    keywords: ['remparts', 'québec', 'quebec', 'lhjmq', 'qmjhl'],
    feeds: [
      { url: 'https://www.espn.com/espn/rss/nhl/news', lang: 'en' },
    ],
  },
  // Baseball - Expos de Montréal
  {
    communitySlug: 'expos-de-montreal',
    keywords: ['expos', 'montreal baseball', 'mlb montreal', 'stade baseball', 'peanut project'],
    feeds: [
      { url: 'https://www.espn.com/espn/rss/mlb/news', lang: 'en' },
    ],
  },
  // Baseball - Blue Jays
  {
    communitySlug: 'blue-jays-toronto',
    keywords: ['blue jays', 'jays', 'toronto baseball'],
    feeds: [
      { url: 'https://www.espn.com/espn/rss/mlb/news', lang: 'en' },
    ],
  },
  // Baseball - Red Sox
  {
    communitySlug: 'red-sox-boston',
    keywords: ['red sox', 'boston baseball', 'fenway'],
    feeds: [
      { url: 'https://www.espn.com/espn/rss/mlb/news', lang: 'en' },
    ],
  },
  // Football - Patriots
  {
    communitySlug: 'patriots',
    keywords: ['patriots', 'new england', 'drake maye', 'foxborough'],
    feeds: [
      { url: 'https://www.espn.com/espn/rss/nfl/news', lang: 'en' },
    ],
  },
];

/** Max news items to post per tribune per cron run */
export const MAX_NEWS_PER_TRIBUNE = 2;

/** Emoji for news posts */
export const NEWS_EMOJI = '📰';
