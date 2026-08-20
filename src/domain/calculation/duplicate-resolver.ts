import type { Course, CourseId } from '../course/course.types';
import { getEffectiveScore, normalizeCourseCode } from '../course/course.normalizer';
import type { GradePointRuleSet } from '../rules/rule-set.types';

function semesterRank(course: Course): number {
  const year = Number(course.term.academicYear?.slice(0, 4) ?? 0);
  const semester = { spring: 2, summer: 3, autumn: 4, winter: 5, unknown: 0 }[course.term.semester];
  return year * 10 + semester;
}

function compareCourses(left: Course, right: Course, ruleSet: GradePointRuleSet): number {
  const scoreDifference =
    getEffectiveScore(left.achievement.grade, ruleSet) -
    getEffectiveScore(right.achievement.grade, ruleSet);
  if (scoreDifference !== 0) return scoreDifference;

  const dateDifference = (left.record.examDate ?? '').localeCompare(right.record.examDate ?? '');
  if (dateDifference !== 0) return dateDifference;

  const termDifference = semesterRank(left) - semesterRank(right);
  if (termDifference !== 0) return termDifference;

  return (left.provenance.rowNumber ?? 0) - (right.provenance.rowNumber ?? 0);
}

export function resolveDuplicateCourses(
  courses: Course[],
  ruleSet: GradePointRuleSet
): Map<CourseId, CourseId> {
  const retainedByCode = new Map<string, Course>();

  for (const course of courses) {
    const code = normalizeCourseCode(course.identity.code);
    const current = retainedByCode.get(code);
    if (!current || compareCourses(course, current, ruleSet) > 0) {
      retainedByCode.set(code, course);
    }
  }

  const duplicateOf = new Map<CourseId, CourseId>();
  for (const course of courses) {
    const retained = retainedByCode.get(normalizeCourseCode(course.identity.code));
    if (retained && retained.id !== course.id) duplicateOf.set(course.id, retained.id);
  }
  return duplicateOf;
}
