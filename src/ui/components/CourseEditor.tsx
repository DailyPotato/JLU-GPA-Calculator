import { Form, Input, InputNumber, Modal, Radio, Select, Switch } from 'antd';
import { useEffect } from 'react';
import { parseSemester } from '../../domain/course/course.normalizer';
import type { Course, LevelGrade } from '../../domain/course/course.types';

interface CourseFormValues {
  code: string;
  name: string;
  rawTerm?: string;
  gradeKind: 'percentage' | 'level';
  percentageGrade?: number;
  levelGrade?: LevelGrade;
  credit: number;
  importedGradePoint?: number;
  courseCategory?: string;
  courseNature?: string;
  userIncluded: boolean;
  recommendationOverride: 'auto' | 'include' | 'exclude';
  isValid: boolean;
}

interface Props {
  open: boolean;
  course?: Course;
  onCancel: () => void;
  onSave: (course: Course) => Promise<void>;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `course-${Date.now()}-${Math.random()}`;
}

export function CourseEditor({ open, course, onCancel, onSave }: Props) {
  const [form] = Form.useForm<CourseFormValues>();
  const gradeKind = Form.useWatch('gradeKind', form);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      code: course?.identity.code ?? '',
      name: course?.identity.name ?? '',
      rawTerm: course?.term.rawText,
      gradeKind: course?.achievement.grade.kind ?? 'percentage',
      percentageGrade:
        course?.achievement.grade.kind === 'percentage' ? course.achievement.grade.raw : undefined,
      levelGrade:
        course?.achievement.grade.kind === 'level' ? course.achievement.grade.raw : undefined,
      credit: course?.achievement.credit ?? 1,
      importedGradePoint: course?.achievement.importedGradePoint,
      courseCategory: course?.attributes.courseCategory,
      courseNature: course?.attributes.courseNature,
      userIncluded: course?.control.userIncluded ?? true,
      recommendationOverride: course?.control.recommendationOverride ?? 'auto',
      isValid: course?.record.isValid ?? true
    });
  }, [course, form, open]);

  const submit = async () => {
    const values = await form.validateFields();
    const now = new Date().toISOString();
    const grade =
      values.gradeKind === 'percentage'
        ? { kind: 'percentage' as const, raw: values.percentageGrade! }
        : { kind: 'level' as const, raw: values.levelGrade! };
    const updated: Course = {
      id: course?.id ?? createId(),
      identity: {
        code: values.code.trim(),
        name: values.name.trim(),
        sequenceCode: course?.identity.sequenceCode
      },
      term: parseSemester(values.rawTerm ?? ''),
      achievement: {
        grade,
        credit: values.credit,
        importedGradePoint: values.importedGradePoint,
        passed: course?.achievement.passed
      },
      attributes: {
        ...course?.attributes,
        courseCategory: values.courseCategory?.trim() || undefined,
        courseNature: values.courseNature?.trim() || undefined
      },
      record: {
        ...(course?.record ?? { isValid: true }),
        isValid: values.isValid
      },
      control: {
        userIncluded: values.userIncluded,
        recommendationOverride: values.recommendationOverride
      },
      provenance: course?.provenance ?? { source: 'manual' },
      audit: {
        createdAt: course?.audit.createdAt ?? now,
        updatedAt: now
      }
    };
    await onSave(updated);
    form.resetFields();
  };

  return (
    <Modal
      open={open}
      title={course ? '编辑课程' : '手动添加课程'}
      okText="保存课程"
      cancelText="取消"
      onCancel={onCancel}
      onOk={() => void submit()}
      destroyOnHidden
      width={680}
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <div className="form-grid">
          <Form.Item
            label="课程号"
            name="code"
            rules={[{ required: true, message: '请输入课程号' }]}
          >
            <Input placeholder="仅课程号相同才会判定为同一课程" />
          </Form.Item>
          <Form.Item
            label="课程名"
            name="name"
            rules={[{ required: true, message: '请输入课程名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="学年学期" name="rawTerm">
            <Input placeholder="例如 2025-2026-1" />
          </Form.Item>
          <Form.Item label="成绩类型" name="gradeKind" rules={[{ required: true }]}>
            <Radio.Group
              optionType="button"
              options={[
                { label: '百分制', value: 'percentage' },
                { label: '五级制', value: 'level' }
              ]}
            />
          </Form.Item>
          {gradeKind === 'level' ? (
            <Form.Item
              label="五级制成绩"
              name="levelGrade"
              rules={[{ required: true, message: '请选择成绩' }]}
            >
              <Select
                options={['优秀', '良好', '中等', '及格', '不及格'].map((value) => ({
                  value,
                  label: value
                }))}
              />
            </Form.Item>
          ) : (
            <Form.Item
              label="百分制成绩"
              name="percentageGrade"
              rules={[{ required: true, message: '请输入成绩' }]}
            >
              <InputNumber min={0} max={100} precision={2} className="full-width" />
            </Form.Item>
          )}
          <Form.Item label="学分" name="credit" rules={[{ required: true, message: '请输入学分' }]}>
            <InputNumber min={0.01} precision={2} className="full-width" />
          </Form.Item>
          <Form.Item label="教务绩点（可选）" name="importedGradePoint">
            <InputNumber min={0} precision={4} className="full-width" />
          </Form.Item>
          <Form.Item label="课程类别" name="courseCategory">
            <Input />
          </Form.Item>
          <Form.Item label="课程性质" name="courseNature">
            <Input />
          </Form.Item>
        </div>
        <Form.Item label="是否参与均分计算" name="userIncluded" valuePropName="checked">
          <Switch checkedChildren="参与" unCheckedChildren="排除" />
        </Form.Item>
        <Form.Item
          label="保研科目设置"
          name="recommendationOverride"
          extra="“自动判断”使用当前保研规则；也可以强制纳入或排除。"
        >
          <Radio.Group
            options={[
              { label: '自动判断', value: 'auto' },
              { label: '强制纳入', value: 'include' },
              { label: '强制排除', value: 'exclude' }
            ]}
          />
        </Form.Item>
        <Form.Item label="成绩记录有效" name="isValid" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
