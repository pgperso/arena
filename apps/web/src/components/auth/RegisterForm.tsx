'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { validateUsername, validateEmail, validatePassword } from '@arena/shared';

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Ce courriel est déjà utilisé');
      } else {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
      setLoading(false);
      return;
    }

    router.push('/login?registered=true');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label htmlFor="username" className="mb-1 block text-sm font-medium text-gray-700">
          Nom d&apos;utilisateur
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          placeholder="mon_pseudo"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          Courriel
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          placeholder="vous@exemple.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue focus:outline-none"
          placeholder="Minimum 8 caractères"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Inscription...' : 'Créer mon compte'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Déjà inscrit?{' '}
        <Link href="/login" className="text-brand-blue hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
