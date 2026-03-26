'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

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
    // Get average
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

    // Get my vote
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

  // Convert percentage (0-100) to rotation angle
  // 0% = -130deg (left), 50% = 0deg (top), 100% = 130deg (right)
  const needleAngle = -130 + (average / 100) * 260;

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-6">
      <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">Nordiquomètre</h2>
      <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Indice de confiance du retour des Nordiques de Québec
      </p>

      {/* Gauge */}
      <div className="relative mb-6" style={{ width: 300, height: 220 }}>
        <Image
          src="/images/nordiquometre.jpg"
          alt="Nordiquomètre"
          width={300}
          height={220}
          className="h-auto w-full rounded-lg"
          priority
        />
        {/* Needle overlay */}
        <div
          className="absolute"
          style={{
            left: '37%',
            top: '45%',
            width: 0,
            height: 0,
            transformOrigin: '0% 50%',
            transform: `rotate(${needleAngle}deg)`,
            transition: 'transform 1s ease-out',
          }}
        >
          <Image
            src="/images/aiguille.png"
            alt="Aiguille"
            width={100}
            height={8}
            className="h-2"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
          />
        </div>
      </div>

      {/* Average display */}
      <div className="mb-6 text-center">
        <p className="text-4xl font-bold text-brand-blue">{average}%</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
      </div>

      {/* Vote slider */}
      {user ? (
        <div className="w-full max-w-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">0%</span>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{sliderValue}%</span>
            <span className="text-xs text-gray-400">100%</span>
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
        <p className="text-sm text-gray-400">Connecte-toi pour voter</p>
      )}
    </div>
  );
}
