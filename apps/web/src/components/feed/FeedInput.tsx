'use client';

import { useState, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { CHAT_MAX_MESSAGE_LENGTH } from '@arena/shared';
import { FeedImagePicker } from './FeedImagePicker';
import { useImageUpload } from '@/hooks/useImageUpload';

interface FeedInputProps {
  onSend: (content: string, imageUrls?: string[]) => Promise<void>;
  disabled: boolean;
  placeholder?: string;
  communityId: number;
  userId: string | null;
}

export function FeedInput({ onSend, disabled, placeholder, communityId, userId }: FeedInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { images, uploading, addImages, removeImage, clearImages, uploadAll } = useImageUpload();

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if ((!trimmed && images.length === 0) || disabled || uploading) return;

    let imageUrls: string[] = [];
    if (images.length > 0 && userId) {
      imageUrls = await uploadAll(communityId, userId);
    }

    setContent('');
    clearImages();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSend(trimmed, imageUrls.length > 0 ? imageUrls : undefined);
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

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      {/* Image previews above the input bar */}
      {images.length > 0 && (
        <div className="mb-2 rounded-t-lg bg-gray-100 p-3">
          <FeedImagePicker
            images={images}
            onAdd={addImages}
            onRemove={removeImage}
            disabled={disabled}
          />
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-0 rounded-lg bg-gray-100">
        {/* + button */}
        <FeedImagePicker
          images={[]}
          onAdd={addImages}
          onRemove={removeImage}
          disabled={disabled}
          buttonOnly
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || uploading}
          placeholder={uploading ? 'Envoi des images...' : (placeholder ?? 'Écrire un message...')}
          rows={1}
          className="flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:text-gray-400"
        />

        {/* Upload spinner */}
        {uploading && (
          <div className="flex items-center px-3 py-2.5">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          </div>
        )}
      </div>

      {/* Character counter */}
      {content.length > CHAT_MAX_MESSAGE_LENGTH * 0.8 && (
        <p className="mt-1 text-right text-xs text-gray-400">
          {content.length}/{CHAT_MAX_MESSAGE_LENGTH}
        </p>
      )}
    </div>
  );
}
