'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { ADSENSE_CLIENT_ID } from '@arena/shared';

const COOKIE_KEY = 'ft_cookie_consent';
const CONSENT_ACCEPTED_EVENT = 'ft-cookie-consent-accepted';

// Loads AdSense only after the user has accepted cookies (Law 25 / GDPR).
// Listens for the custom event emitted by CookieConsent on accept, so the
// script starts loading without a page refresh.
export function AdSenseLoader({ nonce }: { nonce: string }) {
  const [consent, setConsent] = useState<boolean>(false);

  useEffect(() => {
    if (localStorage.getItem(COOKIE_KEY) === 'accepted') {
      setConsent(true);
      return;
    }
    const onAccept = () => setConsent(true);
    window.addEventListener(CONSENT_ACCEPTED_EVENT, onAccept);
    return () => window.removeEventListener(CONSENT_ACCEPTED_EVENT, onAccept);
  }, []);

  if (!consent) return null;

  return (
    <Script
      id="adsense-script"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
      nonce={nonce}
    />
  );
}
