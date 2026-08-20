import type { Course, Grade } from '../../src/domain/course/course.types';

export function makeCourse(
  id: string,
  score: number | Grade,
  credit = 1,
  overrides: Partial<Course> = {}
): Course {
  const now = '2026-08-20T00:00:00.000Z';
  const grade: Grade = typeof score === 'number' ? { kind: 'percentage', raw: score } : score;
  const base: Course = {
    id,
    identity: { code: `COURSE-${id}`, name: `课程 ${id}` },
    term: { academicYear: '2025-2026', semester: 'spring' },
    achievement: { grade, credit },
    attributes: {},
    record: { isValid: true },
    control: { userIncluded: true, recommendationOverride: 'auto' },
    provenance: { source: 'manual', rowNumber: Number(id.replace(/\D/g, '')) || 1 },
    audit: { createdAt: now, updatedAt: now }
  };
  return {
    ...base,
    ...overrides,
    identity: { ...base.identity, ...overrides.identity },
    term: { ...base.term, ...overrides.term },
    achievement: { ...base.achievement, ...overrides.achievement },
    attributes: { ...base.attributes, ...overrides.attributes },
    record: { ...base.record, ...overrides.record },
    control: { ...base.control, ...overrides.control },
    provenance: { ...base.provenance, ...overrides.provenance },
    audit: { ...base.audit, ...overrides.audit }
  };
}
