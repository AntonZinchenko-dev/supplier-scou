import { useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useShortlist, useShortlistActions, useSupplierCard } from '../../shared/api/queries';
import type { DocKind, Fact, Moq, PipelineStatus, Supplier } from '../../shared/api/types';
import { CITIES, CRITERIA, DEMO_TODAY, DOC_LABEL, STATUS, STATUS_ORDER } from '../../shared/config/dictionary';
import { ageLabel, date, dateShort, hostOf, money, moqLine, priceLine, yearsBetween } from '../../shared/lib/format';
import { FactRow, SourceLink } from '../../entities/supplier/Fact';
import { ScoreBar, ScoreNumber } from '../../entities/score/ScoreBar';
import { MAX_COMPARE, useCompare } from '../../features/compare/CompareContext';
import { LetterDialog } from '../../features/letter/LetterDialog';
import { KIND_LABEL } from '../../widgets/results/SupplierRow';
import { useOpenSource } from '../../widgets/source-drawer/SourceDrawer';
import { Badge, Button, Empty, Icon, Skeleton, useToast } from '../../shared/ui';

const DOC_ICON: Record<DocKind, 'doc' | 'landmark' | 'check'> = { declaration: 'doc', certificate: 'doc', vet: 'landmark', haccp: 'check' };

function Section({ id, title, children, aside }: { id: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="card section" aria-labelledby={id}>
      <header className="section__head">
        <h2 id={id}>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function SupplierPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const searchId = params.get('search');
  const card = useSupplierCard(id, searchId);
  const shortlist = useShortlist();
  const actions = useShortlistActions();
  const compare = useCompare();
  const openSource = useOpenSource();
  const toast = useToast();
  const [letterOpen, setLetterOpen] = useState(false);
  const [note, setNote] = useState('');

  if (card.isLoading) {
    return (
      <div className="wrap page">
        <Skeleton h={40} w="50%" />
        <div className="stack" style={{ marginTop: 24 }}>
          <Skeleton h={160} />
          <Skeleton h={160} />
        </div>
      </div>
    );
  }
  if (!card.data) {
    return (
      <div className="wrap page">
        <Empty icon="box" title="Поставщик не найден" action={<Link className="btn btn--primary btn--md" to="/">К поиску</Link>}>
          Возможно, это поставщик, добавленный вручную, а демо после этого сбросили.
        </Empty>
      </div>
    );
  }

  const { supplier: s, summary, filters, query } = card.data;
  const entry = shortlist.data?.find((e) => e.supplierId === s.id);
  const score = summary.score;
  const requested = new Set(filters.products);
  const city = CITIES[filters.city];
  const reg = s.legal.registeredAt.value;
  const inCompare = compare.has(s.id) && (!searchId || compare.searchId === searchId);

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    if (!entry) await actions.add.mutateAsync({ id: s.id, searchId });
    await actions.update.mutateAsync({ id: s.id, note });
    setNote('');
  }

  return (
    <div className="wrap page supplier">
      <nav className="crumbs" aria-label="Навигация">
        {searchId ? (
          <Link to={`/search/${searchId}`}>
            <Icon name="arrowLeft" size={16} /> К результатам{query ? `: «${query}»` : ''}
          </Link>
        ) : (
          <Link to="/">
            <Icon name="arrowLeft" size={16} /> К поиску
          </Link>
        )}
      </nav>

      <header className="supplier__head">
        <div>
          <h1>{s.name}</h1>
          <p className="supplier__tag">{s.tagline}</p>
          <p className="supplier__meta">
            <span>
              <Icon name="landmark" size={15} /> {CITIES[s.city].name} · {KIND_LABEL[s.kind]}
            </span>
            {s.website && (
              <span>
                <Icon name="globe" size={15} /> {hostOf(s.website)}
                {s.offers[0]?.price.sourceId && (
                  <button type="button" className="linkish" onClick={() => openSource({ sourceId: s.offers[0]!.price.sourceId! })}>
                    открыть снимок
                  </button>
                )}
              </span>
            )}
            {s.manual && <Badge tone="brand" icon="note">добавлен вручную</Badge>}
          </p>
        </div>
      </header>

      {score.flags.length > 0 && (
        <ul className="flags-panel">
          {score.flags.map((f) => (
            <li key={f.code} className={`flag flag--${f.level} flag--lg`}>
              <Icon name="alert" size={16} />
              <span>{f.text}</span>
              {f.sourceId && <SourceLink sourceId={f.sourceId} method={/(registry|:docs)$/.test(f.sourceId) ? 'registry' : 'site'} />}
            </li>
          ))}
        </ul>
      )}

      <div className="supplier__layout">
        <div className="supplier__main">
          <Section id="sec-offers" title="Ассортимент и цены" aside={<span className="muted">для юрлиц, с сайта</span>}>
            {s.offers.length ? (
              <table className="offers">
                <thead>
                  <tr>
                    <th scope="col">Товар</th>
                    <th scope="col">Цена</th>
                    <th scope="col">
                      <span className="visually-hidden">Источник</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {s.offers.map((o) => (
                    <tr key={o.productId} className={requested.has(o.productId) ? 'is-requested' : ''}>
                      <td>
                        {o.name}
                        {requested.has(o.productId) && <Badge tone="brand">в запросе</Badge>}
                      </td>
                      <td>
                        {o.price.value ? (
                          priceLine(o.price.value)
                        ) : (
                          <span className="factrow__missing">
                            по запросу<em> · спросим в письме</em>
                          </span>
                        )}
                      </td>
                      <td>{o.price.value && <SourceLink sourceId={o.price.sourceId} quote={o.price.quote} method={o.price.method} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">Ассортимент не указан — добавьте позиции после разговора с поставщиком.</p>
            )}
            {filters.products.filter((p) => !s.offers.some((o) => o.productId === p)).length > 0 && (
              <p className="note-inline">
                <Icon name="info" size={15} /> Части товаров из запроса нет в прайсе — вопрос уже в черновике письма.
              </p>
            )}
          </Section>

          <Section id="sec-delivery" title="Доставка и условия">
            <dl className="facts">
              <FactRow label="Куда возит" fact={s.delivery.cities}>
                {(c) => (c.length ? c.map((x) => CITIES[x].name).join(', ') : s.delivery.nationwide ? 'по России транспортными компаниями' : 'только самовывоз')}
              </FactRow>
              <FactRow label="График" fact={s.delivery.schedule} />
              <FactRow<Moq | number> label="Минимальный заказ" fact={(s.offers[0]?.moq ?? s.delivery.minOrderSum) as Fact<Moq | number>}>
                {(m) => (typeof m === 'number' ? money(m) : moqLine(m))}
              </FactRow>
              <FactRow label="Холодовая цепь" fact={s.delivery.cold} missing="не указано" askHint={false}>
                {() => 'рефрижератор, +2…+4 °C'}
              </FactRow>
              <FactRow label="Отсрочка платежа" fact={s.deferral}>
                {(d) => `до ${d} дней`}
              </FactRow>
              <div className="factrow">
                <dt>Самовывоз</dt>
                <dd>{s.delivery.pickup ? 'есть, со склада' : 'нет'}</dd>
              </div>
            </dl>
          </Section>

          <Section id="sec-docs" title="Документы" aside={<span className="muted">реестр деклараций и сайт</span>}>
            {s.documents.length ? (
              <ul className="docs">
                {s.documents.map((d) => (
                  <li key={d.id} className={`doc ${d.status === 'expired' ? 'is-expired' : ''}`}>
                    <Icon name={DOC_ICON[d.kind]} size={18} />
                    <div>
                      <b>{DOC_LABEL[d.kind]}</b>
                      <span className="doc__num">{d.number}</span>
                      <span className="doc__what">
                        {d.kind === 'declaration' ? `на ${d.productLabel}` : d.productLabel}
                        {d.validUntil && <> · {d.status === 'active' ? `до ${dateShort(d.validUntil)}` : `истекла ${dateShort(d.validUntil)}`}</>}
                      </span>
                    </div>
                    <Badge tone={d.status === 'active' ? 'good' : 'red'}>{d.status === 'active' ? 'действует' : 'истекла'}</Badge>
                    <SourceLink sourceId={d.sourceId} quote={d.quote} method={d.sourceId.endsWith(':docs') ? 'registry' : 'site'} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="factrow__missing">
                Документов не нашли<em> · спросим в письме</em>
              </p>
            )}
          </Section>

          <Section id="sec-legal" title="Юрлицо" aside={<span className="muted">выписка из реестра</span>}>
            {s.registryUnavailable && (
              <p className="note-inline note-inline--amber">
                <Icon name="alert" size={15} /> Реестр не ответил при проверке. Поставщика не прячем, но баллы за надёжность не
                начисляем — в боевой версии проверка повторится сама.
              </p>
            )}
            <dl className="facts">
              <FactRow label="ИНН" fact={s.legal.inn} askHint={false} />
              <FactRow label="ОГРН" fact={s.legal.ogrn} missing="не проверено" askHint={false} />
              <FactRow label="Статус" fact={s.legal.status} missing="не проверено" askHint={false}>
                {(v) => (v === 'active' ? 'действует' : v === 'liquidating' ? 'ликвидируется' : 'ликвидировано')}
              </FactRow>
              <FactRow label="Зарегистрировано" fact={s.legal.registeredAt} missing="не проверено" askHint={false}>
                {(v) => `${date(v)} · ${ageLabel(yearsBetween(v, DEMO_TODAY))}`}
              </FactRow>
              <FactRow label="Вид деятельности" fact={s.legal.okved} missing="не проверено" askHint={false}>
                {(v) => `${v.code} ${v.title}`}
              </FactRow>
            </dl>
            {reg && yearsBetween(reg, DEMO_TODAY) < 0.5 && <p className="muted">Компания совсем молодая — это не запрет, но повод запросить рекомендации.</p>}
          </Section>

          <Section id="sec-contacts" title="Контакты">
            <ContactList s={s} onDemo={(what) => toast(`Демо: ${what} вымышлен — в боевой версии здесь откроется настоящий контакт`)} />
          </Section>

          <Section id="sec-notes" title="Заметки">
            <form className="notes__form" onSubmit={addNote}>
              <label htmlFor="note" className="visually-hidden">
                Новая заметка
              </label>
              <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: звонили, обещали прайс до пятницы" />
              <Button type="submit" icon="plus" disabled={!note.trim()} busy={actions.update.isPending}>
                Добавить
              </Button>
            </form>
            {entry?.notes.length ? (
              <ul className="notes">
                {entry.notes.map((n) => (
                  <li key={n.id}>
                    <time dateTime={n.createdAt}>{dateShort(n.createdAt)}</time>
                    <span>{n.text}</span>
                    <button type="button" className="icon-btn icon-btn--sm" aria-label="Удалить заметку" onClick={() => actions.update.mutate({ id: s.id, removeNote: n.id })}>
                      <Icon name="trash" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{entry ? 'Заметок пока нет.' : 'Первая заметка добавит поставщика в шорт-лист.'}</p>
            )}
          </Section>
        </div>

        <aside className="supplier__aside">
          <div className="card scorecard">
            <div className="scorecard__top">
              <ScoreNumber score={score} size="lg" />
              <div>
                <b>Оценка {query ? 'под ваш запрос' : 'по категории'}</b>
                <span className="muted">
                  {query ? `«${query}»` : `доставка в ${city.acc}`}
                </span>
              </div>
            </div>
            <ScoreBar score={score} />
            <ol className="breakdown">
              {score.items.map((i) => (
                <li key={i.criterion}>
                  <span className="breakdown__pts">
                    <b>+{i.points}</b>/{i.max}
                  </span>
                  <span className="breakdown__text">
                    <span className="breakdown__name">{CRITERIA[i.criterion].name}</span>
                    {i.text}
                  </span>
                  {i.sourceId && <SourceLink sourceId={i.sourceId} method={/(registry|:docs)$/.test(i.sourceId) ? 'registry' : 'site'} />}
                </li>
              ))}
            </ol>
            {score.blocked && <p className="scorecard__blocked">Красный флаг: не работать, пока ситуация не прояснится.</p>}
          </div>

          <div className="card actions-card">
            <Button variant="primary" size="lg" icon="mail" onClick={() => setLetterOpen(true)}>
              Написать запрос КП
            </Button>
            {entry ? (
              <label className="status-select">
                <span>Статус в шорт-листе</span>
                <select
                  className="input"
                  value={entry.status}
                  onChange={(e) => actions.update.mutate({ id: s.id, status: e.target.value as PipelineStatus })}
                >
                  {STATUS_ORDER.map((st) => (
                    <option key={st} value={st}>
                      {STATUS[st].name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <Button
                icon="star"
                onClick={async () => {
                  await actions.add.mutateAsync({ id: s.id, searchId });
                  toast('Добавлено в шорт-лист', 'good');
                }}
                busy={actions.add.isPending}
              >
                В шорт-лист
              </Button>
            )}
            {searchId && (
              <Button
                icon="scale"
                variant="ghost"
                onClick={() => {
                  const was = inCompare;
                  const ok = compare.toggle(s.id, searchId);
                  toast(was ? 'Убрали из сравнения' : ok ? 'Добавлено к сравнению' : `В сравнении уже ${MAX_COMPARE}`);
                }}
              >
                {inCompare ? 'Убрать из сравнения' : 'Добавить к сравнению'}
              </Button>
            )}
          </div>
        </aside>
      </div>

      <LetterDialog supplierId={s.id} supplierName={s.name} searchId={searchId} open={letterOpen} onClose={() => setLetterOpen(false)} />
    </div>
  );
}

function ContactList({ s, onDemo }: { s: Supplier; onDemo: (what: string) => void }) {
  const demo = !s.manual;
  return (
    <dl className="facts">
      <FactRow label="Телефон" fact={s.contacts.phone} askHint={false}>
        {(v) =>
          demo ? (
            <button type="button" className="linkish" onClick={() => onDemo('номер')}>
              <Icon name="phone" size={15} /> {v}
            </button>
          ) : (
            <a href={`tel:${v.replace(/[^\d+]/g, '')}`}>{v}</a>
          )
        }
      </FactRow>
      <FactRow label="Почта" fact={s.contacts.email} askHint={false}>
        {(v) => (
          <a href={`mailto:${v}`}>
            <Icon name="mail" size={15} /> {v}
          </a>
        )}
      </FactRow>
      <FactRow label="Telegram" fact={s.contacts.telegram} missing="не указан" askHint={false}>
        {(v) => (
          <button type="button" className="linkish" onClick={() => onDemo('Telegram')}>
            <Icon name="telegram" size={15} /> {v}
          </button>
        )}
      </FactRow>
      <FactRow label="Менеджер" fact={s.contacts.person} missing="не указан" askHint={false} />
      <div className="factrow">
        <dt>Адрес</dt>
        <dd>{s.address}</dd>
      </div>
    </dl>
  );
}
