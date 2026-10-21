/**
 * Контракт API. Те же типы описаны в contracts/openapi.yaml.
 * Демо (MSW в браузере) и будущий боевой сервер отдают ровно эти структуры.
 */

export type CityId = 'ekb' | 'chel' | 'perm' | 'tmn' | 'ntagil' | 'msk';

export type CategoryId =
  | 'dairy'
  | 'meat'
  | 'fish'
  | 'veg'
  | 'grocery'
  | 'drinks'
  | 'ready'
  | 'bakery'
  | 'packaging';

export type DocKind = 'declaration' | 'certificate' | 'vet' | 'haccp';

/** Откуда взялся факт */
export type FactMethod = 'registry' | 'site' | 'manual';
export type FactStatus = 'confirmed' | 'not_found';

/** Любое значение в карточке хранится вместе с источником */
export interface Fact<T> {
  value: T | null;
  status: FactStatus;
  /** Как написано в источнике: «от 3 коробок по 10 кг» */
  raw?: string;
  /** Дословная цитата — обязательно встречается на странице-источнике */
  quote?: string;
  sourceId?: string;
  method: FactMethod;
  /** Дата сбора, YYYY-MM-DD */
  fetchedAt: string;
}

export type Unit = 'kg' | 'l' | 'pcs' | 'pack';

export interface Price {
  /** Цена за единицу после приведения: ₽ за кг, литр, штуку */
  perUnit: number;
  unit: Unit;
  /** Если на сайте цена за упаковку: «коробка 10 кг — 26 900 ₽» */
  packPrice?: number;
  packSize?: number;
}

export interface Moq {
  kind: 'qty' | 'sum';
  value: number;
  unit?: Unit;
}

export interface Offer {
  productId: string;
  name: string;
  price: Fact<Price>;
  moq: Fact<Moq>;
}

export interface SupplierDoc {
  id: string;
  kind: DocKind;
  number: string;
  /** На какую продукцию: id товаров или категория целиком */
  products: string[];
  productLabel: string;
  status: 'active' | 'expired';
  validUntil: string | null;
  sourceId: string;
  quote: string;
}

export type LegalStatus = 'active' | 'liquidating' | 'liquidated';

export interface Supplier {
  id: string;
  name: string;
  /** Краткое описание: кто они */
  tagline: string;
  kind: 'producer' | 'distributor' | 'farm';
  city: CityId;
  address: string;
  website: string | null;
  categories: CategoryId[];
  manual?: boolean;
  /** Реестр не ответил при проверке (показываем «юрлицо не проверено») */
  registryUnavailable?: boolean;
  legal: {
    inn: Fact<string>;
    ogrn: Fact<string>;
    status: Fact<LegalStatus>;
    registeredAt: Fact<string>;
    okved: Fact<{ code: string; title: string; food: boolean }>;
  };
  contacts: {
    phone: Fact<string>;
    email: Fact<string>;
    telegram: Fact<string>;
    person: Fact<string>;
  };
  offers: Offer[];
  delivery: {
    cities: Fact<CityId[]>;
    /** Возит транспортными компаниями по России — долго, не для свежего */
    nationwide: boolean;
    schedule: Fact<string>;
    daily: boolean;
    minOrderSum: Fact<number>;
    cold: Fact<boolean>;
    pickup: boolean;
  };
  documents: SupplierDoc[];
  deferral: Fact<number>;
}

/** Страница-источник: снимок сайта поставщика или выписки из реестра */
export interface SourcePage {
  id: string;
  kind: 'site' | 'registry' | 'docs';
  supplierId: string;
  title: string;
  url: string;
  fetchedAt: string;
  blocks: SourceBlock[];
}

export type SourceBlock =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }
  | { type: 'row'; label: string; text: string };

/* ─────────── Поиск ─────────── */

export interface Volume {
  value: number;
  unit: Unit;
  period: 'day' | 'week' | 'month';
}

export interface SearchFilters {
  category: CategoryId | null;
  products: string[];
  city: CityId;
  /** Город взят из настроек, а не из запроса */
  cityIsDefault?: boolean;
  volume: Volume | null;
  docs: DocKind[];
  daily: boolean;
}

export interface ParsedQuery {
  raw: string;
  filters: SearchFilters;
  /** Слова, которые разбор не понял — показываем честно */
  unknown: string[];
}

export type CriterionId = 'product' | 'delivery' | 'legal' | 'docs' | 'terms' | 'fresh';

export type Weights = Record<CriterionId, number>;

export interface ScoreItem {
  criterion: CriterionId;
  /** Набранная доля критерия 0…1 */
  share: number;
  points: number;
  max: number;
  text: string;
  sourceId?: string;
}

export interface Flag {
  level: 'red' | 'amber';
  code: string;
  text: string;
  sourceId?: string;
}

export interface Score {
  total: number;
  items: ScoreItem[];
  flags: Flag[];
  /** «не работать» — уходит в конец списка */
  blocked: boolean;
}

export interface SupplierSummary {
  id: string;
  name: string;
  tagline: string;
  city: CityId;
  kind: Supplier['kind'];
  manual?: boolean;
  deliversToCity: boolean | null;
  schedule: string | null;
  daily: boolean;
  /** Цена главного товара из запроса */
  keyPrice: { name: string; price: Price } | null;
  moq: Moq | null;
  minOrderSum: number | null;
  activeDocs: number;
  expiredDocs: number;
  score: Score;
}

export interface SearchResult {
  id: string;
  createdAt: string;
  query: string;
  filters: SearchFilters;
  weights: Weights;
  candidates: number;
  /** По какому товару сравниваем цены, если в запросе товар не указан */
  priceFor: { productId: string; name: string } | null;
  items: SupplierSummary[];
}

/** События потока прогресса (SSE) */
export type SearchEvent =
  | { type: 'step'; step: StepId; status: 'running' | 'done'; detail?: string }
  | { type: 'supplier'; item: SupplierSummary }
  | { type: 'done'; total: number };

export type StepId = 'parse' | 'find' | 'legal' | 'sites' | 'docs' | 'score';

/* ─────────── Шорт-лист ─────────── */

export type PipelineStatus = 'new' | 'contacted' | 'waiting' | 'offer' | 'contract' | 'rejected';

export interface Note {
  id: string;
  text: string;
  createdAt: string;
}

export interface ShortlistEntry {
  supplierId: string;
  name: string;
  city: CityId;
  status: PipelineStatus;
  addedAt: string;
  nextStep: string | null;
  notes: Note[];
  /** Оценка и запрос, из которого добавили */
  lastScore: number | null;
  lastQuery: string | null;
  lastSearchId: string | null;
}

export interface Letter {
  to: string | null;
  subject: string;
  body: string;
  questions: string[];
}

export interface Settings {
  city: CityId;
  company: string;
  weights: Weights | null;
}

export interface NewSupplierInput {
  name: string;
  city: CityId;
  categories: CategoryId[];
  inn?: string;
  website?: string;
  phone?: string;
  email?: string;
  note?: string;
}
