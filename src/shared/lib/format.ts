import type { Moq, Price, Unit } from '../api/types';
import { UNIT_LABEL } from '../config/dictionary';

const NBSP = ' ';

export function num(n: number, digits = 0): string {
  return n
    .toLocaleString('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
    .replace(/\s/g, NBSP);
}

export function money(n: number): string {
  return `${num(Math.round(n))}${NBSP}₽`;
}

export function perUnit(price: Price): string {
  return `${money(price.perUnit)}/${UNIT_LABEL[price.unit]}`;
}

export function priceLine(price: Price): string {
  if (price.packPrice && price.packSize) {
    return `${perUnit(price)} · упаковка ${num(price.packSize)}${NBSP}${UNIT_LABEL[price.unit]} — ${money(price.packPrice)}`;
  }
  return perUnit(price);
}

export function moqLine(moq: Moq): string {
  if (moq.kind === 'sum') return `от ${money(moq.value)}`;
  return `от ${num(moq.value)}${NBSP}${UNIT_LABEL[moq.unit ?? 'kg']}`;
}

export function unitLabel(u: Unit): string {
  return UNIT_LABEL[u];
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** '2026-10-14' → '14 октября 2026' (без часовых поясов — режем строку) */
export function date(iso: string, withYear = true): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const s = `${d} ${MONTHS[(m ?? 1) - 1]}`;
  return withYear ? `${s} ${y}` : s;
}

export function dateShort(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/** Разница в днях между двумя датами YYYY-MM-DD */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000);
}

export function yearsBetween(a: string, b: string): number {
  return daysBetween(a, b) / 365.25;
}

/** plural(5, ['поставщик', 'поставщика', 'поставщиков']) */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export function ageLabel(years: number): string {
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12));
    return `${months} ${plural(months, ['месяц', 'месяца', 'месяцев'])}`;
  }
  const y = Math.floor(years);
  return `${y} ${plural(y, ['год', 'года', 'лет'])}`;
}

/** «Лосось, филе трим D» → «лосось, филе трим D»: строчная только первая буква */
export function lcFirst(s: string): string {
  return s ? s[0]!.toLowerCase() + s.slice(1) : s;
}

export function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
