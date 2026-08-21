import { describe, expect, it } from 'vitest';
import { calculateResult } from '../../src/domain/calculation/calculate';
import { defaultRuleSet } from '../../src/domain/rules/recommendation.rules';
import { makeCourse } from './test-course';

describe('duplicate course resolution', () => {
  it('keeps the highest normalized score for the same course code', () => {
    const lower = makeCourse('1', 80, 3, { identity: { code: 'ae-001', name: '课程 A' } });
    const higher = makeCourse('2', 90, 3, { identity: { code: 'AE-001', name: '课程 A' } });
    const result = calculateResult([lower, higher], 'weighted-average', defaultRuleSet);
    expect(result.includedCourseIds).toEqual(['2']);
    expect(result.formattedValue).toBe('90.00');
    expect(result.evaluations.find((evaluation) => evaluation.courseId === '1')).toMatchObject({
      included: false,
      duplicateOf: '2',
      exclusionCodes: ['duplicate-history']
    });
  });

  it('uses the newer exam date when scores tie', () => {
    const old = makeCourse('1', 85, 2, {
      identity: { code: 'SAME', name: '课程 A' },
      record: { isValid: true, examDate: '2025-01-01' }
    });
    const recent = makeCourse('2', 85, 2, {
      identity: { code: 'SAME', name: '课程 A' },
      record: { isValid: true, examDate: '2026-01-01' }
    });
    expect(
      calculateResult([old, recent], 'weighted-average', defaultRuleSet).includedCourseIds
    ).toEqual(['2']);
  });

  it('does not merge courses with the same name but different codes', () => {
    const first = makeCourse('1', 80, 1, { identity: { code: 'A', name: '同名课程' } });
    const second = makeCourse('2', 90, 1, { identity: { code: 'B', name: '同名课程' } });
    const result = calculateResult([first, second], 'arithmetic-average', defaultRuleSet);
    expect(result.courseCount).toBe(2);
    expect(result.formattedValue).toBe('85.00');
  });
});
