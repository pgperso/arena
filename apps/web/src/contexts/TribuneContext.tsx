'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface TribuneInfo {
  name: string;
  slug: string;
}

interface TribuneContextValue {
  tribune: TribuneInfo | null;
  setTribune: (info: TribuneInfo | null) => void;
  membersOpen: boolean;
  setMembersOpen: (open: boolean) => void;
}

const TribuneContext = createContext<TribuneContextValue>({
  tribune: null,
  setTribune: () => {},
  membersOpen: false,
  setMembersOpen: () => {},
});

export function TribuneProvider({ children }: { children: React.ReactNode }) {
  const [tribune, setTribuneState] = useState<TribuneInfo | null>(null);
  const setTribune = useCallback((info: TribuneInfo | null) => setTribuneState(info), []);

  const [membersOpen, setMembersOpenState] = useState(false);
  const setMembersOpen = useCallback((open: boolean) => setMembersOpenState(open), []);

  return (
    <TribuneContext.Provider value={{ tribune, setTribune, membersOpen, setMembersOpen }}>
      {children}
    </TribuneContext.Provider>
  );
}

export function useTribune() {
  return useContext(TribuneContext);
}
