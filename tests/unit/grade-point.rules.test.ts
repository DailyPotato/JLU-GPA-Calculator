import { describe, expect, it } from 'vitest';
import {
  getEffectiveScore,
  mapScoreToGradePoint,
  resolveGradePoint
} from '../../src/domain/course/course.normalizer';
import { projectGradePointPreset } from '../../src/domain/rules/grade-point.rules';
import { makeCourse } from './test-course';

describe('project grade point preset', () => {
  it.each([
    [100, 4],
    [90, 4],
    [89.999, 3.7],
    [87, 3.7],
    [86.999, 3.3],
    [84, 3.3],
    [83.999, 3],
    [80, 3],
    [79.999, 2.7],
    [77, 2.7],
    [76.999, 2.3],
    [74, 2.3],
    [73.999, 2],
    [70, 2],
    [69.999, 1.7],
    [67, 1.7],
    [66.999, 1.3],
    [64, 1.3],
    [63.999, 1],
    [60, 1],
    [59.999, 0],
    [0, 0]
  ])('maps %s to %s', (score, expected) => {
    expect(mapScoreToGradePoint(score, projectGradePointPreset)).toBe(expected);
  });

  it.each([
    ['优秀', 95],
    ['良好', 85],
    ['中等', 75],
    ['及格', 65],
    ['不及格', 0]
  ] as const)('normalizes %s to %s', (raw, expected) => {
    expect(getEffectiveScore({ kind: 'level', raw }, projectGradePointPreset)).toBe(expected);
  });

  it('keeps imported grade points separate and reports a mapping difference', () => {
    const course = makeCourse('1', 85.6, 2, {
      achievement: {
        grade: { kind: 'percentage', raw: 85.6 },
        credit: 2,
        importedGradePoint: 3.7
      }
    });
    expect(resolveGradePoint(course, 85.6, projectGradePointPreset)).toEqual({
      value: 3.7,
      source: 'imported',
      differsFromMapping: true
    });
  });
});
