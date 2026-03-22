'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Footer } from '@/components/layout/Footer';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-y-auto">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('resetPassword')}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t('resetSubtitle')}
            </p>
          </div>

          {sent ? (
            <div className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
              <p className="font-medium">{t('resetSent')}</p>
              <p className="mt-1">
                {t('resetSentDetail')}
              </p>
              <Link
                href="/login"
                className="mt-4 inline-block text-brand-blue hover:underline"
              >
                {t('backToLogin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  {t('email')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder={t('emailPlaceholder')}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {loading ? t('sending') : t('sendLink')}
              </button>
              <p className="text-center text-sm text-gray-500">
                <Link
                  href="/login"
                  className="text-brand-blue hover:underline"
                >
                  {t('backToLogin')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
