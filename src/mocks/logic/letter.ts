import type { Letter, SearchFilters, Supplier } from '../../shared/api/types';
import { CATEGORIES, CITIES, PRODUCT_BY_ID, UNIT_LABEL } from '../../shared/config/dictionary';
import { dateShort, hostOf, lcFirst, num } from '../../shared/lib/format';

/**
 * Черновик запроса КП. Вопросы собираются из пустых и спорных полей карточки:
 * чего не нашли — то и спрашиваем. Сервис ничего не отправляет сам.
 */
export function buildLetter(s: Supplier, f: SearchFilters | null, company: string): Letter {
  const firm = company.trim() || '[название вашей компании]';
  const filters: SearchFilters = f ?? {
    category: s.categories[0] ?? null,
    products: [],
    city: 'ekb',
    volume: null,
    docs: [],
    daily: false,
  };
  const city = CITIES[filters.city];
  const wanted = filters.products.length
    ? filters.products.map((id) => lcFirst(PRODUCT_BY_ID[id]?.name ?? id))
    : filters.category
      ? [CATEGORIES[filters.category].name.toLowerCase()]
      : ['продукция из вашего ассортимента'];

  const questions: string[] = [];

  for (const pid of filters.products) {
    const offer = s.offers.find((o) => o.productId === pid);
    const name = lcFirst(PRODUCT_BY_ID[pid]?.name ?? pid);
    if (!offer) questions.push(`Есть ли у вас ${name}? В прайсе на сайте мы его не нашли.`);
    else if (!offer.price.value) questions.push(`Какая сейчас цена на ${name} за ${UNIT_LABEL[PRODUCT_BY_ID[pid]?.unit ?? 'kg']} и есть ли скидка от объёма?`);
    else if (offer.price.value.packPrice) questions.push(`Можно ли брать ${name} не целой упаковкой, а на вес?`);
  }
  if (!filters.products.length && s.offers.some((o) => !o.price.value)) {
    questions.push('Пришлите, пожалуйста, актуальный прайс для юрлиц.');
  }

  const moq = s.offers[0]?.moq.value ?? null;
  if (!moq) questions.push('Какой минимальный заказ?');
  else if (filters.volume && moq.kind === 'qty' && moq.unit === filters.volume.unit && moq.value > filters.volume.value) {
    questions.push(`Можно ли начать с меньшего объёма — около ${num(filters.volume.value)} ${UNIT_LABEL[filters.volume.unit]} в ${filters.volume.period === 'day' ? 'день' : filters.volume.period === 'month' ? 'месяц' : 'неделю'}?`);
  }

  const cities = s.delivery.cities.value ?? [];
  if (!cities.includes(filters.city)) {
    questions.push(s.delivery.nationwide
      ? `Есть ли доставка в ${city.acc} своим транспортом, а не только транспортной компанией?`
      : `Возите ли вы в ${city.acc} и в какие дни?`);
  } else if (filters.daily && !s.delivery.daily) {
    questions.push('Возможна ли ежедневная доставка?');
  }

  const active = s.documents.filter((d) => (d.kind === 'declaration' || d.kind === 'certificate') && d.status === 'active');
  const expired = s.documents.filter((d) => d.kind === 'declaration' && d.status === 'expired');
  const target = filters.products.length ? filters.products : s.offers.map((o) => o.productId);
  const covered = active.some((d) => target.some((pid) => d.products.includes(pid)));
  if (expired.length && !active.length) {
    questions.push(`На сайте указана декларация со сроком до ${dateShort(expired[0]?.validUntil ?? '')} — есть ли действующая?`);
  } else if (!covered) {
    questions.push(`Пришлите, пожалуйста, декларацию о соответствии на ${wanted.join(', ')}.`);
  }
  const animal = s.categories.some((c) => c === 'dairy' || c === 'meat' || c === 'fish');
  if ((filters.docs.includes('vet') || animal) && !s.documents.some((d) => d.kind === 'vet')) {
    questions.push('Оформляете ли ветеринарные документы в «Меркурии» на каждую партию?');
  }
  if (!s.deferral.value) questions.push('Возможна ли отсрочка платежа для постоянного клиента?');
  // Даже если на сайте всё есть, уточняем то, чего на сайтах не пишут
  if (questions.length < 3) questions.push('Какой срок поставки после заявки и до какого часа принимаете заказ?');
  if (questions.length < 3) questions.push('Можно ли получить пробную партию или образцы перед первым заказом?');

  const person = s.contacts.person.value?.split(/[,\s]/)[0];
  const greeting = person ? `Здравствуйте, ${person}!` : 'Здравствуйте!';
  const need = [
    `Ищем поставщика: ${wanted.join(', ')}`,
    `с доставкой в ${city.acc}`,
    filters.volume ? `ориентировочный объём — ${num(filters.volume.value)} ${UNIT_LABEL[filters.volume.unit]} в ${filters.volume.period === 'day' ? 'день' : filters.volume.period === 'month' ? 'месяц' : 'неделю'}` : null,
    filters.daily ? 'нужна ежедневная доставка' : null,
    filters.docs.includes('vet') ? 'нужны ветеринарные документы' : null,
  ].filter(Boolean).join(', ');

  const site = s.website ? ` Нашли вас на сайте ${hostOf(s.website)}.` : '';
  const body = [
    greeting,
    '',
    `Меня зовут [имя], я отвечаю за закупки в ${firm}.${site}`,
    '',
    `${need}.`,
    '',
    'Чтобы сравнить предложения, подскажите, пожалуйста:',
    ...questions.map((q, i) => `${i + 1}. ${q}`),
    '',
    'Если удобнее, пришлите прайс и условия ответным письмом.',
    '',
    'С уважением,',
    '[имя]',
    firm,
    '[телефон]',
  ].join('\n');

  const subjectWhat = wanted.length > 2 ? `${wanted.slice(0, 2).join(', ')} и др.` : wanted.join(', ');
  return {
    to: s.contacts.email.value,
    subject: `Запрос коммерческого предложения: ${subjectWhat} — ${firm}`,
    body,
    questions,
  };
}
