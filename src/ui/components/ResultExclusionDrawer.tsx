import { CopyOutlined, FilterOutlined } from '@ant-design/icons';
import { Alert, Button, Drawer, Radio, Select, Space, Typography } from 'antd';
import { useState } from 'react';
import {
  normalizeResultExclusionRule,
  createEmptyResultExclusionRule
} from '../../domain/rules/result-exclusion.rules';
import type { ResultKind } from '../../domain/course/course.types';
import type { ResultExclusionRuleSet } from '../../domain/rules/rule-set.types';

const labels: Record<ResultKind, string> = {
  'recommendation-gpa': '保研 GPA',
  'weighted-average': '加权平均分',
  'arithmetic-average': '算术平均分'
};

const resultKinds: ResultKind[] = ['recommendation-gpa', 'weighted-average', 'arithmetic-average'];

export type ExclusionRuleUpdates = Partial<Record<ResultKind, ResultExclusionRuleSet>>;

interface Props {
  open: boolean;
  kind: ResultKind;
  rule?: ResultExclusionRuleSet;
  onClose: () => void;
  onSave: (updates: ExclusionRuleUpdates) => Promise<void>;
}

export function ResultExclusionDrawer({ open, kind, rule, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<ResultExclusionRuleSet>(() =>
    normalizeResultExclusionRule(rule ?? createEmptyResultExclusionRule())
  );
  const [saving, setSaving] = useState<ResultKind | 'current'>();
  const [error, setError] = useState<string>();
  const syncTargets = resultKinds.filter((candidate) => candidate !== kind);

  const persist = async (target?: ResultKind) => {
    setSaving(target ?? 'current');
    setError(undefined);
    const normalized = normalizeResultExclusionRule(draft);
    try {
      await onSave(
        target
          ? { [kind]: normalized, [target]: structuredClone(normalized) }
          : { [kind]: normalized }
      );
      setDraft(normalized);
      if (!target) onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '排除规则保存失败');
    } finally {
      setSaving(undefined);
    }
  };

  return (
    <Drawer
      open={open}
      title={`${labels[kind]} · 排除规则`}
      size={560}
      className="functional-drawer result-exclusion-drawer"
      onClose={onClose}
      destroyOnHidden
      extra={
        <Space>
          <Button aria-label="取消" onClick={onClose}>
            取消
          </Button>
          <Button type="primary" loading={saving === 'current'} onClick={() => void persist()}>
            保存规则
          </Button>
        </Space>
      }
    >
      <div className="exclusion-drawer-intro">
        <span className="exclusion-drawer-icon" aria-hidden="true">
          <FilterOutlined />
        </span>
        <div>
          <Typography.Title level={4}>{labels[kind]}的自动排除</Typography.Title>
          <Typography.Paragraph type="secondary">
            以下规则只影响当前计算。所有条件均为空时，不会额外排除课程。
          </Typography.Paragraph>
        </div>
      </div>

      <section className="exclusion-rule-section" aria-labelledby="course-type-rule-title">
        <div className="exclusion-rule-heading">
          <Typography.Title id="course-type-rule-title" level={5}>
            课程类型排除
          </Typography.Title>
          <Typography.Text type="secondary">按课程性质或课程类别识别</Typography.Text>
        </div>
        <Radio.Group
          block
          optionType="button"
          buttonStyle="solid"
          value={draft.courseType}
          onChange={(event) => setDraft({ ...draft, courseType: event.target.value })}
          options={[
            { label: '无', value: 'none' },
            { label: '选修', value: 'elective' },
            { label: '必修', value: 'required' }
          ]}
        />
      </section>

      <section className="exclusion-rule-section" aria-labelledby="keyword-rule-title">
        <div className="exclusion-rule-heading">
          <Typography.Title id="keyword-rule-title" level={5}>
            关键词排除
          </Typography.Title>
          <Typography.Text type="secondary">课程名称包含任一关键词即排除</Typography.Text>
        </div>
        <Select
          mode="tags"
          allowClear
          className="full-width"
          value={draft.keywords}
          tokenSeparators={[',', '，']}
          placeholder="输入关键词后按回车，可添加多项"
          aria-label="关键词排除"
          onChange={(keywords) => setDraft({ ...draft, keywords })}
          options={[]}
        />
      </section>

      <section className="exclusion-rule-section" aria-labelledby="course-code-rule-title">
        <div className="exclusion-rule-heading">
          <Typography.Title id="course-code-rule-title" level={5}>
            课程编号排除
          </Typography.Title>
          <Typography.Text type="secondary">规范化后按完整课程编号精确匹配</Typography.Text>
        </div>
        <Select
          mode="tags"
          allowClear
          className="full-width"
          value={draft.courseCodes}
          tokenSeparators={[',', '，']}
          placeholder="输入课程编号后按回车，可添加多项"
          aria-label="课程编号排除"
          onChange={(courseCodes) => setDraft({ ...draft, courseCodes })}
          options={[]}
        />
      </section>

      <section className="exclusion-sync-panel" aria-labelledby="sync-rule-title">
        <div>
          <Typography.Title id="sync-rule-title" level={5}>
            同步到其他计算
          </Typography.Title>
          <Typography.Text type="secondary">
            同步时会先保存当前编辑内容，再覆盖目标计算的排除规则。
          </Typography.Text>
        </div>
        <div className="exclusion-sync-actions">
          {syncTargets.map((target) => (
            <Button
              key={target}
              aria-label={`同步应用于${labels[target]}计算`}
              icon={<CopyOutlined />}
              loading={saving === target}
              onClick={() => void persist(target)}
            >
              同步应用于{labels[target]}计算
            </Button>
          ))}
        </div>
      </section>

      {error && <Alert type="error" showIcon title={error} />}
    </Drawer>
  );
}
