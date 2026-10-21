import type { Score } from '../../shared/api/types';
import { CRITERIA } from '../../shared/config/dictionary';

/**
 * Полоса оценки — главный визуальный приём прототипа.
 * Ширина отрезка = вес критерия, заливка = сколько баллов набрано.
 * С одного взгляда видно не только «82», но и где потеряны баллы.
 */
export function ScoreBar({ score, compact }: { score: Score; compact?: boolean }) {
  const label = score.items.map((i) => `${CRITERIA[i.criterion].name}: ${i.points} из ${i.max}`).join('; ');
  return (
    <div className={`scorebar ${compact ? 'scorebar--compact' : ''} ${score.blocked ? 'is-blocked' : ''}`} role="img" aria-label={`Оценка ${score.total} из 100. ${label}`}>
      {score.items.map((i) => (
        <span key={i.criterion} className="scorebar__seg" style={{ flexGrow: i.max }} title={`${CRITERIA[i.criterion].name}: ${i.points} из ${i.max}`}>
          <span className="scorebar__fill" style={{ width: `${Math.round(i.share * 100)}%` }} />
        </span>
      ))}
    </div>
  );
}

export function ScoreNumber({ score, size = 'md' }: { score: Score; size?: 'md' | 'lg' }) {
  const tone = score.blocked ? 'blocked' : score.total >= 85 ? 'high' : score.total >= 65 ? 'mid' : 'low';
  return (
    <span className={`scorenum scorenum--${size} scorenum--${tone}`}>
      {score.total}
      <small>/100</small>
    </span>
  );
}
