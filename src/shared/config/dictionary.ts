import type { CategoryId, CityId, CriterionId, DocKind, PipelineStatus, StepId, Unit, Weights } from '../api/types';

/** Дата снимка демо-данных. Свежесть фактов считается от неё, поэтому демо не «стареет». */
export const DEMO_TODAY = '2026-10-20';

export interface City {
  id: CityId;
  name: string;
  /** «в Екатеринбург» */
  acc: string;
  /** «в Екатеринбурге» */
  loc: string;
  region: string;
  phoneCode: string;
  innPrefix: string;
  syn: string[];
}

export const CITIES: Record<CityId, City> = {
  ekb: { id: 'ekb', acc: 'Екатеринбург', name: 'Екатеринбург', loc: 'Екатеринбурге', region: 'Свердловская область', phoneCode: '343', innPrefix: '66', syn: ['екатеринбург', 'екб', 'ебург', 'екат', 'свердловск'] },
  chel: { id: 'chel', acc: 'Челябинск', name: 'Челябинск', loc: 'Челябинске', region: 'Челябинская область', phoneCode: '351', innPrefix: '74', syn: ['челябинск', 'челяба'] },
  perm: { id: 'perm', acc: 'Пермь', name: 'Пермь', loc: 'Перми', region: 'Пермский край', phoneCode: '342', innPrefix: '59', syn: ['пермь', 'перми', 'пермский'] },
  tmn: { id: 'tmn', acc: 'Тюмень', name: 'Тюмень', loc: 'Тюмени', region: 'Тюменская область', phoneCode: '345', innPrefix: '72', syn: ['тюмень', 'тюмени'] },
  ntagil: { id: 'ntagil', acc: 'Нижний Тагил', name: 'Нижний Тагил', loc: 'Нижнем Тагиле', region: 'Свердловская область', phoneCode: '343', innPrefix: '66', syn: ['тагил', 'тагиле'] },
  msk: { id: 'msk', acc: 'Москву', name: 'Москва', loc: 'Москве', region: 'Москва', phoneCode: '495', innPrefix: '77', syn: ['москва', 'москве', 'мск'] },
};

/** Города, которые можно выбрать в поиске (Москва — только как адрес федеральных компаний) */
export const SEARCH_CITIES: CityId[] = ['ekb', 'chel', 'perm', 'tmn', 'ntagil'];

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
  /** Какие документы обычно нужны */
  docs: DocKind[];
  syn: string[];
}

export const CATEGORIES: Record<CategoryId, Category> = {
  dairy: { id: 'dairy', name: 'Молочная продукция', short: 'Молочка', docs: ['declaration', 'vet'], syn: ['молочк', 'молочн', 'молок'] },
  meat: { id: 'meat', name: 'Мясо и птица', short: 'Мясо', docs: ['declaration', 'vet'], syn: ['мяс', 'птиц'] },
  fish: { id: 'fish', name: 'Рыба и морепродукты', short: 'Рыба', docs: ['declaration', 'vet'], syn: ['рыб', 'морепродукт'] },
  veg: { id: 'veg', name: 'Овощи, фрукты, зелень', short: 'Овощи', docs: ['declaration'], syn: ['овощ', 'фрукт', 'зелен'] },
  grocery: { id: 'grocery', name: 'Бакалея', short: 'Бакалея', docs: ['declaration'], syn: ['бакале', 'крупы', 'круп'] },
  drinks: { id: 'drinks', name: 'Напитки', short: 'Напитки', docs: ['declaration'], syn: ['напит'] },
  ready: { id: 'ready', name: 'Готовая еда и полуфабрикаты', short: 'Готовая еда', docs: ['declaration'], syn: ['готов', 'полуфабрикат', 'кулинари'] },
  bakery: { id: 'bakery', name: 'Хлеб и выпечка', short: 'Выпечка', docs: ['declaration'], syn: ['хлеб', 'выпечк', 'пекарн'] },
  packaging: { id: 'packaging', name: 'Упаковка и одноразовая посуда', short: 'Упаковка', docs: ['declaration'], syn: ['упаковк', 'тара', 'одноразов', 'посуд'] },
};

export const CATEGORY_ORDER: CategoryId[] = ['dairy', 'meat', 'fish', 'veg', 'ready', 'bakery', 'grocery', 'drinks', 'packaging'];

export interface Product {
  id: string;
  category: CategoryId;
  name: string;
  /** Как называть в прайсе поставщика (варианты) */
  priceNames: string[];
  unit: Unit;
  /** Диапазон цены за единицу, ₽ */
  price: [number, number];
  /** Синонимы для разбора запроса; многословные проверяются первыми */
  syn: string[];
}

export const PRODUCTS: Product[] = [
  // Молочка
  { id: 'milk', category: 'dairy', name: 'Молоко 3,2%', priceNames: ['Молоко 3,2%, 1 л', 'Молоко пастеризованное 3,2%'], unit: 'l', price: [84, 112], syn: ['молоко', 'молока'] },
  { id: 'cream', category: 'dairy', name: 'Сливки 33%', priceNames: ['Сливки 33%, 1 л', 'Сливки питьевые 33%'], unit: 'l', price: [430, 540], syn: ['сливки', 'сливок'] },
  { id: 'sourcream', category: 'dairy', name: 'Сметана 20%', priceNames: ['Сметана 20%, ведро 5 кг', 'Сметана 20%'], unit: 'kg', price: [260, 330], syn: ['сметана', 'сметаны'] },
  { id: 'cottage', category: 'dairy', name: 'Творог 9%', priceNames: ['Творог 9%, весовой', 'Творог 9%'], unit: 'kg', price: [380, 480], syn: ['творог', 'творога'] },
  { id: 'mozzarella', category: 'dairy', name: 'Сыр моцарелла', priceNames: ['Моцарелла для пиццы, брусок', 'Сыр моцарелла 45%'], unit: 'kg', price: [760, 960], syn: ['моцарелла', 'моцареллы', 'сыр'] },
  { id: 'butter', category: 'dairy', name: 'Масло сливочное 82,5%', priceNames: ['Масло сливочное 82,5%, монолит', 'Масло сливочное 82,5%'], unit: 'kg', price: [900, 1150], syn: ['масло сливочное', 'сливочное масло'] },
  // Рыба
  { id: 'salmon', category: 'fish', name: 'Лосось охлаждённый, филе трим D', priceNames: ['Филе лосося охл., трим D', 'Лосось охлаждённый, филе трим D'], unit: 'kg', price: [2350, 3100], syn: ['лосось', 'лосося', 'семга', 'сёмга', 'лосос'] },
  { id: 'trout', category: 'fish', name: 'Форель охлаждённая', priceNames: ['Форель охлаждённая, тушка', 'Форель радужная охл.'], unit: 'kg', price: [1450, 1900], syn: ['форель', 'форели'] },
  { id: 'shrimp', category: 'fish', name: 'Креветки 90/120', priceNames: ['Креветки 90/120, в/м', 'Креветка северная 90/120'], unit: 'kg', price: [1100, 1500], syn: ['креветки', 'креветок', 'креветка'] },
  { id: 'tuna', category: 'fish', name: 'Тунец, филе', priceNames: ['Тунец желтоперый, филе', 'Тунец, филе с/м'], unit: 'kg', price: [1800, 2400], syn: ['тунец', 'тунца'] },
  { id: 'eel', category: 'fish', name: 'Угорь копчёный', priceNames: ['Угорь унаги копчёный', 'Угорь копчёный'], unit: 'kg', price: [3500, 4300], syn: ['угорь', 'угря', 'унаги'] },
  // Мясо
  { id: 'chicken', category: 'meat', name: 'Филе куриное охлаждённое', priceNames: ['Филе цыплёнка-бройлера охл.', 'Филе куриное охлаждённое'], unit: 'kg', price: [370, 460], syn: ['куриное филе', 'филе курин', 'курица', 'курицы', 'курин'] },
  { id: 'beef', category: 'meat', name: 'Говядина, вырезка', priceNames: ['Вырезка говяжья охл.', 'Говядина, вырезка'], unit: 'kg', price: [1900, 2500], syn: ['говядина', 'говядины', 'вырезка'] },
  { id: 'pork', category: 'meat', name: 'Свинина, шея', priceNames: ['Шея свиная б/к охл.', 'Свинина, шея'], unit: 'kg', price: [520, 650], syn: ['свинина', 'свинины', 'свиная'] },
  { id: 'mince', category: 'meat', name: 'Фарш говяжий', priceNames: ['Фарш говяжий охл.', 'Фарш говяжий'], unit: 'kg', price: [590, 720], syn: ['фарш', 'фарша'] },
  { id: 'turkey', category: 'meat', name: 'Индейка, филе бедра', priceNames: ['Филе бедра индейки охл.', 'Индейка, филе бедра'], unit: 'kg', price: [520, 630], syn: ['индейка', 'индейки'] },
  // Овощи
  { id: 'potato', category: 'veg', name: 'Картофель мытый', priceNames: ['Картофель мытый, сетка 25 кг', 'Картофель мытый'], unit: 'kg', price: [28, 46], syn: ['картофель', 'картошка', 'картошки'] },
  { id: 'cucumber', category: 'veg', name: 'Огурцы', priceNames: ['Огурцы среднеплодные', 'Огурцы тепличные'], unit: 'kg', price: [140, 220], syn: ['огурцы', 'огурцов', 'огурец'] },
  { id: 'tomato', category: 'veg', name: 'Томаты', priceNames: ['Томаты сливовидные', 'Томаты тепличные'], unit: 'kg', price: [180, 280], syn: ['томаты', 'помидоры', 'томатов', 'помидор'] },
  { id: 'lettuce', category: 'veg', name: 'Салат айсберг', priceNames: ['Салат айсберг, кочан', 'Салат айсберг'], unit: 'kg', price: [220, 320], syn: ['айсберг', 'салат айсберг'] },
  { id: 'greens', category: 'veg', name: 'Зелень: укроп, петрушка', priceNames: ['Укроп, петрушка, пучок 100 г', 'Зелень свежая (укроп, петрушка)'], unit: 'kg', price: [450, 700], syn: ['укроп', 'петрушка'] },
  { id: 'avocado', category: 'veg', name: 'Авокадо хасс', priceNames: ['Авокадо хасс, калибр 18', 'Авокадо хасс'], unit: 'kg', price: [380, 520], syn: ['авокадо'] },
  // Бакалея
  { id: 'sushirice', category: 'grocery', name: 'Рис для суши', priceNames: ['Рис для суши, мешок 25 кг', 'Рис круглозёрный для суши'], unit: 'kg', price: [140, 190], syn: ['рис для суши', 'рис', 'риса'] },
  { id: 'flour', category: 'grocery', name: 'Мука пшеничная в/с', priceNames: ['Мука пшеничная в/с, 50 кг', 'Мука пшеничная высшего сорта'], unit: 'kg', price: [38, 55], syn: ['мука', 'муки'] },
  { id: 'sugar', category: 'grocery', name: 'Сахар', priceNames: ['Сахар-песок, 50 кг', 'Сахар белый'], unit: 'kg', price: [70, 92], syn: ['сахар', 'сахара'] },
  { id: 'oil', category: 'grocery', name: 'Масло подсолнечное', priceNames: ['Масло подсолнечное раф., 5 л', 'Масло подсолнечное рафинированное'], unit: 'l', price: [140, 178], syn: ['масло подсолнечное', 'подсолнечное', 'фритюр'] },
  { id: 'nori', category: 'grocery', name: 'Нори, 50 листов', priceNames: ['Нори «Голд», 50 листов', 'Водоросли нори, 50 л.'], unit: 'pack', price: [650, 900], syn: ['нори'] },
  // Напитки
  { id: 'water', category: 'drinks', name: 'Вода питьевая 0,5 л', priceNames: ['Вода питьевая негаз., 0,5 л', 'Вода питьевая 0,5 л'], unit: 'pcs', price: [18, 29], syn: ['вода', 'воды'] },
  { id: 'juice', category: 'drinks', name: 'Сок 1 л', priceNames: ['Сок яблочный прямого отжима, 1 л', 'Сок в ассортименте, 1 л'], unit: 'pcs', price: [95, 145], syn: ['сок', 'соки', 'сока'] },
  { id: 'mors', category: 'drinks', name: 'Морс клюквенный', priceNames: ['Морс клюквенный, 1 л', 'Морс из северных ягод'], unit: 'l', price: [160, 225], syn: ['морс', 'морсы', 'морса'] },
  { id: 'lemonade', category: 'drinks', name: 'Лимонад 0,33 л', priceNames: ['Лимонад крафтовый, 0,33 л', 'Лимонад в стекле, 0,33 л'], unit: 'pcs', price: [70, 110], syn: ['лимонад', 'лимонады'] },
  // Готовая еда
  { id: 'salads', category: 'ready', name: 'Салаты в контейнерах', priceNames: ['Салаты в ассортименте, контейнер 180 г', 'Салат «Цезарь», 200 г'], unit: 'pcs', price: [120, 230], syn: ['готовые салаты', 'салаты', 'салатов', 'салат'] },
  { id: 'soups', category: 'ready', name: 'Супы охлаждённые', priceNames: ['Суп охлаждённый, 300 г', 'Супы дня в ассортименте, 350 г'], unit: 'pcs', price: [140, 220], syn: ['супы', 'суп', 'супов'] },
  { id: 'sandwiches', category: 'ready', name: 'Сэндвичи и роллы', priceNames: ['Сэндвич с курицей, 180 г', 'Ролл-сэндвич в ассортименте'], unit: 'pcs', price: [110, 195], syn: ['сэндвичи', 'сэндвич', 'сендвич'] },
  { id: 'dumplings', category: 'ready', name: 'Пельмени ручной лепки', priceNames: ['Пельмени ручной лепки, 1 кг', 'Пельмени «Уральские», 1 кг'], unit: 'kg', price: [420, 620], syn: ['пельмени', 'пельменей'] },
  { id: 'syrniki', category: 'ready', name: 'Сырники замороженные', priceNames: ['Сырники замороженные, 1 кг', 'Сырники, шоковая заморозка'], unit: 'kg', price: [380, 520], syn: ['сырники', 'сырников'] },
  // Выпечка
  { id: 'bread', category: 'bakery', name: 'Хлеб формовой', priceNames: ['Хлеб формовой, 600 г', 'Хлеб пшеничный, 600 г'], unit: 'pcs', price: [45, 70], syn: ['хлеб', 'хлеба'] },
  { id: 'buns', category: 'bakery', name: 'Булочки для бургеров', priceNames: ['Булочка бриошь для бургера', 'Булочки для бургеров с кунжутом'], unit: 'pcs', price: [22, 36], syn: ['булочки', 'булочек', 'бриошь'] },
  { id: 'croissant', category: 'bakery', name: 'Круассаны, заморозка', priceNames: ['Круассан сливочный, заморозка', 'Круассаны для выпекания'], unit: 'pcs', price: [38, 62], syn: ['круассаны', 'круассан'] },
  // Упаковка
  { id: 'kraftbox', category: 'packaging', name: 'Крафт-коробки для еды', priceNames: ['Коробка крафт для еды, 1000 мл', 'Крафт-коробка с окном, 800 мл'], unit: 'pcs', price: [9, 18], syn: ['крафт-коробки', 'крафт коробки', 'коробки', 'коробка', 'коробок'] },
  { id: 'container', category: 'packaging', name: 'Контейнеры PP с крышкой', priceNames: ['Контейнер PP 500 мл с крышкой', 'Контейнер полипропилен 750 мл'], unit: 'pcs', price: [6, 12], syn: ['контейнеры', 'контейнер', 'ланч-бокс'] },
  { id: 'cups', category: 'packaging', name: 'Стаканы бумажные 350 мл', priceNames: ['Стакан бумажный 350 мл', 'Стакан двухслойный 350 мл'], unit: 'pcs', price: [4, 8], syn: ['стаканы', 'стакан', 'стаканов'] },
  { id: 'bags', category: 'packaging', name: 'Крафт-пакеты с ручками', priceNames: ['Пакет крафт с ручками 32×20×37', 'Крафт-пакет с плоскими ручками'], unit: 'pcs', price: [9, 16], syn: ['пакеты', 'пакет', 'пакетов'] },
  { id: 'cutlery', category: 'packaging', name: 'Приборы деревянные', priceNames: ['Приборы деревянные, набор', 'Вилка деревянная 160 мм'], unit: 'pcs', price: [2, 4], syn: ['приборы', 'вилки', 'ложки'] },
];

export const PRODUCT_BY_ID: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export const UNIT_LABEL: Record<Unit, string> = { kg: 'кг', l: 'л', pcs: 'шт.', pack: 'уп.' };

export const DOC_LABEL: Record<DocKind, string> = {
  declaration: 'Декларация ЕАЭС',
  certificate: 'Сертификат соответствия',
  vet: 'Ветеринарные документы (ВСД)',
  haccp: 'ХАССП',
};

export const DOC_SHORT: Record<DocKind, string> = {
  declaration: 'декларация',
  certificate: 'сертификат',
  vet: 'ветдокументы',
  haccp: 'ХАССП',
};

export const CRITERIA: Record<CriterionId, { name: string; hint: string }> = {
  product: { name: 'Нужный товар', hint: 'Товар из запроса есть в прайсе' },
  delivery: { name: 'Доставка в город', hint: 'Возит в ваш город и с нужной частотой' },
  legal: { name: 'Надёжность юрлица', hint: 'Действует, не однодневка, профиль — еда' },
  docs: { name: 'Документы', hint: 'Действующие декларации и ветдокументы' },
  terms: { name: 'Понятны условия', hint: 'Известны цена, минимальный заказ, доставка' },
  fresh: { name: 'Свежесть данных', hint: 'Данные собраны не давнее 30 дней' },
};

export const CRITERIA_ORDER: CriterionId[] = ['product', 'delivery', 'legal', 'docs', 'terms', 'fresh'];

export const DEFAULT_WEIGHTS: Weights = { product: 30, delivery: 20, legal: 20, docs: 15, terms: 10, fresh: 5 };

/** Для упаковки документы весят меньше, а условия поставки — больше */
export const CATEGORY_WEIGHTS: Partial<Record<CategoryId, Weights>> = {
  packaging: { product: 30, delivery: 25, legal: 20, docs: 8, terms: 12, fresh: 5 },
  fish: { product: 30, delivery: 20, legal: 15, docs: 20, terms: 10, fresh: 5 },
  meat: { product: 30, delivery: 20, legal: 15, docs: 20, terms: 10, fresh: 5 },
};

export const STATUS: Record<PipelineStatus, { name: string; hint: string }> = {
  new: { name: 'Новый', hint: 'Ещё не связывались' },
  contacted: { name: 'Написали', hint: 'Отправили запрос' },
  waiting: { name: 'Ждём КП', hint: 'Обещали прислать предложение' },
  offer: { name: 'КП получено', hint: 'Есть предложение, сравниваем' },
  contract: { name: 'Договор', hint: 'Работаем' },
  rejected: { name: 'Отказ', hint: 'Не подошли' },
};

export const STATUS_ORDER: PipelineStatus[] = ['new', 'contacted', 'waiting', 'offer', 'contract', 'rejected'];

export const STEPS: Record<StepId, { name: string; demo: string }> = {
  parse: { name: 'Разбираю запрос', demo: 'категория, товары, город, объём, документы' },
  find: { name: 'Ищу поставщиков', demo: 'в демо — по каталогу; в бою — поиск, 2ГИС, каталоги' },
  legal: { name: 'Проверяю юрлица', demo: 'статус, возраст, вид деятельности' },
  sites: { name: 'Читаю сайты и прайсы', demo: 'цены, минимальный заказ, доставка' },
  docs: { name: 'Проверяю документы', demo: 'декларации и ветдокументы' },
  score: { name: 'Считаю оценку', demo: 'баллы по правилам, без модели' },
};

export const STEP_ORDER: StepId[] = ['parse', 'find', 'legal', 'sites', 'docs', 'score'];

export const SCENARIOS: { query: string; label: string; category: CategoryId }[] = [
  { query: 'молочка для кафе, Екатеринбург, от 50 кг в неделю', label: 'Молочка для кафе', category: 'dairy' },
  { query: 'лосось охлаждённый с ветсертификатом, Екатеринбург', label: 'Лосось с ветдокументами', category: 'fish' },
  { query: 'крафт-упаковка для доставки, Екатеринбург', label: 'Крафт-упаковка', category: 'packaging' },
  { query: 'овощи с ежедневной доставкой, Екатеринбург', label: 'Овощи каждый день', category: 'veg' },
  { query: 'готовые салаты для магазинов у дома, Екатеринбург', label: 'Готовые салаты', category: 'ready' },
];
