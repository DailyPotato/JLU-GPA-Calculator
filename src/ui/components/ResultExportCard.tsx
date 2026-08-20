import { forwardRef } from 'react';
import type { AllResults } from '../state/app-context';
import type { AppRuleSet } from '../../domain/rules/rule-set.types';

interface Props {
  results: AllResults;
  rules: AppRuleSet;
  generatedAt: Date;
}

function value(result: AllResults[keyof AllResults]): string {
  return result.status === 'success' ? (result.formattedValue ?? '—') : '无可计算课程';
}

export const ResultExportCard = forwardRef<HTMLDivElement, Props>(function ResultExportCard(
  { results, rules, generatedAt },
  ref
) {
  const levelText = Object.entries(rules.gradePoint.levelScores)
    .map(([level, score]) => `${level} ${score}`)
    .join('，');
  return (
    <div ref={ref} className="export-card">
      <div className="export-brand">JLU GPA CALCULATOR</div>
      <h1>吉林大学本科生成绩核算结果</h1>
      <p className="export-time">生成时间：{generatedAt.toLocaleString('zh-CN')}</p>
      <div className="export-results">
        <div>
          <span>保研 GPA</span>
          <strong>{value(results.recommendationGpa)}</strong>
          <small>{results.recommendationGpa.courseCount} 门课程</small>
        </div>
        <div>
          <span>加权平均分</span>
          <strong>{value(results.weightedAverage)}</strong>
          <small>{results.weightedAverage.courseCount} 门课程</small>
        </div>
        <div>
          <span>不加权平均分</span>
          <strong>{value(results.arithmeticAverage)}</strong>
          <small>{results.arithmeticAverage.courseCount} 门课程</small>
        </div>
      </div>
      <div className="export-notes">
        <p>
          <b>规则：</b>
          {rules.name} / {rules.version}（
          {rules.recommendation.verificationStatus === 'verified' ? '已核验' : '未核验'}）
        </p>
        <p>
          <b>五级制折算：</b>
          {levelText}
        </p>
        <p>非吉林大学官方系统，结果仅供个人核算参考。成绩数据未上传服务器。</p>
      </div>
    </div>
  );
});
