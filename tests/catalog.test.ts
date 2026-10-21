import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCatalog, innIsValid, ogrnIsValid } from '../src/mocks/data/catalog';
import type { Fact } from '../src/shared/api/types';

const { suppliers, sources } = buildCatalog();

function blockTexts(sourceId: string): string[] {
  const page = sources[sourceId];
  assert.ok(page, `нет страницы-источника ${sourceId}`);
  return page.blocks.map((b) => ('text' in b ? b.text : ''));
}

function checkFact(name: string, f: Fact<unknown>) {
  if (f.status !== 'confirmed' || f.method === 'manual') return;
  assert.ok(f.sourceId, `${name}: у факта нет источника`);
  assert.ok(f.quote, `${name}: у факта нет цитаты`);
  assert.ok(
    blockTexts(f.sourceId!).some((t) => t.includes(f.quote!)),
    `${name}: цитата «${f.quote}» не найдена на ${f.sourceId}`,
  );
}

test('в каталоге 78 вымышленных поставщиков с уникальными id', () => {
  assert.equal(suppliers.length, 78);
  assert.equal(new Set(suppliers.map((s) => s.id)).size, suppliers.length);
});

test('каталог детерминирован: две сборки дают одно и то же', () => {
  const again = buildCatalog();
  assert.deepEqual(again.suppliers.map((s) => s.legal.inn.value), suppliers.map((s) => s.legal.inn.value));
});

test('у каждого факта есть источник, и цитата дословно есть на странице', () => {
  for (const s of suppliers) {
    const facts: [string, Fact<unknown>][] = [
      ...Object.entries(s.legal).map(([k, v]) => [`${s.id}.legal.${k}`, v] as [string, Fact<unknown>]),
      ...Object.entries(s.contacts).map(([k, v]) => [`${s.id}.contacts.${k}`, v] as [string, Fact<unknown>]),
      [`${s.id}.delivery.cities`, s.delivery.cities],
      [`${s.id}.delivery.schedule`, s.delivery.schedule],
      [`${s.id}.delivery.minOrderSum`, s.delivery.minOrderSum],
      [`${s.id}.delivery.cold`, s.delivery.cold],
      [`${s.id}.deferral`, s.deferral],
      ...s.offers.flatMap((o) => [
        [`${s.id}.${o.productId}.price`, o.price] as [string, Fact<unknown>],
        [`${s.id}.${o.productId}.moq`, o.moq] as [string, Fact<unknown>],
      ]),
    ];
    facts.forEach(([n, f]) => checkFact(n, f));
    for (const d of s.documents) {
      assert.ok(blockTexts(d.sourceId).some((t) => t.includes(d.quote)), `${s.id}: документ ${d.number} без цитаты на странице`);
    }
  }
});

test('ИНН и ОГРН заведомо не проходят контрольную сумму — не совпадут с реальными', () => {
  for (const s of suppliers) {
    const inn = s.legal.inn.value;
    if (inn) assert.equal(innIsValid(inn), false, `${s.id}: ИНН ${inn} случайно валиден`);
    const ogrn = s.legal.ogrn.value;
    if (ogrn) assert.equal(ogrnIsValid(ogrn), false, `${s.id}: ОГРН ${ogrn} случайно валиден`);
  }
  // и сама проверка работает: настоящий формат ИНН ПАО «Сбербанк» 7707083893 валиден
  assert.equal(innIsValid('7707083893'), true);
});

test('сайты и почта — на зарезервированном домене .example, телефоны не набираются', () => {
  for (const s of suppliers) {
    assert.match(s.website ?? '', /^https:\/\/[a-z0-9-]+\.example$/);
    assert.match(s.contacts.email.value ?? '', /@[a-z0-9-]+\.example$/);
    assert.match(s.contacts.phone.value ?? '', /^\+7 \(\d{3}\) 0\d\d-\d\d-\d\d$/);
  }
  for (const page of Object.values(sources)) assert.match(page.url, /^https:\/\/[a-z0-9.-]+\.example\//);
});

test('номера деклараций помечены «ДЕМО»', () => {
  for (const s of suppliers) for (const d of s.documents.filter((x) => x.kind === 'declaration')) assert.match(d.number, /ДЕМО/);
});

test('в каталоге встречаются все ситуации, которые надо показать', () => {
  assert.ok(suppliers.some((s) => s.legal.status.value === 'liquidated'));
  assert.ok(suppliers.some((s) => s.legal.status.value === 'liquidating'));
  assert.ok(suppliers.some((s) => s.registryUnavailable));
  assert.ok(suppliers.some((s) => s.legal.inn.status === 'not_found'));
  assert.ok(suppliers.some((s) => s.documents.some((d) => d.status === 'expired')));
  assert.ok(suppliers.some((s) => s.offers.some((o) => o.price.value?.packPrice)));
  assert.ok(suppliers.some((s) => s.offers.some((o) => o.price.status === 'not_found')));
  assert.ok(suppliers.some((s) => s.delivery.nationwide));
});
