import type { MouseEvent } from 'react';
import { Link } from 'react-router';
import type { SupplierSummary } from '../../shared/api/types';
import { CITIES } from '../../shared/config/dictionary';
import { moqLine, perUnit } from '../../shared/lib/format';
import { Icon } from '../../shared/ui';
import { ScoreBar } from '../../entities/score/ScoreBar';

export const KIND_LABEL = { producer: 'производитель', distributor: 'дистрибьютор', farm: 'фермер' } as const;

export function scheduleShort(s: string | null): string {
  if (!s) return 'график не указан';
  if (s.startsWith('ежедневно')) return 'ежедневно';
  if (s.startsWith('по будням')) return 'по будням';
  if (s.includes('понедельник')) return 'пн, ср, пт';
  if (s.includes('вторник')) return 'вт, пт';
  if (s.includes('раз в неделю')) return 'раз в неделю';
  return s;
}

/** Строка таблицы результатов. На широком экране клик выбирает поставщика для панели справа. */
export function SupplierRow({
  item,
  searchId,
  selected,
  onToggleCompare,
  compareDisabled,
  inShortlist,
  onToggleShortlist,
  active,
  onSelect,
  animate,
}: {
  item: SupplierSummary;
  searchId: string;
  selected: boolean;
  onToggleCompare: () => void;
  compareDisabled: boolean;
  inShortlist: boolean;
  onToggleShortlist: () => void;
  active?: boolean;
  onSelect?: () => void;
  animate?: boolean;
}) {
  const flags = [...item.score.flags].sort((a, b) => (a.level === b.level ? 0 : a.level === 'red' ? -1 : 1));
  const href = `/supplier/${item.id}?search=${searchId}`;
  const s = item.score;

  function rowClick(e: MouseEvent) {
    if (!onSelect) return;
    if ((e.target as HTMLElement).closest('a, button, input, label')) return;
    onSelect();
  }

  return (
    <div
      role="row"
      className={['srow', s.blocked ? 'is-blocked' : '', animate ? 'is-new' : '', selected ? 'is-selected' : '', active ? 'is-active' : ''].join(' ')}
      onClick={rowClick}
      aria-selected={active || undefined}
    >
      <div role="cell" className="srow__check">
        <label title={compareDisabled && !selected ? 'В сравнении уже 4 поставщика' : 'Добавить к сравнению'}>
          <input type="checkbox" checked={selected} onChange={onToggleCompare} disabled={compareDisabled && !selected} aria-label={`Сравнить: ${item.name}`} />
        </label>
      </div>

      <div role="cell" className="srow__main">
        <Link
          to={href}
          className="srow__name"
          onClick={(e) => {
            if (onSelect) {
              e.preventDefault();
              onSelect();
            }
          }}
        >
          {item.name}
        </Link>
        <span className="srow__meta">
          {CITIES[item.city].name} · {KIND_LABEL[item.kind]}
          {item.manual && ' · добавлен вручную'}
        </span>
        {flags.length > 0 && (
          <span className={`srow__flag srow__flag--${flags[0]!.level}`}>
            <Icon name="alert" size={13} />
            {flags[0]!.text}
            {flags.length > 1 && <em> +{flags.length - 1}</em>}
          </span>
        )}
      </div>

      <div role="cell" className="srow__score" aria-label={`Оценка ${s.total} из 100`}>
        <span className={`srow__num ${s.blocked ? 'is-blocked' : ''}`}>{s.total}</span>
        <ScoreBar score={s} compact />
      </div>

      <div role="cell" className="srow__cell" data-label="Доставка">
        {item.deliversToCity === true ? (
          <span className="ok">
            <Icon name="check" size={13} />
            {scheduleShort(item.schedule)}
          </span>
        ) : item.deliversToCity === null ? (
          <span className="dim">через ТК</span>
        ) : (
          <span className="bad">не возит</span>
        )}
      </div>

      <div role="cell" className="srow__cell" data-label="Мин. заказ">
        {item.moq ? moqLine(item.moq) : <span className="dim">нет данных</span>}
      </div>

      <div role="cell" className="srow__cell srow__price" data-label="Цена">
        {item.keyPrice ? (
          <>
            <b>{perUnit(item.keyPrice.price)}</b>
            <small title={item.keyPrice.name}>{item.keyPrice.name}</small>
          </>
        ) : (
          <span className="dim">по запросу</span>
        )}
      </div>

      <div role="cell" className="srow__cell" data-label="Документы">
        {item.activeDocs ? (
          <span>{item.activeDocs} действ.</span>
        ) : item.expiredDocs ? (
          <span className="bad">истекли</span>
        ) : (
          <span className="dim">не нашли</span>
        )}
      </div>

      <div role="cell" className="srow__star">
        <button
          type="button"
          className={`star ${inShortlist ? 'is-on' : ''}`}
          aria-pressed={inShortlist}
          aria-label={inShortlist ? `Убрать из шорт-листа: ${item.name}` : `В шорт-лист: ${item.name}`}
          title={inShortlist ? 'В шорт-листе' : 'В шорт-лист'}
          onClick={onToggleShortlist}
        >
          <Icon name="star" size={18} />
        </button>
      </div>
    </div>
  );
}
