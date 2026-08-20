import type { AppRuleSet } from './rule-set.types';
import { projectGradePointPreset } from './grade-point.rules';
import { createDefaultResultExclusions } from './result-exclusion.rules';

export const defaultRuleSet: AppRuleSet = {
  id: 'jlu-project-preset-unverified',
  name: '项目常用预设（未核验）',
  version: '2026.08-unverified',
  gradePoint: projectGradePointPreset,
  recommendation: {
    id: 'recommendation-empty-unverified',
    name: '保研课程规则（待负责人核验）',
    version: '2026.08-unverified',
    applicableFrom: '2026-08-20',
    verificationStatus: 'unverified'
  },
  exclusions: createDefaultResultExclusions()
};
