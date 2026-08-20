import { describe, expect, it } from 'vitest';
import { defaultRuleSet } from '../../src/domain/rules/recommendation.rules';
import {
  getResultExclusionRule,
  normalizeAppRuleSet,
  normalizeResultExclusionRule
} from '../../src/domain/rules/result-exclusion.rules';
import type { AppRuleSet } from '../../src/domain/rules/rule-set.types';

describe('result exclusion rules', () => {
  it('normalizes empty values, duplicate keywords and course-code casing', () => {
    expect(
      normalizeResultExclusionRule({
        courseType: 'none',
        keywords: ['', ' 英语 ', '英语'],
        courseCodes: ['', 'abc-001', ' ABC-001 ']
      })
    ).toEqual({
      courseType: 'none',
      keywords: ['英语'],
      courseCodes: ['ABC-001']
    });
  });

  it('migrates legacy recommendation exclusions without affecting other results', () => {
    const legacyRules = {
      ...defaultRuleSet,
      exclusions: undefined,
      recommendation: {
        ...defaultRuleSet.recommendation,
        electiveNatureExactValues: ['选修'],
        excludedCourseNames: ['大学英语'],
        excludedCourseCodes: ['abc-001']
      }
    } as unknown as AppRuleSet;

    const normalized = normalizeAppRuleSet(legacyRules);
    expect(normalized.exclusions['recommendation-gpa']).toEqual({
      courseType: 'elective',
      keywords: ['大学英语'],
      courseCodes: ['ABC-001']
    });
    expect(getResultExclusionRule(normalized, 'weighted-average')).toEqual({
      courseType: 'none',
      keywords: [],
      courseCodes: []
    });
  });
});
