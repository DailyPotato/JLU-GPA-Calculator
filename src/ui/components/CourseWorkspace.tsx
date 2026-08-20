import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Empty, Input, Select, Switch, Typography } from 'antd';
import { useMemo, useState } from 'react';
import type { CalculationResult, Course, ResultKind } from '../../domain/course/course.types';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';
import { normalizeCourseCode, normalizeText } from '../../domain/course/course.normalizer';
import { CourseLedger, type CourseLedgerRow } from './CourseLedger';

const viewTitles: Record<ResultKind, string> = {
  'recommendation-gpa': '保研 GPA 课程',
  'weighted-average': '加权平均分课程',
  'arithmetic-average': '不加权平均分课程'
};

interface Props {
  courses: Course[];
  rules: AppRuleSet;
  ready: boolean;
  selectedResultKind?: ResultKind;
  selectedResult?: CalculationResult;
  recommendationResult: CalculationResult;
  onAdd: () => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => Promise<void>;
  onRecommendationChange: (course: Course, included: boolean) => Promise<void>;
}

type CourseFilter = 'all' | 'recommendation' | 'average' | 'invalid';
type CourseSort = 'name' | 'code' | 'score-desc' | 'credit-desc';

export function CourseWorkspace({
  courses,
  rules,
  ready,
  selectedResultKind,
  selectedResult,
  recommendationResult,
  onAdd,
  onEdit,
  onDelete,
  onRecommendationChange
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CourseFilter>('all');
  const [sort, setSort] = useState<CourseSort>('name');
  const [showExcluded, setShowExcluded] = useState(false);

  const rows = useMemo(() => {
    const evaluationMap = new Map(
      (selectedResult?.evaluations ?? []).map((evaluation) => [evaluation.courseId, evaluation])
    );
    const recommendationMap = new Map(
      recommendationResult.evaluations.map((evaluation) => [evaluation.courseId, evaluation])
    );
    let next: CourseLedgerRow[] = courses.map((course) => ({
      course,
      evaluation: evaluationMap.get(course.id),
      recommendationEvaluation: recommendationMap.get(course.id)
    }));

    if (selectedResultKind && selectedResult) {
      next = next.filter((row) => showExcluded || row.evaluation?.included);
    }

    const normalizedQuery = normalizeText(query);
    if (normalizedQuery) {
      next = next.filter(
        ({ course }) =>
          normalizeText(course.identity.name).includes(normalizedQuery) ||
          normalizeCourseCode(course.identity.code).includes(normalizeCourseCode(query))
      );
    }

    if (filter === 'recommendation') {
      next = next.filter(({ course, recommendationEvaluation }) =>
        course.control.recommendationOverride === 'include'
          ? true
          : course.control.recommendationOverride === 'exclude'
            ? false
            : (recommendationEvaluation?.included ?? true)
      );
    } else if (filter === 'average') {
      next = next.filter(({ course }) => course.control.userIncluded);
    } else if (filter === 'invalid') {
      next = next.filter(({ course }) => !course.record.isValid);
    }

    return [...next].sort((left, right) => {
      if (sort === 'code')
        return left.course.identity.code.localeCompare(right.course.identity.code);
      if (sort === 'score-desc') {
        const leftGrade = left.course.achievement.grade;
        const rightGrade = right.course.achievement.grade;
        const leftScore = leftGrade.kind === 'percentage' ? leftGrade.raw : 0;
        const rightScore = rightGrade.kind === 'percentage' ? rightGrade.raw : 0;
        return rightScore - leftScore;
      }
      if (sort === 'credit-desc') {
        return right.course.achievement.credit - left.course.achievement.credit;
      }
      return left.course.identity.name.localeCompare(right.course.identity.name, 'zh-CN');
    });
  }, [
    courses,
    filter,
    query,
    recommendationResult.evaluations,
    selectedResult,
    selectedResultKind,
    showExcluded,
    sort
  ]);

  const title = selectedResultKind ? viewTitles[selectedResultKind] : '课程清单';
  const subtitle = selectedResultKind
    ? `已纳入 ${selectedResult?.courseCount ?? 0} 门课程`
    : `共 ${courses.length} 门课程`;

  return (
    <section className="course-workspace" aria-labelledby="workspace-title">
      <header className="workspace-header">
        <div>
          <Typography.Title id="workspace-title" level={1}>
            {title}
          </Typography.Title>
          <Typography.Text type="secondary">{subtitle}</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          添加课程
        </Button>
      </header>

      <div className="workspace-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索课程名或课程号"
          aria-label="搜索课程名或课程号"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select<CourseFilter>
          aria-label="筛选课程"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: '全部课程' },
            { value: 'recommendation', label: '保研课程' },
            { value: 'average', label: '参与均分' },
            { value: 'invalid', label: '无效记录' }
          ]}
        />
        <Select<CourseSort>
          aria-label="课程排序"
          value={sort}
          onChange={setSort}
          options={[
            { value: 'name', label: '按课程名' },
            { value: 'code', label: '按课程号' },
            { value: 'score-desc', label: '成绩从高到低' },
            { value: 'credit-desc', label: '学分从高到低' }
          ]}
        />
        {selectedResultKind && (
          <label className="show-excluded-control">
            <Switch size="small" checked={showExcluded} onChange={setShowExcluded} />
            <span>显示排除项</span>
          </label>
        )}
      </div>

      {!ready ? (
        <CourseLedger
          rows={[]}
          rules={rules}
          loading
          onEdit={onEdit}
          onDelete={onDelete}
          onRecommendationChange={onRecommendationChange}
        />
      ) : courses.length === 0 ? (
        <div className="workspace-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="还没有课程，请导入成绩表或手动添加"
          >
            <Button type="primary" onClick={onAdd}>
              添加课程
            </Button>
          </Empty>
        </div>
      ) : (
        <CourseLedger
          rows={rows}
          rules={rules}
          onEdit={onEdit}
          onDelete={onDelete}
          onRecommendationChange={onRecommendationChange}
        />
      )}
    </section>
  );
}
