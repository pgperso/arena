'use client';

import type { FeedItem as FeedItemType, FeedMessage as FeedMessageType } from '@arena/shared';
import { FeedMessage } from './FeedMessage';
import { FeedArticleCard } from './FeedArticleCard';
import { FeedPodcastCard } from './FeedPodcastCard';

interface FeedItemProps {
  item: FeedItemType;
  userId: string | null;
  canModerate: boolean;
  communitySlug: string;
  onDeleteMessage: (messageId: number) => void;
  onReply: (message: FeedMessageType) => void;
  onRepost: (messageId: number) => void;
  onQuote: (message: FeedMessageType) => void;
  getMessageById: (id: number) => FeedMessageType | undefined;
}

export function FeedItem({
  item,
  userId,
  canModerate,
  communitySlug,
  onDeleteMessage,
  onReply,
  onRepost,
  onQuote,
  getMessageById,
}: FeedItemProps) {
  switch (item.feedType) {
    case 'message':
      return (
        <FeedMessage
          message={item}
          isOwn={item.memberId === userId}
          canModerate={canModerate}
          userId={userId}
          onDelete={onDeleteMessage}
          onReply={onReply}
          onRepost={onRepost}
          onQuote={onQuote}
          getMessageById={getMessageById}
        />
      );
    case 'article':
      return (
        <FeedArticleCard
          article={item}
          communitySlug={communitySlug}
          userId={userId}
          canModerate={canModerate}
        />
      );
    case 'podcast':
      return (
        <FeedPodcastCard
          podcast={item}
          communitySlug={communitySlug}
          userId={userId}
        />
      );
    default:
      return null;
  }
}
