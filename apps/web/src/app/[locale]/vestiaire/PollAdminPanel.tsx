'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { approvePoll, rejectPoll, updatePoll, type Poll } from '@/services/pollService';

interface PollAdminPanelProps {
  pendingPolls: Poll[];
  activePoll: Poll | null;
}

/**
 * Owner-only panel in the Vestiaire. Lists AI-proposed polls awaiting
 * validation: each can be edited, then approved (becomes the live poll
 * and archives the current one) or rejected. A manual "generate now"
 * button hits the same route the bi-weekly cron uses.
 */
export function PollAdminPanel({ pendingPolls, activePoll }: PollAdminPanelProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setGenMessage(null);
    try {
      const res = await fetch('/api/polls/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setGenMessage(data.error ?? 'Échec de la génération');
      } else {
        setGenMessage(`${data.generated} sondage(s) généré(s).`);
        router.refresh();
      }
    } catch {
      setGenMessage('Erreur réseau.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="mb-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Sondages
          {pendingPolls.length > 0 && (
            <span className="ml-2 rounded-full bg-brand-red px-2 py-0.5 text-xs font-bold text-white">
              {pendingPolls.length} à valider
            </span>
          )}
        </h2>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-lg bg-brand-blue px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {generating ? 'Génération...' : 'Générer par IA'}
        </button>
      </div>

      {genMessage && (
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{genMessage}</p>
      )}

      {/* Active poll — read-only reference */}
      {activePoll && (
        <div className="mb-4 rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
            Sondage actif
          </p>
          <p className="text-sm text-gray-800 dark:text-gray-200">{activePoll.question}</p>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            {activePoll.totalVotes} vote{activePoll.totalVotes > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Pending proposals */}
      {pendingPolls.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Aucun sondage en attente. L&apos;IA en propose de nouveaux le 1er et le 15 du mois,
          ou clique « Générer par IA » pour en créer maintenant.
        </p>
      ) : (
        <div className="space-y-4">
          {pendingPolls.map((poll) => (
            <PendingPollCard key={poll.id} poll={poll} onChanged={() => router.refresh()} />
          ))}
        </div>
      )}
    </section>
  );
}

function PendingPollCard({ poll, onChanged }: { poll: Poll; onChanged: () => void }) {
  const supabase = useSupabase();
  const [question, setQuestion] = useState(poll.question);
  const [options, setOptions] = useState(poll.options.map((o) => ({ id: o.id, label: o.label })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    question !== poll.question ||
    options.some((o, i) => o.label !== poll.options[i]?.label);

  async function saveEdits(): Promise<boolean> {
    const { error: err } = await updatePoll(supabase, poll.id, question, options);
    if (err) {
      setError(err.message);
      return false;
    }
    return true;
  }

  async function handleApprove() {
    setBusy(true);
    setError(null);
    // Persist any edits first so the live poll matches what's on screen.
    if (dirty && !(await saveEdits())) {
      setBusy(false);
      return;
    }
    const { error: err } = await approvePoll(supabase, poll.id);
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    onChanged();
  }

  async function handleReject() {
    setBusy(true);
    setError(null);
    const { error: err } = await rejectPoll(supabase, poll.id);
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    onChanged();
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    const ok = await saveEdits();
    setBusy(false);
    if (ok) onChanged();
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Question
      </label>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={2}
        maxLength={300}
        className="mb-3 w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:outline-none"
      />

      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Options
      </label>
      <div className="mb-3 space-y-1.5">
        {options.map((o, i) => (
          <input
            key={o.id}
            value={o.label}
            onChange={(e) =>
              setOptions((prev) => prev.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)))
            }
            maxLength={120}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-blue focus:outline-none"
          />
        ))}
      </div>

      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleApprove}
          disabled={busy}
          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {busy ? '...' : 'Approuver'}
        </button>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={busy}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Enregistrer
          </button>
        )}
        <button
          onClick={handleReject}
          disabled={busy}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 transition hover:border-red-500 hover:text-red-600 disabled:opacity-50"
        >
          Rejeter
        </button>
      </div>
    </div>
  );
}
