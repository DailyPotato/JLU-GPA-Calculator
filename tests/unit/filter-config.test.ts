import { describe, expect, it } from 'vitest';
import { defaultRuleSet } from '../../src/domain/rules/recommendation.rules';
import {
  parseFilterConfigText,
  serializeFilterConfig
} from '../../src/infrastructure/filter-config';

describe('filter configuration transfer', () => {
  it('round-trips and normalizes all three result exclusion rules', () => {
    const exclusions = structuredClone(defaultRuleSet.exclusions);
    exclusions['recommendation-gpa'].courseType = 'elective';
    exclusions['weighted-average'].keywords = [' 英语 ', '英语'];
    exclusions['arithmetic-average'].courseCodes = ['abc-001'];

    expect(parseFilterConfigText(serializeFilterConfig(exclusions))).toEqual({
      'recommendation-gpa': { courseType: 'elective', keywords: [], courseCodes: [] },
      'weighted-average': { courseType: 'none', keywords: ['英语'], courseCodes: [] },
      'arithmetic-average': { courseType: 'none', keywords: [], courseCodes: ['ABC-001'] }
    });
  });

  it('rejects unrelated, unsupported and structurally invalid files', () => {
    expect(() => parseFilterConfigText('{')).toThrow('不是有效的 JSON');
    expect(() => parseFilterConfigText('{"format":"other","version":1}')).toThrow(
      '不是绩点计算器过滤配置'
    );
    expect(() => parseFilterConfigText('{"format":"jlu-gpa-filter-config","version":2}')).toThrow(
      '不支持此过滤配置版本'
    );
    expect(() =>
      parseFilterConfigText(
        JSON.stringify({
          format: 'jlu-gpa-filter-config',
          version: 1,
          exclusions: {
            'recommendation-gpa': { courseType: 'none', keywords: [], courseCodes: [] }
          }
        })
      )
    ).toThrow('加权平均分配置缺失');
  });
});
