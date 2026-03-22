'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Pencil, Trash2, X } from 'lucide-react';

interface FeedMessageSheetProps {
  isOwn: boolean;
  canModerate: boolean;
  onReply: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FeedMessageSheet({
  isOwn,
  canModerate,
  onReply,
  onEdit,
  onDelete,
  onClose,
}: FeedMessageSheetProps) {
  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const actions = [
    { label: 'Répondre', icon: MessageCircle, onClick: onReply, show: true },
    { label: 'Modifier', icon: Pencil, onClick: onEdit, show: isOwn && !!onEdit },
    { label: 'Supprimer', icon: Trash2, onClick: onDelete, show: canModerate || isOwn, destructive: true },
  ].filter((a) => a.show);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:hidden" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Sheet */}
      <div
        className="relative w-full animate-slide-up rounded-t-2xl bg-white pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Actions */}
        <div className="px-4 pb-6">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => { action.onClick?.(); onClose(); }}
              className={`flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left text-sm font-medium transition ${
                action.destructive
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-900 hover:bg-gray-50'
              }`}
            >
              <action.icon className="h-5 w-5" strokeWidth={1.5} />
              {action.label}
            </button>
          ))}

          {/* Cancel */}
          <button
            onClick={onClose}
            className="mt-2 flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-gray-400 transition hover:bg-gray-50"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
