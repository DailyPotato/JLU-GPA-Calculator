import {
  BookOutlined,
  CalculatorOutlined,
  DownloadOutlined,
  ExportOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  UploadOutlined
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useRef } from 'react';
import type { ResultKind } from '../../domain/course/course.types';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';
import type { AllResults } from '../state/app-context';
import { ResultSummary } from './ResultSummary';

export type PanelKind = 'rules' | 'export';

interface Props {
  activePanel?: PanelKind;
  activeExclusionKind?: ResultKind;
  selectedResultKind?: ResultKind;
  hasCalculated: boolean;
  courseCount: number;
  results: AllResults;
  exclusions: AppRuleSet['exclusions'];
  onCourses: () => void;
  onPanel: (panel: PanelKind) => void;
  onCalculate: () => void;
  onResult: (kind: ResultKind) => void;
  onExclusionRules: (kind: ResultKind) => void;
  onExportFilterConfig: () => void;
  onImportFilterConfig: (file: File) => Promise<void>;
  onAbout: () => void;
}

const navItems = [
  { key: 'courses', label: '课程', icon: <BookOutlined /> },
  { key: 'rules', label: '计算规则', icon: <SettingOutlined /> },
  { key: 'export', label: '结果导出', icon: <ExportOutlined /> }
] as const;

export function Sidebar({
  activePanel,
  activeExclusionKind,
  selectedResultKind,
  hasCalculated,
  courseCount,
  results,
  exclusions,
  onCourses,
  onPanel,
  onCalculate,
  onResult,
  onExclusionRules,
  onExportFilterConfig,
  onImportFilterConfig,
  onAbout
}: Props) {
  const filterConfigInputRef = useRef<HTMLInputElement>(null);
  const resultItems = [
    results.recommendationGpa,
    results.weightedAverage,
    results.arithmeticAverage
  ];

  return (
    <aside className="app-sidebar" aria-label="功能栏">
      <div className="sidebar-brand" aria-label="JLU GPA">
        <span className="sidebar-avatar-slot" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}headshot.jpg`} alt="" />
        </span>
        <span className="sidebar-brand-name">JLU GPA</span>
      </div>

      <nav className="sidebar-nav" aria-label="主要功能">
        {navItems.map((item) => {
          const active =
            item.key === 'courses'
              ? !activePanel && !activeExclusionKind
              : activePanel === item.key;
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
        {resultItems.map((result) => {
          const rule = exclusions[result.kind];
          const configured =
            rule.courseType !== 'none' || rule.keywords.length > 0 || rule.courseCodes.length > 0;
          return (
            <div
              key={result.kind}
              className={`result-module${selectedResultKind === result.kind ? ' result-module-result-active' : ''}${activeExclusionKind === result.kind ? ' result-module-rules-active' : ''}`}
            >
              <ResultSummary
                result={result}
                active={selectedResultKind === result.kind}
                calculated={hasCalculated}
                onSelect={() => onResult(result.kind)}
              />
              <Tooltip
                title={`${result.kind === 'recommendation-gpa' ? '保研 GPA' : result.kind === 'weighted-average' ? '加权平均分' : '算术平均分'}排除规则`}
                placement="right"
              >
                <button
                  type="button"
                  className="result-rule-button"
                  aria-label={`${result.kind === 'recommendation-gpa' ? '保研 GPA' : result.kind === 'weighted-average' ? '加权平均分' : '算术平均分'}排除规则`}
                  onClick={() => onExclusionRules(result.kind)}
                >
                  <FilterOutlined />
                  <span className="result-rule-label">排除规则</span>
                  {configured && <span className="result-rule-configured" aria-label="已配置" />}
                </button>
              </Tooltip>
            </div>
          );
        })}
        <div className="sidebar-filter-transfer" aria-label="过滤配置管理">
          <Tooltip title="导出过滤配置" placement="right">
            <button
              type="button"
              className="filter-transfer-button"
              aria-label="导出过滤配置"
              onClick={onExportFilterConfig}
            >
              <DownloadOutlined />
              <span className="filter-transfer-label">导出过滤配置</span>
            </button>
          </Tooltip>
          <Tooltip title="导入过滤配置" placement="right">
            <button
              type="button"
              className="filter-transfer-button"
              aria-label="导入过滤配置"
              onClick={() => filterConfigInputRef.current?.click()}
            >
              <UploadOutlined />
              <span className="filter-transfer-label">导入过滤配置</span>
            </button>
          </Tooltip>
          <input
            ref={filterConfigInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void onImportFilterConfig(file);
              event.currentTarget.value = '';
            }}
          />
        </div>
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
