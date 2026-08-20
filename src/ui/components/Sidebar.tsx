import {
  BookOutlined,
  CalculatorOutlined,
  ExportOutlined,
  FileAddOutlined,
  InfoCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import type { ResultKind } from '../../domain/course/course.types';
import type { AllResults } from '../state/app-context';
import { ResultSummary } from './ResultSummary';

export type PanelKind = 'import' | 'rules' | 'export';

interface Props {
  activePanel?: PanelKind;
  selectedResultKind?: ResultKind;
  hasCalculated: boolean;
  courseCount: number;
  results: AllResults;
  onCourses: () => void;
  onPanel: (panel: PanelKind) => void;
  onCalculate: () => void;
  onResult: (kind: ResultKind) => void;
  onAbout: () => void;
}

const navItems = [
  { key: 'courses', label: '课程', icon: <BookOutlined /> },
  { key: 'import', label: '导入成绩', icon: <FileAddOutlined /> },
  { key: 'rules', label: '计算规则', icon: <SettingOutlined /> },
  { key: 'export', label: '结果导出', icon: <ExportOutlined /> }
] as const;

export function Sidebar({
  activePanel,
  selectedResultKind,
  hasCalculated,
  courseCount,
  results,
  onCourses,
  onPanel,
  onCalculate,
  onResult,
  onAbout
}: Props) {
  const resultItems = [
    results.recommendationGpa,
    results.weightedAverage,
    results.arithmeticAverage
  ];

  return (
    <aside className="app-sidebar" aria-label="功能栏">
      <div className="sidebar-brand" aria-label="JLU GPA">
        <span className="sidebar-brand-mark">J</span>
        <span className="sidebar-brand-name">JLU GPA</span>
      </div>

      <nav className="sidebar-nav" aria-label="主要功能">
        {navItems.map((item) => {
          const active = item.key === 'courses' ? !activePanel : activePanel === item.key;
          const action = item.key === 'courses' ? onCourses : () => onPanel(item.key);
          return (
            <Tooltip key={item.key} title={item.label} placement="right">
              <button
                type="button"
                className={`nav-item${active ? ' nav-item-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                onClick={action}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            </Tooltip>
          );
        })}
      </nav>

      <div className="sidebar-calculate">
        <Tooltip title="开始计算" placement="right">
          <Button
            type="primary"
            block
            icon={<CalculatorOutlined />}
            disabled={courseCount === 0}
            onClick={onCalculate}
          >
            <span className="calculate-label">开始计算</span>
          </Button>
        </Tooltip>
      </div>

      <section className="sidebar-results" aria-label="计算结果">
        <h2>计算结果</h2>
        {resultItems.map((result) => (
          <ResultSummary
            key={result.kind}
            result={result}
            active={selectedResultKind === result.kind}
            calculated={hasCalculated}
            onSelect={() => onResult(result.kind)}
          />
        ))}
      </section>

      <div className="sidebar-footer">
        <Tooltip title="关于" placement="right">
          <button type="button" className="nav-item" aria-label="关于" onClick={onAbout}>
            <span className="nav-icon">
              <InfoCircleOutlined />
            </span>
            <span className="nav-label">关于</span>
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
