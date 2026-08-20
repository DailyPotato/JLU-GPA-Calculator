import type { Course, CourseEvaluation, ExclusionCode, ResultKind } from '../course/course.types';
import {
  getEffectiveScore,
  normalizeCourseCode,
  normalizeText,
  resolveGradePoint
} from '../course/course.normalizer';
import type { AppRuleSet } from '../rules/rule-set.types';
import { getResultExclusionRule } from '../rules/result-exclusion.rules';
import { resolveDuplicateCourses } from './duplicate-resolver';

const exclusionMessages: Record<ExclusionCode, string> = {
  'invalid-record': '成绩记录被标记为无效',
  'invalid-grade': '成绩无法按当前规则计算',
  'missing-credit': '学分缺失或无效',
  'user-excluded': '用户手动排除',
  'duplicate-history': '同课程号的非最高成绩',
  'result-course-type-excluded': '课程类型命中当前计算的排除规则',
  'result-keyword-excluded': '课程名称命中当前计算的关键词排除规则',
  'result-course-code-excluded': '课程编号命中当前计算的排除规则',
  'manual-recommendation-exclude': '用户手动排除出保研课程'
};

function addExclusion(evaluation: CourseEvaluation, code: ExclusionCode): void {
  if (evaluation.exclusionCodes.includes(code)) return;
  evaluation.exclusionCodes.push(code);
  evaluation.exclusionMessages.push(exclusionMessages[code]);
}

function getResultRuleExclusion(
  course: Course,
  resultKind: ResultKind,
  rules: AppRuleSet
): ExclusionCode | undefined {
  const exclusionRule = getResultExclusionRule(rules, resultKind);
  const attributeValues = [
    course.attributes.courseNature,
    course.attributes.courseCategory,
    course.attributes.publicElectiveCategory
  ]
    .map(normalizeText)
    .filter(Boolean);
  const publicElectiveCategory = normalizeText(course.attributes.publicElectiveCategory);
  const matchesCourseType =
    exclusionRule.courseType === 'elective'
      ? Boolean(publicElectiveCategory) || attributeValues.some((value) => value.includes('选修'))
      : exclusionRule.courseType === 'required'
        ? attributeValues.some((value) => value.includes('必修'))
        : false;
  if (matchesCourseType) {
    return 'result-course-type-excluded';
  }

  const code = normalizeCourseCode(course.identity.code);
  const name = normalizeText(course.identity.name);
  if (exclusionRule.keywords.some((keyword) => name.includes(normalizeText(keyword)))) {
    return 'result-keyword-excluded';
  }
  if (exclusionRule.courseCodes.map(normalizeCourseCode).includes(code)) {
    return 'result-course-code-excluded';
  }
  return undefined;
}

export function evaluateCourses(
  courses: Course[],
  resultKind: ResultKind,
  rules: AppRuleSet
): CourseEvaluation[] {
  const baseEligible: Course[] = [];
  const baseEvaluations = new Map<string, CourseEvaluation>();

  for (const course of courses) {
    const evaluation: CourseEvaluation = {
      courseId: course.id,
      resultKind,
      included: false,
      exclusionCodes: [],
      exclusionMessages: []
    };

    if (!course.record.isValid) addExclusion(evaluation, 'invalid-record');
    if (!course.control.userIncluded) addExclusion(evaluation, 'user-excluded');

    try {
      const effectiveScore = getEffectiveScore(course.achievement.grade, rules.gradePoint);
      if (!Number.isFinite(effectiveScore)) addExclusion(evaluation, 'invalid-grade');
      else evaluation.effectiveScore = effectiveScore;
    } catch {
      addExclusion(evaluation, 'invalid-grade');
    }

    if (!Number.isFinite(course.achievement.credit) || course.achievement.credit <= 0) {
      addExclusion(evaluation, 'missing-credit');
    }

    baseEvaluations.set(course.id, evaluation);
    if (evaluation.exclusionCodes.length === 0) baseEligible.push(course);
  }

  const duplicates = resolveDuplicateCourses(baseEligible, rules.gradePoint);
  for (const course of courses) {
    const evaluation = baseEvaluations.get(course.id)!;
    const duplicateOf = duplicates.get(course.id);
    if (duplicateOf) {
      evaluation.duplicateOf = duplicateOf;
      addExclusion(evaluation, 'duplicate-history');
    }
  }

  for (const course of courses) {
    const evaluation = baseEvaluations.get(course.id)!;
    if (
      resultKind === 'recommendation-gpa' &&
      course.control.recommendationOverride === 'exclude' &&
      evaluation.exclusionCodes.length === 0
    ) {
      addExclusion(evaluation, 'manual-recommendation-exclude');
    }

    const manuallyIncludedForRecommendation =
      resultKind === 'recommendation-gpa' && course.control.recommendationOverride === 'include';
    if (evaluation.exclusionCodes.length === 0 && !manuallyIncludedForRecommendation) {
      const ruleExclusion = getResultRuleExclusion(course, resultKind, rules);
      if (ruleExclusion) addExclusion(evaluation, ruleExclusion);
    }

    evaluation.included = evaluation.exclusionCodes.length === 0;
    if (!evaluation.included || evaluation.effectiveScore === undefined) continue;

    if (resultKind === 'recommendation-gpa') {
      try {
        const gradePoint = resolveGradePoint(course, evaluation.effectiveScore, rules.gradePoint);
        evaluation.effectiveGradePoint = gradePoint.value;
        evaluation.gradePointSource = gradePoint.source;
        evaluation.gradePointDiffersFromMapping = gradePoint.differsFromMapping;
        evaluation.weightedContribution = gradePoint.value * course.achievement.credit;
      } catch {
        addExclusion(evaluation, 'invalid-grade');
        evaluation.included = false;
      }
    } else if (resultKind === 'weighted-average') {
      evaluation.weightedContribution = evaluation.effectiveScore * course.achievement.credit;
    } else {
      evaluation.weightedContribution = evaluation.effectiveScore;
    }
  }

  return courses.map((course) => baseEvaluations.get(course.id)!);
}
