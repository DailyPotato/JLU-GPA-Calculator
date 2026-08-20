import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseSpreadsheetBuffer,
  SheetSelectionRequiredError
} from '../../src/infrastructure/importers/sheetjs-importer';

function workbookBytes(rows: Record<string, unknown>[], secondSheet = false): Uint8Array {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), '成绩');
  if (secondSheet) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), '另一张表');
  }
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

describe('SheetJS importer', () => {
  it('imports mixed percentage and level grades from the JLU schema', () => {
    const rows = [
      {
        学年学期: '2025-2026学年第1学期',
        课程号: 'A001',
        课程名: '程序设计',
        总成绩: 96.9,
        学分: 4,
        绩点: 4,
        是否有效: '是'
      },
      {
        学年学期: '2025-2026学年第1学期',
        课程号: 'A002',
        课程名: '课程设计',
        总成绩: '良好',
        学分: 2,
        绩点: 3.3,
        是否有效: '是'
      }
    ];
    const preview = parseSpreadsheetBuffer(workbookBytes(rows), '虚构成绩.xlsx');
    expect(preview).toMatchObject({
      source: 'jlu-sheet',
      totalRows: 2,
      importableCount: 2,
      errorCount: 0
    });
    expect(preview.courses[0].achievement.grade).toEqual({ kind: 'percentage', raw: 96.9 });
    expect(preview.courses[1].achievement.grade).toEqual({ kind: 'level', raw: '良好' });
  });

  it('keeps valid rows and reports invalid rows', () => {
    const rows = [
      { 课程号: 'A001', 课程名: '有效课程', 总成绩: 90, 学分: 2 },
      { 课程号: '', 课程名: '无效课程', 总成绩: '未知', 学分: 0 }
    ];
    const preview = parseSpreadsheetBuffer(workbookBytes(rows), '部分错误.xlsx');
    expect(preview.importableCount).toBe(1);
    expect(preview.errorCount).toBe(1);
    expect(preview.issues[0]).toMatchObject({ rowNumber: 3, severity: 'error' });
  });

  it('requires explicit selection when multiple sheets contain data', () => {
    const bytes = workbookBytes([{ 课程号: 'A', 课程名: '课程', 总成绩: 90, 学分: 1 }], true);
    expect(() => parseSpreadsheetBuffer(bytes, '多表.xlsx')).toThrow(SheetSelectionRequiredError);
    expect(parseSpreadsheetBuffer(bytes, '多表.xlsx', '另一张表').selectedSheetName).toBe(
      '另一张表'
    );
  });

  it('accepts common generic aliases', () => {
    const rows = [{ 课程代码: 'A001', 课程名称: '课程', 最终成绩: 88, 课程学分: 2 }];
    const preview = parseSpreadsheetBuffer(workbookBytes(rows), '通用.xlsx');
    expect(preview.source).toBe('generic-sheet');
    expect(preview.courses[0].identity.code).toBe('A001');
  });

  it('maps normalized headers back to their original sheet keys', () => {
    const rows = [{ ' 课程号 ': 'A001', '课程名　': '课程', 总成绩: 91, 学分: 2 }];
    const preview = parseSpreadsheetBuffer(workbookBytes(rows), '带空白表头.xlsx');
    expect(preview.importableCount).toBe(1);
    expect(preview.courses[0].identity).toMatchObject({ code: 'A001', name: '课程' });
  });

  it('decodes a UTF-8 CSV with Chinese headers without requiring a BOM', () => {
    const csv = new TextEncoder().encode('课程号,课程名,总成绩,学分\nCSV-001,虚构课程,88,3');
    const preview = parseSpreadsheetBuffer(csv, '虚构成绩.csv');
    expect(preview.importableCount).toBe(1);
    expect(preview.courses[0].identity).toMatchObject({ code: 'CSV-001', name: '虚构课程' });
  });
});
