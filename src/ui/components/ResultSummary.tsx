import type { CalculationResult, ResultKind } from '../../domain/course/course.types';

const labels: Record<ResultKind, string> = {
  'recommendation-gpa': '保研 GPA',
  'weighted-average': '加权平均分',
  'arithmetic-average': '不加权平均分'
};

interface Props {
  result: CalculationResult;
  active: boolean;
  calculated: boolean;
  onSelect: () => void;
}

export function ResultSummary({ result, active, calculated, onSelect }: Props) {
  const display = !calculated
    ? '尚未计算'
    : result.status === 'success'
      ? result.formattedValue
      : '无可计算课程';

  return (
    <button
      type="button"
      className={`result-summary${active ? ' result-summary-active' : ''}`}
      disabled={!calculated}
      aria-pressed={active}
      aria-label={`${labels[result.kind]} ${display}`}
      onClick={onSelect}
    >
      <span className="result-summary-label">{labels[result.kind]}</span>
      <strong className="result-summary-value">{display}</strong>
      <span className="result-summary-compact" aria-hidden="true">
        {result.kind === 'recommendation-gpa'
          ? 'G'
          : result.kind === 'weighted-average'
            ? 'W'
            : 'A'}
      </span>
    </button>
  );
}
