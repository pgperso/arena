'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { Avatar } from '@/components/ui/Avatar';
import { formatTime } from '@arena/shared';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/services/notificationService';

interface NotificationBellProps {
  userId: string;
}

/**
 * Header bell icon + dropdown. Polls the unread count via Supabase Realtime
 * so the badge updates as soon as someone replies to a comment.
 */
export function NotificationBell({ userId }: NotificationBellProps) {
  const t = useTranslations('notifications');
  const router = useRouter();
  const supabase = useSupabase();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    const count = await fetchUnreadNotificationCount(supabase);
    setUnread(count);
  }, [supabase]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications(supabase, 20);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial count + realtime subscription for new notifications
  useEffect(() => {
    refreshUnread();
    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          setUnread((c) => c + 1);
          // If the dropdown is open, reload so the user sees the new item
          if (open) loadList();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refreshUnread, loadList, open]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadList();
    }
  }

  async function handleItemClick(notif: NotificationItem) {
    // Optimistic: mark as read immediately in local state
    setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(c - 1, 0));
    void markNotificationRead(supabase, notif.id);

    // Navigate to the article with the comment highlighted. Router from
    // @/i18n/navigation prefixes the current locale itself — we must pass
    // a locale-less path or we'd end up with /fr/fr/... (404).
    if (notif.articleSlug && notif.communitySlug) {
      const url = `/tribunes/${notif.communitySlug}/articles/${notif.articleSlug}${notif.commentId ? `?commentId=${notif.commentId}` : ''}`;
      setOpen(false);
      router.push(url);
    }
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    await markAllNotificationsRead(supabase, userId);
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={toggleOpen}
        aria-label={t('open')}
        aria-expanded={open}
        className="relative rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 dark:bg-[#1e1e1e] dark:text-gray-400 dark:hover:bg-gray-800"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white ring-1 ring-white dark:ring-[#1e1e1e]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-[28rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-[#1e1e1e]">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('title')}</p>
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-blue hover:underline"
              >
                {t('markAllRead')}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">{t('empty')}</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => {
                const labelKey =
                  n.type === 'comment_reply'
                    ? 'replyLabel'
                    : n.type === 'comment_reply_thread'
                      ? 'replyThreadLabel'
                      : 'commentOnArticleLabel';
                const label = t(labelKey, { name: n.actorUsername ?? '—' });
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleItemClick(n)}
                      className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        n.isRead ? '' : 'bg-brand-blue/5 dark:bg-brand-blue/10'
                      }`}
                    >
                      <Avatar url={n.actorAvatarUrl} name={n.actorUsername ?? '?'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {label}
                        </p>
                        {n.articleTitle && (
                          <p className="mt-0.5 truncate text-xs font-medium text-gray-900 dark:text-gray-100">
                            {n.articleTitle}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          {formatTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-blue" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
