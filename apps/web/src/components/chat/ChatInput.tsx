'use client';

import { useState, useRef, useCallback } from 'react';
import { CHAT_MAX_MESSAGE_LENGTH } from '@arena/shared';

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSend(trimmed);
  }, [content, disabled, onSend]);

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
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? 'Écrire un message...'}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !content.trim()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white transition hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
          title="Envoyer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      {content.length > CHAT_MAX_MESSAGE_LENGTH * 0.8 && (
        <p className="mt-1 text-right text-xs text-gray-400">
          {content.length}/{CHAT_MAX_MESSAGE_LENGTH}
        </p>
      )}
    </div>
  );
}
