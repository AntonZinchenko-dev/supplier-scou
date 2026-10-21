import { createSseParser } from './sse';
import type {
  Letter,
  NewSupplierInput,
  ParsedQuery,
  PipelineStatus,
  SearchEvent,
  SearchFilters,
  SearchResult,
  Settings,
  ShortlistEntry,
  SourcePage,
  Supplier,
  SupplierSummary,
  Weights,
} from './types';

/**
 * Клиент API. Адрес относительный: в демо запросы перехватывает MSW,
 * в боевой версии тот же код ходит на сервер (адрес задаётся в meta[name=api-base]).
 */
function base(): string {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="api-base"]')?.content;
  return meta || new URL('api/', document.baseURI).toString();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(new URL(path, base()), {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(res.status, body?.message ?? `Ошибка ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const json = (body: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(body) });

export interface SupplierCard {
  supplier: Supplier;
  summary: SupplierSummary;
  filters: SearchFilters;
  query: string | null;
}

export interface RecentSearch {
  id: string;
  query: string;
  createdAt: string;
}

export const api = {
  settings: () => request<Settings>('settings'),
  saveSettings: (patch: Partial<Settings>) => request<Settings>('settings', json(patch, 'PUT')),
  parse: (query: string) => request<ParsedQuery>('searches/parse', json({ query })),
  startSearch: (query: string, filters: SearchFilters, weights?: Weights | null) =>
    request<{ id: string }>('searches', json({ query, filters, weights })),
  recent: () => request<RecentSearch[]>('searches'),
  search: (id: string) => request<SearchResult>(`searches/${id}`),
  supplier: (id: string, searchId?: string | null) =>
    request<SupplierCard>(`suppliers/${id}${searchId ? `?search=${encodeURIComponent(searchId)}` : ''}`),
  addSupplier: (input: NewSupplierInput) => request<Supplier>('suppliers', json(input)),
  source: (id: string) => request<SourcePage>(`sources/${encodeURIComponent(id)}`),
  letter: (id: string, searchId?: string | null) => request<Letter>(`suppliers/${id}/letter`, json({ searchId })),
  shortlist: () => request<ShortlistEntry[]>('shortlist'),
  addToShortlist: (id: string, searchId?: string | null) => request<ShortlistEntry>(`shortlist/${id}`, json({ searchId }, 'PUT')),
  updateShortlist: (id: string, patch: { status?: PipelineStatus; nextStep?: string | null; note?: string; removeNote?: string }) =>
    request<ShortlistEntry>(`shortlist/${id}`, json(patch, 'PATCH')),
  removeFromShortlist: (id: string) => request<void>(`shortlist/${id}`, { method: 'DELETE' }),
  exportUrl: () => new URL('shortlist/export', base()).toString(),
  exportCsv: async (): Promise<Blob> => {
    const res = await fetch(new URL('shortlist/export', base()));
    if (!res.ok) throw new ApiError(res.status, 'Не удалось выгрузить');
    return res.blob();
  },
  reset: () => request<void>('demo/reset', { method: 'POST' }),

  /** Поток прогресса поиска. Возвращает функцию отмены. */
  stream(id: string, onEvent: (e: SearchEvent) => void, opts: { fast?: boolean } = {}): () => void {
    const ctrl = new AbortController();
    (async () => {
      const res = await fetch(new URL(`searches/${id}/events${opts.fast ? '?fast=1' : ''}`, base()), { signal: ctrl.signal });
      if (!res.ok || !res.body) throw new ApiError(res.status, 'Поток прогресса недоступен');
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      const feed = createSseParser((_, data) => onEvent(JSON.parse(data) as SearchEvent));
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        feed(value);
      }
    })().catch((e: unknown) => {
      if ((e as Error)?.name !== 'AbortError') onEvent({ type: 'done', total: -1 });
    });
    return () => ctrl.abort();
  },
};
