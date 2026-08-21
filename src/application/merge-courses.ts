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
      exactDuplicateCount: 0,
      restoredExclusionCount: incoming.filter(
        (course) => course.provenance.source === 'backup' && !course.control.userIncluded
      ).length
    };
  }

  const merged = [...existing];
  const indexByKey = new Map(existing.map((course, index) => [exactRecordKey(course), index]));
  let exactDuplicateCount = 0;
  let restoredExclusionCount = 0;
  for (const course of incoming) {
    const key = exactRecordKey(course);
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      exactDuplicateCount += 1;
      if (course.provenance.source === 'backup') {
        const current = merged[existingIndex];
        merged[existingIndex] = {
          ...current,
          control: { ...current.control, userIncluded: course.control.userIncluded },
          audit: { ...current.audit, updatedAt: new Date().toISOString() }
        };
        if (!course.control.userIncluded) restoredExclusionCount += 1;
      }
      continue;
    }
    indexByKey.set(key, merged.length);
    merged.push(course);
    if (course.provenance.source === 'backup' && !course.control.userIncluded) {
      restoredExclusionCount += 1;
    }
  }
  return {
    courses: merged,
    addedCount: merged.length - existing.length,
    replacedCount: 0,
    exactDuplicateCount,
    restoredExclusionCount
  };
}
