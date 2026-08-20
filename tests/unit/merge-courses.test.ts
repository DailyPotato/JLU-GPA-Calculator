import { describe, expect, it } from 'vitest';
import { mergeCourses } from '../../src/application/merge-courses';
import { makeCourse } from './test-course';

describe('course import merge', () => {
  it('replaces the current data set', () => {
    const result = mergeCourses([makeCourse('1', 80)], [makeCourse('2', 90)], 'replace');
    expect(result.courses.map((course) => course.id)).toEqual(['2']);
    expect(result.replacedCount).toBe(1);
  });

  it('skips exact records while preserving suspected retakes', () => {
    const existing = makeCourse('1', 80, 2, {
      identity: { code: 'A', name: '课程' },
      term: { semester: 'spring', rawText: '2025-2026-2' }
    });
    const exact = makeCourse('2', 80, 2, {
      identity: { code: 'A', name: '课程' },
      term: { semester: 'spring', rawText: '2025-2026-2' }
    });
    const retake = makeCourse('3', 90, 2, {
      identity: { code: 'A', name: '课程' },
      term: { semester: 'autumn', rawText: '2026-2027-1' }
    });
    const result = mergeCourses([existing], [exact, retake], 'append');
    expect(result.exactDuplicateCount).toBe(1);
    expect(result.courses.map((course) => course.id)).toEqual(['1', '3']);
  });
});
