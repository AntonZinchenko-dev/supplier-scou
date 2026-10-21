import type { CityId, SearchFilters, Settings, ShortlistEntry, Supplier, Weights } from '../shared/api/types';
import { buildCatalog } from './data/catalog';

/**
 * «База данных» демо: каталог генерируется, а всё, что меняет пользователь
 * (поиски, шорт-лист, заметки, свои поставщики, настройки), хранится в localStorage.
 * В боевой версии это таблицы Postgres; контракт API тот же.
 */

export interface StoredSearch {
  id: string;
  query: string;
  filters: SearchFilters;
  weights: Weights;
  createdAt: string;
}

interface State {
  version: 1;
  searches: StoredSearch[];
  shortlist: ShortlistEntry[];
  manual: Supplier[];
  settings: Settings;
}

const KEY = 'scout:db:v1';

const initial = (): State => ({
  version: 1,
  searches: [],
  shortlist: [],
  manual: [],
  settings: { city: 'ekb' as CityId, company: '', weights: null },
});

let memory: State | null = null;

function load(): State {
  if (memory) return memory;
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === 1) {
        memory = { ...initial(), ...parsed };
        return memory;
      }
    }
  } catch {
    /* приватный режим или заблокированное хранилище — работаем в памяти */
  }
  memory = initial();
  return memory;
}

function save() {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(load()));
  } catch {
    /* не страшно: состояние живёт до перезагрузки */
  }
}

export const db = {
  get state(): State {
    return load();
  },
  update(fn: (s: State) => void) {
    fn(load());
    save();
  },
  reset() {
    memory = initial();
    save();
  },
  suppliers(): Supplier[] {
    return [...buildCatalog().suppliers, ...load().manual];
  },
  supplier(id: string): Supplier | undefined {
    return buildCatalog().suppliers.find((s) => s.id === id) ?? load().manual.find((s) => s.id === id);
  },
  source(id: string) {
    return buildCatalog().sources[id];
  },
  search(id: string): StoredSearch | undefined {
    return load().searches.find((s) => s.id === id);
  },
};

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
