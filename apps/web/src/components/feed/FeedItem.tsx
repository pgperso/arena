'use client';

import { memo } from 'react';
import type { FeedItem as FeedItemType, FeedMessage as FeedMessageType } from '@arena/shared';
import { FeedMessage } from './FeedMessage';
import { FeedArticleCard } from './FeedArticleCard';
import { FeedPodcastCard } from './FeedPodcastCard';

interface FeedItemProps {
  item: FeedItemType;
  userId: string | null;
  canModerate: boolean;
  communitySlug: string;
  isHighlighted?: boolean;
  isGrouped?: boolean;
  onDeleteMessage: (messageId: number) => void;
  onReply: (message: FeedMessageType) => void;
  onScrollToMessage?: (messageId: number) => void;
  getMessageById: (id: number) => FeedMessageType | undefined;
}

export const FeedItem = memo(function FeedItem({
  item,
  userId,
  canModerate,
  communitySlug,
  isHighlighted,
  isGrouped,
  onDeleteMessage,
  onReply,
  onScrollToMessage,
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
          isHighlighted={isHighlighted}
          isGrouped={isGrouped}
          onDelete={onDeleteMessage}
          onReply={onReply}
          onScrollToMessage={onScrollToMessage}
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
});
