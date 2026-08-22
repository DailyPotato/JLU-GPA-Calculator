import { formatDecimal } from '../../domain/calculation/format-result';
import { getEffectiveScore, resolveGradePoint } from '../../domain/course/course.normalizer';
import type { Course, CourseEvaluation } from '../../domain/course/course.types';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';

export interface CourseLedgerRow {
  course: Course;
  evaluation?: CourseEvaluation;
  recommendationEvaluation?: CourseEvaluation;
}

export function gradeText(course: Course): string {
  const grade = course.achievement.grade;
  return grade.kind === 'percentage' ? formatDecimal(grade.raw, 1) : grade.raw;
}

export function gradePointText(course: Course, rules: AppRuleSet): string {
  try {
    const score = getEffectiveScore(course.achievement.grade, rules.gradePoint);
    return formatDecimal(resolveGradePoint(course, score, rules.gradePoint).value, 1);
  } catch {
    return '—';
  }
}

export function recommendationValue(row: CourseLedgerRow): boolean {
  const override = row.course.control.recommendationOverride;
  if (override === 'include') return true;
  if (override === 'exclude') return false;
  return row.recommendationEvaluation?.included ?? true;
}
