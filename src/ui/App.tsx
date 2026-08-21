import { App as AntApp, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Course, ResultKind } from '../domain/course/course.types';
import { exportAdaptedCourseWorkbook } from '../infrastructure/exporters/course-workbook-exporter';
import { exportResultPdf, exportResultPng } from '../infrastructure/exporters/result-exporter';
import { downloadFilterConfig, parseFilterConfigFile } from '../infrastructure/filter-config';
import { AboutDialog } from './components/AboutDialog';
import { AppShell } from './components/AppShell';
import { CourseDrawer } from './components/CourseDrawer';
import { CourseWorkspace } from './components/CourseWorkspace';
import { ExportDrawer } from './components/ExportDrawer';
import { ImportDrawer } from './components/ImportDialog';
import { ResultExportCard } from './components/ResultExportCard';
import {
  ResultExclusionDrawer,
  type ExclusionRuleUpdates
} from './components/ResultExclusionDrawer';
import { RulesDrawer } from './components/SettingsDialog';
import { Sidebar, type PanelKind } from './components/Sidebar';
import { AppProvider, useAppState } from './state/app-context';

function Workbench() {
  const app = AntApp.useApp();
  const {
    courses,
    rules,
    ready,
    hasCalculated,
    selectedResultKind,
    persistenceError,
    results,
    startCalculation,
    selectResultKind,
    saveCourse,
    deleteCourse,
    clearCourses,
    importCourses,
    saveRules
  } = useAppState();
  const [activePanel, setActivePanel] = useState<PanelKind>();
  const [importOpen, setImportOpen] = useState(false);
  const [exclusionKind, setExclusionKind] = useState<ResultKind>();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course>();
  const [exporting, setExporting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (persistenceError) app.message.error(persistenceError);
  }, [app.message, persistenceError]);

  const resultByKind = useMemo(
    () => ({
      'recommendation-gpa': results.recommendationGpa,
      'weighted-average': results.weightedAverage,
      'arithmetic-average': results.arithmeticAverage
    }),
    [results]
  );

  const selectedResult = selectedResultKind ? resultByKind[selectedResultKind] : undefined;

  const edit = (course?: Course) => {
    setActivePanel(undefined);
    setImportOpen(false);
    setEditingCourse(course);
    setEditorOpen(true);
  };

  const exportResult = async (format: 'png' | 'pdf' | 'xlsx') => {
    if (format !== 'xlsx' && !exportRef.current) return;
    setExporting(true);
    setGeneratedAt(new Date());
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    try {
      if (format === 'xlsx') {
        await exportAdaptedCourseWorkbook(courses, [
          results.recommendationGpa,
          results.weightedAverage,
          results.arithmeticAverage
        ]);
      } else if (format === 'png') await exportResultPng(exportRef.current!);
      else await exportResultPdf(exportRef.current!);
      app.message.success(format === 'xlsx' ? '已导出适配表格' : `已导出 ${format.toUpperCase()}`);
    } catch (error) {
      app.message.error(error instanceof Error ? error.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const recommendationIncluded = editingCourse
    ? editingCourse.control.recommendationOverride === 'include'
      ? true
      : editingCourse.control.recommendationOverride === 'exclude'
        ? false
        : (results.recommendationGpa.evaluations.find(
            (evaluation) => evaluation.courseId === editingCourse.id
          )?.included ?? true)
    : true;

  const setRecommendation = async (course: Course, included: boolean) => {
    try {
      await saveCourse({
        ...course,
        control: {
          ...course.control,
          recommendationOverride: included ? 'include' : 'exclude'
        },
        audit: { ...course.audit, updatedAt: new Date().toISOString() }
      });
    } catch {
      app.message.error('保研课程设置保存失败');
    }
  };

  const confirmClearCourses = () => {
    app.modal.confirm({
      title: '清空全部课程？',
      content: `将删除当前保存的 ${courses.length} 门课程，并重置全部计算结果。此操作无法撤销。`,
      okText: '确认清空',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await clearCourses();
          setActivePanel(undefined);
          setImportOpen(false);
          setEditorOpen(false);
          setEditingCourse(undefined);
          setWorkspaceVersion((version) => version + 1);
          app.message.success('课程和计算结果已清空');
        } catch (error) {
          app.message.error(error instanceof Error ? error.message : '清空课程失败');
          throw error;
        }
      }
    });
  };

  return (
    <AppShell
      sidebar={
        <Sidebar
          activePanel={activePanel}
          activeExclusionKind={exclusionKind}
          selectedResultKind={selectedResultKind}
          hasCalculated={hasCalculated}
          courseCount={courses.length}
          results={results}
          exclusions={rules.exclusions}
          onCourses={() => {
            setActivePanel(undefined);
            setImportOpen(false);
            setExclusionKind(undefined);
            selectResultKind(undefined);
          }}
          onPanel={(panel) => {
            setExclusionKind(undefined);
            setImportOpen(false);
            setActivePanel(panel);
          }}
          onCalculate={startCalculation}
          onResult={(kind: ResultKind) => {
            setActivePanel(undefined);
            setImportOpen(false);
            setExclusionKind(undefined);
            selectResultKind(kind);
          }}
          onExclusionRules={(kind) => {
            setActivePanel(undefined);
            setImportOpen(false);
            setExclusionKind(kind);
          }}
          onExportFilterConfig={() => {
            try {
              downloadFilterConfig(rules.exclusions);
              app.message.success('过滤配置已导出');
            } catch (error) {
              app.message.error(error instanceof Error ? error.message : '过滤配置导出失败');
            }
          }}
          onImportFilterConfig={async (file) => {
            try {
              const exclusions = await parseFilterConfigFile(file);
              await saveRules({ ...rules, exclusions });
              app.message.success('过滤配置已导入并应用');
            } catch (error) {
              app.message.error(error instanceof Error ? error.message : '过滤配置导入失败');
            }
          }}
          onAbout={() => setAboutOpen(true)}
        />
      }
    >
      <CourseWorkspace
        key={workspaceVersion}
        courses={courses}
        rules={rules}
        ready={ready}
        selectedResultKind={selectedResultKind}
        selectedResult={selectedResult}
        recommendationResult={results.recommendationGpa}
        onAdd={() => edit()}
        onClear={confirmClearCourses}
        onEdit={edit}
        onDelete={async (course) => {
          try {
            await deleteCourse(course.id);
            app.message.success('课程已删除');
          } catch {
            app.message.error('课程删除失败');
          }
        }}
        onRecommendationChange={setRecommendation}
      />

      {importOpen && (
        <ImportDrawer
          open
          existingCourses={courses}
          onCancel={() => setImportOpen(false)}
          onCommit={async (incoming, mode) => {
            const merged = await importCourses(incoming, mode);
            app.message.success(
              `已导入，当前共 ${merged.courses.length} 门课程${merged.restoredExclusionCount ? `，恢复 ${merged.restoredExclusionCount} 门排除状态` : ''}`
            );
            return merged;
          }}
        />
      )}
      {activePanel === 'rules' && (
        <RulesDrawer
          open
          rules={rules}
          onCancel={() => setActivePanel(undefined)}
          onSave={async (nextRules) => {
            await saveRules(nextRules);
            app.message.success('计算规则已保存');
          }}
        />
      )}
      {activePanel === 'export' && (
        <ExportDrawer
          open
          results={results}
          calculated={hasCalculated}
          courseCount={courses.length}
          exporting={exporting}
          onClose={() => setActivePanel(undefined)}
          onExport={exportResult}
        />
      )}
      {exclusionKind && (
        <ResultExclusionDrawer
          key={exclusionKind}
          open
          kind={exclusionKind}
          rule={rules.exclusions[exclusionKind]}
          onClose={() => setExclusionKind(undefined)}
          onSave={async (updates: ExclusionRuleUpdates) => {
            await saveRules({
              ...rules,
              exclusions: { ...rules.exclusions, ...updates }
            });
            const targets = Object.keys(updates) as ResultKind[];
            app.message.success(targets.length > 1 ? '排除规则已保存并同步' : '排除规则已保存');
          }}
        />
      )}
      <CourseDrawer
        open={editorOpen}
        course={editingCourse}
        recommendationIncluded={recommendationIncluded}
        onClose={() => {
          setEditorOpen(false);
          setEditingCourse(undefined);
        }}
        onImport={() => {
          setEditorOpen(false);
          setEditingCourse(undefined);
          setImportOpen(true);
        }}
        onSave={saveCourse}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <div className="export-host" aria-hidden="true">
        <ResultExportCard
          ref={exportRef}
          results={results}
          rules={rules}
          generatedAt={generatedAt}
        />
      </div>
    </AppShell>
  );
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#8F2C3E',
          colorText: '#1D232B',
          colorTextSecondary: '#707986',
          colorBorder: '#DFE3E8',
          borderRadius: 5,
          fontFamily: '"Microsoft YaHei", "Segoe UI", system-ui, sans-serif'
        },
        components: {
          Button: { controlHeight: 36 },
          Table: { headerBg: '#F5F6F7', headerColor: '#4B5563', rowHoverBg: '#F8F9FA' }
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
