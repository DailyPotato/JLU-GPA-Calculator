import { Button, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import type {
  CalculationResult,
  Course,
  CourseEvaluation,
  ResultKind
} from '../../domain/course/course.types';

interface Row {
  course: Course;
  evaluation: CourseEvaluation;
}

interface Props {
  kind: ResultKind;
  courses: Course[];
  result: CalculationResult;
  onEdit: (course: Course) => void;
}

const titles: Record<ResultKind, string> = {
  'recommendation-gpa': '保研 GPA 课程明细',
  'weighted-average': '加权平均分课程明细',
  'arithmetic-average': '不加权平均分课程明细'
};

function rawGrade(course: Course): string {
  return course.achievement.grade.kind === 'percentage'
    ? String(course.achievement.grade.raw)
    : course.achievement.grade.raw;
}

export function CourseTable({ kind, courses, result, onEdit }: Props) {
  const [showExcluded, setShowExcluded] = useState(false);
  const courseMap = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const rows = result.evaluations
    .filter((evaluation) => showExcluded || evaluation.included)
    .flatMap((evaluation) => {
      const course = courseMap.get(evaluation.courseId);
      return course ? [{ course, evaluation }] : [];
    });

  const columns: ColumnsType<Row> = [
    { title: '课程号', dataIndex: ['course', 'identity', 'code'], fixed: 'left', width: 130 },
    { title: '课程名', dataIndex: ['course', 'identity', 'name'], fixed: 'left', width: 180 },
    { title: '原始成绩', width: 100, render: (_, row) => rawGrade(row.course) },
    {
      title: '标准化成绩',
      width: 110,
      render: (_, row) => row.evaluation.effectiveScore ?? '—'
    }
  ];

  if (kind !== 'arithmetic-average') {
    columns.push({ title: '学分', width: 80, render: (_, row) => row.course.achievement.credit });
  }
  if (kind === 'recommendation-gpa') {
    columns.push(
      {
        title: '采用绩点',
        width: 105,
        render: (_, row) => row.evaluation.effectiveGradePoint ?? '—'
      },
      {
        title: '绩点来源',
        width: 110,
        render: (_, row) =>
          row.evaluation.gradePointSource === 'imported' ? (
            <Space size={4}>
              教务
              {row.evaluation.gradePointDiffersFromMapping && <Tag color="gold">与映射不同</Tag>}
            </Space>
          ) : row.evaluation.gradePointSource === 'mapped' ? (
            '映射'
          ) : (
            '—'
          )
      },
      {
        title: '绩点×学分',
        width: 120,
        render: (_, row) => row.evaluation.weightedContribution?.toFixed(4) ?? '—'
      }
    );
  } else if (kind === 'weighted-average') {
    columns.push({
      title: '成绩×学分',
      width: 120,
      render: (_, row) => row.evaluation.weightedContribution?.toFixed(4) ?? '—'
    });
  }

  columns.push(
    {
      title: '纳入情况',
      width: 230,
      render: (_, row) =>
        row.evaluation.included ? (
          <Tag color="green">已纳入</Tag>
        ) : (
          <Typography.Text type="secondary">
            {row.evaluation.exclusionMessages.join('；')}
          </Typography.Text>
        )
    },
    {
      title: '操作',
      fixed: 'right',
      width: 80,
      render: (_, row) => (
        <Button type="link" onClick={() => onEdit(row.course)}>
          编辑
        </Button>
      )
    }
  );

  return (
    <section className="detail-panel" aria-label={titles[kind]}>
      <div className="section-heading detail-heading">
        <div>
          <Typography.Title level={3}>{titles[kind]}</Typography.Title>
          <Typography.Text type="secondary">
            已纳入 {result.courseCount} 门
            {result.creditSum !== undefined ? `，合计 ${result.creditSum} 学分` : ''}
          </Typography.Text>
        </div>
        <Space>
          <Typography.Text>显示被排除课程</Typography.Text>
          <Switch checked={showExcluded} onChange={setShowExcluded} />
        </Space>
      </div>
      <Table<Row>
        rowKey={(row) => row.course.id}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        scroll={{ x: 1050 }}
        locale={{ emptyText: showExcluded ? '没有课程记录' : '本项没有已纳入课程' }}
        rowClassName={(row) => (row.evaluation.included ? '' : 'excluded-row')}
        size="middle"
      />
    </section>
  );
}
