import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSseParser, formatSse } from '../src/shared/api/sse';

test('поток SSE собирается из кусков, разорванных где угодно', () => {
  const got: [string, unknown][] = [];
  const feed = createSseParser((e, d) => got.push([e, JSON.parse(d)]));
  const raw = formatSse({ type: 'step', step: 'parse' }, 'step') + formatSse({ type: 'done', total: 3 }, 'done').replace(/\n/g, '\r\n');
  for (let i = 0; i < raw.length; i += 7) feed(raw.slice(i, i + 7));
  assert.deepEqual(got, [
    ['step', { type: 'step', step: 'parse' }],
    ['done', { type: 'done', total: 3 }],
  ]);
});
