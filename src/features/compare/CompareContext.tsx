import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const MAX_COMPARE = 4;

interface CompareState {
  ids: string[];
  searchId: string | null;
  has: (id: string) => boolean;
  toggle: (id: string, searchId?: string | null) => boolean;
  remove: (id: string) => void;
  clear: () => void;
}

const Ctx = createContext<CompareState | null>(null);
const KEY = 'scout:compare';

function read(): { ids: string[]; searchId: string | null } {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* хранилище недоступно */
  }
  return { ids: [], searchId: null };
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(read);
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* не критично */
    }
  }, [state]);

  const toggle = useCallback((id: string, searchId?: string | null) => {
    let added = false;
    setState((s) => {
      // Новый поиск — новое сравнение: оценки из разных запросов не сравниваем
      const base = searchId && s.searchId && searchId !== s.searchId ? { ids: [], searchId } : s;
      if (base.ids.includes(id)) return { ...base, ids: base.ids.filter((x) => x !== id) };
      if (base.ids.length >= MAX_COMPARE) return base;
      added = true;
      return { ids: [...base.ids, id], searchId: searchId ?? base.searchId };
    });
    return added;
  }, []);

  const value = useMemo<CompareState>(
    () => ({
      ...state,
      has: (id) => state.ids.includes(id),
      toggle,
      remove: (id) => setState((s) => ({ ...s, ids: s.ids.filter((x) => x !== id) })),
      clear: () => setState({ ids: [], searchId: null }),
    }),
    [state, toggle],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare(): CompareState {
  const v = useContext(Ctx);
  if (!v) throw new Error('CompareProvider не подключён');
  return v;
}
