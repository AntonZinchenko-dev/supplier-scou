import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../shared/api/client';
import { useRecent, useShortlist } from '../../shared/api/queries';
import type { SearchFilters } from '../../shared/api/types';
import { CATEGORIES, CRITERIA, CRITERIA_ORDER, DEFAULT_WEIGHTS, SCENARIOS, STATUS, STATUS_ORDER } from '../../shared/config/dictionary';
import { dateShort } from '../../shared/lib/format';
import { QueryChips } from '../../features/search/QueryChips';
import { useStartSearch } from '../../features/search/useStartSearch';
import { Button, Icon } from '../../shared/ui';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function HomePage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters | null>(null);
  const debounced = useDebounced(query.trim(), 280);
  const parsed = useQuery({ queryKey: ['parse', debounced], queryFn: () => api.parse(debounced), enabled: debounced.length > 2 });
  const start = useStartSearch();
  const recent = useRecent();
  const shortlist = useShortlist();

  useEffect(() => {
    if (parsed.data && parsed.data.raw === debounced) setFilters(parsed.data.filters);
  }, [parsed.data, debounced]);
  useEffect(() => {
    if (!query.trim()) setFilters(null);
  }, [query]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    start.mutate({ query: q, filters: filters && debounced === q ? filters : undefined });
  }

  const entries = shortlist.data ?? [];
  const nextSteps = entries.filter((e) => e.nextStep).sort((a, b) => (a.nextStep! < b.nextStep! ? -1 : 1)).slice(0, 3);

  return (
    <div className="wrap home">
      <section className="home__main">
        <h1 className="home__title">Поиск поставщиков продуктов питания</h1>
        <p className="home__lead">
          Что нужно и куда — одной строкой. Сравним цену, минимальный заказ, доставку и документы; у каждой цифры будет
          ссылка на источник.
        </p>

        <form className="searchbox" onSubmit={submit} role="search">
          <label htmlFor="q" className="visually-hidden">
            Что ищем
          </label>
          <div className="searchbox__field">
            <Icon name="search" size={18} />
            <input
              id="q"
              className="searchbox__input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="молочка для кафе, Екатеринбург, от 50 кг в неделю"
              autoComplete="off"
              autoFocus
            />
            <Button variant="primary" size="lg" type="submit" busy={start.isPending} disabled={!query.trim()}>
              Найти
            </Button>
          </div>
          {filters && query.trim() ? (
            <QueryChips filters={filters} onChange={setFilters} unknown={parsed.data?.unknown} />
          ) : (
            <p className="searchbox__hint">Можно указать категорию или товар, город, объём, «с ветдокументами», «каждый день».</p>
          )}
        </form>

        <section className="examples" aria-labelledby="ex-title">
          <h2 id="ex-title" className="section-title">
            Примеры запросов
          </h2>
          <ul className="examples__list">
            {SCENARIOS.map((s) => (
              <li key={s.query}>
                <button type="button" className="examples__item" onClick={() => start.mutate({ query: s.query })} disabled={start.isPending}>
                  <span className="examples__cat">{CATEGORIES[s.category].short}</span>
                  <span className="examples__q">{s.query}</span>
                  <Icon name="chevronRight" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {recent.data && recent.data.length > 0 && (
          <section className="examples" aria-labelledby="recent-title">
            <h2 id="recent-title" className="section-title">
              Недавние поиски
            </h2>
            <ul className="examples__list">
              {recent.data.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <Link className="examples__item" to={`/search/${r.id}`}>
                    <span className="examples__cat">{dateShort(r.createdAt)}</span>
                    <span className="examples__q">{r.query || 'поиск по фильтрам'}</span>
                    <Icon name="chevronRight" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>

      <aside className="home__side">
        <section className="panel" aria-labelledby="sl-title">
          <header className="panel__head">
            <h2 id="sl-title">Шорт-лист</h2>
            <Link to="/shortlist">Открыть</Link>
          </header>
          {entries.length ? (
            <>
              <table className="mini">
                <tbody>
                  {STATUS_ORDER.filter((s) => entries.some((e) => e.status === s)).map((s) => (
                    <tr key={s}>
                      <th scope="row">{STATUS[s].name}</th>
                      <td>{entries.filter((e) => e.status === s).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {nextSteps.length > 0 && (
                <>
                  <h3 className="panel__sub">Ближайшие шаги</h3>
                  <ul className="panel__list">
                    {nextSteps.map((e) => (
                      <li key={e.supplierId}>
                        <span>{dateShort(e.nextStep!)}</span> {e.name}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="muted">Пока пусто. Отмечайте подходящих поставщиков звёздочкой в результатах.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="w-title">
          <header className="panel__head">
            <h2 id="w-title">Как считается оценка</h2>
          </header>
          <table className="mini">
            <tbody>
              {CRITERIA_ORDER.map((k) => (
                <tr key={k}>
                  <th scope="row">
                    {CRITERIA[k].name}
                    <small>{CRITERIA[k].hint}</small>
                  </th>
                  <td>{DEFAULT_WEIGHTS[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="panel__note">
            Баллы считает код по правилам, веса можно поменять. Ликвидация, истёкшие декларации и другие красные флаги
            показаны отдельно и не прячутся в сумме.
          </p>
        </section>
      </aside>
    </div>
  );
}
