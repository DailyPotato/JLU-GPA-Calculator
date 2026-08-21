import type { Course } from '../../domain/course/course.types';

export type ImportField =
  | 'academicTerm'
  | 'courseCode'
  | 'courseName'
  | 'rawGrade'
  | 'sequenceCode'
  | 'publicElectiveCategory'
  | 'courseCategory'
  | 'courseNature'
  | 'credit'
  | 'studyMode'
  | 'isMajor'
  | 'examDate'
  | 'importedGradePoint'
  | 'retakeText'
  | 'examType'
  | 'openingDepartment'
  | 'passed'
  | 'isValid'
  | 'userExcluded'
  | 'specialReason';

export interface ImportIssue {
  sheetName: string;
  rowNumber?: number;
  field?: ImportField | 'header' | 'file';
  originalValue?: unknown;
  severity: 'warning' | 'error';
  message: string;
  suggestion?: string;
}

export interface ImportPreview {
  fileName: string;
  sheetNames: string[];
  selectedSheetName: string;
  source: 'jlu-sheet' | 'generic-sheet';
  headerMapping: Partial<Record<ImportField, string>>;
  totalRows: number;
  courses: Course[];
  issues: ImportIssue[];
  importableCount: number;
  errorCount: number;
  warningCount: number;
  hasExclusionColumn: boolean;
  restoredExclusionCount: number;
}

export type ImportMergeMode = 'replace' | 'append';

export interface MergeResult {
  courses: Course[];
  addedCount: number;
  replacedCount: number;
  exactDuplicateCount: number;
  restoredExclusionCount: number;
}
