import { App } from 'antd';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CalculationResult } from '../../src/domain/course/course.types';
import { defaultRuleSet } from '../../src/domain/rules/recommendation.rules';
import { CourseWorkspace } from '../../src/ui/components/CourseWorkspace';
import { makeCourse } from '../unit/test-course';

describe('CourseWorkspace', () => {
  it('keeps the excluded-course control on the preprocessing course list', () => {
    const included = makeCourse('1', 90, 2, {
      identity: { code: 'INCLUDED-001', name: '纳入课程' }
    });
    const excluded = makeCourse('2', 80, 2, {
      identity: { code: 'EXCLUDED-001', name: '排除课程' },
      control: { userIncluded: false, recommendationOverride: 'auto' }
    });
    const recommendationResult: CalculationResult = {
      kind: 'recommendation-gpa',
      status: 'success',
      value: 4,
      formattedValue: '4.0000',
      includedCourseIds: [included.id],
      excludedCourseIds: [excluded.id],
      courseCount: 1,
      creditSum: 2,
      evaluations: [
        {
          courseId: included.id,
          resultKind: 'recommendation-gpa',
          included: true,
          exclusionCodes: [],
          exclusionMessages: []
        },
        {
          courseId: excluded.id,
          resultKind: 'recommendation-gpa',
          included: false,
          exclusionCodes: ['user-excluded'],
          exclusionMessages: ['用户手动排除']
        }
      ]
    };

    render(
      <App>
        <CourseWorkspace
          courses={[included, excluded]}
          rules={defaultRuleSet}
          ready
          recommendationResult={recommendationResult}
          onAdd={vi.fn()}
          onClear={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          onRecommendationChange={vi.fn().mockResolvedValue(undefined)}
        />
      </App>
    );

    const toggle = screen.getByRole('switch', { name: '显示排除项' });
    expect(toggle).toBeChecked();
    expect(screen.getByText('排除课程')).toBeInTheDocument();
    expect(screen.getByText('1', { selector: '.show-excluded-count' })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByText('排除课程')).not.toBeInTheDocument();
  });

  it('shows excluded courses by default and lets the user hide them', () => {
    const included = makeCourse('1', 90, 2, {
      identity: { code: 'INCLUDED-001', name: '纳入课程' }
    });
    const excluded = makeCourse('2', 80, 2, {
      identity: { code: 'EXCLUDED-001', name: '排除课程' },
      control: { userIncluded: false, recommendationOverride: 'auto' }
    });
    const selectedResult: CalculationResult = {
      kind: 'weighted-average',
      status: 'success',
      value: 90,
      formattedValue: '90.0000',
      includedCourseIds: [included.id],
      excludedCourseIds: [excluded.id],
      courseCount: 1,
      creditSum: 2,
      evaluations: [
        {
          courseId: included.id,
          resultKind: 'weighted-average',
          included: true,
          exclusionCodes: [],
          exclusionMessages: [],
          effectiveScore: 90,
          weightedContribution: 180
        },
        {
          courseId: excluded.id,
          resultKind: 'weighted-average',
          included: false,
          exclusionCodes: ['user-excluded'],
          exclusionMessages: ['用户手动排除']
        }
      ]
    };
    const recommendationResult: CalculationResult = {
      ...selectedResult,
      kind: 'recommendation-gpa',
      evaluations: selectedResult.evaluations.map((evaluation) => ({
        ...evaluation,
        resultKind: 'recommendation-gpa'
      }))
    };

    render(
      <App>
        <CourseWorkspace
          courses={[included, excluded]}
          rules={defaultRuleSet}
          ready
          selectedResultKind="weighted-average"
          selectedResult={selectedResult}
          recommendationResult={recommendationResult}
          onAdd={vi.fn()}
          onClear={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn().mockResolvedValue(undefined)}
          onRecommendationChange={vi.fn().mockResolvedValue(undefined)}
        />
      </App>
    );

    const toggle = screen.getByRole('switch', { name: '显示排除项' });
    expect(toggle).toBeChecked();
    expect(screen.getByText('排除课程')).toBeInTheDocument();
    expect(screen.getByText('用户手动排除')).toBeInTheDocument();
    expect(screen.getByText('1', { selector: '.show-excluded-count' })).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByText('排除课程')).not.toBeInTheDocument();
  });
});
