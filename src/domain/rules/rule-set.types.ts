import type { LevelGrade, ResultKind } from '../course/course.types';

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
  /** Legacy fields retained so previously saved browser settings can be migrated. */
  electiveNatureExactValues?: string[];
  excludedCourseCodes?: string[];
  excludedCourseNames?: string[];
}

export type CourseTypeExclusion = 'none' | 'elective' | 'required';

export interface ResultExclusionRuleSet {
  courseType: CourseTypeExclusion;
  keywords: string[];
  courseCodes: string[];
}

export interface AppRuleSet {
  id: string;
  name: string;
  version: string;
  gradePoint: GradePointRuleSet;
  recommendation: RecommendationRuleSet;
  exclusions: Record<ResultKind, ResultExclusionRuleSet>;
}
