'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useSupabase } from '@/hooks/useSupabase';
import { useCoverUpload } from '@/hooks/useCoverUpload';
import { createArticle, updateArticle } from '@/services/articleService';
import { slugify } from '@/lib/slugify';
import { CONTENT_AUTHORS as AUTHORS } from '@/lib/contentAuthors';

const AUTHOR_OPTIONS = [
  { name: 'Mon profil', initials: '✓', color: '#0B4870' },
  ...AUTHORS,
];

interface ExistingArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_image_url: string | null;
  is_published: boolean;
}

interface ArticleEditorProps {
  communityId: number;
  communitySlug: string;
  userId: string;
  existingArticle?: ExistingArticle;
  onPublished: (slug: string) => void;
  onCancel: () => void;
}

export function ArticleEditor({
  communityId,
  communitySlug,
  userId,
  existingArticle,
  onPublished,
  onCancel,
}: ArticleEditorProps) {
  const isEditMode = !!existingArticle;
  const [title, setTitle] = useState(existingArticle?.title ?? '');
  const [excerpt, setExcerpt] = useState(existingArticle?.excerpt ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorNameOverride, setAuthorNameOverride] = useState('');
  const supabase = useSupabase();
  const { coverPreview, handleCoverChange: onCoverChange, removeCover, uploadCover } = useCoverUpload(
    supabase, communityId, existingArticle?.cover_image_url ?? null,
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
        validate: (href: string) => /^https?:\/\//.test(href),
      }),
      ImageExtension,
      Placeholder.configure({ placeholder: 'Écrivez votre article ici...' }),
    ],
    content: existingArticle?.body ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none',
      },
    },
  });

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const err = onCoverChange(e);
    if (err) setError(err);
  }

  const handleSave = useCallback(async (publish: boolean) => {
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }
    if (publish && (!editor?.getHTML() || editor.isEmpty)) {
      setError("Le contenu de l'article est requis");
      return;
    }

    setSaving(true);
    setError(null);

    const coverImageUrl = await uploadCover();
    const slug = slugify(title) || `article-${Date.now()}`;
    const body = editor?.getHTML() ?? '';

    if (isEditMode) {
      const { error: updateError } = await updateArticle(supabase, existingArticle.id, {
        title: title.trim(),
        slug,
        excerpt: excerpt.trim() || null,
        body,
        coverImageUrl,
        isPublished: publish,
      });

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await createArticle(supabase, {
        communityId,
        authorId: userId,
        title: title.trim(),
        slug,
        excerpt: excerpt.trim() || null,
        body,
        coverImageUrl,
        isPublished: publish,
        authorNameOverride: authorNameOverride.trim() || null,
      });

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onPublished(slug);
  }, [title, excerpt, editor, uploadCover, communityId, userId, supabase, onPublished, isEditMode, existingArticle]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditMode ? "Modifier l'article" : 'Nouvel article'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Brouillon'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {saving ? 'Publication...' : isEditMode ? 'Mettre à jour' : 'Publier'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cover image */}
      <div className="mb-4">
        {coverPreview ? (
          <div className="relative">
            <img src={coverPreview} alt="Couverture" className="h-48 w-full rounded-xl object-cover" />
            <button
              onClick={removeCover}
              className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition hover:bg-black/70"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <label className="flex h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 transition hover:border-gray-400">
            <div className="text-center text-sm text-gray-400">
              <svg className="mx-auto mb-1 h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
              Ajouter une image de couverture
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleCoverChange} />
          </label>
        )}
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de l'article"
        className="mb-2 w-full border-none text-2xl font-bold text-gray-900 placeholder-gray-300 focus:ring-0 focus:outline-none"
        maxLength={200}
      />

      {/* Excerpt */}
      <input
        type="text"
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
        placeholder="Résumé court (optionnel)"
        className="mb-4 w-full border-none text-sm text-gray-500 placeholder-gray-300 focus:ring-0 focus:outline-none"
        maxLength={300}
      />

      {/* Publish as selector */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
        <p className="mb-2 text-xs font-medium text-gray-500">Publier en tant que :</p>
        <div className="flex flex-wrap gap-2">
          {AUTHOR_OPTIONS.map((author) => (
            <button
              key={author.name}
              type="button"
              onClick={() => setAuthorNameOverride(author.name === 'Mon profil' ? '' : author.name)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                (authorNameOverride === '' && author.name === 'Mon profil') || authorNameOverride === author.name
                  ? 'border-brand-blue bg-brand-blue/5 font-medium text-brand-blue'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white'
              }`}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: author.color }}
              >
                {author.initials}
              </span>
              {author.name}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="mb-1 flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-gray-200 bg-gray-50 px-2 py-1.5">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Gras"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italique"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Titre"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Sous-titre"
          >
            H3
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Liste"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Citation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </ToolbarButton>
          <span className="mx-1 border-l border-gray-300" />
          <ToolbarButton
            active={false}
            onClick={() => {
              const url = window.prompt('URL du lien:');
              if (url && /^https?:\/\//.test(url)) editor.chain().focus().setLink({ href: url }).run();
            }}
            title="Lien"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      <div className="rounded-b-lg border border-gray-200">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded px-2 py-1 text-xs font-medium transition ${
        active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
