import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { api } from '../../shared/api/client';
import { keys, useSaveSettings, useSearchResult, useShortlist, useShortlistActions } from '../../shared/api/queries';
import type { SearchFilters, SupplierSummary, Weights } from '../../shared/api/types';
import { CATEGORIES, CITIES } from '../../shared/config/dictionary';
import { plural } from '../../shared/lib/format';
import { MAX_COMPARE, useCompare } from '../../features/compare/CompareContext';
import { QueryChips } from '../../features/search/QueryChips';
import { useStartSearch } from '../../features/search/useStartSearch';
import { WeightsDialog } from '../../features/weights/WeightsDialog';
import { ProgressPanel, type StepState } from '../../widgets/results/ProgressPanel';
import { SupplierPreview } from '../../widgets/results/SupplierPreview';
import { SupplierRow } from '../../widgets/results/SupplierRow';
import { Button, Empty, Icon, Skeleton, useMediaQuery, useToast } from '../../shared/ui';

type Sort = 'score' | 'price' | 'moq' | 'docs';

interface View {
  deliversOnly: boolean;
  noRed: boolean;
  hasDocs: boolean;
  hasPrice: boolean;
  sort: Sort;
}

const DEFAULT_VIEW: View = { deliversOnly: true, noRed: false, hasDocs: false, hasPrice: false, sort: 'score' };

function moqValue(i: SupplierSummary): number {
  if (!i.moq) return Infinity;
  // Сумму переводим в «условные килограммы», чтобы сортировка была осмысленной
  return i.moq.kind === 'sum' ? i.moq.value / 300 : i.moq.value;
}

function applyView(items: SupplierSummary[], v: View): SupplierSummary[] {
  const out = items.filter(
    (i) =>
      (!v.deliversOnly || i.deliversToCity !== false) &&
      (!v.noRed || !i.score.flags.some((f) => f.level === 'red')) &&
      (!v.hasDocs || i.activeDocs > 0) &&
      (!v.hasPrice || i.keyPrice),
  );
  const blockedLast = (a: SupplierSummary, b: SupplierSummary) => Number(a.score.blocked) - Number(b.score.blocked);
  if (v.sort === 'price') return [...out].sort((a, b) => blockedLast(a, b) || (a.keyPrice?.price.perUnit ?? Infinity) - (b.keyPrice?.price.perUnit ?? Infinity));
  if (v.sort === 'moq') return [...out].sort((a, b) => blockedLast(a, b) || moqValue(a) - moqValue(b));
  if (v.sort === 'docs') return [...out].sort((a, b) => blockedLast(a, b) || b.activeDocs - a.activeDocs);
  return out;
}

export function ResultsPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const fresh = Boolean((location.state as { fresh?: boolean } | null)?.fresh);
  const [streaming, setStreaming] = useState(fresh);
  const [steps, setSteps] = useState<StepState>({});
  const [live, setLive] = useState<SupplierSummary[]>([]);
  const result = useSearchResult(id);
  const shortlist = useShortlist();
  const { add, remove } = useShortlistActions();
  const compare = useCompare();
  const start = useStartSearch();
  const saveSettings = useSaveSettings();
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [editFilters, setEditFilters] = useState<SearchFilters | null>(null);
  const [editQuery, setEditQuery] = useState<string | null>(null);
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const withPreview = useMediaQuery('(min-width: 1200px)');

  /* Поток прогресса для нового поиска */
  useEffect(() => {
    if (!fresh) {
      setStreaming(false);
      return;
    }
    setStreaming(true);
    setSteps({});
    setLive([]);
    const cancel = api.stream(id, (e) => {
      if (e.type === 'step') setSteps((s) => ({ ...s, [e.step]: { status: e.status, detail: e.detail } }));
      else if (e.type === 'supplier') setLive((xs) => [...xs, e.item]);
      else if (e.type === 'done') {
        qc.invalidateQueries({ queryKey: keys.search(id) });
        setStreaming(false);
        navigate(location.pathname, { replace: true, state: {} });
      }
    });
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fresh]);

  useEffect(() => {
    setEditFilters(null);
    setEditQuery(null);
    setView(DEFAULT_VIEW);
    setActiveId(null);
  }, [id]);

  const data = result.data;
  const items = streaming ? live : (data?.items ?? []);
  const filters = editFilters ?? data?.filters ?? null;
  const city = CITIES[filters?.city ?? 'ekb'];
  const visible = useMemo(() => applyView(items, view), [items, view]);
  const hiddenNoDelivery = items.filter((i) => i.deliversToCity === false).length;
  const delivering = items.filter((i) => i.deliversToCity === true).length;
  const redCount = items.filter((i) => i.score.flags.some((f) => f.level === 'red')).length;
  const inShortlist = new Set(shortlist.data?.map((e) => e.supplierId));
  const dirty =
    Boolean(editFilters && data && JSON.stringify(editFilters) !== JSON.stringify(data.filters)) ||
    (editQuery !== null && editQuery.trim() !== (data?.query ?? ''));
  const active = activeId && visible.some((i) => i.id === activeId) ? activeId : (visible[0]?.id ?? null);

  function rerun(weights?: Weights | null) {
    if (!filters) return;
    start.mutate({ query: editQuery?.trim() ?? data?.query ?? '', filters, weights: weights === undefined ? data?.weights : weights });
  }

  async function toggleShortlist(item: SupplierSummary) {
    if (inShortlist.has(item.id)) {
      await remove.mutateAsync(item.id);
      toast('Убрали из шорт-листа');
    } else {
      await add.mutateAsync({ id: item.id, searchId: id });
      toast(`${item.name} — в шорт-листе`, 'good');
    }
  }

  if (result.isError) {
    return (
      <div className="wrap page">
        <Empty icon="search" title="Такого поиска нет" action={<Link className="btn btn--primary btn--md" to="/">Новый поиск</Link>}>
          Возможно, демо сбросили или ссылку открыли в другом браузере: история поисков хранится у вас в браузере.
        </Empty>
      </div>
    );
  }

  const sortHead = (key: Sort, label: string, title: string) => (
    <button
      type="button"
      className={`rhead__sort ${view.sort === key ? 'is-on' : ''}`}
      onClick={() => setView({ ...view, sort: key })}
      aria-pressed={view.sort === key}
      title={title}
    >
      {label}
      <Icon name="chevronDown" size={13} />
    </button>
  );

  return (
    <div className="wrap page results">
      <section className="qbar" aria-label="Запрос">
        <form
          className="qbar__form"
          onSubmit={(e) => {
            e.preventDefault();
            const q = editQuery?.trim();
            if (q !== undefined && q && q !== data?.query && !editFilters) start.mutate({ query: q });
            else if (dirty) rerun();
          }}
        >
          <Link to="/" className="icon-btn" aria-label="Новый поиск">
            <Icon name="arrowLeft" />
          </Link>
          <label htmlFor="rq" className="visually-hidden">
            Запрос
          </label>
          <input id="rq" className="qbar__input" value={editQuery ?? data?.query ?? ''} placeholder="Запрос" onChange={(e) => setEditQuery(e.target.value)} />
          <Button type="submit" variant={dirty ? 'primary' : 'secondary'} busy={start.isPending} disabled={!dirty} className={dirty ? '' : 'is-idle'}>
            Искать заново
          </Button>
        </form>
        {filters ? <QueryChips filters={filters} onChange={setEditFilters} /> : <Skeleton h={30} w="60%" />}
      </section>

      {streaming && <ProgressPanel steps={steps} found={live.length} />}

      <div className={`results__grid ${withPreview ? 'has-preview' : ''}`}>
        <section className="rtable" aria-label="Поставщики" aria-busy={streaming}>
          <div className="rtoolbar">
            <p className="rtoolbar__summary">
              {data && !streaming ? (
                <>
                  <b>
                    {data.items.length} {plural(data.items.length, ['поставщик', 'поставщика', 'поставщиков'])}
                  </b>
                  {data.filters.category && <> · {CATEGORIES[data.filters.category].short.toLowerCase()}</>} · {delivering} возят в {city.acc}
                  {redCount > 0 && <> · {redCount} с красными флагами</>}
                </>
              ) : (
                <>Собираю… найдено {live.length}</>
              )}
            </p>
            <div className="rtoolbar__filters" role="group" aria-label="Фильтры">
              <label className={`toggle ${view.deliversOnly ? 'is-on' : ''}`}>
                <input type="checkbox" checked={view.deliversOnly} onChange={(e) => setView({ ...view, deliversOnly: e.target.checked })} />
                Возят в {city.acc}
              </label>
              <label className={`toggle ${view.noRed ? 'is-on' : ''}`}>
                <input type="checkbox" checked={view.noRed} onChange={(e) => setView({ ...view, noRed: e.target.checked })} />
                Без красных флагов
              </label>
              <label className={`toggle ${view.hasDocs ? 'is-on' : ''}`}>
                <input type="checkbox" checked={view.hasDocs} onChange={(e) => setView({ ...view, hasDocs: e.target.checked })} />
                С документами
              </label>
              <label className={`toggle ${view.hasPrice ? 'is-on' : ''}`}>
                <input type="checkbox" checked={view.hasPrice} onChange={(e) => setView({ ...view, hasPrice: e.target.checked })} />
                С ценой
              </label>
              <Button size="sm" variant="ghost" icon="sliders" onClick={() => setWeightsOpen(true)} disabled={!data}>
                Важность критериев
              </Button>
            </div>
          </div>

          <div role="table" aria-label="Поставщики" className="rtable__body">
            <div role="row" className="rhead">
              <span role="columnheader" className="rhead__check">
                <span className="visually-hidden">Сравнить</span>
              </span>
              <span role="columnheader">Поставщик</span>
              <span role="columnheader">{sortHead('score', 'Оценка', 'Сортировать по оценке')}</span>
              <span role="columnheader">Доставка</span>
              <span role="columnheader">{sortHead('moq', 'Мин. заказ', 'Сначала с меньшим минимальным заказом')}</span>
              <span role="columnheader" title={data?.priceFor ? `Цена за единицу: ${data.priceFor.name}` : undefined}>
                {sortHead('price', data?.priceFor ? `Цена · ${data.priceFor.name.split(/[ ,]/)[0]?.toLowerCase()}` : 'Цена', 'Сначала дешевле')}
              </span>
              <span role="columnheader">{sortHead('docs', 'Документы', 'Сначала с документами')}</span>
              <span role="columnheader">
                <span className="visually-hidden">Шорт-лист</span>
              </span>
            </div>

            {!streaming && !data && (
              <div className="stack" style={{ padding: 16 }}>
                <Skeleton h={44} />
                <Skeleton h={44} />
                <Skeleton h={44} />
              </div>
            )}

            {visible.map((item) => (
              <SupplierRow
                key={item.id}
                item={item}
                searchId={id}
                selected={compare.searchId === id && compare.has(item.id)}
                compareDisabled={compare.searchId === id && compare.ids.length >= MAX_COMPARE}
                onToggleCompare={() => compare.toggle(item.id, id)}
                inShortlist={inShortlist.has(item.id)}
                onToggleShortlist={() => toggleShortlist(item)}
                active={withPreview && item.id === active}
                onSelect={withPreview ? () => setActiveId(item.id) : undefined}
                animate={streaming}
              />
            ))}
          </div>

          {!streaming && data && visible.length === 0 && (
            <Empty
              icon="filter"
              title="Под эти условия никто не подошёл"
              action={
                <div className="empty__actions">
                  {view.deliversOnly && hiddenNoDelivery > 0 && <Button onClick={() => setView({ ...view, deliversOnly: false })}>Показать и тех, кто не возит</Button>}
                  <Button onClick={() => setView(DEFAULT_VIEW)}>Сбросить фильтры</Button>
                </div>
              }
            >
              Уберите требование к документам, выберите соседний город или добавьте своего поставщика.
            </Empty>
          )}
          {!streaming && data && visible.length > 0 && view.deliversOnly && hiddenNoDelivery > 0 && (
            <button type="button" className="rtable__more" onClick={() => setView({ ...view, deliversOnly: false })}>
              Скрыто {hiddenNoDelivery}: не возят в {city.acc}. Показать
            </button>
          )}
          <p className="rtable__legend">
            Полоска под оценкой — шесть критериев: ширина отрезка — вес, заливка — набранные баллы. Красные флаги не
            прячутся в сумме и показаны отдельно.
          </p>
        </section>

        {withPreview && (
          <aside className="results__preview">
            {active ? <SupplierPreview id={active} searchId={id} /> : <div className="preview preview--empty">Выберите поставщика в таблице</div>}
          </aside>
        )}
      </div>

      {compare.ids.length > 0 && compare.searchId === id && <CompareTray items={data?.items ?? live} searchId={id} />}

      {data && (
        <WeightsDialog
          open={weightsOpen}
          onClose={() => setWeightsOpen(false)}
          current={data.weights}
          onApply={(w) => {
            setWeightsOpen(false);
            saveSettings.mutate({ weights: w });
            rerun(w);
          }}
        />
      )}
    </div>
  );
}

function CompareTray({ items, searchId }: { items: SupplierSummary[]; searchId: string }) {
  const compare = useCompare();
  const names = compare.ids.map((cid) => items.find((i) => i.id === cid)?.name.replace(/^(ООО|АО|КФХ) /, '') ?? cid);
  return (
    <div className="tray" role="region" aria-label="Сравнение">
      <div className="wrap tray__in">
        <span className="tray__label">
          <Icon name="scale" size={16} /> Сравнение: {compare.ids.length} из {MAX_COMPARE}
        </span>
        <ul className="tray__names">
          {compare.ids.map((cid, i) => (
            <li key={cid}>
              {names[i]}
              <button type="button" aria-label={`Убрать ${names[i]}`} onClick={() => compare.remove(cid)}>
                <Icon name="x" size={13} />
              </button>
            </li>
          ))}
        </ul>
        <div className="tray__actions">
          <Button size="sm" variant="ghost" onClick={compare.clear}>
            Очистить
          </Button>
          {compare.ids.length >= 2 ? (
            <Link className="btn btn--primary btn--sm" to={`/compare?ids=${compare.ids.join(',')}&search=${searchId}`}>
              <span>Сравнить</span>
            </Link>
          ) : (
            <span className="tray__hint">отметьте ещё одного</span>
          )}
        </div>
      </div>
    </div>
  );
}
