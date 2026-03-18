'use client';

import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { createClient } from '@/lib/supabase/client';
import { useImageUpload } from '@/hooks/useImageUpload';

interface ArticleEditorProps {
  communityId: number;
  communitySlug: string;
  userId: string;
  onPublished: (slug: string) => void;
  onCancel: () => void;
}

export function ArticleEditor({
  communityId,
  communitySlug,
  userId,
  onPublished,
  onCancel,
}: ArticleEditorProps) {
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension,
      Placeholder.configure({ placeholder: 'Écrivez votre article ici...' }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none',
      },
    },
  });

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 200);
  }

  const handlePublish = useCallback(async () => {
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }
    if (!editor?.getHTML() || editor.isEmpty) {
      setError("Le contenu de l'article est requis");
      return;
    }

    setPublishing(true);
    setError(null);

    const supabase = createClient();
    let coverImageUrl: string | null = null;

    // Upload cover image if present
    if (coverFile) {
      const ext = coverFile.name.split('.').pop() ?? 'jpg';
      const path = `article-covers/${communityId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(path, coverFile, { contentType: coverFile.type });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path);
        coverImageUrl = urlData.publicUrl;
      }
    }

    const slug = generateSlug(title) || `article-${Date.now()}`;
    const body = editor!.getHTML();

    const { error: insertError } = await supabase.from('articles').insert({
      community_id: communityId,
      author_id: userId,
      title: title.trim(),
      slug,
      excerpt: excerpt.trim() || null,
      body,
      cover_image_url: coverImageUrl,
      is_published: true,
      published_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      setPublishing(false);
      return;
    }

    setPublishing(false);
    onPublished(slug);
  }, [title, excerpt, editor, coverFile, communityId, userId, onPublished]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Nouvel article</h2>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {publishing ? 'Publication...' : 'Publier'}
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
              onClick={() => {
                setCoverPreview(null);
                setCoverFile(null);
              }}
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
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
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
        maxLength={500}
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
              if (url) editor.chain().focus().setLink({ href: url }).run();
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
