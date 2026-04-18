'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, SendHorizontal } from 'lucide-react';
import Image from 'next/image';
import { CHAT_MAX_MESSAGE_LENGTH, MAX_IMAGES_PER_MESSAGE } from '@arena/shared';
import { useImageUpload } from '@/hooks/useImageUpload';

interface FeedInputProps {
  onSend: (content: string, imageUrls?: string[]) => Promise<void>;
  disabled: boolean;
  placeholder?: string;
  communityId: number;
  userId: string | null;
  autoFocus?: boolean;
}

export function FeedInput({ onSend, disabled, placeholder, communityId, userId, autoFocus }: FeedInputProps) {
  const t = useTranslations('tribune');
  const tc = useTranslations('common');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { images, uploading, addImages, removeImage, clearImages, uploadAll } = useImageUpload();

  // Auto-focus when reply mode activates
  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  // Auto-dismiss the error after 4s so it doesn't linger.
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(id);
  }, [error]);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if ((!trimmed && images.length === 0) || disabled || uploading) return;

    let imageUrls: string[] = [];
    if (images.length > 0 && userId) {
      imageUrls = await uploadAll(communityId, userId);
    }

    const savedContent = content;
    setContent('');
    clearImages();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    const textarea = textareaRef.current;
    try {
      await onSend(trimmed, imageUrls.length > 0 ? imageUrls : undefined);
      setError(null);
    } catch (err) {
      // Restore what the user typed so they can edit + retry instead of losing it.
      setContent(savedContent);
      const message = err instanceof Error ? err.message : 'Échec de l\u2019envoi';
      setError(message);
    }
    textarea?.focus();
  }, [content, disabled, uploading, images, userId, communityId, onSend, uploadAll, clearImages]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    if (value.length <= CHAT_MAX_MESSAGE_LENGTH) {
      setContent(value);
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addImages(e.target.files);
      e.target.value = '';
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      const dt = new DataTransfer();
      imageFiles.forEach((f) => dt.items.add(f));
      addImages(dt.files);
    }
  }

  const canAddMoreImages = images.length < MAX_IMAGES_PER_MESSAGE;

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Single unified container */}
      <div className="overflow-hidden rounded-lg bg-gray-100 dark:bg-[#272525]">
        {/* Image previews inside the bar */}
        {images.length > 0 && (
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 p-3">
            {images.map((img) => (
              <div key={img.id} className="relative flex-shrink-0">
                <Image
                  src={img.previewUrl}
                  alt={t('preview')}
                  width={80}
                  height={80}
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-xs text-white transition hover:bg-red-600"
                >
                  <X className="h-3 w-3" strokeWidth={2.5} />
                </button>
              </div>
            ))}
            {/* Add more button inline with previews */}
            {canAddMoreImages && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 transition hover:border-gray-400 hover:text-gray-500 dark:text-gray-400 disabled:opacity-50"
                title={t('addMoreImages')}
              >
                <Plus className="h-5 w-5" strokeWidth={2} />
              </button>
            )}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end">
          {/* + button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || !canAddMoreImages}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300 dark:text-gray-400 disabled:opacity-50"
            title={t('addImages')}
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={disabled || uploading}
            placeholder={uploading ? t('uploadingImages') : (placeholder ?? t('writeMessage'))}
            rows={1}
            className="flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:text-gray-400"
          />

          {/* Send button — always visible on mobile, hidden on desktop */}
          <button
            onClick={handleSend}
            disabled={disabled || uploading || (!content.trim() && images.length === 0)}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-brand-blue transition hover:text-brand-blue-dark disabled:text-gray-300 md:hidden"
            title={tc('send')}
          >
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            ) : (
              <SendHorizontal className="h-5 w-5" strokeWidth={2} />
            )}
          </button>

          {/* Upload spinner */}
          {uploading && (
            <div className="flex items-center px-3 py-2.5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {/* Error message (auto-dismisses after 4s) */}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Character counter */}
      {content.length > CHAT_MAX_MESSAGE_LENGTH * 0.8 && (
        <p className="mt-1 text-right text-xs text-gray-400">
          {content.length}/{CHAT_MAX_MESSAGE_LENGTH}
        </p>
      )}
    </div>
  );
}
