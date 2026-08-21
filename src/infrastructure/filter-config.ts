import type { ResultKind } from '../domain/course/course.types';
import { normalizeResultExclusionRule } from '../domain/rules/result-exclusion.rules';
import type { AppRuleSet, ResultExclusionRuleSet } from '../domain/rules/rule-set.types';

const filterConfigFormat = 'jlu-gpa-filter-config';
const filterConfigVersion = 1;
const maxFilterConfigBytes = 256 * 1024;
const resultKinds: ResultKind[] = ['recommendation-gpa', 'weighted-average', 'arithmetic-average'];

interface FilterConfigFile {
  format: typeof filterConfigFormat;
  version: typeof filterConfigVersion;
  exportedAt: string;
  exclusions: AppRuleSet['exclusions'];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRule(value: unknown, label: string): ResultExclusionRuleSet {
  if (!isRecord(value)) throw new Error(`${label}配置缺失或格式不正确`);
  if (!['none', 'elective', 'required'].includes(String(value.courseType))) {
    throw new Error(`${label}的课程类型排除值无效`);
  }
  if (!Array.isArray(value.keywords) || !value.keywords.every((item) => typeof item === 'string')) {
    throw new Error(`${label}的关键词排除必须是文本列表`);
  }
  if (
    !Array.isArray(value.courseCodes) ||
    !value.courseCodes.every((item) => typeof item === 'string')
  ) {
    throw new Error(`${label}的课程编号排除必须是文本列表`);
  }
  return normalizeResultExclusionRule(value);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function serializeFilterConfig(exclusions: AppRuleSet['exclusions']): string {
  const file: FilterConfigFile = {
    format: filterConfigFormat,
    version: filterConfigVersion,
    exportedAt: new Date().toISOString(),
    exclusions
  };
  return JSON.stringify(file, null, 2);
}

export function parseFilterConfigText(text: string): AppRuleSet['exclusions'] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('过滤配置不是有效的 JSON 文件');
  }
  if (!isRecord(value) || value.format !== filterConfigFormat) {
    throw new Error('此文件不是绩点计算器过滤配置');
  }
  if (value.version !== filterConfigVersion) {
    throw new Error(`不支持此过滤配置版本：${String(value.version)}`);
  }
  if (!isRecord(value.exclusions)) throw new Error('过滤配置中缺少排除规则');
  const exclusions = value.exclusions;

  const labels: Record<ResultKind, string> = {
    'recommendation-gpa': '保研 GPA',
    'weighted-average': '加权平均分',
    'arithmetic-average': '算术平均分'
  };
  return Object.fromEntries(
    resultKinds.map((kind) => [kind, parseRule(exclusions[kind], labels[kind])])
  ) as AppRuleSet['exclusions'];
}

export async function parseFilterConfigFile(file: File): Promise<AppRuleSet['exclusions']> {
  if (file.size > maxFilterConfigBytes) throw new Error('过滤配置文件不能超过 256 KB');
  if (!file.name.toLowerCase().endsWith('.json')) throw new Error('请选择 .json 过滤配置文件');
  return parseFilterConfigText(await file.text());
}

export function downloadFilterConfig(exclusions: AppRuleSet['exclusions']): void {
  const blob = new Blob([serializeFilterConfig(exclusions)], {
    type: 'application/json;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `JLU-GPA-过滤配置-${timestamp()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
