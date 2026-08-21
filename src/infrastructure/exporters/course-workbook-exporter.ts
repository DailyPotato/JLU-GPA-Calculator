import type { CalculationResult, Course, ExclusionCode } from '../../domain/course/course.types';

export const adaptedCourseHeaders = [
  '学年学期',
  '课程号',
  '课程名',
  '总成绩',
  '学分',
  '绩点',
  '课序号',
  '校公选课类别',
  '课程类别',
  '课程性质',
  '修读方式',
  '是否主修',
  '考试日期',
  '重修重考',
  '考试类型',
  '开课单位',
  '是否及格',
  '是否有效',
  '特殊原因',
  '是否排除'
] as const;

export type AdaptedCourseRow = Record<(typeof adaptedCourseHeaders)[number], string | number>;

const persistedExclusionCodes = new Set<ExclusionCode>([
  'user-excluded',
  'result-course-type-excluded',
  'result-keyword-excluded',
  'result-course-code-excluded',
  'manual-recommendation-exclude'
]);

function yesNo(value?: boolean): string {
  return value === undefined ? '' : value ? '是' : '否';
}

function excludedByUserRules(results: CalculationResult[]): Set<string> {
  return new Set(
    results.flatMap((result) =>
      result.evaluations
        .filter((evaluation) =>
          evaluation.exclusionCodes.some((code) => persistedExclusionCodes.has(code))
        )
        .map((evaluation) => evaluation.courseId)
    )
  );
}

export function buildAdaptedCourseRows(
  courses: Course[],
  results: CalculationResult[] = []
): AdaptedCourseRow[] {
  const ruleExcludedCourseIds = excludedByUserRules(results);
  return courses.map((course) => ({
    学年学期: course.term.rawText ?? '',
    课程号: course.identity.code,
    课程名: course.identity.name,
    总成绩: course.achievement.grade.raw,
    学分: course.achievement.credit,
    绩点: course.achievement.importedGradePoint ?? '',
    课序号: course.identity.sequenceCode ?? '',
    校公选课类别: course.attributes.publicElectiveCategory ?? '',
    课程类别: course.attributes.courseCategory ?? '',
    课程性质: course.attributes.courseNature ?? '',
    修读方式: course.attributes.studyMode ?? '',
    是否主修: yesNo(course.attributes.isMajor),
    考试日期: course.record.examDate ?? '',
    重修重考: course.record.retakeText ?? '',
    考试类型: course.attributes.examType ?? '',
    开课单位: course.attributes.openingDepartment ?? '',
    是否及格: yesNo(course.achievement.passed),
    是否有效: yesNo(course.record.isValid),
    特殊原因: course.record.specialReason ?? '',
    是否排除: !course.control.userIncluded || ruleExcludedCourseIds.has(course.id) ? '是' : '否'
  }));
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function exportAdaptedCourseWorkbook(
  courses: Course[],
  results: CalculationResult[] = []
): Promise<void> {
  if (courses.length === 0) throw new Error('没有可导出的课程');
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.json_to_sheet(buildAdaptedCourseRows(courses, results), {
    header: [...adaptedCourseHeaders]
  });
  sheet['!cols'] = adaptedCourseHeaders.map((header) => ({
    wch: header === '课程名' ? 28 : header === '特殊原因' ? 24 : Math.max(header.length * 2, 12)
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '课程与排除状态');
  XLSX.writeFile(workbook, `JLU-GPA-适配课程-${timestamp()}.xlsx`, { compression: true });
}
