export type CourseId = string;

export type Semester = 'spring' | 'summer' | 'autumn' | 'winter' | 'unknown';

export type LevelGrade = '优秀' | '良好' | '中等' | '及格' | '不及格';

export type Grade = { kind: 'percentage'; raw: number } | { kind: 'level'; raw: LevelGrade };

export type ManualRecommendationOverride = 'auto' | 'include' | 'exclude';

export type CourseSource = 'manual' | 'jlu-sheet' | 'generic-sheet' | 'backup';

export interface Course {
  id: CourseId;
  identity: {
    code: string;
    name: string;
    sequenceCode?: string;
  };
  term: {
    academicYear?: string;
    semester: Semester;
    rawText?: string;
  };
  achievement: {
    grade: Grade;
    credit: number;
    importedGradePoint?: number;
    passed?: boolean;
  };
  attributes: {
    courseCategory?: string;
    courseNature?: string;
    publicElectiveCategory?: string;
    studyMode?: string;
    examType?: string;
    openingDepartment?: string;
    isMajor?: boolean;
  };
  record: {
    isValid: boolean;
    invalidReason?: string;
    examDate?: string;
    retakeText?: string;
    specialReason?: string;
  };
  control: {
    userIncluded: boolean;
    recommendationOverride: ManualRecommendationOverride;
    duplicateOf?: CourseId;
  };
  provenance: {
    source: CourseSource;
    importBatchId?: string;
    fileName?: string;
    sheetName?: string;
    rowNumber?: number;
    rawFields?: Record<string, unknown>;
  };
  audit: {
    createdAt: string;
    updatedAt: string;
  };
}

export type ResultKind = 'recommendation-gpa' | 'weighted-average' | 'arithmetic-average';

export type ExclusionCode =
  | 'invalid-record'
  | 'invalid-grade'
  | 'missing-credit'
  | 'user-excluded'
  | 'duplicate-history'
  | 'elective-course'
  | 'recommendation-excluded-course'
  | 'manual-recommendation-exclude';

export interface CourseEvaluation {
  courseId: CourseId;
  resultKind: ResultKind;
  included: boolean;
  exclusionCodes: ExclusionCode[];
  exclusionMessages: string[];
  effectiveScore?: number;
  effectiveGradePoint?: number;
  gradePointSource?: 'imported' | 'mapped';
  gradePointDiffersFromMapping?: boolean;
  weightedContribution?: number;
  duplicateOf?: CourseId;
}

export interface CalculationResult {
  kind: ResultKind;
  status: 'success' | 'empty' | 'invalid';
  value?: number;
  formattedValue?: string;
  includedCourseIds: CourseId[];
  excludedCourseIds: CourseId[];
  courseCount: number;
  creditSum?: number;
  evaluations: CourseEvaluation[];
}
