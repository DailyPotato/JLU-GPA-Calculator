import { App } from 'antd';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { defaultRuleSet } from '../../src/domain/rules/recommendation.rules';
import { CourseLedger } from '../../src/ui/components/CourseLedger';
import { makeCourse } from '../unit/test-course';

describe('CourseLedger', () => {
  it('shows one course per row with grade point and yes/no recommendation control', () => {
    const course = makeCourse('1', 90, 2, {
      identity: { code: 'TEST-001', name: '虚构测试课程' }
    });
    const onEdit = vi.fn();
    const onRecommendationChange = vi.fn().mockResolvedValue(undefined);

    render(
      <App>
        <CourseLedger
          rows={[
            {
              course,
              recommendationEvaluation: {
                courseId: course.id,
                resultKind: 'recommendation-gpa',
                included: true,
                exclusionCodes: [],
                exclusionMessages: []
              }
            }
          ]}
          rules={defaultRuleSet}
          onEdit={onEdit}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          onRecommendationChange={onRecommendationChange}
        />
      </App>
    );

    expect(screen.getByText('虚构测试课程')).toBeInTheDocument();
    expect(screen.getByText('TEST-001')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4.0000')).toBeInTheDocument();
    expect(screen.queryByText(/自动/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: '虚构测试课程保研课程' }));
    expect(onRecommendationChange).toHaveBeenCalledWith(course, false);

    fireEvent.click(screen.getByText('虚构测试课程'));
    expect(onEdit).toHaveBeenCalledWith(course);
  });
});
