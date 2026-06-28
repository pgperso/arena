'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const STORAGE_KEY = 'pool-beta-dismissed';

/** Temporary beta notice on the pool home — dismissible, remembered per device. */
export function BetaNotice() {
  const t = useTranslations('pool.beta');
  // Hidden until mounted so SSR and the dismissed state don't mismatch.
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(localStorage.getItem(STORAGE_KEY) !== '1');
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-900/10">
      <span className="mt-0.5 shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {t('badge')}
      </span>
      <p className="flex-1 text-amber-900 dark:text-amber-200">{t('message')}</p>
      <button
        type="button"
        onClick={() => { localStorage.setItem(STORAGE_KEY, '1'); setShow(false); }}
        aria-label={t('dismiss')}
        className="shrink-0 rounded px-1 text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
      >
        ✕
      </button>
    </div>
  );
}
