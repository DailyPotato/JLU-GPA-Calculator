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
    expect(results.recommendationGpa.formattedValue).toBe('4.00');
    expect(results.weightedAverage.value).toBe((96.9 * 4 + 82 * 2) / 6);
    expect(results.weightedAverage.formattedValue).toBe('91.93');
    expect(results.arithmeticAverage.formattedValue).toBe('89.45');
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

  it('applies course-code exclusions only to their configured result', () => {
    const rules: AppRuleSet = {
      ...defaultRuleSet,
      exclusions: {
        ...defaultRuleSet.exclusions,
        'recommendation-gpa': {
          courseType: 'none',
          keywords: [],
          courseCodes: ['EXCLUDED']
        }
      }
    };
    const course = makeCourse('1', 88, 2, {
      identity: { code: 'EXCLUDED', name: '被排除课程' }
    });
    expect(calculateResult([course], 'recommendation-gpa', rules).status).toBe('empty');
    expect(calculateResult([course], 'weighted-average', rules).formattedValue).toBe('88.00');
    expect(calculateResult([course], 'arithmetic-average', rules).formattedValue).toBe('88.00');
  });

  it('supports independent keyword exclusions and ignores empty entries', () => {
    const rules: AppRuleSet = {
      ...defaultRuleSet,
      exclusions: {
        ...defaultRuleSet.exclusions,
        'weighted-average': {
          courseType: 'none',
          keywords: [' 英语 ', '', '   '],
          courseCodes: []
        }
      }
    };
    const english = makeCourse('1', 88, 2, {
      identity: { code: 'ENGLISH-001', name: '大学英语 A' }
    });
    const math = makeCourse('2', 92, 2, {
      identity: { code: 'MATH-001', name: '高等数学' }
    });

    const weighted = calculateResult([english, math], 'weighted-average', rules);
    const arithmetic = calculateResult([english, math], 'arithmetic-average', rules);
    expect(weighted).toMatchObject({ formattedValue: '92.00', includedCourseIds: ['2'] });
    expect(weighted.evaluations[0].exclusionCodes).toContain('result-keyword-excluded');
    expect(arithmetic).toMatchObject({ formattedValue: '90.00', courseCount: 2 });
  });

  it.each([
    ['elective', { courseNature: '专业选修课' }],
    ['required', { courseCategory: '学科必修' }]
  ] as const)('excludes %s course types using course attributes', (courseType, attributes) => {
    const rules: AppRuleSet = {
      ...defaultRuleSet,
      exclusions: {
        ...defaultRuleSet.exclusions,
        'arithmetic-average': { courseType, keywords: [], courseCodes: [] }
      }
    };
    const course = makeCourse('1', 90, 2, { attributes });
    const result = calculateResult([course], 'arithmetic-average', rules);
    expect(result.status).toBe('empty');
    expect(result.evaluations[0].exclusionCodes).toContain('result-course-type-excluded');
  });

  it('lets a manual recommendation inclusion override automatic recommendation exclusions', () => {
    const rules: AppRuleSet = {
      ...defaultRuleSet,
      exclusions: {
        ...defaultRuleSet.exclusions,
        'recommendation-gpa': {
          courseType: 'none',
          keywords: ['测试'],
          courseCodes: []
        }
      }
    };
    const course = makeCourse('1', 90, 2, {
      identity: { code: 'TEST-001', name: '测试课程' },
      control: { userIncluded: true, recommendationOverride: 'include' }
    });
    expect(calculateResult([course], 'recommendation-gpa', rules).status).toBe('success');
  });

  it('treats zero as a valid score', () => {
    const course = makeCourse('1', 0, 2, {
      control: { userIncluded: true, recommendationOverride: 'include' }
    });
    const results = calculateAllResults([course], defaultRuleSet);
    expect(results.recommendationGpa).toMatchObject({
      status: 'success',
      formattedValue: '0.00'
    });
    expect(results.weightedAverage).toMatchObject({ status: 'success', formattedValue: '0.00' });
  });
});
