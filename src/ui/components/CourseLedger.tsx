import { DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons';
import { App, Button, Dropdown, Switch, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Course, CourseEvaluation } from '../../domain/course/course.types';
import { getEffectiveScore, resolveGradePoint } from '../../domain/course/course.normalizer';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';

export interface CourseLedgerRow {
  course: Course;
  evaluation?: CourseEvaluation;
  recommendationEvaluation?: CourseEvaluation;
}

interface Props {
  rows: CourseLedgerRow[];
  rules: AppRuleSet;
  loading?: boolean;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => Promise<void>;
  onRecommendationChange: (course: Course, included: boolean) => Promise<void>;
}

function gradeText(course: Course): string {
  const grade = course.achievement.grade;
  return grade.kind === 'percentage' ? String(grade.raw) : grade.raw;
}

function gradePointText(course: Course, rules: AppRuleSet): string {
  try {
    const score = getEffectiveScore(course.achievement.grade, rules.gradePoint);
    return resolveGradePoint(course, score, rules.gradePoint).value.toFixed(4);
  } catch {
    return '—';
  }
}

function recommendationValue(row: CourseLedgerRow): boolean {
  const override = row.course.control.recommendationOverride;
  if (override === 'include') return true;
  if (override === 'exclude') return false;
  return row.recommendationEvaluation?.included ?? true;
}

export function CourseLedger({
  rows,
  rules,
  loading,
  onEdit,
  onDelete,
  onRecommendationChange
}: Props) {
  const app = App.useApp();

  const confirmDelete = (course: Course) => {
    app.modal.confirm({
      title: '删除这门课程？',
      content: `“${course.identity.name}”将从本机课程数据中移除。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => onDelete(course)
    });
  };

  const columns: ColumnsType<CourseLedgerRow> = [
    {
      title: '课程名',
      key: 'course',
      fixed: 'left',
      width: 260,
      render: (_, row) => (
        <div className="course-identity">
          <Typography.Text strong>{row.course.identity.name}</Typography.Text>
          <Typography.Text type="secondary">{row.course.identity.code}</Typography.Text>
        </div>
      )
    },
    {
      title: '成绩',
      key: 'grade',
      width: 100,
      render: (_, row) => <span className="numeric-cell">{gradeText(row.course)}</span>
    },
    {
      title: '学分',
      key: 'credit',
      width: 90,
      render: (_, row) => <span className="numeric-cell">{row.course.achievement.credit}</span>
    },
    {
      title: '绩点',
      key: 'gradePoint',
      width: 110,
      render: (_, row) => <span className="numeric-cell">{gradePointText(row.course, rules)}</span>
    },
    {
      title: '保研课程',
      key: 'recommendation',
      width: 122,
      render: (_, row) => (
        <Switch
          size="small"
          checked={recommendationValue(row)}
          checkedChildren="是"
          unCheckedChildren="否"
          aria-label={`${row.course.identity.name}保研课程`}
          onClick={(_, event) => event.stopPropagation()}
          onChange={(checked) => void onRecommendationChange(row.course, checked)}
        />
      )
    },
    {
      title: '说明',
      key: 'reason',
      width: 240,
      render: (_, row) =>
        row.evaluation && !row.evaluation.included ? (
          <Typography.Text type="secondary" className="exclusion-reason">
            {row.evaluation.exclusionMessages.join('；')}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        )
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      align: 'center',
      width: 72,
      render: (_, row) => (
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'edit', icon: <EditOutlined />, label: '编辑' },
              { type: 'divider' },
              { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true }
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              if (key === 'edit') onEdit(row.course);
              else confirmDelete(row.course);
            }
          }}
        >
          <Button
            type="text"
            icon={<MoreOutlined />}
            aria-label={`${row.course.identity.name}操作`}
            onClick={(event) => event.stopPropagation()}
          />
        </Dropdown>
      )
    }
  ];

  return (
    <div className="course-ledger" data-testid="course-ledger">
      <Table<CourseLedgerRow>
        rowKey={(row) => row.course.id}
        columns={columns}
        dataSource={rows}
        loading={loading}
        size="middle"
        pagination={{ pageSize: 12, hideOnSinglePage: true, showSizeChanger: false }}
        scroll={{ x: 995 }}
        locale={{ emptyText: '没有符合条件的课程' }}
        rowClassName={(row) => (row.evaluation && !row.evaluation.included ? 'excluded-row' : '')}
        onRow={(row) => ({ onClick: () => onEdit(row.course) })}
      />
    </div>
  );
}
