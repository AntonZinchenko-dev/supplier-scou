import { useEffect, useState } from 'react';
import type { Weights } from '../../shared/api/types';
import { CRITERIA, CRITERIA_ORDER } from '../../shared/config/dictionary';
import { Button, Dialog } from '../../shared/ui';

function normalize(w: Weights): Weights {
  const sum = CRITERIA_ORDER.reduce((a, k) => a + w[k], 0) || 1;
  const out = {} as Weights;
  let acc = 0;
  CRITERIA_ORDER.forEach((k, i) => {
    const v = i === CRITERIA_ORDER.length - 1 ? 100 - acc : Math.round((w[k] / sum) * 100);
    out[k] = v;
    acc += v;
  });
  return out;
}

/** Закупщик двигает ползунки: «цена важнее документов» — порядок пересчитывается */
export function WeightsDialog({
  open,
  onClose,
  current,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  current: Weights;
  onApply: (w: Weights | null) => void;
}) {
  const [w, setW] = useState<Weights>(current);
  useEffect(() => {
    if (open) setW(current);
  }, [open, current]);
  const norm = normalize(w);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Что для вас важнее"
      footer={
        <>
          <Button onClick={() => onApply(null)}>Как по умолчанию</Button>
          <Button variant="primary" icon="check" onClick={() => onApply(norm)}>
            Пересчитать
          </Button>
        </>
      }
    >
      <p className="muted">
        Оценку считает код по правилам. Веса в сумме — 100 баллов. Для упаковки документы по умолчанию весят меньше, для
        рыбы и мяса — больше.
      </p>
      <div className="weights">
        {CRITERIA_ORDER.map((k) => (
          <div className="weights__row" key={k}>
            <label htmlFor={`w-${k}`}>
              <b>{CRITERIA[k].name}</b>
              <span>{CRITERIA[k].hint}</span>
            </label>
            <input
              id={`w-${k}`}
              type="range"
              min={0}
              max={50}
              step={1}
              value={w[k]}
              onChange={(e) => setW({ ...w, [k]: Number(e.target.value) })}
            />
            <output htmlFor={`w-${k}`}>{norm[k]}</output>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
