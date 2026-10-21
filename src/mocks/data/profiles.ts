import type { CategoryId, CityId, LegalStatus } from '../../shared/api/types';

/**
 * Профили вымышленных поставщиков. Из профиля генератор (catalog.ts) собирает карточку,
 * цены, страницы сайта и выписки. Профиль задаёт «характер» поставщика, чтобы в демо
 * встретились все ситуации: лучший вариант, цена только за коробку, нет минимального
 * заказа, истёкшая декларация, ликвидация, молодая компания, сайт без ИНН, реестр не ответил.
 *
 * Все компании вымышлены. Совпадения названий с реальными организациями случайны.
 */
export interface Profile {
  slug: string;
  name: string;
  tagline: string;
  kind: 'producer' | 'distributor' | 'farm';
  city: CityId;
  cats: CategoryId[];
  products: string[];
  /** city — только свой город; region — свой город и область; ural — крупные города Урала; russia — ТК по России */
  delivery: 'city' | 'region' | 'ural' | 'russia' | 'pickup';
  schedule: 'daily' | 'weekdays' | '3x' | '2x' | 'weekly';
  /** kg — цена за единицу; box — только за упаковку; partial — часть «по запросу»; none — прайс по запросу */
  prices: 'kg' | 'box' | 'partial' | 'none';
  moq: { kind: 'qty'; value: number } | { kind: 'sum'; value: number } | { kind: 'box'; value: number } | { kind: 'none' };
  /** full — на всё; partial — только на часть товаров; expired — все истекли; none — нет */
  docs: 'full' | 'partial' | 'expired' | 'none';
  vet?: boolean;
  haccp?: boolean;
  age: number;
  status?: LegalStatus;
  siteInn?: boolean;
  registryDown?: boolean;
  okvedFood?: boolean;
  cold?: boolean;
  deferral?: number;
  stale?: boolean;
  telegram?: boolean;
  manager?: string;
  about?: string;
}

export const PROFILES: Profile[] = [
  /* ───────────── Молочная продукция ───────────── */
  {
    slug: 'berezovka-moloko', name: 'ООО «Молочный двор Берёзовка»', tagline: 'Молочный завод полного цикла под Екатеринбургом',
    kind: 'producer', city: 'ekb', cats: ['dairy'], products: ['milk', 'cream', 'sourcream', 'cottage', 'butter'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 4000 }, docs: 'full', vet: true, haccp: true,
    age: 12, cold: true, deferral: 14, telegram: true, manager: 'Ольга, отдел HoReCa',
    about: 'Своё стадо и переработка. Работаем с кафе, столовыми и магазинами у дома с 2014 года.',
  },
  {
    slug: 'tikhaya-pad', name: 'ООО «Сыроварня Тихая Падь»', tagline: 'Моцарелла и сливочные сыры для пиццерий',
    kind: 'producer', city: 'ekb', cats: ['dairy'], products: ['mozzarella', 'cottage', 'cream', 'butter'],
    delivery: 'city', schedule: '3x', prices: 'kg', moq: { kind: 'qty', value: 10 }, docs: 'full', vet: true, haccp: true,
    age: 6, cold: true, manager: 'Дмитрий, технолог',
    about: 'Варим сыр из молока соседних ферм. Брусок моцареллы для пиццы — наш основной продукт.',
  },
  {
    slug: 'zeleny-lug', name: 'АО «Агрокомплекс Зелёный Луг»', tagline: 'Крупный производитель молочной продукции Южного Урала',
    kind: 'producer', city: 'chel', cats: ['dairy'], products: ['milk', 'sourcream', 'cottage', 'butter', 'cream'],
    delivery: 'ural', schedule: '2x', prices: 'box', moq: { kind: 'box', value: 3 }, docs: 'full', vet: true,
    age: 18, cold: true, deferral: 30,
    about: 'Отгружаем сетям и оптовикам по всему Уралу. Цены — за коробку или ведро.',
  },
  {
    slug: 'uralmolprodukt', name: 'ООО «Уралмолпродукт-Опт»', tagline: 'Оптовый склад молочной продукции нескольких заводов',
    kind: 'distributor', city: 'ekb', cats: ['dairy'], products: ['milk', 'cream', 'sourcream', 'mozzarella', 'butter'],
    delivery: 'region', schedule: 'weekdays', prices: 'partial', moq: { kind: 'sum', value: 8000 }, docs: 'partial', vet: true,
    age: 4, deferral: 21,
  },
  {
    slug: 'severnaya-burenka', name: 'КФХ «Северная Бурёнка»', tagline: 'Фермерское молоко и творог',
    kind: 'farm', city: 'ekb', cats: ['dairy'], products: ['milk', 'cottage', 'sourcream'],
    delivery: 'city', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 20 }, docs: 'full', vet: true,
    age: 2.5, stale: true, telegram: true,
  },
  {
    slug: 'chusovskie-luga', name: 'ООО «Чусовские луга»', tagline: 'Молочный завод в Пермском крае',
    kind: 'producer', city: 'perm', cats: ['dairy'], products: ['milk', 'cream', 'butter', 'cottage'],
    delivery: 'ural', schedule: 'weekly', prices: 'none', moq: { kind: 'none' }, docs: 'full', vet: true,
    age: 9,
  },
  {
    slug: 'holod-sklad-66', name: 'ООО «Холодный склад 66»', tagline: 'Дистрибуция охлаждённой молочной продукции',
    kind: 'distributor', city: 'ekb', cats: ['dairy'], products: ['mozzarella', 'butter', 'cream', 'milk'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 6000 }, docs: 'expired', vet: true,
    age: 1.5, cold: true,
  },
  {
    slug: 'lavka-istok', name: 'ООО «Молочная лавка Исток»', tagline: 'Молоко и сливки с доставкой по городу',
    kind: 'distributor', city: 'ekb', cats: ['dairy'], products: ['milk', 'cream', 'sourcream'],
    delivery: 'city', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 3000 }, docs: 'partial',
    age: 0.35, telegram: true,
  },
  {
    slug: 'tyumen-slivochnaya', name: 'ООО «Тюменская сливочная»', tagline: 'Сливочное масло и сливки',
    kind: 'producer', city: 'tmn', cats: ['dairy'], products: ['butter', 'cream', 'sourcream'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 30 }, docs: 'full', vet: true,
    age: 14, cold: true,
  },
  {
    slug: 'horeca-sklad', name: 'ООО «ГорекаСклад»', tagline: 'Всё для кухни ресторана с одного склада',
    kind: 'distributor', city: 'ekb', cats: ['dairy', 'grocery', 'fish', 'meat'],
    products: ['mozzarella', 'cream', 'butter', 'sushirice', 'nori', 'oil', 'shrimp', 'chicken'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 10000 }, docs: 'partial', vet: true,
    age: 7, cold: true, deferral: 30, telegram: true, manager: 'Игорь, менеджер HoReCa',
    about: 'Широкий ассортимент для ресторанов: молочка, бакалея, рыба, мясо. Один счёт — одна машина.',
  },
  {
    slug: 'slivochny-krai', name: 'ООО «Сливочный край»', tagline: 'Оптовая торговля молочной продукцией',
    kind: 'distributor', city: 'chel', cats: ['dairy'], products: ['milk', 'cream', 'cottage'],
    delivery: 'ural', schedule: '3x', prices: 'kg', moq: { kind: 'sum', value: 5000 }, docs: 'full', vet: true,
    age: 8, status: 'liquidating',
  },

  /* ───────────── Рыба и морепродукты ───────────── */
  {
    slug: 'severny-veter', name: 'ООО «Рыбная артель Северный ветер»', tagline: 'Охлаждённая рыба для суши-баров и ресторанов',
    kind: 'distributor', city: 'ekb', cats: ['fish'], products: ['salmon', 'trout', 'shrimp', 'tuna', 'eel'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'qty', value: 5 }, docs: 'full', vet: true, haccp: true,
    age: 11, cold: true, deferral: 14, telegram: true, manager: 'Анна, оптовый отдел',
    about: 'Свой цех разделки и холодильник +2 °C. Лосось везём авиа три раза в неделю, разделываем под заказ.',
  },
  {
    slug: 'okean-terminal', name: 'ООО «Океан-Терминал Урал»', tagline: 'Импорт и оптовая продажа морепродуктов',
    kind: 'distributor', city: 'ekb', cats: ['fish'], products: ['salmon', 'shrimp', 'tuna', 'eel'],
    delivery: 'ural', schedule: 'weekdays', prices: 'box', moq: { kind: 'box', value: 2 }, docs: 'full', vet: true,
    age: 15, cold: true, deferral: 21,
  },
  {
    slug: 'isetskaya-ryba', name: 'ООО «Исетская рыбная компания»', tagline: 'Переработка рыбы и пресервы',
    kind: 'producer', city: 'chel', cats: ['fish'], products: ['salmon', 'trout'],
    delivery: 'ural', schedule: '3x', prices: 'kg', moq: { kind: 'qty', value: 20 }, docs: 'partial', vet: true,
    age: 9, cold: true,
  },
  {
    slug: 'kurilsky-ulov', name: 'ООО «Курильский улов»', tagline: 'Морепродукты с Дальнего Востока по всей России',
    kind: 'distributor', city: 'msk', cats: ['fish'], products: ['salmon', 'shrimp', 'tuna'],
    delivery: 'russia', schedule: 'weekly', prices: 'kg', moq: { kind: 'sum', value: 30000 }, docs: 'full', vet: true,
    age: 6,
  },
  {
    slug: 'sushi-snab', name: 'ООО «Суши-Снаб Урал»', tagline: 'Снабжение суши-баров: рыба и японская бакалея',
    kind: 'distributor', city: 'ekb', cats: ['fish', 'grocery'], products: ['salmon', 'eel', 'shrimp', 'sushirice', 'nori'],
    delivery: 'city', schedule: 'daily', prices: 'partial', moq: { kind: 'sum', value: 7000 }, docs: 'partial',
    age: 3, telegram: true,
  },
  {
    slug: 'forel-tavatui', name: 'КФХ «Форелевое хозяйство Таватуй»', tagline: 'Выращиваем радужную форель',
    kind: 'farm', city: 'ekb', cats: ['fish'], products: ['trout'],
    delivery: 'region', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 10 }, docs: 'full', vet: true,
    age: 7, cold: true,
  },
  {
    slug: 'severnaya-guba', name: 'ООО «Северная Губа»', tagline: 'Рыба и морепродукты оптом',
    kind: 'distributor', city: 'ekb', cats: ['fish'], products: ['salmon', 'shrimp'],
    delivery: 'city', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 5000 }, docs: 'none',
    age: 0.4, siteInn: false,
  },
  {
    slug: 'kamskaya-ryba', name: 'ООО «Камская рыба»', tagline: 'Форель и речная рыба Прикамья',
    kind: 'producer', city: 'perm', cats: ['fish'], products: ['trout', 'salmon'],
    delivery: 'ural', schedule: 'weekly', prices: 'none', moq: { kind: 'none' }, docs: 'full', vet: true,
    age: 20, stale: true,
  },
  {
    slug: 'tobolsky-dvor', name: 'ООО «Тобольский рыбный двор»', tagline: 'Северная и океаническая рыба',
    kind: 'distributor', city: 'tmn', cats: ['fish'], products: ['salmon', 'trout', 'tuna'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 15 }, docs: 'expired', vet: true,
    age: 10, cold: true,
  },
  {
    slug: 'moreprodukty-e', name: 'ООО «Морепродукты-Е»', tagline: 'Креветки, тунец, лосось для ресторанов',
    kind: 'distributor', city: 'ekb', cats: ['fish'], products: ['shrimp', 'salmon', 'tuna', 'eel'],
    delivery: 'region', schedule: 'weekdays', prices: 'kg', moq: { kind: 'sum', value: 8000 }, docs: 'full', vet: true,
    age: 5, cold: true, deferral: 7,
  },

  /* ───────────── Упаковка ───────────── */
  {
    slug: 'kraft-tara', name: 'ООО «КрафтТара»', tagline: 'Производство крафт-упаковки для доставки еды',
    kind: 'producer', city: 'ekb', cats: ['packaging'], products: ['kraftbox', 'bags', 'cups'],
    delivery: 'region', schedule: 'weekdays', prices: 'kg', moq: { kind: 'box', value: 1 }, docs: 'full',
    age: 8, deferral: 14, telegram: true, manager: 'Сергей, отдел продаж',
    about: 'Своё производство: печатаем логотип от 3 000 штук. Короб — 300 коробок или 500 пакетов.',
  },
  {
    slug: 'ekoupak-ural', name: 'ООО «ЭкоУпак Урал»', tagline: 'Эко-упаковка и одноразовая посуда',
    kind: 'distributor', city: 'ekb', cats: ['packaging'], products: ['kraftbox', 'container', 'cutlery', 'cups'],
    delivery: 'ural', schedule: '3x', prices: 'box', moq: { kind: 'sum', value: 5000 }, docs: 'partial',
    age: 5,
  },
  {
    slug: 'plastform', name: 'ООО «Пластформ»', tagline: 'Контейнеры из полипропилена',
    kind: 'producer', city: 'chel', cats: ['packaging'], products: ['container'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 1000 }, docs: 'full',
    age: 13,
  },
  {
    slug: 'paket-opt', name: 'ООО «Пакет-Опт»', tagline: 'Пакеты, стаканы, приборы оптом',
    kind: 'distributor', city: 'perm', cats: ['packaging'], products: ['bags', 'cups', 'cutlery'],
    delivery: 'ural', schedule: 'weekly', prices: 'partial', moq: { kind: 'sum', value: 10000 }, docs: 'none',
    age: 6,
  },
  {
    slug: 'upakovka-24', name: 'ООО «Упаковка 24»', tagline: 'Упаковка для кафе с доставкой за день',
    kind: 'distributor', city: 'ekb', cats: ['packaging'], products: ['kraftbox', 'container', 'bags', 'cups', 'cutlery'],
    delivery: 'city', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 3000 }, docs: 'partial',
    age: 3, siteInn: false, telegram: true,
  },
  {
    slug: 'uralsky-karton', name: 'АО «Уральский картон»', tagline: 'Картонная тара и крафт-пакеты',
    kind: 'producer', city: 'ekb', cats: ['packaging'], products: ['kraftbox', 'bags'],
    delivery: 'region', schedule: 'weekly', prices: 'none', moq: { kind: 'box', value: 5 }, docs: 'full',
    age: 25,
  },
  {
    slug: 'pakmarket', name: 'ООО «Пакмаркет Онлайн»', tagline: 'Интернет-магазин упаковки для бизнеса',
    kind: 'distributor', city: 'msk', cats: ['packaging'], products: ['kraftbox', 'container', 'cups', 'bags', 'cutlery'],
    delivery: 'russia', schedule: 'weekly', prices: 'kg', moq: { kind: 'sum', value: 2000 }, docs: 'full',
    age: 7,
  },
  {
    slug: 'zelenaya-posuda', name: 'ООО «Зелёная посуда»', tagline: 'Деревянные приборы и бумажные стаканы',
    kind: 'distributor', city: 'ekb', cats: ['packaging'], products: ['cutlery', 'cups', 'kraftbox'],
    delivery: 'city', schedule: '3x', prices: 'kg', moq: { kind: 'qty', value: 500 }, docs: 'expired',
    age: 2,
  },
  {
    slug: 'sibirskaya-upakovka', name: 'ООО «Сибирская упаковка»', tagline: 'Контейнеры и стаканы собственного производства',
    kind: 'producer', city: 'tmn', cats: ['packaging'], products: ['container', 'cups'],
    delivery: 'ural', schedule: '2x', prices: 'box', moq: { kind: 'box', value: 4 }, docs: 'full',
    age: 11,
  },
  {
    slug: 'kraft-i-ko', name: 'ООО «Крафт и Ко»', tagline: 'Крафт-коробки и пакеты',
    kind: 'distributor', city: 'ekb', cats: ['packaging'], products: ['kraftbox', 'bags'],
    delivery: 'region', schedule: 'weekdays', prices: 'kg', moq: { kind: 'sum', value: 4000 }, docs: 'full',
    age: 1.2, okvedFood: false,
  },

  /* ───────────── Овощи, фрукты, зелень ───────────── */
  {
    slug: 'bely-klyuch', name: 'АО «Тепличный комбинат Белый Ключ»', tagline: 'Тепличные овощи и зелень круглый год',
    kind: 'producer', city: 'ekb', cats: ['veg'], products: ['cucumber', 'tomato', 'lettuce', 'greens'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'qty', value: 10 }, docs: 'full', haccp: true,
    age: 16, cold: true, deferral: 14, manager: 'Марина, работа с HoReCa',
    about: 'Собираем утром — привозим в тот же день. 12 гектаров теплиц под Екатеринбургом.',
  },
  {
    slug: 'ovoshchebaza-6', name: 'ООО «Овощебаза № 6»', tagline: 'Овощи и фрукты оптом со склада',
    kind: 'distributor', city: 'ekb', cats: ['veg'], products: ['potato', 'cucumber', 'tomato', 'lettuce', 'avocado', 'greens'],
    delivery: 'city', schedule: 'daily', prices: 'partial', moq: { kind: 'sum', value: 5000 }, docs: 'partial',
    age: 9, deferral: 14, telegram: true,
  },
  {
    slug: 'kfh-lugovoe', name: 'КФХ «Луговое»', tagline: 'Фермерский картофель и зелень',
    kind: 'farm', city: 'ekb', cats: ['veg'], products: ['potato', 'greens', 'cucumber'],
    delivery: 'region', schedule: '3x', prices: 'kg', moq: { kind: 'qty', value: 25 }, docs: 'partial',
    age: 6,
  },
  {
    slug: 'svezhy-ural', name: 'ООО «Свежий Урал»', tagline: 'Поставки овощей для ресторанов и столовых',
    kind: 'distributor', city: 'ekb', cats: ['veg'], products: ['potato', 'tomato', 'cucumber', 'avocado'],
    delivery: 'ural', schedule: 'daily', prices: 'box', moq: { kind: 'box', value: 2 }, docs: 'full',
    age: 4, registryDown: true,
  },
  {
    slug: 'yuzhnouralskie-ovoshchi', name: 'ООО «Южноуральские овощи»', tagline: 'Овощи с полей Челябинской области',
    kind: 'producer', city: 'chel', cats: ['veg'], products: ['potato', 'cucumber', 'tomato'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 50 }, docs: 'full',
    age: 12,
  },
  {
    slug: 'zeleny-dvor-prikamya', name: 'ООО «Зелёный двор Прикамья»', tagline: 'Микрозелень, салаты и пряные травы',
    kind: 'producer', city: 'perm', cats: ['veg'], products: ['greens', 'lettuce'],
    delivery: 'ural', schedule: 'weekly', prices: 'kg', moq: { kind: 'qty', value: 5 }, docs: 'full',
    age: 3,
  },
  {
    slug: 'frukt-import', name: 'ООО «Фрукт-Импорт»', tagline: 'Импортные овощи и фрукты',
    kind: 'distributor', city: 'msk', cats: ['veg'], products: ['avocado', 'tomato'],
    delivery: 'russia', schedule: 'weekly', prices: 'kg', moq: { kind: 'sum', value: 50000 }, docs: 'full',
    age: 10,
  },
  {
    slug: 'ovoshchnoy-ryad', name: 'ООО «Овощной ряд»', tagline: 'Овощи для кафе и столовых',
    kind: 'distributor', city: 'ekb', cats: ['veg'], products: ['potato', 'cucumber', 'tomato'],
    delivery: 'city', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 3000 }, docs: 'full',
    age: 6, status: 'liquidated',
  },
  {
    slug: 'tyumenskaya-niva', name: 'КФХ «Тюменская нива»', tagline: 'Картофель и огурцы от фермера',
    kind: 'farm', city: 'tmn', cats: ['veg'], products: ['potato', 'cucumber'],
    delivery: 'city', schedule: 'daily', prices: 'kg', moq: { kind: 'qty', value: 30 }, docs: 'partial',
    age: 8,
  },
  {
    slug: 'sad-iset', name: 'ООО «Сад и огород Исеть»', tagline: 'Овощи, зелень и авокадо',
    kind: 'distributor', city: 'ekb', cats: ['veg'], products: ['tomato', 'cucumber', 'greens', 'avocado', 'lettuce'],
    delivery: 'region', schedule: 'weekdays', prices: 'kg', moq: { kind: 'sum', value: 6000 }, docs: 'full',
    age: 7, stale: true,
  },
  {
    slug: 'tagilskaya-ovoshchnaya', name: 'ООО «Тагильская овощная компания»', tagline: 'Овощи оптом по области',
    kind: 'distributor', city: 'ntagil', cats: ['veg'], products: ['potato', 'cucumber', 'tomato', 'lettuce'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 4000 }, docs: 'partial',
    age: 5,
  },

  /* ───────────── Готовая еда ───────────── */
  {
    slug: 'dobry-obed', name: 'ООО «Фабрика-кухня Добрый обед»', tagline: 'Готовая еда для магазинов у дома и кофеен',
    kind: 'producer', city: 'ekb', cats: ['ready'], products: ['salads', 'soups', 'sandwiches', 'syrniki'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 8000 }, docs: 'full', haccp: true,
    age: 9, cold: true, deferral: 21, telegram: true, manager: 'Екатерина, отдел продаж',
    about: 'Готовим ночью, привозим к открытию. Срок годности салатов — 72 часа, маркировка под вашу сеть.',
  },
  {
    slug: 'pelmennaya-masterskaya', name: 'ООО «Пельменная мастерская»', tagline: 'Пельмени и сырники ручной лепки',
    kind: 'producer', city: 'ekb', cats: ['ready'], products: ['dumplings', 'syrniki'],
    delivery: 'ural', schedule: '3x', prices: 'kg', moq: { kind: 'qty', value: 20 }, docs: 'full',
    age: 12, cold: true,
  },
  {
    slug: 'kulinariya-24', name: 'ООО «Кулинария 24»', tagline: 'Салаты и сэндвичи для кофеен',
    kind: 'producer', city: 'ekb', cats: ['ready'], products: ['salads', 'sandwiches', 'soups'],
    delivery: 'city', schedule: 'daily', prices: 'partial', moq: { kind: 'sum', value: 5000 }, docs: 'partial',
    age: 2, cold: true,
  },
  {
    slug: 'yuzhnouralskaya-kukhnya', name: 'ООО «Южноуральская кухня»', tagline: 'Фабрика готовых блюд',
    kind: 'producer', city: 'chel', cats: ['ready'], products: ['salads', 'soups', 'dumplings'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 40 }, docs: 'full',
    age: 7, cold: true,
  },
  {
    slug: 'eda-v-put', name: 'ООО «Еда в путь»', tagline: 'Сэндвичи и салаты для АЗС и магазинов',
    kind: 'producer', city: 'ekb', cats: ['ready'], products: ['sandwiches', 'salads'],
    delivery: 'region', schedule: 'weekdays', prices: 'kg', moq: { kind: 'sum', value: 6000 }, docs: 'expired',
    age: 4, cold: true,
  },
  {
    slug: 'lanch-lab', name: 'ООО «Ланч-Лаб»', tagline: 'Новая фабрика-кухня: боулы, салаты, супы',
    kind: 'producer', city: 'ekb', cats: ['ready'], products: ['salads', 'sandwiches', 'soups'],
    delivery: 'city', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 4000 }, docs: 'full',
    age: 0.3, cold: true, telegram: true,
  },
  {
    slug: 'permsky-kulinar', name: 'ООО «Пермский кулинар»', tagline: 'Замороженные полуфабрикаты',
    kind: 'producer', city: 'perm', cats: ['ready'], products: ['dumplings', 'syrniki', 'soups'],
    delivery: 'ural', schedule: '3x', prices: 'none', moq: { kind: 'sum', value: 10000 }, docs: 'full',
    age: 10, cold: true,
  },
  {
    slug: 'snezhnaya-fabrika', name: 'АО «Снежная фабрика»', tagline: 'Замороженные полуфабрикаты по всей России',
    kind: 'producer', city: 'msk', cats: ['ready'], products: ['dumplings', 'syrniki'],
    delivery: 'russia', schedule: 'weekly', prices: 'kg', moq: { kind: 'sum', value: 40000 }, docs: 'full',
    age: 15, cold: true,
  },
  {
    slug: 'salatny-tsekh', name: 'ООО «Салатный цех»', tagline: 'Салаты и супы для розничных сетей',
    kind: 'producer', city: 'tmn', cats: ['ready'], products: ['salads', 'soups'],
    delivery: 'ural', schedule: '3x', prices: 'kg', moq: { kind: 'qty', value: 50 }, docs: 'full',
    age: 5, cold: true,
  },
  {
    slug: 'kukhnya-na-plotinke', name: 'ООО «Кухня на Плотинке»', tagline: 'Домашняя кулинария',
    kind: 'producer', city: 'ekb', cats: ['ready'], products: ['salads', 'soups', 'syrniki'],
    delivery: 'city', schedule: 'daily', prices: 'kg', moq: { kind: 'qty', value: 30 }, docs: 'partial',
    age: 6, stale: true,
  },

  /* ───────────── Мясо и птица ───────────── */
  {
    slug: 'myasnoy-dvor', name: 'ООО «Мясной двор Уральский»', tagline: 'Мясо охлаждённое для ресторанов',
    kind: 'producer', city: 'ekb', cats: ['meat'], products: ['beef', 'pork', 'mince', 'chicken'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'qty', value: 10 }, docs: 'full', vet: true,
    age: 14, cold: true, deferral: 14,
  },
  {
    slug: 'ptitsekompleks-iset', name: 'АО «Птицекомплекс Исеть»', tagline: 'Курица и индейка',
    kind: 'producer', city: 'ekb', cats: ['meat'], products: ['chicken', 'turkey'],
    delivery: 'ural', schedule: 'weekdays', prices: 'box', moq: { kind: 'box', value: 3 }, docs: 'full', vet: true, haccp: true,
    age: 22, cold: true, deferral: 30,
  },
  {
    slug: 'myasnaya-artel', name: 'ООО «Мясная артель Миасс»', tagline: 'Мясопереработка полного цикла',
    kind: 'producer', city: 'chel', cats: ['meat'], products: ['beef', 'pork', 'mince'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 20 }, docs: 'full', vet: true,
    age: 10, cold: true,
  },
  {
    slug: 'myaso-opt-66', name: 'ООО «Мясо-Опт 66»', tagline: 'Мясо и птица оптом',
    kind: 'distributor', city: 'ekb', cats: ['meat'], products: ['chicken', 'pork', 'mince', 'turkey'],
    delivery: 'city', schedule: 'daily', prices: 'partial', moq: { kind: 'sum', value: 7000 }, docs: 'partial',
    age: 3,
  },
  {
    slug: 'prikamsky-fermer', name: 'ООО «Прикамский фермер»', tagline: 'Фермерская говядина и свинина',
    kind: 'farm', city: 'perm', cats: ['meat'], products: ['beef', 'pork'],
    delivery: 'ural', schedule: 'weekly', prices: 'none', moq: { kind: 'none' }, docs: 'full', vet: true,
    age: 6,
  },
  {
    slug: 'indeyka-tobola', name: 'ООО «Индейка Тобола»', tagline: 'Мясо индейки',
    kind: 'producer', city: 'tmn', cats: ['meat'], products: ['turkey'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 15 }, docs: 'full', vet: true,
    age: 8, cold: true,
  },
  {
    slug: 'govyazhiy-ryad', name: 'ООО «Говяжий ряд»', tagline: 'Говядина и фарш',
    kind: 'distributor', city: 'ekb', cats: ['meat'], products: ['beef', 'mince'],
    delivery: 'region', schedule: '3x', prices: 'kg', moq: { kind: 'sum', value: 5000 }, docs: 'expired', vet: true,
    age: 5,
  },
  {
    slug: 'myasnaya-lavka-tagil', name: 'ООО «Мясная лавка Тагил»', tagline: 'Мясо и птица по Свердловской области',
    kind: 'distributor', city: 'ntagil', cats: ['meat'], products: ['chicken', 'pork', 'mince'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 3000 }, docs: 'full', vet: true,
    age: 4, cold: true,
  },

  /* ───────────── Бакалея ───────────── */
  {
    slug: 'bakaleya-ural', name: 'ООО «Бакалея-Урал»', tagline: 'Бакалея для общепита',
    kind: 'distributor', city: 'ekb', cats: ['grocery'], products: ['flour', 'sugar', 'oil', 'sushirice'],
    delivery: 'ural', schedule: 'weekdays', prices: 'kg', moq: { kind: 'sum', value: 10000 }, docs: 'full',
    age: 12, deferral: 30,
  },
  {
    slug: 'aziya-snab', name: 'ООО «Азия-Снаб Урал»', tagline: 'Японская и азиатская бакалея',
    kind: 'distributor', city: 'ekb', cats: ['grocery'], products: ['sushirice', 'nori', 'oil'],
    delivery: 'region', schedule: '3x', prices: 'kg', moq: { kind: 'sum', value: 6000 }, docs: 'partial',
    age: 6,
  },
  {
    slug: 'melnitsa-na-sylve', name: 'АО «Мельница на Сылве»', tagline: 'Мука пшеничная и ржаная',
    kind: 'producer', city: 'perm', cats: ['grocery'], products: ['flour'],
    delivery: 'ural', schedule: 'weekly', prices: 'box', moq: { kind: 'box', value: 10 }, docs: 'full',
    age: 30,
  },
  {
    slug: 'sakharny-dvor', name: 'ООО «Сахарный двор»', tagline: 'Сахар, мука, масло оптом',
    kind: 'distributor', city: 'chel', cats: ['grocery'], products: ['sugar', 'flour', 'oil'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'qty', value: 100 }, docs: 'full',
    age: 9,
  },
  {
    slug: 'zerno-i-maslo', name: 'ООО «Торговый дом Зерно и Масло»', tagline: 'Федеральный поставщик бакалеи',
    kind: 'distributor', city: 'msk', cats: ['grocery'], products: ['oil', 'flour', 'sugar', 'sushirice'],
    delivery: 'russia', schedule: 'weekly', prices: 'kg', moq: { kind: 'sum', value: 60000 }, docs: 'full',
    age: 17,
  },
  {
    slug: 'kladovaya-shefa', name: 'ООО «Кладовая шефа»', tagline: 'Бакалея небольшими партиями',
    kind: 'distributor', city: 'ekb', cats: ['grocery'], products: ['sushirice', 'nori', 'oil', 'sugar'],
    delivery: 'city', schedule: 'daily', prices: 'partial', moq: { kind: 'sum', value: 3000 }, docs: 'none',
    age: 2, telegram: true,
  },
  {
    slug: 'sibirskaya-bakaleya', name: 'ООО «Сибирская бакалея»', tagline: 'Крупы, мука, сахар',
    kind: 'distributor', city: 'tmn', cats: ['grocery'], products: ['flour', 'sugar', 'sushirice'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'sum', value: 8000 }, docs: 'partial',
    age: 7,
  },

  /* ───────────── Напитки ───────────── */
  {
    slug: 'morsy-severa', name: 'ООО «Морсы Севера»', tagline: 'Морсы и лимонады из северных ягод',
    kind: 'producer', city: 'ekb', cats: ['drinks'], products: ['mors', 'lemonade'],
    delivery: 'region', schedule: '3x', prices: 'kg', moq: { kind: 'qty', value: 20 }, docs: 'full',
    age: 5, telegram: true,
  },
  {
    slug: 'isetsky-rodnik', name: 'ООО «Исетский родник»', tagline: 'Питьевая вода и лимонады',
    kind: 'producer', city: 'ekb', cats: ['drinks'], products: ['water', 'lemonade'],
    delivery: 'ural', schedule: 'weekdays', prices: 'box', moq: { kind: 'box', value: 5 }, docs: 'full',
    age: 13,
  },
  {
    slug: 'sady-yuzhnogo-urala', name: 'ООО «Сады Южного Урала»', tagline: 'Соки прямого отжима',
    kind: 'producer', city: 'chel', cats: ['drinks'], products: ['juice', 'mors'],
    delivery: 'ural', schedule: '2x', prices: 'kg', moq: { kind: 'sum', value: 7000 }, docs: 'full',
    age: 11,
  },
  {
    slug: 'napitki-opt-e', name: 'ООО «Напитки-Опт Е»', tagline: 'Напитки для HoReCa',
    kind: 'distributor', city: 'ekb', cats: ['drinks'], products: ['water', 'juice', 'lemonade'],
    delivery: 'city', schedule: 'daily', prices: 'partial', moq: { kind: 'sum', value: 5000 }, docs: 'partial',
    age: 4,
  },
  {
    slug: 'limonadnaya-soda', name: 'ООО «Лимонадная фабрика Сода»', tagline: 'Крафтовые лимонады в стекле',
    kind: 'producer', city: 'perm', cats: ['drinks'], products: ['lemonade'],
    delivery: 'ural', schedule: 'weekly', prices: 'kg', moq: { kind: 'qty', value: 48 }, docs: 'full',
    age: 3,
  },

  /* ───────────── Хлеб и выпечка ───────────── */
  {
    slug: 'pekarnya-zakvaska', name: 'ООО «Пекарня Закваска»', tagline: 'Хлеб на закваске и булочки для бургеров',
    kind: 'producer', city: 'ekb', cats: ['bakery'], products: ['bread', 'buns', 'croissant'],
    delivery: 'region', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 3000 }, docs: 'full', haccp: true,
    age: 7,
  },
  {
    slug: 'khlebozavod-7', name: 'АО «Хлебозавод № 7»', tagline: 'Хлеб и булочки большими партиями',
    kind: 'producer', city: 'ekb', cats: ['bakery'], products: ['bread', 'buns'],
    delivery: 'region', schedule: 'daily', prices: 'none', moq: { kind: 'sum', value: 5000 }, docs: 'full',
    age: 40,
  },
  {
    slug: 'utrennyaya-vypechka', name: 'ООО «Утренняя выпечка»', tagline: 'Замороженная выпечка для кофеен',
    kind: 'producer', city: 'chel', cats: ['bakery'], products: ['croissant', 'buns'],
    delivery: 'ural', schedule: '2x', prices: 'box', moq: { kind: 'box', value: 2 }, docs: 'full',
    age: 8, cold: true,
  },
  {
    slug: 'briosh-tsekh', name: 'ООО «Бриошь-Цех»', tagline: 'Булочки для бургеров и хот-догов',
    kind: 'producer', city: 'ekb', cats: ['bakery'], products: ['buns'],
    delivery: 'city', schedule: 'weekdays', prices: 'kg', moq: { kind: 'qty', value: 200 }, docs: 'partial',
    age: 1.5,
  },
  {
    slug: 'permsky-karavai', name: 'ООО «Пермский каравай»', tagline: 'Хлебозавод',
    kind: 'producer', city: 'perm', cats: ['bakery'], products: ['bread'],
    delivery: 'city', schedule: 'daily', prices: 'kg', moq: { kind: 'sum', value: 2000 }, docs: 'full',
    age: 18,
  },
  {
    slug: 'pekarnya-krua', name: 'ООО «Французская пекарня Круа»', tagline: 'Круассаны и багеты',
    kind: 'producer', city: 'ekb', cats: ['bakery'], products: ['croissant', 'bread'],
    delivery: 'city', schedule: '3x', prices: 'kg', moq: { kind: 'qty', value: 50 }, docs: 'expired',
    age: 4, stale: true,
  },
];
