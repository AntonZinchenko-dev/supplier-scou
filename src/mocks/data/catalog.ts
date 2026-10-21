import type {
  CategoryId,
  CityId,
  Fact,
  FactMethod,
  LegalStatus,
  Moq,
  Offer,
  Price,
  SourceBlock,
  SourcePage,
  Supplier,
  SupplierDoc,
  Unit,
} from '../../shared/api/types';
import { CITIES, DEMO_TODAY, PRODUCT_BY_ID, UNIT_LABEL } from '../../shared/config/dictionary';
import { date, dateShort, money, num } from '../../shared/lib/format';
import { PROFILES, type Profile } from './profiles';

/**
 * Генератор демо-каталога. Детерминированный: зерно случайности — slug поставщика,
 * поэтому каталог всегда одинаковый и тесты на нём стабильны.
 *
 * Главное правило то же, что в боевой версии: каждый факт ссылается на страницу-источник,
 * а цитата дословно встречается на этой странице (это проверяет tests/catalog.test.ts).
 */

export interface Catalog {
  suppliers: Supplier[];
  sources: Record<string, SourcePage>;
}

/* ─────────── Случайность с зерном ─────────── */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const int = (r: Rng, min: number, max: number) => Math.floor(min + r() * (max - min + 1));
const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)] as T;

function nicePrice(n: number): number {
  if (n < 30) return Math.round(n);
  if (n < 200) return Math.round(n);
  if (n < 1000) return Math.round(n / 5) * 5;
  return Math.round(n / 10) * 10;
}

function addDays(iso: string, days: number): string {
  const d = new Date(Date.parse(iso) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/* ─────────── Реквизиты с заведомо неверной контрольной суммой ─────────── */

const INN10 = [2, 4, 10, 3, 5, 9, 4, 6, 8];

export function innChecksum(first9: string): number {
  const s = first9.split('').reduce((acc, d, i) => acc + Number(d) * (INN10[i] ?? 0), 0);
  return (s % 11) % 10;
}

/** Настоящий ИНН юрлица (10 цифр) проходит эту проверку. Демо-ИНН — никогда. */
export function innIsValid(inn: string): boolean {
  if (!/^\d{10}$/.test(inn)) return false;
  return innChecksum(inn.slice(0, 9)) === Number(inn[9]);
}

export function ogrnIsValid(ogrn: string): boolean {
  if (!/^\d{13}$/.test(ogrn)) return false;
  return Number((BigInt(ogrn.slice(0, 12)) % 11n) % 10n) === Number(ogrn[12]);
}

function makeInn(r: Rng, prefix: string): string {
  let body = prefix;
  while (body.length < 9) body += String(int(r, 0, 9));
  const good = innChecksum(body);
  return body + String((good + int(r, 1, 9)) % 10);
}

function makeOgrn(r: Rng, prefix: string, year: number): string {
  let body = '1' + String(year).slice(2) + prefix;
  while (body.length < 12) body += String(int(r, 0, 9));
  const good = Number((BigInt(body) % 11n) % 10n);
  return body + String((good + int(r, 1, 9)) % 10);
}

/* ─────────── Словари текста ─────────── */

const DAT: Record<CityId, string> = {
  ekb: 'Екатеринбургу',
  chel: 'Челябинску',
  perm: 'Перми',
  tmn: 'Тюмени',
  ntagil: 'Нижнему Тагилу',
  msk: 'Москве',
};

const STREETS = ['ул. Складская', 'ул. Промышленная', 'ул. Заводская', 'пер. Холодильный', 'ул. Оптовиков', 'ул. Монтажная', 'ул. Транспортная', 'ул. Полевая', 'ул. Береговая', 'ул. Фабричная'];

const OKVED: Record<CategoryId, { producer: [string, string]; distributor: [string, string] }> = {
  dairy: { producer: ['10.51', 'Производство молока (кроме сырого) и молочной продукции'], distributor: ['46.33', 'Торговля оптовая молочными продуктами, яйцами и пищевыми маслами и жирами'] },
  meat: { producer: ['10.11', 'Переработка и консервирование мяса'], distributor: ['46.32', 'Торговля оптовая мясом и мясными продуктами'] },
  fish: { producer: ['10.20', 'Переработка и консервирование рыбы, ракообразных и моллюсков'], distributor: ['46.38.1', 'Торговля оптовая рыбой, ракообразными и моллюсками'] },
  veg: { producer: ['01.13', 'Выращивание овощей, бахчевых, корнеплодных и клубнеплодных культур'], distributor: ['46.31', 'Торговля оптовая фруктами и овощами'] },
  grocery: { producer: ['10.61', 'Производство продуктов мукомольной и крупяной промышленности'], distributor: ['46.39', 'Торговля оптовая неспециализированная пищевыми продуктами'] },
  drinks: { producer: ['11.07', 'Производство безалкогольных напитков и минеральных вод'], distributor: ['46.34', 'Торговля оптовая напитками'] },
  ready: { producer: ['10.85', 'Производство готовых пищевых продуктов и блюд'], distributor: ['46.39', 'Торговля оптовая неспециализированная пищевыми продуктами'] },
  bakery: { producer: ['10.71', 'Производство хлеба и мучных кондитерских изделий'], distributor: ['46.36', 'Торговля оптовая сахаром, шоколадом и сахаристыми кондитерскими изделиями'] },
  packaging: { producer: ['17.21', 'Производство гофрированной бумаги и картона, бумажной и картонной тары'], distributor: ['46.49', 'Торговля оптовая прочими бытовыми товарами'] },
};

const DECL_LABEL: Record<CategoryId, string> = {
  dairy: 'молоко и молочная продукция',
  meat: 'мясо и мясная продукция',
  fish: 'рыба охлаждённая и морепродукты',
  veg: 'овощи свежие',
  grocery: 'бакалейная продукция',
  drinks: 'безалкогольные напитки',
  ready: 'кулинарная продукция и полуфабрикаты',
  bakery: 'хлебобулочные изделия',
  packaging: 'упаковка для пищевой продукции (ТР ТС 005/2011)',
};

/** Те же формулировки в винительном падеже — для «декларация на …» */
const DECL_ACC: Record<CategoryId, string> = {
  dairy: 'молоко и молочную продукцию',
  meat: 'мясо и мясную продукцию',
  fish: 'рыбу охлаждённую и морепродукты',
  veg: 'свежие овощи',
  grocery: 'бакалейную продукцию',
  drinks: 'безалкогольные напитки',
  ready: 'кулинарную продукцию и полуфабрикаты',
  bakery: 'хлебобулочные изделия',
  packaging: 'упаковку для пищевой продукции',
};

const SCHEDULE: Record<Profile['schedule'], string> = {
  daily: 'ежедневно, с 6:00 до 12:00',
  weekdays: 'по будням, заказ до 16:00 — привезём на следующий день',
  '3x': 'понедельник, среда, пятница',
  '2x': 'вторник и пятница',
  weekly: 'раз в неделю, по четвергам',
};

/** Размер упаковки для цены «за коробку» */
function pack(productId: string, unit: Unit): { size: number; label: string } {
  const special: Record<string, { size: number; label: string }> = {
    salmon: { size: 5, label: 'коробка 5 кг' },
    trout: { size: 10, label: 'ящик 10 кг' },
    shrimp: { size: 5, label: 'коробка 5 кг' },
    tuna: { size: 5, label: 'коробка 5 кг' },
    eel: { size: 2, label: 'упаковка 2 кг' },
    potato: { size: 25, label: 'сетка 25 кг' },
    flour: { size: 50, label: 'мешок 50 кг' },
    sugar: { size: 50, label: 'мешок 50 кг' },
    sushirice: { size: 25, label: 'мешок 25 кг' },
    oil: { size: 15, label: 'короб 3 × 5 л' },
    water: { size: 12, label: 'упаковка 12 шт.' },
    lemonade: { size: 24, label: 'ящик 24 шт.' },
    juice: { size: 12, label: 'короб 12 шт.' },
    cups: { size: 1000, label: 'короб 1000 шт.' },
    cutlery: { size: 1000, label: 'короб 1000 шт.' },
    croissant: { size: 60, label: 'коробка 60 шт.' },
    buns: { size: 48, label: 'лоток 48 шт.' },
  };
  if (special[productId]) return special[productId];
  if (unit === 'kg') return { size: 10, label: 'коробка 10 кг' };
  if (unit === 'l') return { size: 12, label: 'коробка 12 л' };
  if (unit === 'pcs') return { size: 300, label: 'короб 300 шт.' };
  return { size: 10, label: 'коробка 10 уп.' };
}

/* ─────────── Сборка факта ─────────── */

function found<T>(value: T, method: FactMethod, sourceId: string, quote: string, fetchedAt: string, raw?: string): Fact<T> {
  return { value, status: 'confirmed', method, sourceId, quote, fetchedAt, raw: raw ?? quote };
}

function missing<T>(method: FactMethod, fetchedAt: string, sourceId?: string): Fact<T> {
  return { value: null, status: 'not_found', method, fetchedAt, sourceId };
}

/* ─────────── Один поставщик ─────────── */

function deliveryCities(p: Profile): CityId[] {
  switch (p.delivery) {
    case 'city':
      return [p.city];
    case 'region':
      if (p.city === 'ekb') return ['ekb', 'ntagil'];
      if (p.city === 'ntagil') return ['ntagil', 'ekb'];
      return [p.city];
    case 'ural':
      return ['ekb', 'chel', 'perm', 'tmn', 'ntagil'];
    default:
      return [];
  }
}

function deliveryText(p: Profile): string {
  switch (p.delivery) {
    case 'city':
      return `Доставляем своим транспортом по ${DAT[p.city]}.`;
    case 'region':
      if (p.city === 'ekb') return 'Доставляем своим транспортом по Екатеринбургу и Нижнему Тагилу, по области — по согласованию.';
      if (p.city === 'ntagil') return 'Доставляем своим транспортом по Нижнему Тагилу и Екатеринбургу.';
      return `Доставляем своим транспортом по ${DAT[p.city]} и пригородам.`;
    case 'ural':
      return 'Возим своим транспортом в Екатеринбург, Челябинск, Пермь, Тюмень и Нижний Тагил.';
    case 'russia':
      return 'Отправляем по всей России транспортными компаниями, срок 3–7 дней.';
    case 'pickup':
      return 'Работаем только на самовывоз со склада.';
  }
}

function buildSupplier(p: Profile, sources: Record<string, SourcePage>): Supplier {
  const r = mulberry32(hash(p.slug));
  const city = CITIES[p.city];
  const host = `${p.slug}.example`;
  const site = `https://${host}`;
  const fetchedAt = p.stale ? addDays(DEMO_TODAY, -int(r, 42, 80)) : addDays(DEMO_TODAY, -int(r, 1, 19));
  const ids = {
    main: `${p.slug}:site`,
    delivery: `${p.slug}:delivery`,
    contacts: `${p.slug}:contacts`,
    registry: `${p.slug}:registry`,
    docs: `${p.slug}:docs`,
  };

  /* Реквизиты */
  const regYear = Number(DEMO_TODAY.slice(0, 4)) - Math.floor(p.age);
  const registeredAt = addDays(DEMO_TODAY, -Math.round(p.age * 365.25) - int(r, 0, 25));
  const inn = makeInn(r, city.innPrefix);
  const ogrn = makeOgrn(r, city.innPrefix, Number(registeredAt.slice(0, 4)) || regYear);
  const mainCat = p.cats[0] as CategoryId;
  const okvedPair = p.okvedFood === false
    ? (['68.20', 'Аренда и управление собственным или арендованным недвижимым имуществом'] as [string, string])
    : OKVED[mainCat][p.kind === 'distributor' ? 'distributor' : 'producer'];
  const address = `г. ${city.name}, ${pick(r, STREETS)}, ${int(r, 2, 120)}`;

  /* Цены */
  const priceMul = p.kind === 'distributor' ? 1.05 : p.kind === 'farm' ? 0.98 : 0.96;
  const priceLines: string[] = [];
  const offers: Offer[] = [];
  const firstUnit = PRODUCT_BY_ID[p.products[0] ?? '']?.unit ?? 'kg';

  /* Минимальный заказ */
  let moqFact: Fact<Moq>;
  let moqLineText: string | null = null;
  let minSumFact: Fact<number>;
  if (p.moq.kind === 'sum') {
    moqLineText = `Минимальная сумма заказа — ${money(p.moq.value)}.`;
    moqFact = found({ kind: 'sum', value: p.moq.value }, 'site', ids.delivery, moqLineText, fetchedAt);
    minSumFact = found(p.moq.value, 'site', ids.delivery, moqLineText, fetchedAt);
  } else if (p.moq.kind === 'qty') {
    moqLineText = `Минимальный заказ — от ${num(p.moq.value)} ${UNIT_LABEL[firstUnit]}`;
    moqFact = found({ kind: 'qty', value: p.moq.value, unit: firstUnit }, 'site', ids.delivery, moqLineText, fetchedAt);
    minSumFact = missing('site', fetchedAt, ids.delivery);
  } else if (p.moq.kind === 'box') {
    const n = p.moq.value;
    const word = n === 1 ? 'одного короба' : `${n} коробок`;
    moqLineText = `Отгрузка от ${word}.`;
    const pk = pack(p.products[0] ?? '', firstUnit);
    moqFact = found({ kind: 'qty', value: pk.size * n, unit: firstUnit }, 'site', ids.delivery, moqLineText, fetchedAt, `от ${word} (${pk.label})`);
    minSumFact = missing('site', fetchedAt, ids.delivery);
  } else {
    moqFact = missing('site', fetchedAt, ids.delivery);
    minSumFact = missing('site', fetchedAt, ids.delivery);
  }

  p.products.forEach((pid, i) => {
    const prod = PRODUCT_BY_ID[pid];
    if (!prod) throw new Error(`Неизвестный товар ${pid} у ${p.slug}`);
    const name = pick(r, prod.priceNames);
    const base = nicePrice((prod.price[0] + r() * (prod.price[1] - prod.price[0])) * priceMul);
    let price: Fact<Price>;
    const onRequest = p.prices === 'none' || (p.prices === 'partial' && i % 2 === 1);
    if (onRequest) {
      const line = p.prices === 'none' ? `${name} — в наличии` : `${name} — цена по запросу`;
      priceLines.push(line);
      price = missing('site', fetchedAt, ids.main);
    } else if (p.prices === 'box') {
      const pk = pack(pid, prod.unit);
      const packPrice = nicePrice(base * pk.size);
      const line = `${name} — ${pk.label} — ${money(packPrice)}`;
      priceLines.push(line);
      price = found(
        { perUnit: Math.round(packPrice / pk.size), unit: prod.unit, packPrice, packSize: pk.size },
        'site', ids.main, line, fetchedAt, `${pk.label} — ${money(packPrice)}`,
      );
    } else {
      const line = `${name} — ${money(base)}/${UNIT_LABEL[prod.unit]}`;
      priceLines.push(line);
      price = found({ perUnit: base, unit: prod.unit }, 'site', ids.main, line, fetchedAt);
    }
    offers.push({ productId: pid, name: prod.name, price, moq: moqFact });
  });

  /* Документы */
  const documents: SupplierDoc[] = [];
  const docBlocks: SourceBlock[] = [];
  const animal = p.cats.some((c) => c === 'dairy' || c === 'meat' || c === 'fish');
  if (p.docs !== 'none') {
    const cats = p.docs === 'partial' ? [mainCat] : p.cats;
    cats.forEach((cat, ci) => {
      const catProducts = p.products.filter((pid) => PRODUCT_BY_ID[pid]?.category === cat);
      const covered = p.docs === 'partial' ? catProducts.slice(0, 1) : catProducts;
      if (!covered.length) return;
      const prodName = PRODUCT_BY_ID[covered[0] ?? '']?.name ?? '';
      const label = p.docs === 'partial' ? `«${prodName}»` : DECL_LABEL[cat];
      const accLabel = p.docs === 'partial' ? `«${prodName}»` : DECL_ACC[cat];
      const expired = p.docs === 'expired';
      const validUntil = expired ? addDays(DEMO_TODAY, -int(r, 20, 300)) : addDays(DEMO_TODAY, int(r, 150, 900));
      const year = Number(validUntil.slice(2, 4)) - (expired ? 3 : 2);
      const number = `ЕАЭС N RU Д-RU.ДЕМО.В.${String(int(r, 1000, 99999)).padStart(5, '0')}/${String(year).padStart(2, '0')}`;
      const statusText = expired ? `прекращена, срок истёк ${dateShort(validUntil)}` : `действует до ${dateShort(validUntil)}`;
      const text = `Продукция: ${label}. Статус: ${statusText}`;
      docBlocks.push({ type: 'row', label: `Декларация ${number}`, text });
      documents.push({
        id: `${p.slug}:decl:${ci}`,
        kind: 'declaration',
        number,
        products: covered,
        productLabel: accLabel,
        status: expired ? 'expired' : 'active',
        validUntil,
        sourceId: ids.docs,
        quote: text,
      });
    });
  }

  /* Тексты страниц */
  const deliveryLine = deliveryText(p);
  const scheduleLine = `График доставки: ${SCHEDULE[p.schedule]}.`;
  const coldLine = p.cold ? 'Доставка рефрижератором, +2…+4 °C.' : null;
  const deferralLine = p.deferral ? `Отсрочка платежа для постоянных клиентов — до ${p.deferral} дней.` : null;
  const vetLine = p.vet && (p.docs === 'full' || p.docs === 'partial') && animal
    ? 'Ветеринарные сопроводительные документы оформляем в системе «Меркурий» на каждую партию.'
    : null;
  const haccpLine = p.haccp ? 'Производство работает по системе ХАССП (ГОСТ Р 51705.1).' : null;
  const pickup = p.kind === 'distributor';
  const pickupLine = pickup ? `Самовывоз со склада: ${address}.` : null;

  if (vetLine) {
    documents.push({
      id: `${p.slug}:vet`,
      kind: 'vet',
      number: 'ВСД в ФГИС «Меркурий»',
      products: p.products.filter((pid) => ['dairy', 'meat', 'fish'].includes(PRODUCT_BY_ID[pid]?.category ?? '')),
      productLabel: 'на каждую партию',
      status: 'active',
      validUntil: null,
      sourceId: ids.delivery,
      quote: vetLine,
    });
  }
  if (haccpLine) {
    documents.push({
      id: `${p.slug}:haccp`,
      kind: 'haccp',
      number: 'ГОСТ Р 51705.1',
      products: p.products,
      productLabel: 'всё производство',
      status: 'active',
      validUntil: null,
      sourceId: ids.main,
      quote: haccpLine,
    });
  }

  const aboutDefault = p.kind === 'producer'
    ? `Собственное производство в ${city.loc}. Работаем с общепитом и розницей.`
    : p.kind === 'farm'
      ? 'Фермерское хозяйство. Небольшие партии, всё своё.'
      : `Оптовый склад в ${city.loc}. Ассортимент нескольких производителей.`;

  const priceHeader = p.prices === 'none' ? 'Ассортимент' : `Прайс-лист для юрлиц на ${date(fetchedAt)}`;
  const mainBlocks: SourceBlock[] = [
    { type: 'h', text: p.name.replace(/^(ООО|АО|КФХ) /, '') },
    { type: 'p', text: p.tagline + '.' },
    { type: 'p', text: p.about ?? aboutDefault },
    ...(haccpLine ? [{ type: 'p' as const, text: haccpLine }] : []),
    { type: 'h', text: priceHeader },
    ...priceLines.map((t) => ({ type: 'li' as const, text: t })),
    ...(p.prices === 'none' ? [{ type: 'p' as const, text: 'Цены высылаем по запросу после заявки.' }] : []),
    ...(p.prices === 'partial' ? [{ type: 'p' as const, text: 'Цены на позиции «по запросу» уточняйте у менеджера.' }] : []),
  ];
  sources[ids.main] = { id: ids.main, kind: 'site', supplierId: p.slug, title: 'Главная и прайс', url: `${site}/`, fetchedAt, blocks: mainBlocks };

  const deliveryBlocks: SourceBlock[] = [
    { type: 'h', text: 'Доставка и оплата' },
    { type: 'p', text: deliveryLine },
    { type: 'p', text: scheduleLine },
    ...(moqLineText ? [{ type: 'p' as const, text: moqLineText }] : []),
    ...(coldLine ? [{ type: 'p' as const, text: coldLine }] : []),
    ...(vetLine ? [{ type: 'p' as const, text: vetLine }] : []),
    ...(pickupLine ? [{ type: 'p' as const, text: pickupLine }] : []),
    { type: 'p', text: 'Оплата по счёту, работаем с НДС.' },
    ...(deferralLine ? [{ type: 'p' as const, text: deferralLine }] : []),
  ];
  sources[ids.delivery] = { id: ids.delivery, kind: 'site', supplierId: p.slug, title: 'Доставка и оплата', url: `${site}/dostavka`, fetchedAt, blocks: deliveryBlocks };

  const phone = `+7 (${city.phoneCode}) 0${int(r, 10, 99)}-${int(r, 10, 99)}-${int(r, 10, 99)}`;
  const email = `${pick(r, ['zakaz', 'opt', 'sales', 'horeca'])}@${host}`;
  const telegram = p.telegram ? `@${p.slug.replace(/-/g, '_')}_opt` : null;
  const showInn = p.siteInn !== false;
  const contactBlocks: SourceBlock[] = [
    { type: 'h', text: 'Контакты' },
    { type: 'row', label: 'Телефон отдела продаж', text: phone },
    { type: 'row', label: 'Почта для заявок', text: email },
    ...(telegram ? [{ type: 'row' as const, label: 'Telegram', text: telegram }] : []),
    ...(p.manager ? [{ type: 'row' as const, label: 'Менеджер', text: p.manager }] : []),
    { type: 'row', label: 'Адрес', text: address },
    ...(showInn ? [{ type: 'row' as const, label: 'Реквизиты', text: `${p.name}, ИНН ${inn}` }] : []),
  ];
  sources[ids.contacts] = { id: ids.contacts, kind: 'site', supplierId: p.slug, title: 'Контакты', url: `${site}/kontakty`, fetchedAt, blocks: contactBlocks };

  /* Выписка из реестра */
  const status: LegalStatus = p.status ?? 'active';
  const statusText: Record<LegalStatus, string> = {
    active: 'Действующее',
    liquidating: 'В процессе ликвидации',
    liquidated: 'Прекратило деятельность (ликвидировано)',
  };
  const linked = showInn && !p.registryDown;
  const regFetched = fetchedAt;
  let legal: Supplier['legal'];
  if (linked) {
    const okvedText = `${okvedPair[0]} ${okvedPair[1]}`;
    sources[ids.registry] = {
      id: ids.registry,
      kind: 'registry',
      supplierId: p.slug,
      title: 'Выписка из реестра юрлиц (демо)',
      url: `https://registry.example/${inn}`,
      fetchedAt: regFetched,
      blocks: [
        { type: 'h', text: p.name },
        { type: 'row', label: 'ИНН', text: inn },
        { type: 'row', label: 'ОГРН', text: ogrn },
        { type: 'row', label: 'Статус', text: statusText[status] },
        { type: 'row', label: 'Дата регистрации', text: dateShort(registeredAt) },
        { type: 'row', label: 'Основной вид деятельности', text: okvedText },
        { type: 'row', label: 'Адрес', text: address },
      ],
    };
    legal = {
      inn: found(inn, 'registry', ids.registry, inn, regFetched),
      ogrn: found(ogrn, 'registry', ids.registry, ogrn, regFetched),
      status: found(status, 'registry', ids.registry, statusText[status], regFetched),
      registeredAt: found(registeredAt, 'registry', ids.registry, dateShort(registeredAt), regFetched),
      okved: found({ code: okvedPair[0], title: okvedPair[1], food: p.okvedFood !== false }, 'registry', ids.registry, okvedText, regFetched),
    };
  } else {
    legal = {
      inn: showInn ? found(inn, 'site', ids.contacts, `ИНН ${inn}`, fetchedAt) : missing('site', fetchedAt, ids.contacts),
      ogrn: missing('registry', fetchedAt),
      status: missing('registry', fetchedAt),
      registeredAt: missing('registry', fetchedAt),
      okved: missing('registry', fetchedAt),
    };
  }

  if (docBlocks.length) {
    sources[ids.docs] = {
      id: ids.docs,
      kind: 'docs',
      supplierId: p.slug,
      title: 'Реестр деклараций о соответствии (демо)',
      url: `https://docs-registry.example/?inn=${inn}`,
      fetchedAt: regFetched,
      blocks: [{ type: 'h', text: `Заявитель: ${p.name}` }, ...docBlocks],
    };
  }

  const cities = deliveryCities(p);
  return {
    id: p.slug,
    name: p.name,
    tagline: p.tagline,
    kind: p.kind,
    city: p.city,
    address,
    website: site,
    categories: p.cats,
    registryUnavailable: p.registryDown || undefined,
    legal,
    contacts: {
      phone: found(phone, 'site', ids.contacts, phone, fetchedAt),
      email: found(email, 'site', ids.contacts, email, fetchedAt),
      telegram: telegram ? found(telegram, 'site', ids.contacts, telegram, fetchedAt) : missing('site', fetchedAt, ids.contacts),
      person: p.manager ? found(p.manager, 'site', ids.contacts, p.manager, fetchedAt) : missing('site', fetchedAt, ids.contacts),
    },
    offers,
    delivery: {
      cities: found(cities, 'site', ids.delivery, deliveryLine, fetchedAt),
      nationwide: p.delivery === 'russia',
      schedule: found(SCHEDULE[p.schedule], 'site', ids.delivery, scheduleLine, fetchedAt),
      daily: p.schedule === 'daily',
      minOrderSum: minSumFact,
      cold: coldLine ? found(true, 'site', ids.delivery, coldLine, fetchedAt) : missing('site', fetchedAt, ids.delivery),
      pickup,
    },
    documents,
    deferral: deferralLine && p.deferral
      ? found(p.deferral, 'site', ids.delivery, deferralLine, fetchedAt)
      : missing('site', fetchedAt, ids.delivery),
  };
}

let cache: Catalog | null = null;

export function buildCatalog(): Catalog {
  if (cache) return cache;
  const sources: Record<string, SourcePage> = {};
  const suppliers = PROFILES.map((p) => buildSupplier(p, sources));
  cache = { suppliers, sources };
  return cache;
}
