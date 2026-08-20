import type { CalculationResult, Course, ResultKind } from '../course/course.types';
import type { AppRuleSet } from '../rules/rule-set.types';
import { formatResult } from './format-result';
import { evaluateCourses } from './preprocess';

export function calculateResult(
  courses: Course[],
  kind: ResultKind,
  rules: AppRuleSet
): CalculationResult {
  const evaluations = evaluateCourses(courses, kind, rules);
  const included = evaluations.filter((evaluation) => evaluation.included);
  const includedCourseIds = included.map((evaluation) => evaluation.courseId);
  const excludedCourseIds = evaluations
    .filter((evaluation) => !evaluation.included)
    .map((evaluation) => evaluation.courseId);

  if (included.length === 0) {
    return {
      kind,
      status: 'empty',
      includedCourseIds,
      excludedCourseIds,
      courseCount: 0,
      evaluations
    };
  }

  const byId = new Map(courses.map((course) => [course.id, course]));
  const creditSum = included.reduce(
    (sum, evaluation) => sum + (byId.get(evaluation.courseId)?.achievement.credit ?? 0),
    0
  );
  const numerator = included.reduce(
    (sum, evaluation) => sum + (evaluation.weightedContribution ?? 0),
    0
  );
  const denominator = kind === 'arithmetic-average' ? included.length : creditSum;
  const value = numerator / denominator;

  if (!Number.isFinite(value)) {
    return {
      kind,
      status: 'invalid',
      includedCourseIds,
      excludedCourseIds,
      courseCount: included.length,
      creditSum: kind === 'arithmetic-average' ? undefined : creditSum,
      evaluations
    };
  }

  return {
    kind,
    status: 'success',
    value,
    formattedValue: formatResult(value),
    includedCourseIds,
    excludedCourseIds,
    courseCount: included.length,
    creditSum: kind === 'arithmetic-average' ? undefined : creditSum,
    evaluations
  };
}

export function calculateAllResults(courses: Course[], rules: AppRuleSet) {
  return {
    recommendationGpa: calculateResult(courses, 'recommendation-gpa', rules),
    weightedAverage: calculateResult(courses, 'weighted-average', rules),
    arithmeticAverage: calculateResult(courses, 'arithmetic-average', rules)
  };
}
