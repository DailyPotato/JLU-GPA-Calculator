import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CalculationResult } from '../../src/domain/course/course.types';
import { ResultCard } from '../../src/ui/components/ResultCard';

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

describe('ResultCard', () => {
  it('hides values before the first explicit calculation', () => {
    render(
      <ResultCard result={success} active={false} calculated={false} onClick={() => undefined} />
    );
    expect(screen.getByText('尚未计算')).toBeInTheDocument();
    expect(screen.queryByText('90.0000')).not.toBeInTheDocument();
  });

  it('shows four decimals and opens details after calculation', () => {
    const onClick = vi.fn();
    render(<ResultCard result={success} active={false} calculated onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('90.0000')).toBeInTheDocument();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
