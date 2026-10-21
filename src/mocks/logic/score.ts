import type {
  CriterionId,
  Flag,
  Moq,
  Score,
  ScoreItem,
  SearchFilters,
  Supplier,
  SupplierSummary,
  Volume,
  Weights,
} from '../../shared/api/types';
import {
  CATEGORIES,
  CATEGORY_WEIGHTS,
  CITIES,
  CRITERIA_ORDER,
  DEFAULT_WEIGHTS,
  DEMO_TODAY,
  PRODUCT_BY_ID,
  UNIT_LABEL,
} from '../../shared/config/dictionary';
import { ageLabel, daysBetween, lcFirst, num, yearsBetween } from '../../shared/lib/format';

/**
 * Оценку считает код, а не модель: её можно объяснить по пунктам,
 * и на одних и тех же данных она всегда одинаковая.
 * Каждый критерий даёт долю 0…1, итог = Σ доля × вес. Веса в сумме — 100.
 */

export function weightsFor(filters: Pick<SearchFilters, 'category'>, custom?: Weights | null): Weights {
  if (custom) return normalizeWeights(custom);
  return (filters.category && CATEGORY_WEIGHTS[filters.category]) || DEFAULT_WEIGHTS;
}

export function normalizeWeights(w: Weights): Weights {
  const sum = CRITERIA_ORDER.reduce((a, k) => a + Math.max(0, w[k]), 0) || 1;
  const out = {} as Weights;
  let acc = 0;
  CRITERIA_ORDER.forEach((k, i) => {
    const v = i === CRITERIA_ORDER.length - 1 ? 100 - acc : Math.round((Math.max(0, w[k]) / sum) * 100);
    out[k] = v;
    acc += v;
  });
  return out;
}

const ANIMAL = new Set(['dairy', 'meat', 'fish']);

type SchedKey = 'daily' | 'weekdays' | '3x' | '2x' | 'weekly' | 'unknown';
const FREQ: Record<SchedKey, number> = { daily: 1, weekdays: 0.95, '3x': 0.85, '2x': 0.72, weekly: 0.55, unknown: 0.7 };
function scheduleKey(text: string | null): SchedKey {
  if (!text) return 'unknown';
  if (text.startsWith('ежедневно')) return 'daily';
  if (text.startsWith('по будням')) return 'weekdays';
  if (text.includes('понедельник')) return '3x';
  if (text.includes('вторник')) return '2x';
  if (text.includes('раз в неделю')) return 'weekly';
  return 'unknown';
}

function weeklyVolume(v: Volume): number {
  if (v.period === 'day') return v.value * 7;
  if (v.period === 'month') return v.value / 4.3;
  return v.value;
}

interface Part {
  share: number;
  text: string;
  sourceId?: string;
}

function productPart(s: Supplier, f: SearchFilters): Part {
  if (f.products.length) {
    const hits = f.products.filter((pid) => s.offers.some((o) => o.productId === pid));
    const miss = f.products.filter((pid) => !hits.includes(pid));
    const sameCat = miss.filter((pid) => s.categories.includes(PRODUCT_BY_ID[pid]?.category ?? 'dairy'));
    const share = (hits.length + sameCat.length * 0.2) / f.products.length;
    const firstHit = s.offers.find((o) => hits.includes(o.productId));
    const names = (ids: string[]) => ids.map((id) => lcFirst(PRODUCT_BY_ID[id]?.name ?? id)).join(', ');
    let text: string;
    if (!miss.length) text = `В прайсе есть ${names(hits)}`;
    else if (hits.length) text = `Есть ${names(hits)}; нет ${names(miss)}`;
    else if (sameCat.length) text = `Нужного товара нет в прайсе, есть другие позиции той же категории`;
    else text = `Нужного товара нет в ассортименте`;
    return { share, text, sourceId: firstHit?.price.sourceId ?? s.offers[0]?.price.sourceId };
  }
  if (f.category) {
    const n = s.offers.filter((o) => PRODUCT_BY_ID[o.productId]?.category === f.category).length;
    const share = n >= 3 ? 1 : n === 2 ? 0.8 : n === 1 ? 0.6 : s.categories.includes(f.category) ? 0.3 : 0;
    const cat = CATEGORIES[f.category].name.toLowerCase();
    const text = n ? `В ассортименте ${n} ${n === 1 ? 'позиция' : n < 5 ? 'позиции' : 'позиций'}: ${cat}` : `Профиль: ${cat}, позиций в прайсе не нашли`;
    return { share, text, sourceId: s.offers[0]?.price.sourceId };
  }
  return { share: s.offers.length ? 1 : 0.5, text: `${s.offers.length} позиций в ассортименте`, sourceId: s.offers[0]?.price.sourceId };
}

function deliveryPart(s: Supplier, f: SearchFilters): Part & { delivers: boolean | null } {
  const city = CITIES[f.city];
  const cities = s.delivery.cities.value ?? [];
  const src = s.delivery.cities.sourceId;
  let share = 0;
  let text: string;
  let delivers: boolean | null = false;
  if (cities.includes(f.city)) {
    share = 1;
    delivers = true;
    text = `Возит в ${city.acc} своим транспортом`;
  } else if (s.delivery.nationwide) {
    share = 0.4;
    delivers = null;
    text = `В ${city.acc} — только транспортными компаниями, 3–7 дней`;
  } else if (s.city === f.city) {
    share = 0.3;
    text = `Находится в ${city.loc}, про доставку на сайте не сказано`;
  } else if (s.delivery.cities.status === 'not_found') {
    share = 0.2;
    delivers = null;
    text = 'Про доставку не нашли — спросить в письме';
  } else {
    text = `Не возит в ${city.acc}`;
  }
  // Частота и удалённость: ежедневно из своего города лучше, чем раз в неделю из соседнего региона
  const freq = FREQ[scheduleKey(s.delivery.schedule.value)];
  if (share >= 1) {
    share = freq * (s.city === f.city || (f.city === 'ekb' && s.city === 'ntagil') || (f.city === 'ntagil' && s.city === 'ekb') ? 1 : 0.9);
  }
  if (f.daily && share > 0 && !s.delivery.daily) {
    const sched = s.delivery.schedule.value;
    const weekdays = sched?.startsWith('по будням');
    share = Math.max(0, share - (weekdays ? 0.1 : 0.3));
    text += sched ? `, но график — ${sched}` : ', график не указан';
  } else if (share >= 1 && s.delivery.schedule.value) {
    text += `, ${s.delivery.schedule.value.split(',')[0]}`;
  }
  return { share, text, sourceId: src, delivers };
}

function legalPart(s: Supplier): Part {
  const st = s.legal.status;
  if (st.status === 'not_found') {
    if (s.manual) return { share: 0.3, text: 'Добавлен вручную — реквизиты не проверены' };
    if (s.registryUnavailable) return { share: 0, text: 'Реестр не ответил — юрлицо не проверено' };
    return { share: 0, text: 'На сайте нет ИНН — не удалось связать с юрлицом' };
  }
  if (st.value !== 'active') {
    return { share: 0, text: st.value === 'liquidated' ? 'Компания ликвидирована' : 'Компания в процессе ликвидации', sourceId: st.sourceId };
  }
  let share = 0.4;
  const reg = s.legal.registeredAt.value;
  const years = reg ? yearsBetween(reg, DEMO_TODAY) : 0;
  if (years >= 3) share += 0.3;
  else if (years >= 1) share += 0.15;
  const okved = s.legal.okved.value;
  if (okved?.food) share += 0.3;
  const parts = [`действует ${ageLabel(years)}`];
  if (okved) parts.push(okved.food ? `профиль — ${okved.title.toLowerCase().split(',')[0]}` : `вид деятельности: ${okved.title.toLowerCase()}`);
  const text = parts.join(', ');
  return { share: Math.min(1, share), text: text[0]?.toUpperCase() + text.slice(1), sourceId: st.sourceId };
}

function docsPart(s: Supplier, f: SearchFilters): Part & { vetMissing: boolean; allExpired: boolean } {
  const cat = f.category ?? s.categories[0] ?? 'grocery';
  const wantVet = f.docs.includes('vet') || (ANIMAL.has(cat) && CATEGORIES[cat].docs.includes('vet'));
  const strictVet = f.docs.includes('vet');
  const decls = s.documents.filter((d) => d.kind === 'declaration' || d.kind === 'certificate');
  const active = decls.filter((d) => d.status === 'active');
  const target = f.products.length ? f.products : s.offers.filter((o) => PRODUCT_BY_ID[o.productId]?.category === cat).map((o) => o.productId);
  const covering = active.filter((d) => target.some((pid) => d.products.includes(pid)));
  const fullCover = active.find((d) => target.every((pid) => d.products.includes(pid) || !s.offers.some((o) => o.productId === pid)));
  const vet = s.documents.find((d) => d.kind === 'vet' && d.status === 'active');
  const haccp = s.documents.find((d) => d.kind === 'haccp');
  const base = wantVet ? 0.8 : 1;
  let share = 0;
  const bits: string[] = [];
  let sourceId: string | undefined;
  if (fullCover) {
    share = base;
    bits.push(`декларация на ${fullCover.productLabel} действует`);
    sourceId = fullCover.sourceId;
  } else if (covering.length || active.length) {
    share = base * 0.5;
    const d = covering[0] ?? active[0];
    bits.push(`декларация только на ${d?.productLabel}`);
    sourceId = d?.sourceId;
  } else if (decls.length) {
    bits.push('все декларации истекли');
    sourceId = decls[0]?.sourceId;
  } else {
    bits.push('деклараций не нашли');
  }
  if (wantVet) {
    if (vet) {
      share += 0.2;
      bits.push('ветдокументы в «Меркурии»');
      sourceId = sourceId ?? vet.sourceId;
    } else {
      bits.push('ветдокументов нет');
      if (strictVet) share = Math.min(share, 0.4);
    }
  }
  if (haccp) {
    share += 0.1;
    bits.push('ХАССП');
  }
  const text = bits.join(', ');
  return {
    share: Math.min(1, share),
    text: text[0]?.toUpperCase() + text.slice(1),
    sourceId,
    vetMissing: strictVet && !vet,
    allExpired: decls.length > 0 && !active.length,
  };
}

function keyOffer(s: Supplier, f: SearchFilters) {
  const byRequest = f.products.map((pid) => s.offers.find((o) => o.productId === pid)).filter(Boolean);
  const inCat = s.offers.filter((o) => !f.category || PRODUCT_BY_ID[o.productId]?.category === f.category);
  return byRequest[0] ?? inCat.find((o) => o.price.value) ?? inCat[0] ?? s.offers[0];
}

function termsPart(s: Supplier, f: SearchFilters): Part {
  const offer = keyOffer(s, f);
  const hasPrice = Boolean(offer?.price.value);
  const moq = offer?.moq.value ?? s.delivery.minOrderSum.value;
  const hasDelivery = Boolean(s.delivery.schedule.value || s.delivery.minOrderSum.value);
  const share = (hasPrice ? 0.4 : 0) + (moq ? 0.3 : 0) + (hasDelivery ? 0.3 : 0);
  const known: string[] = [];
  const unknown: string[] = [];
  (hasPrice ? known : unknown).push('цена');
  (moq ? known : unknown).push('минимальный заказ');
  (hasDelivery ? known : unknown).push('условия доставки');
  const text = unknown.length ? `Известно: ${known.join(', ') || 'ничего'}; нет: ${unknown.join(', ')}` : 'Известны цена, минимальный заказ и доставка';
  return { share, text, sourceId: offer?.price.sourceId };
}

function freshPart(s: Supplier): Part {
  if (s.manual) return { share: 1, text: 'Данные внесены вручную' };
  const d = daysBetween(s.contacts.phone.fetchedAt, DEMO_TODAY);
  const share = d <= 30 ? 1 : d <= 60 ? 0.4 : 0;
  return { share, text: d <= 30 ? `Собрано ${d} ${d === 1 ? 'день' : d < 5 ? 'дня' : 'дней'} назад` : `Собрано ${d} дней назад — могло устареть` };
}

function moqFlag(moq: Moq | null, v: Volume | null): Flag | null {
  if (!moq || !v || moq.kind !== 'qty' || moq.unit !== v.unit) return null;
  const week = weeklyVolume(v);
  if (moq.value <= week) return null;
  return {
    level: 'amber',
    code: 'moq',
    text: `Минимальный заказ ${num(moq.value)} ${UNIT_LABEL[moq.unit]} больше вашего объёма ${num(week)} ${UNIT_LABEL[v.unit]} в неделю`,
  };
}

export function scoreSupplier(s: Supplier, f: SearchFilters, weights: Weights): Score & { delivers: boolean | null } {
  const parts: Record<CriterionId, Part> = {
    product: productPart(s, f),
    delivery: deliveryPart(s, f),
    legal: legalPart(s),
    docs: docsPart(s, f),
    terms: termsPart(s, f),
    fresh: freshPart(s),
  };
  const items: ScoreItem[] = CRITERIA_ORDER.map((c) => {
    const p = parts[c];
    const max = weights[c];
    return { criterion: c, share: p.share, points: Math.round(p.share * max), max, text: p.text, sourceId: p.sourceId };
  });
  let total = items.reduce((a, i) => a + i.points, 0);

  const flags: Flag[] = [];
  let blocked = false;
  const st = s.legal.status;
  if (st.value === 'liquidated' || st.value === 'liquidating') {
    blocked = true;
    flags.push({
      level: 'red',
      code: 'liquidation',
      text: st.value === 'liquidated' ? 'Компания ликвидирована — не работать' : 'Компания ликвидируется — не работать',
      sourceId: st.sourceId,
    });
  }
  const reg = s.legal.registeredAt.value;
  if (reg && yearsBetween(reg, DEMO_TODAY) < 0.5) {
    flags.push({ level: 'red', code: 'young', text: `Компании меньше 6 месяцев (${ageLabel(yearsBetween(reg, DEMO_TODAY))})`, sourceId: s.legal.registeredAt.sourceId });
  }
  const okved = s.legal.okved.value;
  if (okved && !okved.food) {
    flags.push({ level: 'red', code: 'okved', text: 'Вид деятельности не про еду и упаковку — возможно, перекупщик', sourceId: s.legal.okved.sourceId });
  }
  const docs = parts.docs as ReturnType<typeof docsPart>;
  if (docs.allExpired) {
    flags.push({ level: 'red', code: 'expired', text: 'Все найденные декларации истекли', sourceId: docs.sourceId });
  }
  if (st.status === 'not_found' && !s.manual) {
    if (s.registryUnavailable) flags.push({ level: 'amber', code: 'registry', text: 'Реестр не ответил — юрлицо не проверено, проверка повторится позже' });
    else flags.push({ level: 'red', code: 'noinn', text: 'На сайте нет ИНН — не удалось связать сайт с юрлицом' });
  }
  if (docs.vetMissing) flags.push({ level: 'amber', code: 'vet', text: 'Нет ветеринарных документов, а в запросе они нужны' });
  const delivery = parts.delivery as ReturnType<typeof deliveryPart>;
  if (s.delivery.nationwide) flags.push({ level: 'amber', code: 'tk', text: 'Только через транспортные компании — для свежего не подходит' });
  if (f.daily && delivery.share > 0 && !s.delivery.daily && s.delivery.schedule.value) {
    flags.push({ level: 'amber', code: 'schedule', text: `Возит не каждый день: ${s.delivery.schedule.value}` });
  }
  const offer = keyOffer(s, f);
  const mf = moqFlag(offer?.moq.value ?? null, f.volume);
  if (mf) flags.push(mf);
  if (!s.manual && daysBetween(s.contacts.phone.fetchedAt, DEMO_TODAY) > 30) {
    flags.push({ level: 'amber', code: 'stale', text: 'Данные старше 30 дней — могли устареть' });
  }

  if (blocked) total = Math.min(total, 10);
  return { total, items, flags, blocked, delivers: delivery.delivers };
}

/**
 * Если в запросе нет товара, цены сравниваем по одному «опорному» товару —
 * самому частому в выдаче. Иначе в одной колонке оказались бы молоко за литр и масло за килограмм.
 */
export function referenceProduct(items: Supplier[], f: SearchFilters): string | null {
  if (f.products.length || !f.category) return null;
  const counts = new Map<string, number>();
  for (const s of items) {
    for (const o of s.offers) {
      if (PRODUCT_BY_ID[o.productId]?.category === f.category && o.price.value) counts.set(o.productId, (counts.get(o.productId) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function summarize(s: Supplier, f: SearchFilters, weights: Weights, refProduct?: string | null): SupplierSummary {
  const sc = scoreSupplier(s, f, weights);
  const { delivers, ...score } = sc;
  const offer = keyOffer(s, f);
  const refOffer = refProduct ? s.offers.find((o) => o.productId === refProduct) : undefined;
  const priced = refProduct ? (refOffer?.price.value ? refOffer : null) : offer?.price.value ? offer : null;
  return {
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    city: s.city,
    kind: s.kind,
    manual: s.manual,
    deliversToCity: delivers,
    schedule: s.delivery.schedule.value,
    daily: s.delivery.daily,
    keyPrice: priced && priced.price.value ? { name: priced.name, price: priced.price.value } : null,
    moq: offer?.moq.value ?? null,
    minOrderSum: s.delivery.minOrderSum.value,
    activeDocs: s.documents.filter((d) => d.status === 'active').length,
    expiredDocs: s.documents.filter((d) => d.status === 'expired').length,
    score,
  };
}

export function rank(items: SupplierSummary[]): SupplierSummary[] {
  return [...items].sort((a, b) => {
    if (a.score.blocked !== b.score.blocked) return a.score.blocked ? 1 : -1;
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    return a.name.localeCompare(b.name, 'ru');
  });
}

export function matchesFilters(s: Supplier, f: SearchFilters): boolean {
  if (f.products.length && s.offers.some((o) => f.products.includes(o.productId))) return true;
  if (f.category) return s.categories.includes(f.category);
  if (f.products.length) return false;
  return true;
}
