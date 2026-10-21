import type { CategoryId, CityId, DocKind, ParsedQuery, Unit, Volume } from '../../shared/api/types';
import { CATEGORIES, CITIES, PRODUCTS, SEARCH_CITIES } from '../../shared/config/dictionary';

/**
 * Разбор запроса обычными словами в фильтры.
 * В прототипе — словарь с синонимами. В боевой версии этот шаг делает языковая модель
 * с ответом строго по JSON-схеме; интерфейс («как понял» + правка чипов) остаётся тем же.
 */

const STOP = new Set([
  'для', 'кафе', 'ресторана', 'ресторанов', 'ресторан', 'столовой', 'столовых', 'магазинов', 'магазина', 'магазин',
  'у', 'дома', 'от', 'до', 'в', 'во', 'на', 'с', 'со', 'и', 'по', 'нужен', 'нужна', 'нужно', 'нужны', 'ищу', 'ищем',
  'поставщик', 'поставщика', 'поставщиков', 'поставщики', 'оптом', 'опт', 'оптовый', 'недорого', 'хороший', 'хорошего',
  'доставкой', 'доставка', 'доставки', 'доставку', 'неделю', 'неделя', 'день', 'месяц', 'кг', 'л', 'шт', 'штук', 'литров',
  'город', 'городе', 'сети', 'сеть', 'кофейни', 'кофеен', 'пиццерии', 'суши', 'бара', 'баров', 'нас', 'мне', 'нам',
  'охлажденный', 'охлажденная', 'охлажденные', 'охлажденного', 'свежий', 'свежие', 'свежая', 'свежего', 'фермерский',
  'качественный', 'качественные', 'постоянно', 'регулярно', 'или', 'а', 'же', 'чтобы', 'который', 'которые',
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"“”„()!?;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LETTER = 'а-яa-z';

/** Слово целиком, допускаем до двух букв окончания: «салат» ловит «салаты», но не «салатница» */
function wordRe(syn: string): RegExp {
  const esc = syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![${LETTER}])${esc}[а-я]{0,2}(?![${LETTER}])`, 'u');
}

/** Начало слова: «молочк» ловит «молочка», «молочку» */
function prefixRe(stem: string): RegExp {
  return new RegExp(`(?<![${LETTER}])${stem}[а-я]*`, 'u');
}

const PRODUCT_SYNS = PRODUCTS.flatMap((p) => p.syn.map((syn) => ({ id: p.id, category: p.category, syn: normalize(syn) }))).sort(
  (a, b) => b.syn.length - a.syn.length,
);

export function parseQuery(raw: string, defaultCity: CityId = 'ekb'): ParsedQuery {
  let text = ` ${normalize(raw)} `;
  const consumed: string[] = [];
  const eat = (re: RegExp): string | null => {
    const m = text.match(re);
    if (!m) return null;
    consumed.push(m[0]);
    text = text.replace(m[0], ' ');
    return m[0];
  };

  /* Город */
  let city: CityId | null = null;
  for (const id of [...SEARCH_CITIES, 'msk' as CityId]) {
    for (const syn of CITIES[id].syn) {
      if (eat(prefixRe(syn))) {
        city = city ?? id;
        break;
      }
    }
  }

  /* Объём: «от 50 кг в неделю», «200 шт/день» */
  let volume: Volume | null = null;
  const vm = text.match(/(\d+(?:[.,]\d+)?)\s*(кг|килограмм[а-я]*|тонн[а-я]*|т|л|литр[а-я]*|шт[а-я.]*|штук[а-я]*)\s*(?:в|\/|за)?\s*(день|сутки|неделю|нед[а-я.]*|месяц|мес[а-я.]*)?/u);
  if (vm) {
    let value = Number((vm[1] ?? '0').replace(',', '.'));
    const u = vm[2] ?? 'кг';
    let unit: Unit = 'kg';
    if (/^т/.test(u)) value *= 1000;
    else if (/^л/.test(u)) unit = 'l';
    else if (/^шт/.test(u)) unit = 'pcs';
    const per = vm[3] ?? '';
    const period: Volume['period'] = /^(день|сут)/.test(per) ? 'day' : /^мес/.test(per) ? 'month' : 'week';
    volume = { value, unit, period };
    consumed.push(vm[0]);
    text = text.replace(vm[0], ' ');
  }

  /* Документы и частота */
  const docs: DocKind[] = [];
  if (eat(/(?<![а-я])вет[а-я]*|меркури[а-я]*|всд(?![а-я])/u)) docs.push('vet');
  if (eat(/декларац[а-я]*|сертификат[а-я]*/u)) docs.push('declaration');
  if (eat(/хассп|haccp/u)) docs.push('haccp');
  const daily = Boolean(eat(/ежедневн[а-я]*|каждый день|каждое утро|по утрам/u));

  /* Товары: сначала длинные синонимы */
  const products: string[] = [];
  for (const ps of PRODUCT_SYNS) {
    if (products.includes(ps.id)) continue;
    if (eat(wordRe(ps.syn))) products.push(ps.id);
  }

  /* «Крафт-упаковка» без уточнения — это крафт-коробки и крафт-пакеты */
  if (!products.length && eat(/крафт[а-я-]*/u)) products.push('kraftbox', 'bags');

  /* Категория: по товарам или по словам */
  let category: CategoryId | null = null;
  if (products.length) {
    category = PRODUCTS.find((p) => p.id === products[0])?.category ?? null;
  }
  for (const cat of Object.values(CATEGORIES)) {
    for (const stem of cat.syn) {
      if (eat(prefixRe(stem))) {
        category = category ?? cat.id;
        break;
      }
    }
  }
  // Товары другой категории, чем выбранная, оставляем — но категория одна
  const left = text
    .split(/[\s,.]+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d/.test(w));

  return {
    raw,
    filters: {
      category,
      products,
      city: city ?? defaultCity,
      cityIsDefault: city === null,
      volume,
      docs,
      daily,
    },
    unknown: [...new Set(left)],
  };
}
