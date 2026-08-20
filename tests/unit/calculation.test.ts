import { describe, expect, it } from 'vitest';
import { calculateAllResults, calculateResult } from '../../src/domain/calculation/calculate';
import { defaultRuleSet } from '../../src/domain/rules/recommendation.rules';
import type { AppRuleSet } from '../../src/domain/rules/rule-set.types';
import { makeCourse } from './test-course';

describe('calculation pipeline', () => {
  it('calculates all three results without intermediate rounding', () => {
    const courses = [
      makeCourse('1', 96.9, 4, {
        achievement: {
          grade: { kind: 'percentage', raw: 96.9 },
          credit: 4,
          importedGradePoint: 4
        },
        control: { userIncluded: true, recommendationOverride: 'include' }
      }),
      makeCourse('2', 82, 2, {
        achievement: {
          grade: { kind: 'percentage', raw: 82 },
          credit: 2,
          importedGradePoint: 3
        },
        control: { userIncluded: true, recommendationOverride: 'exclude' }
      })
    ];
    const results = calculateAllResults(courses, defaultRuleSet);
    expect(results.recommendationGpa.formattedValue).toBe('4.0000');
    expect(results.weightedAverage.value).toBe((96.9 * 4 + 82 * 2) / 6);
    expect(results.weightedAverage.formattedValue).toBe('91.9333');
    expect(results.arithmeticAverage.formattedValue).toBe('89.4500');
  });

  it('returns empty instead of zero for no recommendation courses', () => {
    const course = makeCourse('1', 90, 3, {
      control: { userIncluded: true, recommendationOverride: 'exclude' }
    });
    const result = calculateResult([course], 'recommendation-gpa', defaultRuleSet);
    expect(result).toMatchObject({
      status: 'empty',
      courseCount: 0
    });
    expect(result.value).toBeUndefined();
  });

  it('does not apply recommendation exclusions to normal averages', () => {
    const rules: AppRuleSet = {
      ...defaultRuleSet,
      recommendation: {
        ...defaultRuleSet.recommendation,
        excludedCourseCodes: ['EXCLUDED']
      }
    };
    const course = makeCourse('1', 88, 2, {
      identity: { code: 'EXCLUDED', name: '被排除课程' }
    });
    expect(calculateResult([course], 'recommendation-gpa', rules).status).toBe('empty');
    expect(calculateResult([course], 'weighted-average', rules).formattedValue).toBe('88.0000');
    expect(calculateResult([course], 'arithmetic-average', rules).formattedValue).toBe('88.0000');
  });

  it('treats zero as a valid score', () => {
    const course = makeCourse('1', 0, 2, {
      control: { userIncluded: true, recommendationOverride: 'include' }
    });
    const results = calculateAllResults([course], defaultRuleSet);
    expect(results.recommendationGpa).toMatchObject({
      status: 'success',
      formattedValue: '0.0000'
    });
    expect(results.weightedAverage).toMatchObject({ status: 'success', formattedValue: '0.0000' });
  });
});
