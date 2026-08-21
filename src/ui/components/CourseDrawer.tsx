import { FileAddOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
  Typography
} from 'antd';
import { useEffect, useState } from 'react';
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
  recommendationIncluded: boolean;
  isValid: boolean;
}

interface Props {
  open: boolean;
  course?: Course;
  recommendationIncluded?: boolean;
  onClose: () => void;
  onImport: () => void;
  onSave: (course: Course) => Promise<void>;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `course-${Date.now()}-${Math.random()}`;
}

export function CourseDrawer({
  open,
  course,
  recommendationIncluded,
  onClose,
  onImport,
  onSave
}: Props) {
  const app = App.useApp();
  const [form] = Form.useForm<CourseFormValues>();
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
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
      recommendationIncluded: recommendationIncluded ?? true,
      isValid: course?.record.isValid ?? true
    });
  }, [course, form, open, recommendationIncluded]);

  const close = () => {
    if (!dirty) {
      onClose();
      return;
    }
    app.modal.confirm({
      title: '放弃未保存的修改？',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: () => {
        setDirty(false);
        onClose();
      }
    });
  };

  const openImport = () => {
    if (!dirty) {
      onImport();
      return;
    }
    app.modal.confirm({
      title: '改为导入成绩表？',
      content: '当前手动填写的内容尚未保存。',
      okText: '放弃并导入',
      cancelText: '继续编辑',
      onOk: () => {
        setDirty(false);
        form.resetFields();
        onImport();
      }
    });
  };

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
        recommendationOverride: values.recommendationIncluded ? 'include' : 'exclude'
      },
      provenance: course?.provenance ?? { source: 'manual' },
      audit: {
        createdAt: course?.audit.createdAt ?? now,
        updatedAt: now
      }
    };

    setSaving(true);
    try {
      await onSave(updated);
      setDirty(false);
      form.resetFields();
      onClose();
      app.message.success(course ? '课程已更新' : '课程已添加');
    } catch (error) {
      app.message.error(error instanceof Error ? error.message : '课程保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={course ? '编辑课程' : '添加课程'}
      size={500}
      className="functional-drawer course-drawer"
      onClose={close}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={close}>取消</Button>
          <Button type="primary" loading={saving} onClick={() => void submit()}>
            保存课程
          </Button>
        </Space>
      }
    >
      {!course && (
        <>
          <section className="course-import-entry" aria-labelledby="course-import-entry-title">
            <span className="course-import-entry-icon" aria-hidden="true">
              <FileAddOutlined />
            </span>
            <div className="course-import-entry-copy">
              <Typography.Text id="course-import-entry-title" strong>
                从成绩表批量添加
              </Typography.Text>
              <Typography.Text type="secondary">
                支持 XLS、XLSX 和 CSV；适配表可恢复课程排除状态
              </Typography.Text>
            </div>
            <Button aria-label="导入成绩表" icon={<FileAddOutlined />} onClick={openImport}>
              导入成绩表
            </Button>
          </section>
          <Divider plain className="course-entry-divider">
            或手动填写
          </Divider>
        </>
      )}
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        onValuesChange={() => setDirty(true)}
      >
        <Form.Item label="课程号" name="code" rules={[{ required: true, message: '请输入课程号' }]}>
          <Input placeholder="仅课程号相同才视为同一课程" />
        </Form.Item>
        <Form.Item label="课程名" name="name" rules={[{ required: true, message: '请输入课程名' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="学年学期" name="rawTerm">
          <Input placeholder="例如 2025-2026-1" />
        </Form.Item>
        <div className="form-grid">
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
              <InputNumber min={0} max={100} precision={1} className="full-width" />
            </Form.Item>
          )}
          <Form.Item label="学分" name="credit" rules={[{ required: true, message: '请输入学分' }]}>
            <InputNumber min={0.1} precision={1} className="full-width" />
          </Form.Item>
          <Form.Item label="教务导入绩点" name="importedGradePoint">
            <InputNumber min={0} precision={1} className="full-width" />
          </Form.Item>
        </div>
        <Form.Item label="课程类别" name="courseCategory">
          <Input />
        </Form.Item>
        <Form.Item label="课程性质" name="courseNature">
          <Input />
        </Form.Item>
        <div className="course-switches">
          <Form.Item label="保研课程" name="recommendationIncluded" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item label="参与均分" name="userIncluded" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item label="成绩记录有效" name="isValid" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </div>
      </Form>
    </Drawer>
  );
}
