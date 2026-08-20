import * as XLSX from 'xlsx';
import { courseSchema } from '../../domain/course/course.schema';
import type { Course } from '../../domain/course/course.types';
import {
  normalizeText,
  parseBoolean,
  parseGrade,
  parseSemester
} from '../../domain/course/course.normalizer';
import type { ImportField, ImportIssue, ImportPreview } from './import.types';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5_000;

const fieldAliases: Record<ImportField, string[]> = {
  academicTerm: ['学年学期', '学期', '开课学期'],
  courseCode: ['课程号', '课程代码', '课程编号'],
  courseName: ['课程名', '课程名称'],
  rawGrade: ['总成绩', '成绩', '最终成绩'],
  sequenceCode: ['课序号'],
  publicElectiveCategory: ['校公选课类别', '公选课类别'],
  courseCategory: ['课程类别'],
  courseNature: ['课程性质'],
  credit: ['学分', '课程学分'],
  studyMode: ['修读方式'],
  isMajor: ['是否主修'],
  examDate: ['考试日期'],
  importedGradePoint: ['绩点', '课程绩点'],
  retakeText: ['重修重考', '重修情况', '重考情况'],
  examType: ['考试类型'],
  openingDepartment: ['开课单位', '开课院系'],
  passed: ['是否及格'],
  isValid: ['是否有效'],
  specialReason: ['特殊原因']
};

const requiredFields: ImportField[] = ['courseCode', 'courseName', 'rawGrade', 'credit'];

export class SheetSelectionRequiredError extends Error {
  constructor(public readonly sheetNames: string[]) {
    super('工作簿包含多个非空工作表，请选择一个工作表');
    this.name = 'SheetSelectionRequiredError';
  }
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `course-${Date.now()}-${Math.random()}`;
}

function mapHeaders(headers: string[]): {
  mapping: Partial<Record<ImportField, string>>;
  issues: ImportIssue[];
} {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeText(header)
  }));
  const mapping: Partial<Record<ImportField, string>> = {};
  const issues: ImportIssue[] = [];

  for (const [field, aliases] of Object.entries(fieldAliases) as [ImportField, string[]][]) {
    const matches = normalizedHeaders.filter(({ normalized }) => aliases.includes(normalized));
    if (matches.length === 1) mapping[field] = matches[0].original;
    if (matches.length > 1) {
      issues.push({
        sheetName: '',
        field: 'header',
        severity: 'error',
        originalValue: matches.map(({ original }) => original),
        message: `字段“${field}”匹配到多个表头`,
        suggestion: '请保留一个目标列后重新导入'
      });
    }
  }
  return { mapping, issues };
}

function valueFor(
  row: Record<string, unknown>,
  mapping: Partial<Record<ImportField, string>>,
  field: ImportField
): unknown {
  const header = mapping[field];
  return header ? row[header] : undefined;
}

function optionalText(value: unknown): string | undefined {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

function parseOptionalNumber(value: unknown, fieldLabel: string): number | undefined {
  const text = normalizeText(value);
  if (!text) return undefined;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${fieldLabel}不是有效的非负数`);
  return parsed;
}

function rowToCourse(
  row: Record<string, unknown>,
  mapping: Partial<Record<ImportField, string>>,
  context: {
    source: 'jlu-sheet' | 'generic-sheet';
    fileName: string;
    sheetName: string;
    rowNumber: number;
    importBatchId: string;
    now: string;
  }
): Course {
  const code = normalizeText(valueFor(row, mapping, 'courseCode'));
  const name = normalizeText(valueFor(row, mapping, 'courseName'));
  if (!code) throw new Error('课程号为空');
  if (!name) throw new Error('课程名为空');

  const grade = parseGrade(valueFor(row, mapping, 'rawGrade'));
  const credit = Number(normalizeText(valueFor(row, mapping, 'credit')));
  if (!Number.isFinite(credit) || credit <= 0) throw new Error('学分必须为大于 0 的有限数');

  const isValid = parseBoolean(valueFor(row, mapping, 'isValid')) ?? true;
  const rawTerm = normalizeText(valueFor(row, mapping, 'academicTerm'));
  const importedGradePoint = parseOptionalNumber(
    valueFor(row, mapping, 'importedGradePoint'),
    '绩点'
  );

  return courseSchema.parse({
    id: createId(),
    identity: {
      code,
      name,
      sequenceCode: optionalText(valueFor(row, mapping, 'sequenceCode'))
    },
    term: parseSemester(rawTerm),
    achievement: {
      grade,
      credit,
      importedGradePoint,
      passed: parseBoolean(valueFor(row, mapping, 'passed'))
    },
    attributes: {
      courseCategory: optionalText(valueFor(row, mapping, 'courseCategory')),
      courseNature: optionalText(valueFor(row, mapping, 'courseNature')),
      publicElectiveCategory: optionalText(valueFor(row, mapping, 'publicElectiveCategory')),
      studyMode: optionalText(valueFor(row, mapping, 'studyMode')),
      examType: optionalText(valueFor(row, mapping, 'examType')),
      openingDepartment: optionalText(valueFor(row, mapping, 'openingDepartment')),
      isMajor: parseBoolean(valueFor(row, mapping, 'isMajor'))
    },
    record: {
      isValid,
      invalidReason: isValid ? undefined : '教务表标记为无效',
      examDate: optionalText(valueFor(row, mapping, 'examDate')),
      retakeText: optionalText(valueFor(row, mapping, 'retakeText')),
      specialReason: optionalText(valueFor(row, mapping, 'specialReason'))
    },
    control: {
      userIncluded: isValid,
      recommendationOverride: 'auto'
    },
    provenance: {
      source: context.source,
      importBatchId: context.importBatchId,
      fileName: context.fileName,
      sheetName: context.sheetName,
      rowNumber: context.rowNumber,
      rawFields: row
    },
    audit: {
      createdAt: context.now,
      updatedAt: context.now
    }
  });
}

function nonEmptySheetNames(workbook: XLSX.WorkBook): string[] {
  return workbook.SheetNames.filter((name) => {
    const sheet = workbook.Sheets[name];
    const range = sheet?.['!ref'];
    if (!sheet || !range) return false;
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][];
    return rows.some((row) => row.some((value) => normalizeText(value) !== ''));
  });
}

function readWorkbook(data: ArrayBuffer | Uint8Array, fileName: string): XLSX.WorkBook {
  if (fileName.toLowerCase().endsWith('.csv')) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    let text: string;
    try {
      text = new globalThis.TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      text = new globalThis.TextDecoder('gb18030').decode(bytes);
    }
    return XLSX.read(text.replace(/^\uFEFF/, ''), { type: 'string' });
  }
  return XLSX.read(data, { type: 'array' });
}

export function parseSpreadsheetBuffer(
  data: ArrayBuffer | Uint8Array,
  fileName: string,
  selectedSheetName?: string
): ImportPreview {
  const workbook = readWorkbook(data, fileName);
  const sheetNames = nonEmptySheetNames(workbook);
  if (sheetNames.length === 0) throw new Error('工作簿没有非空工作表');
  if (!selectedSheetName && sheetNames.length > 1)
    throw new SheetSelectionRequiredError(sheetNames);
  const sheetName = selectedSheetName ?? sheetNames[0];
  if (!sheetNames.includes(sheetName)) throw new Error(`工作表“${sheetName}”不存在或为空`);

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
    blankrows: false
  });
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`成绩表超过 ${MAX_IMPORT_ROWS} 行限制`);

  const headers = Object.keys(rows[0] ?? {});
  const normalizedHeaders = headers.map(normalizeText);
  const { mapping, issues: headerIssues } = mapHeaders(headers);
  const source = ['学年学期', '课程号', '课程名', '总成绩', '学分'].every((header) =>
    normalizedHeaders.includes(header)
  )
    ? 'jlu-sheet'
    : 'generic-sheet';
  const issues: ImportIssue[] = headerIssues.map((issue) => ({ ...issue, sheetName }));

  for (const field of requiredFields) {
    if (!mapping[field]) {
      issues.push({
        sheetName,
        field: 'header',
        severity: 'error',
        message: `缺少必要字段“${field}”`,
        suggestion: '请使用吉林大学导出表，或将列名改为受支持的同义表头'
      });
    }
  }

  const canParseRows = requiredFields.every((field) => mapping[field]);
  const courses: Course[] = [];
  const importBatchId = createId();
  const now = new Date().toISOString();
  if (canParseRows && headerIssues.every((issue) => issue.severity !== 'error')) {
    rows.forEach((row, index) => {
      try {
        courses.push(
          rowToCourse(row, mapping, {
            source,
            fileName,
            sheetName,
            rowNumber: index + 2,
            importBatchId,
            now
          })
        );
      } catch (error) {
        issues.push({
          sheetName,
          rowNumber: index + 2,
          severity: 'error',
          message: error instanceof Error ? error.message : '无法解析此行',
          suggestion: '请检查课程号、课程名、成绩和学分'
        });
      }
    });
  }

  return {
    fileName,
    sheetNames,
    selectedSheetName: sheetName,
    source,
    headerMapping: mapping,
    totalRows: rows.length,
    courses,
    issues,
    importableCount: courses.length,
    errorCount: issues.filter((issue) => issue.severity === 'error').length,
    warningCount: issues.filter((issue) => issue.severity === 'warning').length
  };
}

export async function parseSpreadsheetFile(
  file: File,
  selectedSheetName?: string
): Promise<ImportPreview> {
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error('文件超过 10 MB 限制');
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !['xls', 'xlsx', 'csv'].includes(extension)) {
    throw new Error('仅支持 .xls、.xlsx 和 .csv 文件');
  }
  return parseSpreadsheetBuffer(await file.arrayBuffer(), file.name, selectedSheetName);
}
