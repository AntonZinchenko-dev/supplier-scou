import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../shared/api/client';
import { useShortlist, useShortlistActions } from '../../shared/api/queries';
import type { PipelineStatus, ShortlistEntry } from '../../shared/api/types';
import { CITIES, STATUS, STATUS_ORDER } from '../../shared/config/dictionary';
import { dateShort, plural } from '../../shared/lib/format';
import { LetterDialog } from '../../features/letter/LetterDialog';
import { Button, Empty, Icon, IconButton, Skeleton, useToast } from '../../shared/ui';

/** Закупка не заканчивается поиском: важно помнить, кому написали и что ответили */
export function ShortlistPage() {
  const list = useShortlist();
  const toast = useToast();
  const [tab, setTab] = useState<PipelineStatus | 'all'>('all');
  const [letterFor, setLetterFor] = useState<ShortlistEntry | null>(null);
  const entries = list.data ?? [];
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, entries.filter((e) => e.status === s).length])) as Record<PipelineStatus, number>;
  const shown = tab === 'all' ? entries : entries.filter((e) => e.status === tab);

  async function exportCsv() {
    try {
      const blob = await api.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shortlist-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Файл CSV для Excel скачан', 'good');
    } catch {
      toast('Не удалось выгрузить шорт-лист');
    }
  }

  return (
    <div className="wrap page shortlist">
      <header className="page-head">
        <div>
          <h1 className="page-title">Шорт-лист</h1>
          <p className="muted">
            {entries.length
              ? `${entries.length} ${plural(entries.length, ['поставщик', 'поставщика', 'поставщиков'])} · статусы, следующий шаг и заметки`
              : 'Сюда попадают поставщики, с которыми стоит связаться'}
          </p>
        </div>
        {entries.length > 0 && (
          <Button icon="download" onClick={exportCsv}>
            Выгрузить в Excel (CSV)
          </Button>
        )}
      </header>

      {list.isLoading ? (
        <Skeleton h={200} />
      ) : entries.length === 0 ? (
        <Empty
          icon="star"
          title="Шорт-лист пока пуст"
          action={
            <Link className="btn btn--primary btn--md" to="/">
              <Icon name="search" /> <span>Найти поставщиков</span>
            </Link>
          }
        >
          Нажмите на звёздочку в результатах поиска или отметьте «Написали» в черновике письма — поставщик появится здесь.
        </Empty>
      ) : (
        <>
          <div className="tabs" role="tablist" aria-label="Статус">
            <button type="button" role="tab" aria-selected={tab === 'all'} className="tab" onClick={() => setTab('all')}>
              Все <span>{entries.length}</span>
            </button>
            {STATUS_ORDER.map((s) => (
              <button key={s} type="button" role="tab" aria-selected={tab === s} className="tab" onClick={() => setTab(s)} disabled={!counts[s]}>
                {STATUS[s].name} <span>{counts[s]}</span>
              </button>
            ))}
          </div>
          <ul className="slist">
            {shown.map((e) => (
              <ShortlistItem key={e.supplierId} e={e} onLetter={() => setLetterFor(e)} />
            ))}
          </ul>
        </>
      )}
      {letterFor && (
        <LetterDialog supplierId={letterFor.supplierId} supplierName={letterFor.name} searchId={letterFor.lastSearchId} open onClose={() => setLetterFor(null)} />
      )}
    </div>
  );
}

function ShortlistItem({ e, onLetter }: { e: ShortlistEntry; onLetter: () => void }) {
  const { update, remove } = useShortlistActions();
  const toast = useToast();
  const [note, setNote] = useState('');
  const href = `/supplier/${e.supplierId}${e.lastSearchId ? `?search=${e.lastSearchId}` : ''}`;
  return (
    <li className={`sitem sitem--${e.status}`}>
      <div className="sitem__who">
        <h2 className="sitem__name">
          <Link to={href}>{e.name}</Link>
        </h2>
        <p className="muted">
          {CITIES[e.city].name}
          {e.lastScore !== null && <> · оценка {e.lastScore}</>}
          {e.lastQuery && <> · «{e.lastQuery}»</>}
        </p>
      </div>
      <label className="sitem__field">
        <span>Статус</span>
        <select className="input" value={e.status} onChange={(ev) => update.mutate({ id: e.supplierId, status: ev.target.value as PipelineStatus })}>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS[s].name}
            </option>
          ))}
        </select>
      </label>
      <label className="sitem__field">
        <span>Следующий шаг</span>
        <input className="input" type="date" value={e.nextStep ?? ''} onChange={(ev) => update.mutate({ id: e.supplierId, nextStep: ev.target.value || null })} />
      </label>
      <div className="sitem__notes">
        {e.notes.slice(0, 2).map((n) => (
          <p key={n.id}>
            <time>{dateShort(n.createdAt)}</time> {n.text}
          </p>
        ))}
        <form
          className="sitem__noteform"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!note.trim()) return;
            update.mutate({ id: e.supplierId, note });
            setNote('');
          }}
        >
          <label className="visually-hidden" htmlFor={`note-${e.supplierId}`}>
            Заметка
          </label>
          <input id={`note-${e.supplierId}`} className="input input--sm" placeholder="Заметка: что ответили" value={note} onChange={(ev) => setNote(ev.target.value)} />
          <Button size="sm" type="submit" disabled={!note.trim()}>
            Добавить
          </Button>
        </form>
      </div>
      <div className="sitem__actions">
        <Button size="sm" icon="mail" onClick={onLetter}>
          Письмо
        </Button>
        <IconButton
          icon="trash"
          label="Убрать из шорт-листа"
          className="icon-btn--sm"
          onClick={async () => {
            await remove.mutateAsync(e.supplierId);
            toast('Убрали из шорт-листа');
          }}
        />
      </div>
    </li>
  );
}
