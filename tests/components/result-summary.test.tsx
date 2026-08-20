import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CalculationResult } from '../../src/domain/course/course.types';
import { ResultSummary } from '../../src/ui/components/ResultSummary';

const success: CalculationResult = {
  kind: 'weighted-average',
  status: 'success',
  value: 90,
  formattedValue: '90.0000',
  includedCourseIds: ['1'],
  excludedCourseIds: [],
  courseCount: 1,
  creditSum: 2,
  evaluations: []
};

describe('ResultSummary', () => {
  it('hides values before the first explicit calculation', () => {
    render(
      <ResultSummary
        result={success}
        active={false}
        calculated={false}
        onSelect={() => undefined}
      />
    );
    expect(screen.getByText('尚未计算')).toBeInTheDocument();
    expect(screen.queryByText('90.0000')).not.toBeInTheDocument();
  });

  it('shows four decimals and opens details after calculation', () => {
    const onClick = vi.fn();
    render(<ResultSummary result={success} active={false} calculated onSelect={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('90.0000')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
