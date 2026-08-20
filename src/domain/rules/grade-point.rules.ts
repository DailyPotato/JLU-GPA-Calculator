import type { GradePointRuleSet } from './rule-set.types';

export const projectGradePointPreset: GradePointRuleSet = {
  mode: 'imported-preferred',
  levelScores: {
    优秀: 95,
    良好: 85,
    中等: 75,
    及格: 65,
    不及格: 0
  },
  bands: [
    { minInclusive: 90, maxExclusive: 101, gradePoint: 4 },
    { minInclusive: 87, maxExclusive: 90, gradePoint: 3.7 },
    { minInclusive: 84, maxExclusive: 87, gradePoint: 3.3 },
    { minInclusive: 80, maxExclusive: 84, gradePoint: 3 },
    { minInclusive: 77, maxExclusive: 80, gradePoint: 2.7 },
    { minInclusive: 74, maxExclusive: 77, gradePoint: 2.3 },
    { minInclusive: 70, maxExclusive: 74, gradePoint: 2 },
    { minInclusive: 67, maxExclusive: 70, gradePoint: 1.7 },
    { minInclusive: 64, maxExclusive: 67, gradePoint: 1.3 },
    { minInclusive: 60, maxExclusive: 64, gradePoint: 1 },
    { minInclusive: 0, maxExclusive: 60, gradePoint: 0 }
  ]
};
