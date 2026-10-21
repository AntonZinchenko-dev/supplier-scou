import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCatalog } from '../src/mocks/data/catalog';
import { parseQuery } from '../src/mocks/logic/parse';
import { matchesFilters, normalizeWeights, rank, scoreSupplier, summarize, weightsFor } from '../src/mocks/logic/score';
import { CRITERIA_ORDER, DEFAULT_WEIGHTS, SCENARIOS } from '../src/shared/config/dictionary';

const { suppliers } = buildCatalog();
const byId = (id: string) => suppliers.find((s) => s.id === id)!;

function run(query: string) {
  const { filters } = parseQuery(query);
  const w = weightsFor(filters);
  return { filters, items: rank(suppliers.filter((s) => matchesFilters(s, filters)).map((s) => summarize(s, filters, w))) };
}

test('веса в сумме дают 100, в том числе после ползунков', () => {
  for (const w of [DEFAULT_WEIGHTS, normalizeWeights({ product: 1, delivery: 1, legal: 1, docs: 1, terms: 1, fresh: 1 }), normalizeWeights({ product: 50, delivery: 0, legal: 13, docs: 7, terms: 3, fresh: 0 })]) {
    assert.equal(CRITERIA_ORDER.reduce((a, k) => a + w[k], 0), 100);
  }
});

test('каждый готовый сценарий даёт не меньше 8 поставщиков с доставкой в город', () => {
  for (const s of SCENARIOS) {
    const { items } = run(s.query);
    assert.ok(items.filter((i) => i.deliversToCity !== false).length >= 8, s.query);
  }
});

test('лучший в сценарии — витринный поставщик, ликвидированные — в конце', () => {
  assert.equal(run(SCENARIOS[0]!.query).items[0]!.id, 'berezovka-moloko');
  assert.equal(run(SCENARIOS[1]!.query).items[0]!.id, 'severny-veter');
  const veg = run(SCENARIOS[3]!.query).items;
  assert.equal(veg[0]!.id, 'bely-klyuch');
  assert.equal(veg.at(-1)!.id, 'ovoshchnoy-ryad');
  assert.ok(veg.at(-1)!.score.blocked);
});

test('красные флаги: ликвидация, молодая компания, истёкшие декларации, нет ИНН, не тот ОКВЭД', () => {
  const { filters } = parseQuery('молочка екб');
  const w = weightsFor(filters);
  const codes = (id: string) => scoreSupplier(byId(id), filters, w).flags.map((f) => f.code);
  assert.ok(codes('slivochny-krai').includes('liquidation'));
  assert.ok(codes('lavka-istok').includes('young'));
  assert.ok(codes('holod-sklad-66').includes('expired'));
  const pack = parseQuery('крафт-упаковка екб').filters;
  assert.ok(scoreSupplier(byId('upakovka-24'), pack, weightsFor(pack)).flags.some((f) => f.code === 'noinn'));
  assert.ok(scoreSupplier(byId('kraft-i-ko'), pack, weightsFor(pack)).flags.some((f) => f.code === 'okved'));
});

test('реестр не ответил — поставщика не прячем, баллы за юрлицо не начисляем', () => {
  const { filters } = parseQuery('овощи екб');
  const sc = scoreSupplier(byId('svezhy-ural'), filters, weightsFor(filters));
  assert.equal(sc.items.find((i) => i.criterion === 'legal')!.points, 0);
  assert.ok(sc.flags.some((f) => f.code === 'registry' && f.level === 'amber'));
  assert.equal(sc.blocked, false);
});

test('требование ветдокументов снижает оценку тем, у кого их нет', () => {
  const withVet = parseQuery('лосось с ветсертификатом екб').filters;
  const without = { ...withVet, docs: [] };
  const s = byId('sushi-snab');
  const a = scoreSupplier(s, withVet, weightsFor(withVet)).items.find((i) => i.criterion === 'docs')!;
  const b = scoreSupplier(s, without, weightsFor(without)).items.find((i) => i.criterion === 'docs')!;
  assert.ok(a.share < b.share || a.share <= 0.4);
});

test('просьба о ежедневной доставке штрафует редкий график', () => {
  const daily = parseQuery('овощи каждый день екб').filters;
  const plain = { ...daily, daily: false };
  const s = byId('kfh-lugovoe');
  const d1 = scoreSupplier(s, daily, weightsFor(daily)).items.find((i) => i.criterion === 'delivery')!.points;
  const d2 = scoreSupplier(s, plain, weightsFor(plain)).items.find((i) => i.criterion === 'delivery')!.points;
  assert.ok(d1 < d2);
});

test('минимальный заказ больше недельного объёма — предупреждение', () => {
  const f = parseQuery('сливки екб от 20 кг в неделю').filters;
  const flags = scoreSupplier(byId('tyumen-slivochnaya'), f, weightsFor(f)).flags;
  assert.ok(flags.some((x) => x.code === 'moq'));
});

test('оценка детерминирована', () => {
  const a = run(SCENARIOS[2]!.query).items.map((i) => [i.id, i.score.total]);
  const b = run(SCENARIOS[2]!.query).items.map((i) => [i.id, i.score.total]);
  assert.deepEqual(a, b);
});
