import { DownloadOutlined, FileImageOutlined, FilePdfOutlined } from '@ant-design/icons';
import { Button, Drawer, Space, Typography } from 'antd';
import type { AllResults } from '../state/app-context';

interface Props {
  open: boolean;
  results: AllResults;
  calculated: boolean;
  exporting: boolean;
  onClose: () => void;
  onExport: (format: 'png' | 'pdf') => Promise<void>;
}

function value(result: AllResults[keyof AllResults], calculated: boolean): string {
  if (!calculated) return '尚未计算';
  return result.status === 'success' ? (result.formattedValue ?? '—') : '无可计算课程';
}

export function ExportDrawer({ open, results, calculated, exporting, onClose, onExport }: Props) {
  const items = [
    { label: '保研 GPA', result: results.recommendationGpa },
    { label: '加权平均分', result: results.weightedAverage },
    { label: '不加权平均分', result: results.arithmeticAverage }
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
            <Typography.Text type="secondary">所有数值统一保留四位小数</Typography.Text>
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
