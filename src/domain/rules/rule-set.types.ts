import type { LevelGrade } from '../course/course.types';

export interface GradePointBand {
  minInclusive: number;
  maxExclusive: number;
  gradePoint: number;
}

export interface GradePointRuleSet {
  mode: 'imported-preferred' | 'recalculate';
  levelScores: Record<LevelGrade, number>;
  bands: GradePointBand[];
}

export interface RecommendationRuleSet {
  id: string;
  name: string;
  version: string;
  applicableFrom: string;
  applicableTo?: string;
  college?: string;
  major?: string;
  verificationStatus: 'verified' | 'unverified';
  sourceTitle?: string;
  sourceUrl?: string;
  verifiedAt?: string;
  electiveNatureExactValues: string[];
  excludedCourseCodes: string[];
  excludedCourseNames: string[];
}

export interface AppRuleSet {
  id: string;
  name: string;
  version: string;
  gradePoint: GradePointRuleSet;
  recommendation: RecommendationRuleSet;
}
