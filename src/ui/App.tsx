import {
  Alert,
  App as AntApp,
  Button,
  ConfigProvider,
  Empty,
  Layout,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  theme
} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useRef, useState } from 'react';
import type { Course, ResultKind } from '../domain/course/course.types';
import { exportResultPdf, exportResultPng } from '../infrastructure/exporters/result-exporter';
import { CourseEditor } from './components/CourseEditor';
import { CourseTable } from './components/CourseTable';
import { ImportDialog } from './components/ImportDialog';
import { ResultCard } from './components/ResultCard';
import { ResultExportCard } from './components/ResultExportCard';
import { SettingsDialog } from './components/SettingsDialog';
import { AppProvider, useAppState } from './state/app-context';

function gradeText(course: Course): string {
  const grade = course.achievement.grade;
  return grade.kind === 'percentage' ? String(grade.raw) : grade.raw;
}

function Workbench() {
  const app = AntApp.useApp();
  const {
    courses,
    rules,
    ready,
    hasCalculated,
    expandedKind,
    persistenceError,
    results,
    startCalculation,
    toggleExpanded,
    saveCourse,
    deleteCourse,
    importCourses,
    saveRules
  } = useAppState();
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course>();
  const [exporting, setExporting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const exportRef = useRef<HTMLDivElement>(null);

  const resultByKind = useMemo(
    () => ({
      'recommendation-gpa': results.recommendationGpa,
      'weighted-average': results.weightedAverage,
      'arithmetic-average': results.arithmeticAverage
    }),
    [results]
  );

  const edit = (course?: Course) => {
    setEditingCourse(course);
    setEditorOpen(true);
  };

  const exportResult = async (format: 'png' | 'pdf') => {
    if (!exportRef.current) return;
    setExporting(true);
    setGeneratedAt(new Date());
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    try {
      if (format === 'png') await exportResultPng(exportRef.current);
      else await exportResultPdf(exportRef.current);
      app.message.success(`已导出 ${format.toUpperCase()}`);
    } catch (error) {
      app.message.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<Course> = [
    { title: '课程号', dataIndex: ['identity', 'code'], width: 135 },
    { title: '课程名', dataIndex: ['identity', 'name'], width: 200 },
    { title: '成绩', width: 90, render: (_, course) => gradeText(course) },
    { title: '学分', dataIndex: ['achievement', 'credit'], width: 75 },
    {
      title: '参与均分',
      width: 100,
      render: (_, course) => (
        <Switch
          size="small"
          checked={course.control.userIncluded}
          checkedChildren="参与"
          unCheckedChildren="排除"
          onChange={(checked) =>
            saveCourse({
              ...course,
              control: { ...course.control, userIncluded: checked },
              audit: { ...course.audit, updatedAt: new Date().toISOString() }
            }).catch(() => app.message.error('保存失败'))
          }
        />
      )
    },
    {
      title: '保研科目',
      width: 110,
      render: (_, course) => {
        return (
          <Select
            size="small"
            value={course.control.recommendationOverride}
            style={{ width: 104 }}
            options={[
              { label: '自动判断', value: 'auto' },
              { label: '强制纳入', value: 'include' },
              { label: '强制排除', value: 'exclude' }
            ]}
            onChange={(recommendationOverride: Course['control']['recommendationOverride']) =>
              saveCourse({
                ...course,
                control: { ...course.control, recommendationOverride },
                audit: { ...course.audit, updatedAt: new Date().toISOString() }
              }).catch(() => app.message.error('保存失败'))
            }
          />
        );
      }
    },
    { title: '学期', dataIndex: ['term', 'rawText'], width: 130, render: (value) => value || '—' },
    {
      title: '操作',
      fixed: 'right',
      width: 130,
      render: (_, course) => (
        <Space size="small">
          <Button type="link" onClick={() => edit(course)}>
            编辑
          </Button>
          <Popconfirm
            title="删除这门课程？"
            description="删除后将立即从本地保存和计算中移除。"
            okText="删除"
            cancelText="取消"
            onConfirm={() => deleteCourse(course.id).catch(() => app.message.error('删除失败'))}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (!ready) {
    return (
      <div className="loading-screen">
        <Spin size="large" />
        <Typography.Text>正在读取本地课程数据…</Typography.Text>
      </div>
    );
  }

  const invalidCount = courses.filter((course) => !course.record.isValid).length;
  const recommendationExcluded = results.recommendationGpa.excludedCourseIds.length;

  return (
    <Layout className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            J
          </div>
          <div>
            <Typography.Title level={1}>吉林大学本科生绩点计算器</Typography.Title>
            <Typography.Text>JLU GPA Calculator · 本地优先</Typography.Text>
          </div>
        </div>
        <Space wrap>
          <Button onClick={() => setSettingsOpen(true)}>计算规则</Button>
          <Tag color={rules.recommendation.verificationStatus === 'verified' ? 'green' : 'orange'}>
            {rules.recommendation.verificationStatus === 'verified' ? '规则已核验' : '规则未核验'}
          </Tag>
        </Space>
      </header>

      <Layout.Content className="content">
        <Alert
          type="warning"
          showIcon
          message="非吉林大学官方系统"
          description={`当前使用“${rules.name}” ${rules.version}。保研范围和绩点映射尚需按适用学院、专业和年份核验，结果仅供个人核对。`}
        />
        <Alert
          className="privacy-alert"
          type="success"
          showIcon
          message="成绩文件仅在浏览器本地解析并保存在本机 IndexedDB，不会上传服务器。清理站点数据或更换设备可能导致数据丢失。"
        />
        {persistenceError && (
          <Alert
            className="privacy-alert"
            type="error"
            showIcon
            message="本地保存出现问题"
            description={persistenceError}
          />
        )}

        <section className="workspace-card input-section">
          <div className="section-heading">
            <div>
              <Typography.Title level={2}>课程数据</Typography.Title>
              <Typography.Text type="secondary">
                导入成绩表或手动录入；只有课程号相同才按重复课程处理。
              </Typography.Text>
            </div>
            <Space wrap>
              <Button type="primary" size="large" onClick={() => setImportOpen(true)}>
                导入成绩表
              </Button>
              <Button size="large" onClick={() => edit()}>
                手动添加课程
              </Button>
            </Space>
          </div>

          <div className="metric-strip">
            <div>
              <span>当前课程</span>
              <strong>{courses.length}</strong>
            </div>
            <div>
              <span>无效记录</span>
              <strong>{invalidCount}</strong>
            </div>
            <div>
              <span>保研 GPA 已排除</span>
              <strong>{recommendationExcluded}</strong>
            </div>
            <Button
              type="primary"
              size="large"
              disabled={courses.length === 0}
              onClick={startCalculation}
            >
              开始计算
            </Button>
          </div>

          {courses.length ? (
            <Table<Course>
              rowKey="id"
              columns={columns}
              dataSource={courses}
              size="middle"
              scroll={{ x: 970 }}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
            />
          ) : (
            <Empty
              description="还没有课程，请导入成绩表或手动添加"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </section>

        <section className="results-section">
          <div className="section-heading">
            <div>
              <Typography.Title level={2}>计算结果</Typography.Title>
              <Typography.Text type="secondary">
                首次点击“开始计算”后显示；之后编辑课程或规则会自动更新。
              </Typography.Text>
            </div>
            <Space wrap>
              <Button
                disabled={!hasCalculated}
                loading={exporting}
                onClick={() => void exportResult('png')}
              >
                导出 PNG
              </Button>
              <Button
                disabled={!hasCalculated}
                loading={exporting}
                onClick={() => void exportResult('pdf')}
              >
                导出 PDF
              </Button>
            </Space>
          </div>
          <div className="result-grid">
            {(Object.keys(resultByKind) as ResultKind[]).map((kind) => (
              <ResultCard
                key={kind}
                result={resultByKind[kind]}
                active={expandedKind === kind}
                calculated={hasCalculated}
                onClick={() => toggleExpanded(kind)}
              />
            ))}
          </div>
          {hasCalculated && expandedKind && (
            <CourseTable
              kind={expandedKind}
              courses={courses}
              result={resultByKind[expandedKind]}
              onEdit={edit}
            />
          )}
        </section>
      </Layout.Content>

      <footer className="footer">
        <Typography.Text type="secondary">
          本项目不收集成绩数据 · 数据仅保存在当前浏览器 · 结果保留四位小数
        </Typography.Text>
      </footer>

      {importOpen && (
        <ImportDialog
          open
          existingCourses={courses}
          onCancel={() => setImportOpen(false)}
          onCommit={importCourses}
        />
      )}
      <CourseEditor
        open={editorOpen}
        course={editingCourse}
        onCancel={() => setEditorOpen(false)}
        onSave={async (course) => {
          await saveCourse(course);
          setEditorOpen(false);
          app.message.success(editingCourse ? '课程已更新' : '课程已添加');
        }}
      />
      {settingsOpen && (
        <SettingsDialog
          open
          rules={rules}
          onCancel={() => setSettingsOpen(false)}
          onSave={saveRules}
        />
      )}
      <div className="export-host" aria-hidden="true">
        <ResultExportCard
          ref={exportRef}
          results={results}
          rules={rules}
          generatedAt={generatedAt}
        />
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0f766e',
          borderRadius: 10,
          fontFamily: '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif'
        }
      }}
    >
      <AntApp>
        <AppProvider>
          <Workbench />
        </AppProvider>
      </AntApp>
    </ConfigProvider>
  );
}
