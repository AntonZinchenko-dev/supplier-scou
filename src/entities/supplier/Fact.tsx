import type { ReactNode } from 'react';
import type { Fact, FactMethod } from '../../shared/api/types';
import { dateShort } from '../../shared/lib/format';
import { Icon, type IconName } from '../../shared/ui';
import { useOpenSource } from '../../widgets/source-drawer/SourceDrawer';

const METHOD: Record<FactMethod, { icon: IconName; label: string }> = {
  site: { icon: 'globe', label: 'с сайта' },
  registry: { icon: 'landmark', label: 'из реестра' },
  manual: { icon: 'note', label: 'вручную' },
};

export function SourceLink({ sourceId, quote, method = 'site', fetchedAt }: { sourceId?: string; quote?: string; method?: FactMethod; fetchedAt?: string }) {
  const open = useOpenSource();
  const m = METHOD[method];
  if (method === 'manual' || !sourceId) {
    return (
      <span className="srclink srclink--static" title="Внесено вручную">
        <Icon name={m.icon} size={14} />
        {m.label}
      </span>
    );
  }
  return (
    <button
      type="button"
      className="srclink"
      onClick={() => open({ sourceId, quote })}
      title={`Открыть источник${fetchedAt ? `, собрано ${dateShort(fetchedAt)}` : ''}`}
    >
      <Icon name={m.icon} size={14} />
      <span>{m.label}</span>
    </button>
  );
}

/** Строка карточки: название поля, значение, источник. Пустое поле — честное «не нашли». */
export function FactRow<T>({
  label,
  fact,
  children,
  missing = 'не нашли на сайте',
  askHint = true,
}: {
  label: string;
  fact: Fact<T>;
  children?: (value: T) => ReactNode;
  missing?: string;
  askHint?: boolean;
}) {
  const ok = fact.status === 'confirmed' && fact.value !== null;
  return (
    <div className={`factrow ${ok ? '' : 'is-missing'}`}>
      <dt>{label}</dt>
      <dd>
        {ok ? (
          <span className="factrow__value">{children ? children(fact.value as T) : String(fact.value)}</span>
        ) : (
          <span className="factrow__missing">
            {missing}
            {askHint && <em> · спросим в письме</em>}
          </span>
        )}
        {ok && <SourceLink sourceId={fact.sourceId} quote={fact.quote} method={fact.method} fetchedAt={fact.fetchedAt} />}
      </dd>
    </div>
  );
}
