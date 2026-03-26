'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';

/**
 * CONFIGURATION — Ajuster ces valeurs pour positionner l'aiguille
 * Toutes les valeurs sont en % de l'image (0-100)
 */
const CONFIG = {
  // Position du pivot de l'aiguille (centre du cadran)
  pivotX: 40,       // % depuis la gauche
  pivotY: 48.5,       // % depuis le haut
  // Longueur de l'aiguille
  needleLength: 25, // % de la largeur de l'image
  // Angles de rotation (en degrés, CSS: 0°=droite, positif=horaire)
  // 0% = 3h20 (bas-droite) = 30°
  // 50% = 9h (gauche) = 180°
  // 100% = 3h00 (droite) = 360°
  angleMin: 13,     // angle quand 0%
  angleMax: 360,    // angle quand 100%
};

export function Nordiquometre() {
  const supabase = useSupabase();
  const { user } = useAuth();
  const [average, setAverage] = useState(50);
  const [totalVotes, setTotalVotes] = useState(0);
  const [myVote, setMyVote] = useState<number | null>(null);
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
        .select('vote')
        .eq('member_id', user.id)
        .single();

      if (myData) {
        setMyVote((myData as { vote: number }).vote);
        setSliderValue((myData as { vote: number }).vote);
      }
    }

    setLoaded(true);
  }, [supabase, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleVote() {
    if (!user) return;
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

    setMyVote(sliderValue);
    setSaving(false);
    loadData();
  }

  const needleAngle = CONFIG.angleMin + (average / 100) * (CONFIG.angleMax - CONFIG.angleMin);

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
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <div className="relative w-full" style={{ maxWidth: 500 }}>
          {/* Image de fond — garde ses proportions */}
          <img
            src="/images/nordiquometre.png"
            alt="Nordiquomètre"
            className="w-full"
            draggable={false}
          />

          {/* Aiguille — positionnée en % relatif à l'image */}
          <img
            src="/images/aiguille.png"
            alt="Aiguille"
            draggable={false}
            className="pointer-events-none absolute"
            style={{
              left: `${CONFIG.pivotX}%`,
              top: `${CONFIG.pivotY}%`,
              width: `${CONFIG.needleLength}%`,
              transformOrigin: '0% 50%',
              transform: `translateY(-50%) rotate(${needleAngle}deg)`,
              transition: 'transform 1s ease-out',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            }}
          />

          {/* Point central du pivot */}
          <div
            className="pointer-events-none absolute rounded-full bg-white shadow-lg"
            style={{
              left: `${CONFIG.pivotX}%`,
              top: `${CONFIG.pivotY}%`,
              width: '2.5%',
              height: '2.5%',
              transform: 'translate(-50%, -50%)',
              border: '2px solid #333',
            }}
          />

          {/* Pourcentage */}
          <div
            className="absolute rounded-full bg-black/70 px-3 py-1 backdrop-blur-sm"
            style={{
              left: `${CONFIG.pivotX}%`,
              bottom: '5%',
              transform: 'translateX(-50%)',
            }}
          >
            <span className="text-sm font-bold text-white sm:text-base">{average}%</span>
            <span className="ml-1.5 text-[10px] text-gray-300">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Vote */}
      <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        {user ? (
          <div className="mx-auto max-w-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">0%</span>
              <span className="text-xs font-bold text-brand-blue">{sliderValue}%</span>
              <span className="text-[10px] text-gray-400">100%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className="mb-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-700 accent-brand-blue"
            />
            <button
              onClick={handleVote}
              disabled={saving}
              className="w-full rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {saving ? 'Envoi...' : myVote !== null ? 'Mettre à jour' : 'Voter'}
            </button>
            {myVote !== null && (
              <p className="mt-1 text-center text-[10px] text-gray-400">Ton vote : {myVote}%</p>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400">Connecte-toi pour voter</p>
        )}
      </div>
    </div>
  );
}
