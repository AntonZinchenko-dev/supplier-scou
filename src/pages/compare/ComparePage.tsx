import { useQueries } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, type SupplierCard } from '../../shared/api/client';
import { keys, useShortlist, useShortlistActions } from '../../shared/api/queries';
import { CITIES, DEMO_TODAY, PRODUCT_BY_ID } from '../../shared/config/dictionary';
import { ageLabel, daysBetween, moqLine, perUnit, yearsBetween } from '../../shared/lib/format';
import { ScoreBar, ScoreNumber } from '../../entities/score/ScoreBar';
import { SourceLink } from '../../entities/supplier/Fact';
import { useCompare } from '../../features/compare/CompareContext';
import { LetterDialog } from '../../features/letter/LetterDialog';
import { scheduleShort } from '../../widgets/results/SupplierRow';
import { Button, Empty, Icon, IconButton, Skeleton, useToast } from '../../shared/ui';

type Cell = { node: ReactNode; value?: number | null };

function bestIndex(cells: Cell[], mode: 'min' | 'max'): number {
  let best = -1;
  let bv = mode === 'min' ? Infinity : -Infinity;
  cells.forEach((c, i) => {
    if (c.value === null || c.value === undefined) return;
    if ((mode === 'min' && c.value < bv) || (mode === 'max' && c.value > bv)) {
      bv = c.value;
      best = i;
    }
  });
  const ties = cells.filter((c) => c.value === bv).length;
  return ties > 1 && ties === cells.length ? -1 : best;
}

const NA = <span className="cmp__na">нет данных</span>;

export function ComparePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, 4);
  const searchId = params.get('search');
  const compare = useCompare();
  const toast = useToast();
  const shortlist = useShortlist();
  const { add } = useShortlistActions();
  const [letterFor, setLetterFor] = useState<{ id: string; name: string } | null>(null);
  const cards = useQueries({
    queries: ids.map((id) => ({ queryKey: keys.supplier(id, searchId), queryFn: () => api.supplier(id, searchId) })),
  });

  if (ids.length < 2) {
    return (
      <div className="wrap page">
        <Empty icon="scale" title="Нечего сравнивать" action={<Link className="btn btn--primary btn--md" to="/">К поиску</Link>}>
          Отметьте галочкой 2–4 поставщика в результатах поиска.
        </Empty>
      </div>
    );
  }
  if (cards.some((c) => c.isLoading)) {
    return (
      <div className="wrap page">
        <Skeleton h={48} w="40%" />
        <div style={{ marginTop: 24 }}>
          <Skeleton h={420} />
        </div>
      </div>
    );
  }
  const data = cards.map((c) => c.data).filter(Boolean) as SupplierCard[];
  if (!data.length) return null;
  const filters = data[0]!.filters;
  const city = CITIES[filters.city];
  const inShortlist = new Set(shortlist.data?.map((e) => e.supplierId));

  const products = filters.products.length
    ? filters.products
    : [...new Set(data.flatMap((d) => d.supplier.offers.filter((o) => !filters.category || PRODUCT_BY_ID[o.productId]?.category === filters.category).map((o) => o.productId)))].slice(0, 4);

  function removeCol(id: string) {
    const next = ids.filter((x) => x !== id);
    compare.remove(id);
    navigate(`/compare?ids=${next.join(',')}${searchId ? `&search=${searchId}` : ''}`, { replace: true });
  }

  const rows: { label: string; hint?: string; cells: Cell[]; best?: 'min' | 'max' }[] = [
    {
      label: 'Оценка',
      hint: query(data[0]!),
      best: 'max',
      cells: data.map((d) => ({
        value: d.summary.score.blocked ? null : d.summary.score.total,
        node: (
          <div className="cmp__score">
            <ScoreNumber score={d.summary.score} />
            <ScoreBar score={d.summary.score} compact />
          </div>
        ),
      })),
    },
    {
      label: 'Предупреждения',
      cells: data.map((d) => ({
        node: d.summary.score.flags.length ? (
          <ul className="cmp__flags">
            {d.summary.score.flags.map((f) => (
              <li key={f.code} className={`flag flag--${f.level}`}>
                {f.text}
              </li>
            ))}
          </ul>
        ) : (
          <span className="cmp__ok">
            <Icon name="check" size={14} /> нет
          </span>
        ),
      })),
    },
    {
      label: `Доставка в ${city.acc}`,
      cells: data.map((d) => {
        const c = d.supplier.delivery.cities;
        const yes = c.value?.includes(filters.city);
        return {
          node: yes ? (
            <>
              <Icon name="check" size={14} /> {scheduleShort(d.supplier.delivery.schedule.value)} <SourceLink sourceId={c.sourceId} quote={c.quote} />
            </>
          ) : d.supplier.delivery.nationwide ? (
            'только ТК, 3–7 дней'
          ) : (
            <span className="cmp__bad">не возит</span>
          ),
        };
      }),
    },
    ...products.map((pid) => ({
      label: PRODUCT_BY_ID[pid]?.name ?? pid,
      hint: 'цена за единицу',
      best: 'min' as const,
      cells: data.map((d) => {
        const o = d.supplier.offers.find((x) => x.productId === pid);
        if (!o) return { node: <span className="cmp__na">нет в ассортименте</span>, value: null };
        if (!o.price.value) return { node: <span className="cmp__na">по запросу</span>, value: null };
        return {
          value: o.price.value.perUnit,
          node: (
            <>
              {perUnit(o.price.value)}
              {o.price.value.packPrice && <small>пересчитано из цены за упаковку</small>} <SourceLink sourceId={o.price.sourceId} quote={o.price.quote} />
            </>
          ),
        };
      }),
    })),
    {
      label: 'Минимальный заказ',
      cells: data.map((d) => {
        const m = d.supplier.offers[0]?.moq;
        return m?.value ? { node: <>{moqLine(m.value)} <SourceLink sourceId={m.sourceId} quote={m.quote} /></> } : { node: NA };
      }),
    },
    {
      label: 'Документы',
      best: 'max',
      cells: data.map((d) => {
        const active = d.supplier.documents.filter((x) => x.status === 'active');
        const expired = d.supplier.documents.filter((x) => x.status === 'expired');
        return {
          value: active.length,
          node: active.length ? (
            <ul className="cmp__docs">
              {active.map((x) => (
                <li key={x.id}>
                  {x.kind === 'declaration' ? `декларация на ${x.productLabel}` : x.kind === 'vet' ? 'ветдокументы' : 'ХАССП'}
                </li>
              ))}
            </ul>
          ) : expired.length ? (
            <span className="cmp__bad">истекли</span>
          ) : (
            NA
          ),
        };
      }),
    },
    {
      label: 'Юрлицо',
      cells: data.map((d) => {
        const st = d.supplier.legal.status.value;
        const reg = d.supplier.legal.registeredAt.value;
        if (!st) return { node: <span className="cmp__na">не проверено</span> };
        return {
          node:
            st === 'active' ? (
              <>действует {reg ? ageLabel(yearsBetween(reg, DEMO_TODAY)) : ''}</>
            ) : (
              <span className="cmp__bad">{st === 'liquidated' ? 'ликвидировано' : 'ликвидируется'}</span>
            ),
        };
      }),
    },
    {
      label: 'Отсрочка платежа',
      best: 'max',
      cells: data.map((d) => (d.supplier.deferral.value ? { value: d.supplier.deferral.value, node: `до ${d.supplier.deferral.value} дней` } : { node: NA, value: null })),
    },
    {
      label: 'Данные собраны',
      cells: data.map((d) => {
        if (d.supplier.manual) return { node: 'вручную' };
        const days = daysBetween(d.supplier.contacts.phone.fetchedAt, DEMO_TODAY);
        return { node: <span className={days > 30 ? 'cmp__bad' : ''}>{days} дн. назад</span> };
      }),
    },
  ];

  return (
    <div className="wrap page compare">
      <nav className="crumbs">
        <Link to={searchId ? `/search/${searchId}` : '/'}>
          <Icon name="arrowLeft" size={16} /> К результатам
        </Link>
      </nav>
      <h1 className="page-title">Сравнение поставщиков</h1>
      <p className="muted">Лучшее значение в строке подсвечено. «Нет данных» — значит, на сайте этого не нашли: вопрос уйдёт в письмо.</p>
      <div className="cmp-scroll">
        <table className="cmp" style={{ ['--cols' as string]: data.length }}>
          <thead>
            <tr>
              <th scope="col" className="cmp__corner">
                <span className="visually-hidden">Критерий</span>
              </th>
              {data.map((d) => (
                <th scope="col" key={d.supplier.id}>
                  <div className="cmp__head">
                    <Link to={`/supplier/${d.supplier.id}${searchId ? `?search=${searchId}` : ''}`}>{d.supplier.name}</Link>
                    <span>{CITIES[d.supplier.city].name}</span>
                    <IconButton icon="x" label={`Убрать ${d.supplier.name}`} className="icon-btn--sm" onClick={() => removeCol(d.supplier.id)} disabled={data.length <= 2} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const best = r.best ? bestIndex(r.cells, r.best) : -1;
              return (
                <tr key={r.label}>
                  <th scope="row">
                    {r.label}
                    {r.hint && <small>{r.hint}</small>}
                  </th>
                  {r.cells.map((c, i) => (
                    <td key={i} className={i === best ? 'is-best' : ''}>
                      {c.node}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="cmp__actions">
              <th scope="row">Действия</th>
              {data.map((d) => (
                <td key={d.supplier.id}>
                  <Button size="sm" variant="primary" icon="mail" onClick={() => setLetterFor({ id: d.supplier.id, name: d.supplier.name })}>
                    Письмо
                  </Button>
                  <Button
                    size="sm"
                    icon="star"
                    disabled={inShortlist.has(d.supplier.id)}
                    onClick={async () => {
                      await add.mutateAsync({ id: d.supplier.id, searchId });
                      toast('Добавлено в шорт-лист', 'good');
                    }}
                  >
                    {inShortlist.has(d.supplier.id) ? 'В шорт-листе' : 'В шорт-лист'}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {letterFor && <LetterDialog supplierId={letterFor.id} supplierName={letterFor.name} searchId={searchId} open onClose={() => setLetterFor(null)} />}
    </div>
  );
}

function query(d: SupplierCard): string | undefined {
  return d.query ? `под запрос «${d.query}»` : undefined;
}
