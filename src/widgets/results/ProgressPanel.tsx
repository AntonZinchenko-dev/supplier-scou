import type { StepId } from '../../shared/api/types';
import { STEP_ORDER, STEPS } from '../../shared/config/dictionary';
import { Icon } from '../../shared/ui';

export type StepState = Partial<Record<StepId, { status: 'running' | 'done'; detail?: string }>>;

/** Живой прогресс: человек видит, что работа идёт, и может читать первые результаты */
export function ProgressPanel({ steps, found }: { steps: StepState; found: number }) {
  const doneCount = STEP_ORDER.filter((s) => steps[s]?.status === 'done').length;
  return (
    <section className="progress" aria-label="Ход поиска">
      <div className="progress__head">
        <span className="progress__spinner" aria-hidden="true" />
        <b>Собираю данные</b>
        <span className="muted">· найдено {found}</span>
        <span className="progress__bar" aria-hidden="true">
          <span style={{ width: `${(doneCount / STEP_ORDER.length) * 100}%` }} />
        </span>
      </div>
      <ol className="progress__steps" aria-live="polite">
        {STEP_ORDER.map((id) => {
          const st = steps[id];
          return (
            <li key={id} className={`pstep ${st ? `is-${st.status}` : 'is-wait'}`}>
              <span className="pstep__icon" aria-hidden="true">
                {st?.status === 'done' ? <Icon name="check" size={14} /> : null}
              </span>
              <span className="pstep__name">{STEPS[id].name}</span>
              <span className="pstep__detail">{st?.detail ?? STEPS[id].demo}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
