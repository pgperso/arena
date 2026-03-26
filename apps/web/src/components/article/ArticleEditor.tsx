'use client';

import { useState, useCallback, useEffect } from 'react';
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
  author_name_override?: string | null;
}

interface ArticleEditorProps {
  communityId: number;
  communitySlug: string;
  userId: string;
  existingArticle?: ExistingArticle;
  onPublished: (slug: string, communitySlug: string) => void;
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
  const [customSlug, setCustomSlug] = useState(existingArticle?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEditMode);
  const [selectedCommunityId, setSelectedCommunityId] = useState(communityId);
  const [selectedCommunitySlug, setSelectedCommunitySlug] = useState(communitySlug);
  const [communities, setCommunities] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [excerpt, setExcerpt] = useState(existingArticle?.excerpt ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorNameOverride, setAuthorNameOverride] = useState(existingArticle?.author_name_override ?? '');
  const [showConfirm, setShowConfirm] = useState(false);
  const supabase = useSupabase();
  const { coverPreview, handleCoverChange: onCoverChange, removeCover, uploadCover } = useCoverUpload(
    supabase, selectedCommunityId, existingArticle?.cover_image_url ?? null,
  );

  // Load communities for tribune selector (new articles only)
  useEffect(() => {
    supabase
      .from('community_members')
      .select('community_id, communities!inner(id, name, slug)')
      .eq('member_id', userId)
      .then(({ data }) => {
        if (data) {
          const comms = (data as unknown as { communities: { id: number; name: string; slug: string } }[])
            .map((d) => d.communities);
          setCommunities(comms);
        }
      });
  }, [supabase, userId, isEditMode]);

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
    const slug = (customSlug.trim() || slugify(title)).slice(0, 60) || `article-${Date.now()}`;
    const body = editor?.getHTML() ?? '';

    if (isEditMode) {
      const { error: updateError } = await updateArticle(supabase, existingArticle.id, {
        title: title.trim(),
        slug,
        excerpt: excerpt.trim() || null,
        body,
        coverImageUrl,
        isPublished: publish,
        authorNameOverride: authorNameOverride.trim() || null,
      });

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await createArticle(supabase, {
        communityId: selectedCommunityId,
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
    onPublished(slug, selectedCommunitySlug);
  }, [title, excerpt, editor, uploadCover, communityId, selectedCommunityId, selectedCommunitySlug, customSlug, authorNameOverride, userId, supabase, onPublished, isEditMode, existingArticle]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {isEditMode ? "Modifier l'article" : 'Nouvel article'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950"
          >
            Annuler
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Brouillon'}
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={saving}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {isEditMode ? 'Mettre à jour' : 'Publier'}
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
          <label className="flex h-32 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 transition hover:border-gray-400">
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
        onChange={(e) => {
          setTitle(e.target.value);
          if (!slugTouched) setCustomSlug(slugify(e.target.value).slice(0, 60));
        }}
        placeholder="Titre de l'article"
        className="mb-2 w-full border-none text-2xl font-bold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:ring-0 focus:outline-none"
        maxLength={200}
      />

      {/* Slug */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-400">URL de l&apos;article</label>
          <span className={`text-[10px] ${customSlug.length <= 60 ? 'text-green-500' : 'text-red-500'}`}>
            {customSlug.length}/60
          </span>
        </div>
        <div className="mt-1 flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-1.5">
          <span className="shrink-0 text-xs text-gray-400">…/articles/</span>
          <input
            type="text"
            value={customSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setCustomSlug(slugify(e.target.value).slice(0, 60));
            }}
            className="flex-1 border-none bg-transparent text-xs text-gray-700 dark:text-gray-300 focus:ring-0 focus:outline-none"
            placeholder="slug-auto-genere"
            maxLength={60}
          />
        </div>
      </div>

      {/* Tribune selector (new articles only — can't change after publish) */}
      {!isEditMode && communities.length > 1 && (
        <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-3">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Publier dans :</p>
          <select
            value={selectedCommunityId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedCommunityId(id);
              const comm = communities.find((c) => c.id === id);
              if (comm) setSelectedCommunitySlug(comm.slug);
            }}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Excerpt — critical for SEO (meta description) */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-400">Résumé SEO <span className="text-orange-500">— recommandé pour le référencement</span></label>
          <span className={`text-[10px] ${excerpt.length > 0 ? (excerpt.length <= 155 ? 'text-green-500' : 'text-orange-500') : 'text-gray-300'}`}>
            {excerpt.length}/155
          </span>
        </div>
        <input
          type="text"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="120-155 caractères idéal. Ex: Analyse sans filtre des Canadiens — séries, deadline, gardien..."
          className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          maxLength={200}
        />
      </div>

      {/* Publish as selector */}
      <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-3 py-3">
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Publier en tant que :</p>
        <div className="flex flex-wrap gap-2">
          {AUTHOR_OPTIONS.map((author) => (
            <button
              key={author.name}
              type="button"
              onClick={() => setAuthorNameOverride(author.name === 'Mon profil' ? '' : author.name)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                (authorNameOverride === '' && author.name === 'Mon profil') || authorNameOverride === author.name
                  ? 'border-brand-blue bg-brand-blue/5 font-medium text-brand-blue'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:border-gray-600 hover:bg-white dark:bg-gray-900'
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
        <div className="mb-1 flex flex-wrap gap-1 rounded-t-lg border border-b-0 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-2 py-1.5">
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
          <span className="mx-1 border-l border-gray-300 dark:border-gray-600" />
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
      <div className="rounded-b-lg border border-gray-200 dark:border-gray-700">
        <EditorContent editor={editor} />
      </div>

      {/* Publish confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100">Confirmer la publication</h3>
            <div className="mb-5 space-y-2.5">
              <CheckItem label="Titre" value={title.trim()} ok={!!title.trim()} />
              <CheckItem label="Tribune" value={communities.find((c) => c.id === selectedCommunityId)?.name ?? communitySlug} ok={true} />
              <CheckItem label="Auteur" value={authorNameOverride || 'Mon profil créateur'} ok={true} />
              <CheckItem label="Résumé SEO" value={excerpt.trim() ? `${excerpt.trim().length} caractères` : 'Aucun'} ok={!!excerpt.trim()} warn={!excerpt.trim()} />
              <CheckItem label="Slug URL" value={customSlug || slugify(title).slice(0, 60)} ok={!!(customSlug || title)} />
              <CheckItem label="Image de couverture" value={coverPreview ? 'Oui' : 'Aucune'} ok={!!coverPreview} warn={!coverPreview} />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-950"
              >
                Modifier
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleSave(true); }}
                disabled={saving || !title.trim()}
                className="flex-1 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {saving ? 'Publication...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckItem({ label, value, ok, warn }: { label: string; value: string; ok: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <span className={`mt-0.5 shrink-0 ${ok && !warn ? 'text-green-500' : warn ? 'text-orange-400' : 'text-red-500'}`}>
        {ok && !warn ? '✓' : warn ? '⚠' : '✗'}
      </span>
      <div>
        <span className="font-medium text-gray-700 dark:text-gray-300">{label} : </span>
        <span className="text-gray-500 dark:text-gray-400">{value}</span>
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
        active ? 'bg-gray-200 text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300'
      }`}
    >
      {children}
    </button>
  );
}
