import { Card, Typography } from 'antd';
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
  onClick: () => void;
}

export function ResultCard({ result, active, calculated, onClick }: Props) {
  const display = !calculated
    ? '尚未计算'
    : result.status === 'success'
      ? result.formattedValue
      : '无可计算课程';
  return (
    <Card
      hoverable={calculated}
      role={calculated ? 'button' : undefined}
      tabIndex={calculated ? 0 : -1}
      aria-pressed={active}
      className={`result-card${active ? ' result-card-active' : ''}`}
      onClick={calculated ? onClick : undefined}
      onKeyDown={(event) => {
        if (calculated && (event.key === 'Enter' || event.key === ' ')) onClick();
      }}
    >
      <Typography.Text className="result-label">{labels[result.kind]}</Typography.Text>
      <div className={result.status === 'success' && calculated ? 'result-value' : 'result-empty'}>
        {display}
      </div>
    </Card>
  );
}
