import { useState } from 'react';
import type { CategoryId, CityId, DocKind, SearchFilters } from '../../shared/api/types';
import { CATEGORIES, CATEGORY_ORDER, CITIES, DOC_SHORT, PRODUCT_BY_ID, PRODUCTS, SEARCH_CITIES, UNIT_LABEL } from '../../shared/config/dictionary';
import { num } from '../../shared/lib/format';
import { Icon } from '../../shared/ui';

const PERIOD = { day: 'в день', week: 'в неделю', month: 'в месяц' } as const;

/**
 * «Как понял»: запрос, разобранный на фильтры. Каждый чип можно поправить или убрать
 * до запуска — дешевле, чем потратить минуты на сбор не того.
 */
export function QueryChips({
  filters,
  onChange,
  unknown = [],
  compact,
}: {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  unknown?: string[];
  compact?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const set = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch });
  const productsOfCat = filters.category ? PRODUCTS.filter((p) => p.category === filters.category && !filters.products.includes(p.id)) : [];
  const missingDocs = (['vet', 'declaration', 'haccp'] as DocKind[]).filter((d) => !filters.docs.includes(d));

  return (
    <div className={`qchips ${compact ? 'qchips--compact' : ''}`}>
      {!compact && <span className="qchips__label">Как понял:</span>}
      <label className="qchip qchip--select" title="Категория">
        <Icon name="box" size={15} />
        <select
          aria-label="Категория"
          value={filters.category ?? ''}
          onChange={(e) => set({ category: (e.target.value || null) as CategoryId | null, products: [] })}
        >
          <option value="">Все категории</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORIES[c].name}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={14} />
      </label>

      {filters.products.map((pid) => (
        <span key={pid} className="qchip">
          {PRODUCT_BY_ID[pid]?.name ?? pid}
          <button type="button" aria-label={`Убрать ${PRODUCT_BY_ID[pid]?.name}`} onClick={() => set({ products: filters.products.filter((x) => x !== pid) })}>
            <Icon name="x" size={13} />
          </button>
        </span>
      ))}

      <label className="qchip qchip--select" title="Город доставки">
        <Icon name="truck" size={15} />
        <select aria-label="Город доставки" value={filters.city} onChange={(e) => set({ city: e.target.value as CityId, cityIsDefault: false })}>
          {SEARCH_CITIES.map((c) => (
            <option key={c} value={c}>
              {CITIES[c].name}
            </option>
          ))}
        </select>
        {filters.cityIsDefault && <em className="qchip__hint">по умолчанию</em>}
        <Icon name="chevronDown" size={14} />
      </label>

      {filters.volume && (
        <span className="qchip">
          от {num(filters.volume.value)} {UNIT_LABEL[filters.volume.unit]} {PERIOD[filters.volume.period]}
          <button type="button" aria-label="Убрать объём" onClick={() => set({ volume: null })}>
            <Icon name="x" size={13} />
          </button>
        </span>
      )}

      {filters.docs.map((d) => (
        <span key={d} className="qchip qchip--doc">
          <Icon name="doc" size={14} />
          {DOC_SHORT[d]}
          <button type="button" aria-label={`Убрать требование: ${DOC_SHORT[d]}`} onClick={() => set({ docs: filters.docs.filter((x) => x !== d) })}>
            <Icon name="x" size={13} />
          </button>
        </span>
      ))}

      {filters.daily && (
        <span className="qchip">
          ежедневная доставка
          <button type="button" aria-label="Убрать ежедневную доставку" onClick={() => set({ daily: false })}>
            <Icon name="x" size={13} />
          </button>
        </span>
      )}

      <span className="qchip-add">
        <button type="button" className="qchip qchip--ghost" aria-expanded={adding} onClick={() => setAdding((v) => !v)}>
          <Icon name="plus" size={14} /> уточнить
        </button>
        {adding && (
          <span className="qchip-add__menu" role="menu">
            {productsOfCat.slice(0, 6).map((p) => (
              <button key={p.id} type="button" role="menuitem" onClick={() => (set({ products: [...filters.products, p.id] }), setAdding(false))}>
                + {p.name}
              </button>
            ))}
            {missingDocs.map((d) => (
              <button key={d} type="button" role="menuitem" onClick={() => (set({ docs: [...filters.docs, d] }), setAdding(false))}>
                + нужны {DOC_SHORT[d]}
              </button>
            ))}
            {!filters.daily && (
              <button type="button" role="menuitem" onClick={() => (set({ daily: true }), setAdding(false))}>
                + доставка каждый день
              </button>
            )}
            {!filters.volume && (
              <button type="button" role="menuitem" onClick={() => (set({ volume: { value: 50, unit: PRODUCT_BY_ID[filters.products[0] ?? '']?.unit === 'pcs' ? 'pcs' : 'kg', period: 'week' } }), setAdding(false))}>
                + объём ~50 в неделю
              </button>
            )}
          </span>
        )}
      </span>

      {unknown.length > 0 && !compact && (
        <span className="qchips__unknown" title="Эти слова разбор не понял и не учитывает">
          не понял: {unknown.slice(0, 4).join(', ')}
        </span>
      )}
    </div>
  );
}
