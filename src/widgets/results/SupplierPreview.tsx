import { useState } from 'react';
import { Link } from 'react-router';
import { useShortlist, useShortlistActions, useSupplierCard } from '../../shared/api/queries';
import { CITIES, CRITERIA, PRODUCT_BY_ID } from '../../shared/config/dictionary';
import { moqLine, priceLine } from '../../shared/lib/format';
import { ScoreBar } from '../../entities/score/ScoreBar';
import { SourceLink } from '../../entities/supplier/Fact';
import { LetterDialog } from '../../features/letter/LetterDialog';
import { Button, Icon, Skeleton, useToast } from '../../shared/ui';
import { KIND_LABEL, scheduleShort } from './SupplierRow';

/** Панель справа от таблицы: главное о поставщике без перехода на другую страницу */
export function SupplierPreview({ id, searchId }: { id: string; searchId: string }) {
  const card = useSupplierCard(id, searchId);
  const shortlist = useShortlist();
  const { add } = useShortlistActions();
  const toast = useToast();
  const [letter, setLetter] = useState(false);

  if (!card.data) {
    return (
      <div className="preview">
        <Skeleton h={22} w="70%" />
        <Skeleton h={14} w="40%" />
        <Skeleton h={120} />
        <Skeleton h={160} />
      </div>
    );
  }
  const { supplier: s, summary, filters } = card.data;
  const sc = summary.score;
  const inList = shortlist.data?.some((e) => e.supplierId === s.id);
  const offers = filters.products.length
    ? s.offers.filter((o) => filters.products.includes(o.productId))
    : s.offers.slice(0, 3);
  const missingProducts = filters.products.filter((p) => !s.offers.some((o) => o.productId === p));
  const moq = s.offers[0]?.moq;
  const activeDocs = s.documents.filter((d) => d.status === 'active');

  return (
    <div className="preview" aria-label={`Предпросмотр: ${s.name}`}>
      <header className="preview__head">
        <h2>{s.name}</h2>
        <p>{s.tagline}</p>
        <p className="preview__meta">
          {CITIES[s.city].name} · {KIND_LABEL[s.kind]}
        </p>
      </header>

      {sc.flags.length > 0 && (
        <ul className="preview__flags">
          {sc.flags.map((f) => (
            <li key={f.code} className={`pflag pflag--${f.level}`}>
              <Icon name="alert" size={14} />
              {f.text}
            </li>
          ))}
        </ul>
      )}

      <section className="preview__score">
        <div className="preview__total">
          <span className={`preview__num ${sc.blocked ? 'is-blocked' : ''}`}>{sc.total}</span>
          <span className="muted">из 100</span>
        </div>
        <ScoreBar score={sc} />
        <table className="ptable">
          <tbody>
            {sc.items.map((i) => (
              <tr key={i.criterion}>
                <th scope="row">{CRITERIA[i.criterion].name}</th>
                <td className="ptable__pts">
                  {i.points}
                  <span>/{i.max}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <dl className="pfacts">
        <div>
          <dt>Доставка</dt>
          <dd>
            {s.delivery.cities.value?.includes(filters.city)
              ? `возит в ${CITIES[filters.city].acc}, ${scheduleShort(s.delivery.schedule.value)}`
              : s.delivery.nationwide
                ? 'только ТК, 3–7 дней'
                : `не возит в ${CITIES[filters.city].acc}`}
            <SourceLink sourceId={s.delivery.cities.sourceId} quote={s.delivery.cities.quote} method={s.delivery.cities.method} />
          </dd>
        </div>
        <div>
          <dt>Мин. заказ</dt>
          <dd>
            {moq?.value ? (
              <>
                {moqLine(moq.value)} <SourceLink sourceId={moq.sourceId} quote={moq.quote} method={moq.method} />
              </>
            ) : (
              <span className="dim">не нашли · спросим в письме</span>
            )}
          </dd>
        </div>
        {offers.map((o) => (
          <div key={o.productId}>
            <dt>{o.name}</dt>
            <dd>
              {o.price.value ? (
                <>
                  {priceLine(o.price.value)} <SourceLink sourceId={o.price.sourceId} quote={o.price.quote} method={o.price.method} />
                </>
              ) : (
                <span className="dim">по запросу</span>
              )}
            </dd>
          </div>
        ))}
        {missingProducts.map((p) => (
          <div key={p}>
            <dt>{PRODUCT_BY_ID[p]?.name ?? p}</dt>
            <dd className="dim">нет в прайсе</dd>
          </div>
        ))}
        <div>
          <dt>Документы</dt>
          <dd>
            {activeDocs.length ? (
              activeDocs.map((d) => (d.kind === 'declaration' ? `декларация на ${d.productLabel}` : d.kind === 'vet' ? 'ветдокументы' : 'ХАССП')).join('; ')
            ) : (
              <span className="bad">действующих не нашли</span>
            )}
          </dd>
        </div>
        <div>
          <dt>Контакты</dt>
          <dd>
            {s.contacts.phone.value ?? '—'}
            {s.contacts.email.value && (
              <>
                <br />
                <a href={`mailto:${s.contacts.email.value}`}>{s.contacts.email.value}</a>
              </>
            )}
          </dd>
        </div>
      </dl>

      <div className="preview__actions">
        <Button variant="primary" icon="mail" onClick={() => setLetter(true)}>
          Запрос КП
        </Button>
        <Button
          icon="star"
          disabled={inList}
          onClick={async () => {
            await add.mutateAsync({ id: s.id, searchId });
            toast('Добавлено в шорт-лист', 'good');
          }}
        >
          {inList ? 'В шорт-листе' : 'В шорт-лист'}
        </Button>
        <Link className="btn btn--ghost btn--md" to={`/supplier/${s.id}?search=${searchId}`}>
          <span>Вся карточка</span>
          <Icon name="chevronRight" size={16} />
        </Link>
      </div>

      <LetterDialog supplierId={s.id} supplierName={s.name} searchId={searchId} open={letter} onClose={() => setLetter(false)} />
    </div>
  );
}
