'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';

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

  // 0% = -130deg (gauche), 50% = 0deg (haut), 100% = 130deg (droite)
  const needleAngle = -130 + (average / 100) * 260;

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Gauge — full width */}
      <div className="relative w-full">
        <img
          src="/images/nordiquometre.jpg"
          alt="Nordiquomètre"
          className="w-full"
        />
        {/* Needle */}
        <div
          className="absolute"
          style={{
            left: '37%',
            top: '47%',
            transformOrigin: 'left center',
            transform: `rotate(${needleAngle}deg)`,
            transition: 'transform 1s ease-out',
          }}
        >
          <div className="h-1 rounded-full bg-white shadow-lg" style={{ width: '22%', minWidth: 60 }}>
            <div className="h-full rounded-full bg-gradient-to-r from-white to-red-500" />
          </div>
        </div>
        {/* Center dot */}
        <div
          className="absolute h-4 w-4 rounded-full border-2 border-white bg-gray-900 shadow-lg"
          style={{ left: '36%', top: '44%' }}
        />
        {/* Percentage overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 backdrop-blur-sm">
          <span className="text-lg font-bold text-white">{average}%</span>
          <span className="ml-2 text-xs text-gray-300">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Vote controls */}
      <div className="px-4 py-4">
        {user ? (
          <div className="mx-auto max-w-sm">
            <p className="mb-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
              Quel est ton indice de confiance ?
            </p>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-gray-400">Aucune chance</span>
              <span className="rounded-full bg-brand-blue px-3 py-0.5 text-sm font-bold text-white">{sliderValue}%</span>
              <span className="text-xs text-gray-400">Certain</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className="mb-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-700 accent-brand-blue"
            />
            <button
              onClick={handleVote}
              disabled={saving}
              className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {saving ? 'Envoi...' : myVote !== null ? 'Mettre à jour mon vote' : 'Voter'}
            </button>
            {myVote !== null && (
              <p className="mt-2 text-center text-xs text-gray-400">Ton vote actuel : {myVote}%</p>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400">Connecte-toi pour voter</p>
        )}
      </div>
    </div>
  );
}
