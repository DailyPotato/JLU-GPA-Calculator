import type { Course } from '../domain/course/course.types';
import { normalizeCourseCode, normalizeText } from '../domain/course/course.normalizer';
import type { ImportMergeMode, MergeResult } from '../infrastructure/importers/import.types';

function rawGradeKey(course: Course): string {
  const grade = course.achievement.grade;
  return grade.kind === 'percentage' ? String(grade.raw) : grade.raw;
}

function exactRecordKey(course: Course): string {
  return [
    normalizeCourseCode(course.identity.code),
    normalizeText(course.term.rawText),
    rawGradeKey(course),
    String(course.achievement.credit)
  ].join('|');
}

export function mergeCourses(
  existing: Course[],
  incoming: Course[],
  mode: ImportMergeMode
): MergeResult {
  if (mode === 'replace') {
    return {
      courses: incoming,
      addedCount: incoming.length,
      replacedCount: existing.length,
      exactDuplicateCount: 0
    };
  }

  const keys = new Set(existing.map(exactRecordKey));
  const added: Course[] = [];
  let exactDuplicateCount = 0;
  for (const course of incoming) {
    const key = exactRecordKey(course);
    if (keys.has(key)) {
      exactDuplicateCount += 1;
      continue;
    }
    keys.add(key);
    added.push(course);
  }
  return {
    courses: [...existing, ...added],
    addedCount: added.length,
    replacedCount: 0,
    exactDuplicateCount
  };
}
