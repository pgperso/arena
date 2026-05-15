import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@arena/supabase-client';

// Poll tables were added in migration 00058 — the generated Database
// type doesn't know them yet, so queries are cast through unknown.
type AnyClient = SupabaseClient<Database>;

export type PollStatus = 'pending_review' | 'active' | 'archived' | 'rejected';

export interface PollOption {
  id: number;
  label: string;
  sortOrder: number;
  voteCount: number;
}

export interface Poll {
  id: number;
  question: string;
  status: PollStatus;
  createdBy: 'ai' | 'admin';
  createdAt: string;
  options: PollOption[];
  totalVotes: number;
}

type PollRow = {
  id: number;
  question: string;
  status: PollStatus;
  created_by: 'ai' | 'admin';
  created_at: string;
};

type OptionRow = {
  id: number;
  poll_id: number;
  label: string;
  sort_order: number;
  vote_count: number;
};

function assemble(poll: PollRow, options: OptionRow[]): Poll {
  const opts = options
    .filter((o) => o.poll_id === poll.id)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((o) => ({
      id: o.id,
      label: o.label,
      sortOrder: o.sort_order,
      voteCount: o.vote_count,
    }));
  return {
    id: poll.id,
    question: poll.question,
    status: poll.status,
    createdBy: poll.created_by,
    createdAt: poll.created_at,
    options: opts,
    totalVotes: opts.reduce((s, o) => s + o.voteCount, 0),
  };
}

/** The single poll currently shown in the gallery, or null if none. */
export async function fetchActivePoll(supabase: AnyClient): Promise<Poll | null> {
  const { data: pollData } = await supabase
    .from('polls')
    .select('id, question, status, created_by, created_at')
    .eq('status', 'active')
    .order('activated_at', { ascending: false })
    .limit(1);

  const polls = (pollData ?? []) as unknown as PollRow[];
  if (polls.length === 0) return null;

  const { data: optData } = await supabase
    .from('poll_options')
    .select('id, poll_id, label, sort_order, vote_count')
    .eq('poll_id', polls[0].id);

  return assemble(polls[0], (optData ?? []) as unknown as OptionRow[]);
}

/** All AI proposals awaiting the owner's validation. */
export async function fetchPendingPolls(supabase: AnyClient): Promise<Poll[]> {
  const { data: pollData } = await supabase
    .from('polls')
    .select('id, question, status, created_by, created_at')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });

  const polls = (pollData ?? []) as unknown as PollRow[];
  if (polls.length === 0) return [];

  const { data: optData } = await supabase
    .from('poll_options')
    .select('id, poll_id, label, sort_order, vote_count')
    .in('poll_id', polls.map((p) => p.id));

  const options = (optData ?? []) as unknown as OptionRow[];
  return polls.map((p) => assemble(p, options));
}

/**
 * Cast a vote. voterKey is a UUID the browser keeps in localStorage so
 * the same browser can't vote twice. Returns the RPC status string.
 */
export async function castPollVote(
  supabase: AnyClient,
  pollId: number,
  optionId: number,
  voterKey: string,
): Promise<'ok' | 'already_voted' | 'poll_inactive' | 'invalid_option' | 'invalid_voter' | 'error'> {
  const { data, error } = await supabase.rpc('cast_poll_vote' as never, {
    p_poll_id: pollId,
    p_option_id: optionId,
    p_voter_key: voterKey,
  } as never);
  if (error) return 'error';
  return (data as 'ok' | 'already_voted' | 'poll_inactive' | 'invalid_option' | 'invalid_voter') ?? 'error';
}

/**
 * Approve a pending poll: archive whatever is currently active, then
 * activate the chosen one. Owner-only (enforced by RLS).
 */
export async function approvePoll(
  supabase: AnyClient,
  pollId: number,
): Promise<{ error: Error | null }> {
  const nowIso = new Date().toISOString();

  const archive = await supabase
    .from('polls')
    .update({ status: 'archived', archived_at: nowIso } as never)
    .eq('status', 'active');
  if (archive.error) return { error: new Error(archive.error.message) };

  const activate = await supabase
    .from('polls')
    .update({ status: 'active', activated_at: nowIso } as never)
    .eq('id', pollId);
  if (activate.error) return { error: new Error(activate.error.message) };

  return { error: null };
}

/** Reject a pending poll proposal. */
export async function rejectPoll(
  supabase: AnyClient,
  pollId: number,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('polls')
    .update({ status: 'rejected' } as never)
    .eq('id', pollId);
  return { error: error ? new Error(error.message) : null };
}

/** Edit a poll's question and option labels before approving it. */
export async function updatePoll(
  supabase: AnyClient,
  pollId: number,
  question: string,
  options: { id: number; label: string }[],
): Promise<{ error: Error | null }> {
  const trimmed = question.trim();
  if (trimmed.length < 5) return { error: new Error('Question trop courte') };

  const q = await supabase
    .from('polls')
    .update({ question: trimmed.slice(0, 300) } as never)
    .eq('id', pollId);
  if (q.error) return { error: new Error(q.error.message) };

  for (const opt of options) {
    const label = opt.label.trim().slice(0, 120);
    if (!label) continue;
    const r = await supabase
      .from('poll_options')
      .update({ label } as never)
      .eq('id', opt.id);
    if (r.error) return { error: new Error(r.error.message) };
  }

  return { error: null };
}
