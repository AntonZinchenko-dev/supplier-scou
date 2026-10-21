import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseQuery } from '../src/mocks/logic/parse';

test('сценарий «молочка»: категория, город, объём в неделю', () => {
  const { filters, unknown } = parseQuery('молочка для кафе, Екатеринбург, от 50 кг в неделю');
  assert.equal(filters.category, 'dairy');
  assert.equal(filters.city, 'ekb');
  assert.equal(filters.cityIsDefault, false);
  assert.deepEqual(filters.volume, { value: 50, unit: 'kg', period: 'week' });
  assert.deepEqual(unknown, []);
});

test('товар, ё и ветдокументы', () => {
  const { filters } = parseQuery('лосось охлаждённый с ветсертификатом, Екатеринбург');
  assert.equal(filters.category, 'fish');
  assert.deepEqual(filters.products, ['salmon']);
  assert.deepEqual(filters.docs, ['vet']);
});

test('«крафт-упаковка» — это крафт-коробки и пакеты', () => {
  const { filters } = parseQuery('крафт-упаковка для доставки, Екатеринбург');
  assert.equal(filters.category, 'packaging');
  assert.deepEqual(filters.products, ['kraftbox', 'bags']);
});

test('ежедневная доставка', () => {
  assert.equal(parseQuery('овощи с ежедневной доставкой').filters.daily, true);
});

test('«салат айсберг» — овощ, «готовые салаты» — готовая еда', () => {
  assert.deepEqual(parseQuery('салат айсберг, Челябинск').filters.products, ['lettuce']);
  assert.equal(parseQuery('салат айсберг, Челябинск').filters.city, 'chel');
  const ready = parseQuery('готовые салаты для магазинов у дома');
  assert.equal(ready.filters.category, 'ready');
  assert.deepEqual(ready.filters.products, ['salads']);
});

test('сокращения города и город по умолчанию', () => {
  assert.equal(parseQuery('моцарелла екб').filters.city, 'ekb');
  const p = parseQuery('пельмени', 'perm');
  assert.equal(p.filters.city, 'perm');
  assert.equal(p.filters.cityIsDefault, true);
});

test('«сыр» не ловит «сырники»', () => {
  assert.deepEqual(parseQuery('сырники для кофейни').filters.products, ['syrniki']);
});

test('объём в штуках и в день, тонны в кг', () => {
  assert.deepEqual(parseQuery('стаканы 300 шт в день').filters.volume, { value: 300, unit: 'pcs', period: 'day' });
  assert.deepEqual(parseQuery('мука 2 т в месяц').filters.volume, { value: 2000, unit: 'kg', period: 'month' });
});

test('непонятные слова показываем честно', () => {
  assert.ok(parseQuery('молоко безлактозное').unknown.includes('безлактозное'));
});
