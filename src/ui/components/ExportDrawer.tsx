import {
  DownloadOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FilePdfOutlined
} from '@ant-design/icons';
import { Button, Drawer, Space, Typography } from 'antd';
import { formatDecimal } from '../../domain/calculation/format-result';
import type { AllResults } from '../state/app-context';

interface Props {
  open: boolean;
  results: AllResults;
  calculated: boolean;
  courseCount: number;
  exporting: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'pdf' | 'xlsx') => Promise<void>;
}

function value(result: AllResults[keyof AllResults], calculated: boolean): string {
  if (!calculated) return '尚未计算';
  return result.status === 'success' && result.value !== undefined
    ? formatDecimal(result.value, 1)
    : '无可计算课程';
}

export function ExportDrawer({
  open,
  results,
  calculated,
  courseCount,
  exporting,
  onClose,
  onExport
}: Props) {
  const items = [
    { label: '保研 GPA', result: results.recommendationGpa },
    { label: '加权平均分', result: results.weightedAverage },
    { label: '算术平均分', result: results.arithmeticAverage }
  ];

  return (
    <Drawer
      open={open}
      title="结果导出"
      size={520}
      className="functional-drawer export-drawer"
      onClose={onClose}
      destroyOnHidden
    >
      <div className="export-preview">
        <div className="export-preview-heading">
          <DownloadOutlined />
          <div>
            <Typography.Title level={3}>成绩核算结果</Typography.Title>
            <Typography.Text type="secondary">导出数值统一保留一位小数</Typography.Text>
          </div>
        </div>
        <div className="export-preview-results">
          {items.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{value(item.result, calculated)}</strong>
              {calculated && <small>{item.result.courseCount} 门课程</small>}
            </div>
          ))}
        </div>
      </div>
      <section className="adapted-export-card" aria-labelledby="adapted-export-title">
        <span className="adapted-export-icon" aria-hidden="true">
          <FileExcelOutlined />
        </span>
        <div className="adapted-export-copy">
          <Typography.Title id="adapted-export-title" level={4}>
            课程适配表格
          </Typography.Title>
          <Typography.Text type="secondary">
            导出当前课程；任一计算中的手动或规则排除会写入“是否排除”列，并可再次导入恢复。
          </Typography.Text>
        </div>
        <Button
          icon={<FileExcelOutlined />}
          disabled={courseCount === 0}
          loading={exporting}
          onClick={() => void onExport('xlsx')}
        >
          导出适配表格
        </Button>
      </section>
      <Space orientation="vertical" className="export-actions">
        <Button
          block
          size="large"
          icon={<FileImageOutlined />}
          disabled={!calculated}
          loading={exporting}
          onClick={() => void onExport('png')}
        >
          导出 PNG 图片
        </Button>
        <Button
          block
          size="large"
          icon={<FilePdfOutlined />}
          disabled={!calculated}
          loading={exporting}
          onClick={() => void onExport('pdf')}
        >
          导出 PDF 文档
        </Button>
      </Space>
    </Drawer>
  );
}
