'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface TribuneInfo {
  name: string;
  slug: string;
}

interface TribuneContextValue {
  tribune: TribuneInfo | null;
  setTribune: (info: TribuneInfo | null) => void;
}

const TribuneContext = createContext<TribuneContextValue>({
  tribune: null,
  setTribune: () => {},
});

export function TribuneProvider({ children }: { children: React.ReactNode }) {
  const [tribune, setTribuneState] = useState<TribuneInfo | null>(null);
  const setTribune = useCallback((info: TribuneInfo | null) => setTribuneState(info), []);

  return (
    <TribuneContext.Provider value={{ tribune, setTribune }}>
      {children}
    </TribuneContext.Provider>
  );
}

export function useTribune() {
  return useContext(TribuneContext);
}
