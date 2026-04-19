import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';

export type NotificationType = 'comment_reply' | 'comment_reply_thread' | 'comment_on_article';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  articleId: number | null;
  articleTitle: string | null;
  articleSlug: string | null;
  communitySlug: string | null;
  commentId: number | null;
  isRead: boolean;
  createdAt: string;
}

type RawNotificationRow = {
  id: number;
  type: NotificationType;
  article_id: number | null;
  comment_id: number | null;
  is_read: boolean;
  created_at: string;
  actor: { username: string; avatar_url: string | null } | null;
  article: {
    title: string;
    slug: string;
    communities: { slug: string } | null;
  } | null;
};

function rowToNotification(r: RawNotificationRow): NotificationItem {
  return {
    id: r.id,
    type: r.type,
    actorUsername: r.actor?.username ?? null,
    actorAvatarUrl: r.actor?.avatar_url ?? null,
    articleId: r.article_id,
    articleTitle: r.article?.title ?? null,
    articleSlug: r.article?.slug ?? null,
    communitySlug: r.article?.communities?.slug ?? null,
    commentId: r.comment_id,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}

export async function fetchNotifications(
  supabase: SupabaseClient<Database>,
  limit = 20,
): Promise<NotificationItem[]> {
  const { data } = await supabase
    .from('notifications')
    .select(
      'id, type, article_id, comment_id, is_read, created_at, ' +
      'actor:members!notifications_actor_id_fkey(username, avatar_url), ' +
      'article:articles(title, slug, communities!inner(slug))',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data) return [];
  return (data as unknown as RawNotificationRow[]).map(rowToNotification);
}

export async function fetchUnreadNotificationCount(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient<Database>,
  notificationId: number,
): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient<Database>,
  recipientId: string,
): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', recipientId)
    .eq('is_read', false);
}
