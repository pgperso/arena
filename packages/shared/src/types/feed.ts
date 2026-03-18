export type FeedItemType = 'message' | 'article' | 'podcast';

export interface FeedMember {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface FeedItemBase {
  feedType: FeedItemType;
  feedKey: string;
  feedTimestamp: string;
  communityId: number;
}

export interface FeedMessage extends FeedItemBase {
  feedType: 'message';
  id: number;
  memberId: string | null;
  content: string | null;
  imageUrls: string[];
  parentId: number | null;
  repostOfId: number | null;
  quoteOfId: number | null;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  isRemoved: boolean;
  removedAt: string | null;
  removedBy: string | null;
  createdAt: string;
  member: FeedMember | null;
  parentMessage?: FeedMessage | null;
  repostedMessage?: FeedMessage | null;
  quotedMessage?: FeedMessage | null;
}

export interface FeedArticle extends FeedItemBase {
  feedType: 'article';
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  likeCount: number;
  viewCount: number;
  publishedAt: string;
  author: FeedMember;
}

export interface FeedPodcast extends FeedItemBase {
  feedType: 'podcast';
  id: number;
  title: string;
  description: string | null;
  audioUrl: string;
  coverImageUrl: string | null;
  durationSeconds: number | null;
  likeCount: number;
  createdAt: string;
  publisher: FeedMember | null;
}

export type FeedItem = FeedMessage | FeedArticle | FeedPodcast;
