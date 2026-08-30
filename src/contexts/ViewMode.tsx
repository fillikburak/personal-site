import React, {createContext, useContext, useEffect, useState} from 'react';

export const VIEW_IDS = ['list', 'grouped', 'grid'] as const;

export type ViewId = (typeof VIEW_IDS)[number];

const STORAGE_KEY = 'notes-view-mode';

type ViewModeContextValue = {
  view: ViewId;
  setView: (id: ViewId) => void;
};

const ViewModeContext = createContext<ViewModeContextValue>({
  view: 'list',
  setView: () => {},
});

export function ViewModeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [view, setViewState] = useState<ViewId>('list');

  // Read the saved preference after mount so server and first client render
  // stay in sync (avoids a hydration mismatch).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if ((VIEW_IDS as readonly string[]).includes(stored ?? '')) {
        setViewState(stored as ViewId);
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) — keep default.
    }
  }, []);

  function setView(id: ViewId) {
    setViewState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }

  return (
    <ViewModeContext.Provider value={{view, setView}}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  return useContext(ViewModeContext);
}
