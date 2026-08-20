import type { Course, Grade, LevelGrade, Semester } from './course.types';
import type { GradePointRuleSet } from '../rules/rule-set.types';

const levelGradeAliases: Record<string, LevelGrade> = {
  优秀: '优秀',
  优: '优秀',
  良好: '良好',
  良: '良好',
  中等: '中等',
  中: '中等',
  及格: '及格',
  合格: '及格',
  不及格: '不及格',
  不合格: '不及格'
};

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u00a0\u3000]/g, ' ')
    .trim();
}

export function normalizeCourseCode(value: unknown): string {
  return normalizeText(value).toUpperCase();
}

export function parseBoolean(value: unknown): boolean | undefined {
  const text = normalizeText(value).toLowerCase();
  if (['是', 'true', 'yes', '1', '有效', '及格'].includes(text)) return true;
  if (['否', 'false', 'no', '0', '无效', '不及格'].includes(text)) return false;
  return undefined;
}

export function parseSemester(rawText: string): {
  academicYear?: string;
  semester: Semester;
  rawText?: string;
} {
  const normalized = normalizeText(rawText);
  const academicYear = normalized.match(/(\d{4}-\d{4})/)?.[1];
  let semester: Semester = 'unknown';
  if (/第?1学期|秋季|秋/.test(normalized)) semester = 'autumn';
  if (/第?2学期|春季|春/.test(normalized)) semester = 'spring';
  if (/夏季|夏/.test(normalized)) semester = 'summer';
  if (/冬季|冬/.test(normalized)) semester = 'winter';
  return { academicYear, semester, rawText: normalized || undefined };
}

export function parseGrade(value: unknown): Grade {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value < 0 || value > 100) throw new Error('百分制成绩必须位于 0 到 100');
    return { kind: 'percentage', raw: value };
  }

  const text = normalizeText(value);
  const level = levelGradeAliases[text];
  if (level) return { kind: 'level', raw: level };

  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 100) {
    return { kind: 'percentage', raw: numeric };
  }

  throw new Error(`无法识别成绩“${text || '空值'}”`);
}

export function getEffectiveScore(grade: Grade, ruleSet: GradePointRuleSet): number {
  if (grade.kind === 'percentage') return grade.raw;
  return ruleSet.levelScores[grade.raw];
}

export function mapScoreToGradePoint(score: number, ruleSet: GradePointRuleSet): number {
  const band = ruleSet.bands.find(
    (candidate) => score >= candidate.minInclusive && score < candidate.maxExclusive
  );
  if (!band) throw new Error(`成绩 ${score} 未被绩点规则覆盖`);
  return band.gradePoint;
}

export function resolveGradePoint(
  course: Course,
  effectiveScore: number,
  ruleSet: GradePointRuleSet
): {
  value: number;
  source: 'imported' | 'mapped';
  differsFromMapping: boolean;
} {
  const mapped = mapScoreToGradePoint(effectiveScore, ruleSet);
  const imported = course.achievement.importedGradePoint;
  const canUseImported = Number.isFinite(imported) && (imported ?? -1) >= 0;
  if (ruleSet.mode === 'imported-preferred' && canUseImported) {
    return {
      value: imported as number,
      source: 'imported',
      differsFromMapping: Math.abs((imported as number) - mapped) > Number.EPSILON
    };
  }
  return { value: mapped, source: 'mapped', differsFromMapping: false };
}
