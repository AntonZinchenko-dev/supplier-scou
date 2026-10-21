import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCatalog } from '../src/mocks/data/catalog';
import { buildLetter } from '../src/mocks/logic/letter';
import { parseQuery } from '../src/mocks/logic/parse';

const { suppliers } = buildCatalog();
const byId = (id: string) => suppliers.find((s) => s.id === id)!;

test('нет цены и минимального заказа — это вопросы в письме', () => {
  const f = parseQuery('молоко екб').filters;
  const l = buildLetter(byId('chusovskie-luga'), f, 'Сеть кафе «Пример»');
  assert.ok(l.questions.some((q) => q.includes('цена')));
  assert.ok(l.questions.some((q) => q.includes('минимальный заказ')));
  assert.match(l.subject, /Сеть кафе «Пример»/);
  assert.match(l.body, /с доставкой в Екатеринбург/);
});

test('нет ветдокументов при требовании — спрашиваем про «Меркурий»', () => {
  const f = parseQuery('лосось с ветсертификатом екб').filters;
  const l = buildLetter(byId('sushi-snab'), f, '');
  assert.ok(l.questions.some((q) => q.includes('Меркури')));
  assert.match(l.body, /нужны ветеринарные документы/);
});

test('у полного поставщика вопросов о цене нет, но есть практичные', () => {
  const f = parseQuery('лосось екб').filters;
  const l = buildLetter(byId('severny-veter'), f, 'Х');
  assert.ok(!l.questions.some((q) => q.includes('цена')));
  assert.ok(l.questions.length >= 2);
  assert.equal(l.to, byId('severny-veter').contacts.email.value);
});

test('истёкшая декларация — просим действующую', () => {
  const f = parseQuery('молочка екб').filters;
  const l = buildLetter(byId('holod-sklad-66'), f, 'Х');
  assert.ok(l.questions.some((q) => q.includes('действующая')));
});
