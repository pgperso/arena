'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * CONFIGURATION — Ajuster ces valeurs pour positionner l'aiguille
 * Toutes les valeurs sont en % de l'image (0-100)
 */
const CONFIG = {
  pivotX: 40,
  pivotY: 48.5,
  needleLength: 25,
  angleMin: 13,
  angleMax: 360,
};

/** Phrases selon le pourcentage */
function getVerdict(pct: number): { text: string; emoji: string } {
  if (pct <= 5) return { text: "C'est mort. Oubliez ça.", emoji: '💀' };
  if (pct <= 15) return { text: 'Aucun signe de vie. Zéro espoir.', emoji: '🪦' };
  if (pct <= 25) return { text: "Faudrait un miracle. Pis les miracles, c'est rare.", emoji: '😔' };
  if (pct <= 35) return { text: "Y'a un pouls, mais c'est faible en maudit.", emoji: '💔' };
  if (pct <= 45) return { text: "On commence à jaser, mais c'est encore loin.", emoji: '🤔' };
  if (pct <= 55) return { text: 'Fifty-fifty. Ça pourrait aller des deux bords.', emoji: '⚖️' };
  if (pct <= 65) return { text: "Ça bouge. Y'a de l'espoir dans l'air.", emoji: '👀' };
  if (pct <= 75) return { text: "Les rumeurs sont fortes. Ça s'enligne bien.", emoji: '🔥' };
  if (pct <= 85) return { text: 'Presque confirmé. On retient notre souffle.', emoji: '😤' };
  if (pct <= 95) return { text: 'C\'est quasiment fait. Manque juste l\'annonce.', emoji: '🚨' };
  return { text: 'LES NORDIQUES SONT DE RETOUR !', emoji: '🏒' };
}

const SHARE_URL = 'https://fanstribune.com/fr/tribunes/nordiques-de-quebec';

export function Nordiquometre() {
  const supabase = useSupabase();
  const { user, username } = useAuth();
  const [average, setAverage] = useState(50);
  const [totalVotes, setTotalVotes] = useState(0);
  const [myVote, setMyVote] = useState<number | null>(null);
  const [lastVoteDate, setLastVoteDate] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback(async () => {
    const { data: votes } = await supabase
      .from('nordiquometre_votes')
      .select('vote');

    if (votes && votes.length > 0) {
      const avg = Math.round(
        (votes as { vote: number }[]).reduce((sum, v) => sum + v.vote, 0) / votes.length
      );
      setAverage(avg);
      setTotalVotes(votes.length);
    }

    if (user) {
      const { data: myData } = await supabase
        .from('nordiquometre_votes')
        .select('vote, updated_at')
        .eq('member_id', user.id)
        .single();

      if (myData) {
        const d = myData as { vote: number; updated_at: string };
        setMyVote(d.vote);
        setSliderValue(d.vote);
        setLastVoteDate(d.updated_at);
      }
    }

    setLoaded(true);
  }, [supabase, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check if user already voted today
  const canVoteToday = !lastVoteDate || new Date(lastVoteDate).toDateString() !== new Date().toDateString();

  async function handleVote() {
    if (!user || !canVoteToday) return;
    setSaving(true);

    if (myVote !== null) {
      await supabase
        .from('nordiquometre_votes')
        .update({ vote: sliderValue, updated_at: new Date().toISOString() } as never)
        .eq('member_id', user.id);
    } else {
      await supabase
        .from('nordiquometre_votes')
        .insert({ member_id: user.id, vote: sliderValue } as never);
    }

    // Bot message in Nordiques + Taverne
    const voteName = username || 'Un fan';
    const verdict = getVerdict(sliderValue);
    const botMsg = `${verdict.emoji} ${voteName} a voté ${sliderValue}% au Nordiquomètre ! Indice moyen : ${average}%. ${verdict.text}`;

    // Get Nordiques + Taverne community IDs
    const { data: comms } = await supabase
      .from('communities')
      .select('id, slug')
      .in('slug', ['nordiques-de-quebec', 'nordiques-quebec', 'la-taverne']);

    if (comms) {
      for (const c of comms as { id: number }[]) {
        await supabase.rpc('send_bot_message' as never, {
          p_community_id: c.id,
          p_content: botMsg,
        } as never);
      }
    }

    setMyVote(sliderValue);
    setLastVoteDate(new Date().toISOString());
    setSaving(false);
    loadData();
  }

  const needleAngle = CONFIG.angleMin + (average / 100) * (CONFIG.angleMax - CONFIG.angleMin);
  const verdict = getVerdict(average);

  // Share text
  const shareText = `${verdict.emoji} Nordiquomètre : ${average}% — ${verdict.text} Votez vous aussi !`;

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Gauge */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
        <div className="relative w-full" style={{ maxWidth: 1000 }}>
          <img
            src="/images/nordiquometre.png"
            alt="Nordiquomètre"
            className="w-full"
            draggable={false}
          />

          {/* Aiguille CSS */}
          <svg
            className="pointer-events-none absolute"
            viewBox="0 0 100 24"
            style={{
              left: `${CONFIG.pivotX}%`,
              top: `${CONFIG.pivotY}%`,
              width: `${CONFIG.needleLength}%`,
              height: 'auto',
              transformOrigin: '0% 50%',
              transform: `translateY(-50%) rotate(${needleAngle}deg)`,
              transition: 'transform 1s ease-out',
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
              overflow: 'visible',
            }}
          >
            <polygon
              points="0,5 0,19 95,11 95,13"
              fill={`color-mix(in srgb, #000000 ${100 - average}%, #0B4870 ${average}%)`}
            />
            <polygon
              points="90,10 100,12 90,14"
              fill={`color-mix(in srgb, #111111 ${100 - average}%, #1969B4 ${average}%)`}
            />
          </svg>

          {/* Point central */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${CONFIG.pivotX}%`,
              top: `${CONFIG.pivotY}%`,
              width: '3%',
              height: '3%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: `color-mix(in srgb, #000000 ${100 - average}%, #0B4870 ${average}%)`,
              border: '2px solid rgba(255,255,255,0.8)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
            }}
          />

          {/* Badge % + verdict */}
          <div
            className="absolute rounded-xl bg-black/70 px-3 py-1.5 text-center backdrop-blur-sm"
            style={{
              left: `${CONFIG.pivotX}%`,
              bottom: '5%',
              transform: 'translateX(-50%)',
              maxWidth: '80%',
            }}
          >
            <div className="text-sm font-bold text-white sm:text-base">{average}% <span className="text-[10px] text-gray-300">({totalVotes} votes)</span></div>
            <div className="text-[10px] text-gray-200 sm:text-xs">{verdict.emoji} {verdict.text}</div>
          </div>
        </div>
      </div>

      {/* Vote + Share */}
      <div className="relative z-10 shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] px-4 py-3">
        {user ? (
          <div className="mx-auto max-w-sm">
            {/* Slider + input */}
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="text-[10px] text-gray-400">0%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                disabled={!canVoteToday}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-700 accent-brand-blue disabled:opacity-50"
              />
              <span className="text-[10px] text-gray-400">100%</span>
              <input
                type="number"
                min={0}
                max={100}
                value={sliderValue}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                  setSliderValue(v);
                }}
                disabled={!canVoteToday}
                className="w-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#272525] px-2 py-1 text-center text-sm font-bold text-brand-blue focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:opacity-50"
              />
            </div>

            {/* Vote button */}
            <button
              onClick={handleVote}
              disabled={saving || !canVoteToday}
              className="w-full rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {saving ? 'Envoi...' : !canVoteToday ? 'Déjà voté aujourd\'hui' : myVote !== null ? 'Mettre à jour' : 'Voter'}
            </button>

            {myVote !== null && (
              <p className="mt-1 text-center text-[10px] text-gray-400">Ton vote : {myVote}%</p>
            )}

            {/* Share buttons */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-[10px] text-gray-400">Partager :</span>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href={`https://x.com/intent/tweet?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400">Connecte-toi pour voter</p>
        )}
      </div>
    </div>
  );
}
