// Сквозная проверка собранного прототипа: npm run build && npm run e2e
// Сайт открывается из подпапки /supplier-scout/ — так же, как на GitHub Pages.
import { chromium } from 'playwright';
import { serve } from '../scripts/serve.mjs';

const BASE = '/supplier-scout/';
const PORT = 4174;
const URL = `http://localhost:${PORT}${BASE}`;
const server = await serve(new globalThis.URL('../dist', import.meta.url).pathname, PORT, { base: BASE });
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const failures = [];

function check(cond, msg) {
  if (!cond) failures.push(msg);
  console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`);
}

async function run(width, height) {
  console.log(`\nШирина ${width}px`);
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'ru-RU', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const noHScroll = async () => (await page.evaluate(() => document.documentElement.scrollWidth)) <= width;

  await page.goto(URL);
  await page.waitForSelector('.home__title');
  check((await page.locator('h1').count()) === 1, 'на главной один заголовок h1');
  check(await page.locator('.demo-strip').isVisible(), 'плашка «Демо» видна');
  check(await noHScroll(), 'на главной нет горизонтальной прокрутки');

  // Живой разбор запроса
  await page.fill('#q', 'лосось охлаждённый с ветсертификатом, екб');
  await page.waitForSelector('.qchips');
  check((await page.locator('.qchip--doc').count()) === 1, '«как понял» распознал требование ветдокументов');

  // Готовый сценарий → поток прогресса → результаты
  await page.goto(URL);
  await page.locator('.examples__item').first().click();
  await page.waitForSelector('.progress');
  check(true, 'прогресс поиска показывается');
  await page.waitForSelector('.rtoolbar__summary b', { timeout: 20000 });
  const rows = await page.locator('.srow').count();
  check(rows >= 8, `в сценарии не меньше 8 поставщиков (${rows})`);
  check(await noHScroll(), 'в результатах нет горизонтальной прокрутки');

  // Сортировка по цене
  if (width >= 861) {
    await page.locator('.rhead__sort', { hasText: 'Цена' }).click();
    const prices = await page.locator('.srow:not(.is-blocked) .srow__price b').allInnerTexts();
    const nums = prices.map((p) => Number(p.split('₽')[0].replace(/[^\d]/g, '') || 'NaN')).filter((n) => !Number.isNaN(n));
    check(nums.length > 2 && nums.every((n, i) => i === 0 || n >= nums[i - 1]), 'сортировка по цене работает');
    await page.locator('.rhead__sort', { hasText: 'Оценка' }).click();
  }

  // Шорт-лист из таблицы
  await page.locator('.star').first().click();
  await page.waitForSelector('.nav__count');
  check((await page.locator('.nav__count').innerText()) === '1', 'звёздочка добавляет в шорт-лист');

  // Сравнение
  await page.locator('.srow__check input').nth(0).check();
  await page.locator('.srow__check input').nth(1).check();
  await page.locator('.tray a', { hasText: 'Сравнить' }).click();
  await page.waitForSelector('.cmp');
  check((await page.locator('.cmp thead th').count()) === 3, 'сравнение показывает двух поставщиков');
  check((await page.locator('.cmp td.is-best').count()) > 0, 'лучшее значение в строке подсвечено');
  await page.goBack();
  await page.waitForSelector('.srow');

  // Карточка поставщика
  if (width >= 1200) {
    await page.locator('.srow').nth(1).click();
    await page.waitForSelector('.preview__head');
    check(true, 'панель предпросмотра открывается по клику на строку');
    await page.locator('.preview a', { hasText: 'Вся карточка' }).click();
  } else {
    await page.locator('.srow__name').nth(1).click();
  }
  await page.waitForSelector('.supplier__head h1');
  check(await noHScroll(), 'в карточке нет горизонтальной прокрутки');

  // Источник с подсвеченной цитатой
  await page.locator('.offers .srclink').first().click();
  await page.waitForSelector('.quote-mark');
  const quote = await page.locator('.quote-mark').innerText();
  check(quote.length > 5, `источник открывается, цитата подсвечена («${quote.slice(0, 40)}…»)`);
  await page.keyboard.press('Escape');

  // Письмо
  await page.getByRole('button', { name: 'Написать запрос КП' }).click();
  await page.waitForSelector('#letter-body');
  const body = await page.inputValue('#letter-body');
  check(body.startsWith('Здравствуйте') && body.includes('Чтобы сравнить предложения'), 'черновик письма собран');
  await page.getByRole('button', { name: 'Отметить «Написали»' }).click();
  await page.waitForTimeout(300);

  // Шорт-лист и выгрузка
  await page.goto(`${URL}#/shortlist`);
  await page.waitForSelector('.sitem');
  check((await page.locator('.sitem').count()) === 2, 'в шорт-листе два поставщика');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Выгрузить/ }).click()]);
  check(download.suggestedFilename().endsWith('.csv'), 'шорт-лист выгружается в CSV');

  // Перезагрузка сохраняет состояние, сброс — очищает
  await page.reload();
  await page.waitForSelector('.sitem');
  check(true, 'шорт-лист переживает перезагрузку');
  await page.locator('.demo-strip button', { hasText: 'Сбросить' }).click();
  await page.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await page.waitForSelector('.home__title');
  check((await page.locator('.nav__count').count()) === 0, '«Сбросить демо» очищает шорт-лист');

  check(errors.length === 0, `нет ошибок в консоли${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

try {
  for (const [w, h] of [
    [390, 844],
    [1280, 860],
    [1440, 900],
  ])
    await run(w, h);
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error(`\nНе прошло: ${failures.length}`);
  process.exit(1);
}
console.log('\nВсё прошло');
