import {
  Alert,
  Button,
  Divider,
  Input,
  InputNumber,
  Modal,
  Radio,
  Space,
  Table,
  Typography
} from 'antd';
import { useState } from 'react';
import type { LevelGrade } from '../../domain/course/course.types';
import type { AppRuleSet, GradePointBand } from '../../domain/rules/rule-set.types';

interface Props {
  open: boolean;
  rules: AppRuleSet;
  onCancel: () => void;
  onSave: (rules: AppRuleSet) => Promise<void>;
}

const levels: LevelGrade[] = ['优秀', '良好', '中等', '及格', '不及格'];

function csv(value: string): string[] {
  return value
    .split(/[，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateBands(bands: GradePointBand[]): GradePointBand[] {
  const sorted = [...bands].sort((a, b) => a.minInclusive - b.minInclusive);
  if (!sorted.length) throw new Error('绩点表不能为空');
  if (sorted[0].minInclusive !== 0) throw new Error('绩点表必须从 0 分开始');
  for (let index = 0; index < sorted.length; index += 1) {
    const band = sorted[index];
    if (![band.minInclusive, band.maxExclusive, band.gradePoint].every(Number.isFinite)) {
      throw new Error('绩点表中存在无效数字');
    }
    if (band.minInclusive >= band.maxExclusive || band.gradePoint < 0) {
      throw new Error('每档下限必须小于上限，绩点不得为负数');
    }
    if (index > 0 && sorted[index - 1].maxExclusive !== band.minInclusive) {
      throw new Error('绩点区间必须连续且不能重叠');
    }
  }
  if (sorted.at(-1)!.maxExclusive <= 100)
    throw new Error('绩点表必须覆盖 100 分（末档上限建议填写 101）');
  return sorted;
}

export function SettingsDialog({ open, rules, onCancel, onSave }: Props) {
  const [draft, setDraft] = useState<AppRuleSet>(() => structuredClone(rules));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const updateBand = (index: number, field: keyof GradePointBand, value: number | null) => {
    const bands = draft.gradePoint.bands.map((band, bandIndex) =>
      bandIndex === index ? { ...band, [field]: value ?? 0 } : band
    );
    setDraft({ ...draft, gradePoint: { ...draft.gradePoint, bands } });
  };

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      const bands = validateBands(draft.gradePoint.bands);
      const next: AppRuleSet = {
        ...draft,
        id: 'user-custom-rule-set',
        name: '用户自定义规则',
        version: `custom-${new Date().toISOString().slice(0, 10)}`,
        gradePoint: { ...draft.gradePoint, bands },
        recommendation: {
          ...draft.recommendation,
          id: 'user-custom-recommendation-rules',
          name: '用户自定义保研课程规则',
          verificationStatus: 'unverified'
        }
      };
      await onSave(next);
      onCancel();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '规则保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title="计算规则设置"
      width={900}
      okText="保存规则"
      cancelText="取消"
      confirmLoading={saving}
      onOk={() => void save()}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" className="full-width">
        <Alert
          type="warning"
          showIcon
          message="当前预设尚未按学院、专业和适用年份核验。自定义修改只保存在本浏览器，不代表吉林大学官方规则。"
        />
        <div>
          <Typography.Title level={4}>绩点取值方式</Typography.Title>
          <Radio.Group
            value={draft.gradePoint.mode}
            onChange={(event) =>
              setDraft({
                ...draft,
                gradePoint: {
                  ...draft.gradePoint,
                  mode: event.target.value as AppRuleSet['gradePoint']['mode']
                }
              })
            }
            options={[
              { label: '优先使用教务导入绩点', value: 'imported-preferred' },
              { label: '统一按下表重新计算', value: 'recalculate' }
            ]}
          />
        </div>
        <Divider />
        <div>
          <Typography.Title level={4}>五级制折算表</Typography.Title>
          <div className="level-score-grid">
            {levels.map((level) => (
              <label key={level}>
                <span>{level}</span>
                <InputNumber
                  min={0}
                  max={100}
                  value={draft.gradePoint.levelScores[level]}
                  onChange={(value) =>
                    setDraft({
                      ...draft,
                      gradePoint: {
                        ...draft.gradePoint,
                        levelScores: { ...draft.gradePoint.levelScores, [level]: value ?? 0 }
                      }
                    })
                  }
                />
              </label>
            ))}
          </div>
        </div>
        <Divider />
        <div>
          <div className="section-heading">
            <div>
              <Typography.Title level={4}>分数—绩点表</Typography.Title>
              <Typography.Text type="secondary">
                区间为“下限 ≤ 分数 &lt; 上限”；为了覆盖 100 分，末档上限填写 101。
              </Typography.Text>
            </div>
            <Button
              onClick={() =>
                setDraft({
                  ...draft,
                  gradePoint: {
                    ...draft.gradePoint,
                    bands: [
                      ...draft.gradePoint.bands,
                      { minInclusive: 0, maxExclusive: 1, gradePoint: 0 }
                    ]
                  }
                })
              }
            >
              添加一档
            </Button>
          </div>
          <Table
            size="small"
            pagination={false}
            rowKey={(_, index) => String(index)}
            dataSource={draft.gradePoint.bands}
            columns={[
              {
                title: '下限（含）',
                render: (_, band, index) => (
                  <InputNumber
                    value={band.minInclusive}
                    onChange={(value) => updateBand(index, 'minInclusive', value)}
                  />
                )
              },
              {
                title: '上限（不含）',
                render: (_, band, index) => (
                  <InputNumber
                    value={band.maxExclusive}
                    onChange={(value) => updateBand(index, 'maxExclusive', value)}
                  />
                )
              },
              {
                title: '绩点',
                render: (_, band, index) => (
                  <InputNumber
                    min={0}
                    precision={2}
                    value={band.gradePoint}
                    onChange={(value) => updateBand(index, 'gradePoint', value)}
                  />
                )
              },
              {
                title: '操作',
                width: 80,
                render: (_, __, index) => (
                  <Button
                    type="link"
                    danger
                    onClick={() =>
                      setDraft({
                        ...draft,
                        gradePoint: {
                          ...draft.gradePoint,
                          bands: draft.gradePoint.bands.filter(
                            (_, bandIndex) => bandIndex !== index
                          )
                        }
                      })
                    }
                  >
                    删除
                  </Button>
                )
              }
            ]}
          />
        </div>
        <Divider />
        <div>
          <Typography.Title level={4}>保研课程排除规则</Typography.Title>
          <Typography.Paragraph type="secondary">
            只影响保研 GPA，不影响两种均分。均为规范化后的精确匹配，不做模糊匹配。
          </Typography.Paragraph>
          <Space direction="vertical" className="full-width">
            <label>
              排除的课程性质/类别值（逗号或换行分隔）
              <Input.TextArea
                rows={2}
                value={draft.recommendation.electiveNatureExactValues.join('\n')}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    recommendation: {
                      ...draft.recommendation,
                      electiveNatureExactValues: csv(event.target.value)
                    }
                  })
                }
              />
            </label>
            <label>
              排除的课程号（逗号或换行分隔）
              <Input.TextArea
                rows={2}
                value={draft.recommendation.excludedCourseCodes.join('\n')}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    recommendation: {
                      ...draft.recommendation,
                      excludedCourseCodes: csv(event.target.value)
                    }
                  })
                }
              />
            </label>
            <label>
              排除的课程名（逗号或换行分隔）
              <Input.TextArea
                rows={2}
                value={draft.recommendation.excludedCourseNames.join('\n')}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    recommendation: {
                      ...draft.recommendation,
                      excludedCourseNames: csv(event.target.value)
                    }
                  })
                }
              />
            </label>
          </Space>
        </div>
        {error && <Alert type="error" showIcon message={error} />}
      </Space>
    </Modal>
  );
}
