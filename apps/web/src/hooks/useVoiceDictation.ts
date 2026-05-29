'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Browsers expose the Web Speech API under two names: Chrome / Edge / Safari
// ship `webkitSpeechRecognition`, the unprefixed `SpeechRecognition` only lands
// behind flags in some builds. Firefox has neither — those users see no mic
// button at all (see the `supported` flag).
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface VoiceDictationTranscript {
  text: string;
  isFinal: boolean;
}

// Distinct error codes the consumer can map to user-facing copy. We avoid
// surfacing raw DOMException names because they vary across browsers.
export type VoiceDictationError =
  | 'unsupported'
  | 'insecure-context'
  | 'no-device'
  | 'device-busy'
  | 'not-allowed'
  | 'dismissed'
  | 'recognition-failed'
  | 'unknown';

interface UseVoiceDictationOptions {
  lang: string;
  onTranscript: (transcript: VoiceDictationTranscript) => void;
}

interface UseVoiceDictationResult {
  supported: boolean;
  listening: boolean;
  error: VoiceDictationError | null;
  start: () => void;
  stop: () => void;
}

export function useVoiceDictation({ lang, onTranscript }: UseVoiceDictationOptions): UseVoiceDictationResult {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<VoiceDictationError | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Keep the callback in a ref so the recognition instance — which is built
  // once per session — always invokes the latest closure instead of a stale one.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const start = useCallback(async () => {
    setError(null);

    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('unsupported');
      return;
    }

    // getUserMedia is required to surface the native permission prompt
    // reliably (Chromium occasionally fires `not-allowed` on
    // SpeechRecognition.start() without showing a dialog at all).
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('insecure-context');
      return;
    }

    // Probe permission state first when the browser supports it. This lets
    // us tell the difference between "user explicitly blocked" (which the
    // prompt won't fix) and "user hasn't decided yet".
    let permissionState: PermissionState | 'unknown' = 'unknown';
    try {
      const perms = (navigator as Navigator & { permissions?: { query: (q: { name: string }) => Promise<PermissionStatus> } }).permissions;
      if (perms?.query) {
        const status = await perms.query({ name: 'microphone' });
        permissionState = status.state;
      }
    } catch {
      // Some browsers (older Safari) throw on { name: 'microphone' } — fall
      // through to the getUserMedia attempt, which will surface the real state.
    }

    if (permissionState === 'denied') {
      setError('not-allowed');
      return;
    }

    // Request mic access — this triggers the native prompt when state is
    // 'prompt', and resolves immediately when state is 'granted'. We release
    // the captured tracks immediately so the SpeechRecognition engine can
    // open its own internal stream without contention.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      const name = e instanceof Error ? e.name : '';
      // Map DOMException names to stable error codes. NotAllowedError can
      // mean "user clicked Block" or "user dismissed the prompt" — both
      // resolve through browser settings, so we surface them the same way.
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('not-allowed');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('no-device');
      } else if (name === 'NotReadableError' || name === 'AbortError') {
        setError('device-busy');
      } else {
        setError('unknown');
      }
      return;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText) onTranscriptRef.current({ text: finalText, isFinal: true });
      if (interimText) onTranscriptRef.current({ text: interimText, isFinal: false });
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('not-allowed');
      } else {
        setError('recognition-failed');
      }
      setListening(false);
    };

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      // InvalidStateError fires if start() is called twice in a row.
      setError(e instanceof Error && e.name === 'InvalidStateError' ? 'device-busy' : 'recognition-failed');
      recognitionRef.current = null;
    }
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return { supported, listening, error, start, stop };
}
