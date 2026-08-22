import { DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, Switch, Typography } from 'antd';
import { formatDecimal } from '../../domain/calculation/format-result';
import type { Course } from '../../domain/course/course.types';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';
import {
  gradePointText,
  gradeText,
  recommendationValue,
  type CourseLedgerRow
} from './course-ledger-utils';

interface Props {
  rows: CourseLedgerRow[];
  rules: AppRuleSet;
  onEdit: (course: Course) => void;
  onRequestDelete: (course: Course) => void;
  onRecommendationChange: (course: Course, included: boolean) => Promise<void>;
}

export function CourseCardList({
  rows,
  rules,
  onEdit,
  onRequestDelete,
  onRecommendationChange
}: Props) {
  return (
    <div className="course-card-list" data-testid="course-ledger">
      {rows.map((row) => {
        const course = row.course;
        const excluded = row.evaluation && !row.evaluation.included;
        return (
          <div
            key={course.id}
            className={`course-card${excluded ? ' course-card-excluded' : ''}`}
            onClick={() => onEdit(course)}
          >
            <div className="course-card-header">
              <div className="course-identity">
                <Typography.Text strong>{course.identity.name}</Typography.Text>
                <Typography.Text type="secondary">{course.identity.code}</Typography.Text>
              </div>
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
                    if (key === 'edit') onEdit(course);
                    else onRequestDelete(course);
                  }
                }}
              >
                <Button
                  type="text"
                  icon={<MoreOutlined />}
                  aria-label={`${course.identity.name}操作`}
                  onClick={(event) => event.stopPropagation()}
                />
              </Dropdown>
            </div>
            <div className="course-card-grid">
              <div className="course-card-field">
                <span>成绩</span>
                <strong>{gradeText(course)}</strong>
              </div>
              <div className="course-card-field">
                <span>学分</span>
                <strong>{formatDecimal(course.achievement.credit, 1)}</strong>
              </div>
              <div className="course-card-field">
                <span>绩点</span>
                <strong>{gradePointText(course, rules)}</strong>
              </div>
              <div className="course-card-field course-card-field-switch">
                <span>保研课程</span>
                <Switch
                  size="small"
                  checked={recommendationValue(row)}
                  checkedChildren="是"
                  unCheckedChildren="否"
                  aria-label={`${course.identity.name}保研课程`}
                  onClick={(_, event) => event.stopPropagation()}
                  onChange={(checked) => void onRecommendationChange(course, checked)}
                />
              </div>
            </div>
            {excluded && row.evaluation && (
              <div className="course-card-reason">
                {row.evaluation.exclusionMessages.join('；')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
