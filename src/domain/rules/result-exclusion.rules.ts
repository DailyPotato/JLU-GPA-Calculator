import { normalizeCourseCode, normalizeText } from '../course/course.normalizer';
import type { ResultKind } from '../course/course.types';
import type { AppRuleSet, CourseTypeExclusion, ResultExclusionRuleSet } from './rule-set.types';

const resultKinds: ResultKind[] = ['recommendation-gpa', 'weighted-average', 'arithmetic-average'];

export function createEmptyResultExclusionRule(): ResultExclusionRuleSet {
  return { courseType: 'none', keywords: [], courseCodes: [] };
}

export function createDefaultResultExclusions(): AppRuleSet['exclusions'] {
  return {
    'recommendation-gpa': createEmptyResultExclusionRule(),
    'weighted-average': createEmptyResultExclusionRule(),
    'arithmetic-average': createEmptyResultExclusionRule()
  };
}

function uniqueNormalized(values: unknown, normalize: (value: unknown) => string): string[] {
  if (!Array.isArray(values)) return [];
  const entries = values.map(normalize).filter(Boolean);
  return [...new Set(entries)];
}

export function normalizeResultExclusionRule(
  rule?: Partial<ResultExclusionRuleSet>
): ResultExclusionRuleSet {
  const courseType: CourseTypeExclusion = ['elective', 'required'].includes(rule?.courseType ?? '')
    ? (rule?.courseType as CourseTypeExclusion)
    : 'none';
  return {
    courseType,
    keywords: uniqueNormalized(rule?.keywords, normalizeText),
    courseCodes: uniqueNormalized(rule?.courseCodes, normalizeCourseCode)
  };
}

function migrateLegacyRecommendationRule(rules: AppRuleSet): ResultExclusionRuleSet {
  const legacyTypes = rules.recommendation.electiveNatureExactValues ?? [];
  const normalizedTypes = legacyTypes.map(normalizeText).filter(Boolean);
  const courseType: CourseTypeExclusion = normalizedTypes.some((value) => value.includes('必修'))
    ? 'required'
    : normalizedTypes.length > 0
      ? 'elective'
      : 'none';
  return normalizeResultExclusionRule({
    courseType,
    keywords: rules.recommendation.excludedCourseNames ?? [],
    courseCodes: rules.recommendation.excludedCourseCodes ?? []
  });
}

export function getResultExclusionRule(
  rules: AppRuleSet,
  kind: ResultKind
): ResultExclusionRuleSet {
  const saved = rules.exclusions?.[kind];
  if (saved) return normalizeResultExclusionRule(saved);
  if (kind === 'recommendation-gpa') return migrateLegacyRecommendationRule(rules);
  return createEmptyResultExclusionRule();
}

export function normalizeAppRuleSet(rules: AppRuleSet): AppRuleSet {
  const exclusions = createDefaultResultExclusions();
  for (const kind of resultKinds) exclusions[kind] = getResultExclusionRule(rules, kind);
  return { ...rules, exclusions };
}
