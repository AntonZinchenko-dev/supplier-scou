import { delay, http, HttpResponse } from 'msw';
import type {
  Fact,
  NewSupplierInput,
  PipelineStatus,
  SearchEvent,
  SearchFilters,
  SearchResult,
  Settings,
  ShortlistEntry,
  Supplier,
  Weights,
} from '../shared/api/types';
import { CATEGORIES, CITIES, DEMO_TODAY, PRODUCT_BY_ID, STATUS } from '../shared/config/dictionary';
import { formatSse } from '../shared/api/sse';
import { moqLine, priceLine } from '../shared/lib/format';
import { db, newId, type StoredSearch } from './db';
import { buildLetter } from './logic/letter';
import { parseQuery } from './logic/parse';
import { matchesFilters, rank, referenceProduct, summarize, weightsFor } from './logic/score';

/**
 * Обработчики MSW — «сервер» демо. Пути и ответы совпадают с contracts/openapi.yaml.
 * Пути начинаются со звёздочки перед /api: сайт может жить в подпапке GitHub Pages.
 */

const api = (path: string) => `*/api${path}`;

function computeResult(s: StoredSearch): SearchResult {
  const candidates = db.suppliers().filter((sup) => matchesFilters(sup, s.filters));
  const ref = referenceProduct(candidates, s.filters);
  return {
    id: s.id,
    createdAt: s.createdAt,
    query: s.query,
    filters: s.filters,
    weights: s.weights,
    candidates: candidates.length,
    priceFor: ref ? { productId: ref, name: PRODUCT_BY_ID[ref]?.name ?? ref } : null,
    items: rank(candidates.map((sup) => summarize(sup, s.filters, s.weights, ref))),
  };
}

function notFound(what: string) {
  return HttpResponse.json({ error: 'not_found', message: `${what} не найден` }, { status: 404 });
}

const today = () => new Date().toISOString().slice(0, 10);

function manualFact<T>(value: T | undefined | null): Fact<T> {
  return value === undefined || value === null || value === ''
    ? { value: null, status: 'not_found', method: 'manual', fetchedAt: DEMO_TODAY }
    : { value, status: 'confirmed', method: 'manual', fetchedAt: DEMO_TODAY };
}

function manualSupplier(input: NewSupplierInput): Supplier {
  const id = newId('own');
  return {
    id,
    name: input.name.trim(),
    tagline: input.note?.trim() || 'Добавлен вручную',
    kind: 'distributor',
    city: input.city,
    address: CITIES[input.city].name,
    website: input.website?.trim() ? (input.website.startsWith('http') ? input.website.trim() : `https://${input.website.trim()}`) : null,
    categories: input.categories,
    manual: true,
    legal: {
      inn: manualFact(input.inn?.trim()),
      ogrn: manualFact<string>(null),
      status: manualFact<'active'>(null),
      registeredAt: manualFact<string>(null),
      okved: manualFact<{ code: string; title: string; food: boolean }>(null),
    },
    contacts: {
      phone: manualFact(input.phone?.trim()),
      email: manualFact(input.email?.trim()),
      telegram: manualFact<string>(null),
      person: manualFact<string>(null),
    },
    offers: [],
    delivery: {
      cities: manualFact([input.city]),
      nationwide: false,
      schedule: manualFact<string>(null),
      daily: false,
      minOrderSum: manualFact<number>(null),
      cold: manualFact<boolean>(null),
      pickup: false,
    },
    documents: [],
    deferral: manualFact<number>(null),
  };
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const handlers = [
  /* Настройки: город по умолчанию, название компании для писем, веса */
  http.get(api('/settings'), () => HttpResponse.json(db.state.settings)),
  http.put(api('/settings'), async ({ request }) => {
    const patch = (await request.json()) as Partial<Settings>;
    db.update((s) => {
      s.settings = { ...s.settings, ...patch };
    });
    return HttpResponse.json(db.state.settings);
  }),

  /* Разбор запроса — без запуска поиска, чтобы показать «как понял» */
  http.post(api('/searches/parse'), async ({ request }) => {
    const { query } = (await request.json()) as { query: string };
    await delay(120);
    return HttpResponse.json(parseQuery(query ?? '', db.state.settings.city));
  }),

  /* Запуск поиска по подтверждённым фильтрам */
  http.post(api('/searches'), async ({ request }) => {
    const body = (await request.json()) as { query: string; filters: SearchFilters; weights?: Weights | null };
    if (!body?.filters) return HttpResponse.json({ error: 'bad_request', message: 'Нет фильтров' }, { status: 400 });
    const search: StoredSearch = {
      id: newId('s'),
      query: body.query ?? '',
      filters: body.filters,
      weights: weightsFor(body.filters, body.weights ?? db.state.settings.weights),
      createdAt: new Date().toISOString(),
    };
    db.update((s) => {
      s.searches = [search, ...s.searches].slice(0, 30);
    });
    return HttpResponse.json({ id: search.id }, { status: 201 });
  }),

  http.get(api('/searches'), () =>
    HttpResponse.json(db.state.searches.slice(0, 8).map((s) => ({ id: s.id, query: s.query, createdAt: s.createdAt, category: s.filters.category, city: s.filters.city }))),
  ),

  /* Поток прогресса (SSE): шаги и поставщики по мере готовности */
  http.get(api('/searches/:id/events'), ({ params, request }) => {
    const search = db.search(String(params.id));
    if (!search) return notFound('Поиск');
    const fast = new URL(request.url).searchParams.has('fast');
    const result = computeResult(search);
    const encoder = new TextEncoder();
    const wait = (ms: number) => (fast ? Promise.resolve() : new Promise((r) => setTimeout(r, ms)));
    let cancelled = false;
    const stream = new ReadableStream({
      async start(controller) {
        const send = (e: SearchEvent) => {
          if (!cancelled) controller.enqueue(encoder.encode(formatSse(e, e.type)));
        };
        const supplierById = new Map(db.suppliers().map((s) => [s.id, s]));
        const regDown = result.items.filter((i) => supplierById.get(i.id)?.registryUnavailable).length;
        const docs = result.items.reduce((a, i) => a + i.activeDocs, 0);
        const steps: [SearchEvent & { type: 'step' }, number][] = [
          [{ type: 'step', step: 'parse', status: 'done', detail: search.filters.category ? CATEGORIES[search.filters.category].name : 'все категории' }, 250],
          [{ type: 'step', step: 'find', status: 'done', detail: `кандидатов: ${result.candidates}` }, 450],
          [{ type: 'step', step: 'legal', status: 'done', detail: regDown ? `проверено: ${result.candidates - regDown}, реестр не ответил: ${regDown}` : `проверено: ${result.candidates}` }, 450],
        ];
        for (const [e, ms] of steps) {
          send({ type: 'step', step: e.step, status: 'running' });
          await wait(ms);
          send(e);
        }
        send({ type: 'step', step: 'sites', status: 'running' });
        for (const item of result.items) {
          await wait(110);
          send({ type: 'supplier', item });
        }
        send({ type: 'step', step: 'sites', status: 'done', detail: `прочитано: ${result.items.length}` });
        send({ type: 'step', step: 'docs', status: 'running' });
        await wait(350);
        send({ type: 'step', step: 'docs', status: 'done', detail: `действующих документов: ${docs}` });
        send({ type: 'step', step: 'score', status: 'running' });
        await wait(250);
        send({ type: 'step', step: 'score', status: 'done' });
        send({ type: 'done', total: result.items.length });
        if (!cancelled) controller.close();
      },
      cancel() {
        cancelled = true;
      },
    });
    return new HttpResponse(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  }),

  /* Результаты поиска с оценками */
  http.get(api('/searches/:id'), async ({ params }) => {
    const search = db.search(String(params.id));
    if (!search) return notFound('Поиск');
    await delay(80);
    return HttpResponse.json(computeResult(search));
  }),

  /* Карточка поставщика (+ оценка в контексте поиска) */
  http.get(api('/suppliers/:id'), async ({ params, request }) => {
    const supplier = db.supplier(String(params.id));
    if (!supplier) return notFound('Поставщик');
    const searchId = new URL(request.url).searchParams.get('search');
    const search = searchId ? db.search(searchId) : undefined;
    const filters: SearchFilters = search?.filters ?? {
      category: supplier.categories[0] ?? null,
      products: [],
      city: db.state.settings.city,
      volume: null,
      docs: [],
      daily: false,
    };
    const weights = search?.weights ?? weightsFor(filters, db.state.settings.weights);
    await delay(80);
    return HttpResponse.json({ supplier, summary: summarize(supplier, filters, weights), filters, query: search?.query ?? null });
  }),

  /* Добавить своего поставщика */
  http.post(api('/suppliers'), async ({ request }) => {
    const input = (await request.json()) as NewSupplierInput;
    if (!input?.name?.trim() || !input.categories?.length || !input.city) {
      return HttpResponse.json({ error: 'bad_request', message: 'Нужны название, город и хотя бы одна категория' }, { status: 400 });
    }
    const supplier = manualSupplier(input);
    db.update((s) => {
      s.manual.push(supplier);
    });
    return HttpResponse.json(supplier, { status: 201 });
  }),

  /* Страница-источник */
  http.get(api('/sources/:id'), ({ params }) => {
    const page = db.source(String(params.id));
    return page ? HttpResponse.json(page) : notFound('Источник');
  }),

  /* Черновик письма */
  http.post(api('/suppliers/:id/letter'), async ({ params, request }) => {
    const supplier = db.supplier(String(params.id));
    if (!supplier) return notFound('Поставщик');
    const { searchId } = ((await request.json().catch(() => ({}))) ?? {}) as { searchId?: string };
    const search = searchId ? db.search(searchId) : undefined;
    await delay(150);
    return HttpResponse.json(buildLetter(supplier, search?.filters ?? null, db.state.settings.company));
  }),

  /* Шорт-лист */
  http.get(api('/shortlist'), () => HttpResponse.json(db.state.shortlist)),

  http.put(api('/shortlist/:id'), async ({ params, request }) => {
    const supplier = db.supplier(String(params.id));
    if (!supplier) return notFound('Поставщик');
    const { searchId } = ((await request.json().catch(() => ({}))) ?? {}) as { searchId?: string };
    const search = searchId ? db.search(searchId) : undefined;
    const score = search ? summarize(supplier, search.filters, search.weights).score.total : null;
    db.update((s) => {
      const existing = s.shortlist.find((e) => e.supplierId === supplier.id);
      if (existing) {
        if (search) {
          existing.lastScore = score;
          existing.lastQuery = search.query;
          existing.lastSearchId = search.id;
        }
        return;
      }
      const entry: ShortlistEntry = {
        supplierId: supplier.id,
        name: supplier.name,
        city: supplier.city,
        status: 'new',
        addedAt: new Date().toISOString(),
        nextStep: null,
        notes: [],
        lastScore: score,
        lastQuery: search?.query ?? null,
        lastSearchId: search?.id ?? null,
      };
      s.shortlist.unshift(entry);
    });
    return HttpResponse.json(db.state.shortlist.find((e) => e.supplierId === supplier.id));
  }),

  http.patch(api('/shortlist/:id'), async ({ params, request }) => {
    const patch = (await request.json()) as { status?: PipelineStatus; nextStep?: string | null; note?: string; removeNote?: string };
    let found: ShortlistEntry | undefined;
    db.update((s) => {
      found = s.shortlist.find((e) => e.supplierId === params.id);
      if (!found) return;
      if (patch.status && STATUS[patch.status]) found.status = patch.status;
      if (patch.nextStep !== undefined) found.nextStep = patch.nextStep;
      if (patch.note?.trim()) found.notes.unshift({ id: newId('n'), text: patch.note.trim(), createdAt: new Date().toISOString() });
      if (patch.removeNote) found.notes = found.notes.filter((n) => n.id !== patch.removeNote);
    });
    return found ? HttpResponse.json(found) : notFound('Поставщик в шорт-листе');
  }),

  http.delete(api('/shortlist/:id'), ({ params }) => {
    db.update((s) => {
      s.shortlist = s.shortlist.filter((e) => e.supplierId !== params.id);
    });
    return new HttpResponse(null, { status: 204 });
  }),

  /* Выгрузка шорт-листа: CSV для Excel (точка с запятой, BOM — чтобы кириллица открылась) */
  http.get(api('/shortlist/export'), () => {
    const head = ['Поставщик', 'Город', 'Статус', 'Следующий шаг', 'Оценка', 'Запрос', 'Телефон', 'Почта', 'Сайт', 'Ключевая цена', 'Источник цены', 'Минимальный заказ', 'Доставка', 'Документы', 'Заметки'];
    const rows = db.state.shortlist.map((e) => {
      const s = db.supplier(e.supplierId);
      const search = e.lastSearchId ? db.search(e.lastSearchId) : undefined;
      const sum = s && search ? summarize(s, search.filters, search.weights) : s ? summarize(s, { category: s.categories[0] ?? null, products: [], city: e.city, volume: null, docs: [], daily: false }, weightsFor({ category: s.categories[0] ?? null })) : null;
      const offer = s?.offers.find((o) => o.name === sum?.keyPrice?.name);
      const docs = s?.documents.filter((d) => d.status === 'active').map((d) => `${d.number} (${d.productLabel})`).join(', ');
      return [
        e.name,
        CITIES[e.city].name,
        STATUS[e.status].name,
        e.nextStep ?? '',
        e.lastScore ?? sum?.score.total ?? '',
        e.lastQuery ?? '',
        s?.contacts.phone.value ?? '',
        s?.contacts.email.value ?? '',
        s?.website ?? '',
        sum?.keyPrice ? `${sum.keyPrice.name}: ${priceLine(sum.keyPrice.price)}` : 'нет данных',
        offer?.price.sourceId ? db.source(offer.price.sourceId)?.url ?? '' : '',
        sum?.moq ? moqLine(sum.moq) : 'нет данных',
        s?.delivery.schedule.value ?? 'нет данных',
        docs || 'нет данных',
        e.notes.map((n) => n.text).join(' | '),
      ];
    });
    const csv = '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
    return new HttpResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="shortlist-${today()}.csv"`,
      },
    });
  }),

  /* Сбросить демо */
  http.post(api('/demo/reset'), () => {
    db.reset();
    return new HttpResponse(null, { status: 204 });
  }),
];
