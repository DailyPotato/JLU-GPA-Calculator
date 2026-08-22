import { DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons';
import { App, Button, Dropdown, Switch, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import type { Course } from '../../domain/course/course.types';
import { formatDecimal } from '../../domain/calculation/format-result';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';
import { CourseCardList } from './CourseCardList';
import {
  gradePointText,
  gradeText,
  recommendationValue,
  type CourseLedgerRow
} from './course-ledger-utils';

export type { CourseLedgerRow } from './course-ledger-utils';

const mobileQuery = '(max-width: 640px)';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(mobileQuery).matches);
  useEffect(() => {
    const media = window.matchMedia(mobileQuery);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

interface Props {
  rows: CourseLedgerRow[];
  rules: AppRuleSet;
  loading?: boolean;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => Promise<void>;
  onRecommendationChange: (course: Course, included: boolean) => Promise<void>;
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
  const isMobile = useIsMobile();

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
      render: (_, row) => (
        <span className="numeric-cell">{formatDecimal(row.course.achievement.credit, 1)}</span>
      )
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

  if (isMobile && !loading) {
    return (
      <CourseCardList
        rows={rows}
        rules={rules}
        onEdit={onEdit}
        onRequestDelete={confirmDelete}
        onRecommendationChange={onRecommendationChange}
      />
    );
  }

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
