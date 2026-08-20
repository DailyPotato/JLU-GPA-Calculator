import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Radio,
  Select,
  Space,
  Table,
  Typography,
  Upload
} from 'antd';
import type { UploadProps } from 'antd';
import { useMemo, useState } from 'react';
import { mergeCourses } from '../../application/merge-courses';
import type { Course } from '../../domain/course/course.types';
import type {
  ImportMergeMode,
  ImportPreview,
  MergeResult
} from '../../infrastructure/importers/import.types';

interface Props {
  open: boolean;
  existingCourses: Course[];
  onCancel: () => void;
  onCommit: (courses: Course[], mode: ImportMergeMode) => Promise<MergeResult>;
}

export function ImportDrawer({ open, existingCourses, onCancel, onCommit }: Props) {
  const [file, setFile] = useState<File>();
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>();
  const [preview, setPreview] = useState<ImportPreview>();
  const [mode, setMode] = useState<ImportMergeMode>('append');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const parse = async (nextFile: File, sheet?: string) => {
    setBusy(true);
    setError(undefined);
    try {
      const importer = await import('../../infrastructure/importers/sheetjs-importer');
      const nextPreview = await importer.parseSpreadsheetFile(nextFile, sheet);
      setPreview(nextPreview);
      setSheetNames(nextPreview.sheetNames);
      setSelectedSheet(nextPreview.selectedSheetName);
    } catch (reason) {
      if (
        reason instanceof Error &&
        reason.name === 'SheetSelectionRequiredError' &&
        'sheetNames' in reason &&
        Array.isArray(reason.sheetNames)
      ) {
        setSheetNames(reason.sheetNames);
        setSelectedSheet(reason.sheetNames[0]);
        setPreview(undefined);
      } else {
        setError(reason instanceof Error ? reason.message : '无法解析成绩表');
        setPreview(undefined);
      }
    } finally {
      setBusy(false);
    }
  };

  const beforeUpload: UploadProps['beforeUpload'] = (nextFile) => {
    setFile(nextFile);
    void parse(nextFile);
    return Upload.LIST_IGNORE;
  };

  const estimate = useMemo(
    () => (preview ? mergeCourses(existingCourses, preview.courses, mode) : undefined),
    [existingCourses, mode, preview]
  );

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await onCommit(preview.courses, mode);
      onCancel();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '导入保存失败，原课程未改变');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      title="导入成绩表"
      size={720}
      className="functional-drawer import-drawer"
      onClose={onCancel}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            disabled={!preview || preview.importableCount === 0}
            danger={mode === 'replace' && existingCourses.length > 0}
            loading={busy}
            onClick={() => void confirm()}
          >
            {mode === 'replace' && existingCourses.length ? '确认覆盖' : '确认导入'}
          </Button>
        </Space>
      }
    >
      <Space orientation="vertical" size="middle" className="full-width">
        <Upload.Dragger
          accept=".xls,.xlsx,.csv"
          maxCount={1}
          beforeUpload={beforeUpload}
          showUploadList={false}
          disabled={busy}
        >
          <p className="upload-symbol" aria-hidden="true">
            ⇧
          </p>
          <p className="ant-upload-text">点击或拖入成绩表</p>
          <p className="ant-upload-hint">选择后先预览，确认前不会修改已保存课程</p>
        </Upload.Dragger>
        {file && <Typography.Text type="secondary">当前文件：{file.name}</Typography.Text>}
        {sheetNames.length > 1 && (
          <Space wrap>
            <Typography.Text strong>选择工作表：</Typography.Text>
            <Select
              value={selectedSheet}
              style={{ minWidth: 220 }}
              options={sheetNames.map((name) => ({ label: name, value: name }))}
              onChange={(name) => {
                setSelectedSheet(name);
                if (file) void parse(file, name);
              }}
            />
          </Space>
        )}
        {error && <Alert type="error" showIcon message={error} />}
        {preview && (
          <>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="工作表">{preview.selectedSheetName}</Descriptions.Item>
              <Descriptions.Item label="数据行">{preview.totalRows}</Descriptions.Item>
              <Descriptions.Item label="可导入">{preview.importableCount}</Descriptions.Item>
              <Descriptions.Item label="问题">{preview.errorCount}</Descriptions.Item>
              <Descriptions.Item label="警告">{preview.warningCount}</Descriptions.Item>
              <Descriptions.Item label="表格类型">
                {preview.source === 'jlu-sheet' ? '吉林大学常见格式' : '通用格式'}
              </Descriptions.Item>
            </Descriptions>
            {existingCourses.length > 0 && (
              <div>
                <Typography.Text strong>合并方式</Typography.Text>
                <Radio.Group
                  className="import-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as ImportMergeMode)}
                  options={[
                    {
                      label: `追加表格课程（保留现有 ${existingCourses.length} 门）`,
                      value: 'append'
                    },
                    {
                      label: `覆盖现有课程（删除现有 ${existingCourses.length} 门）`,
                      value: 'replace'
                    }
                  ]}
                />
              </div>
            )}
            {estimate && (
              <Alert
                type={mode === 'replace' ? 'warning' : 'success'}
                showIcon
                message={`操作后预计 ${estimate.courses.length} 门课程；新增 ${estimate.addedCount} 门；跳过完全重复 ${estimate.exactDuplicateCount} 门${estimate.replacedCount ? `；将替换 ${estimate.replacedCount} 门` : ''}`}
              />
            )}
            {preview.issues.length > 0 && (
              <Table
                size="small"
                pagination={{ pageSize: 5 }}
                rowKey={(issue, index) =>
                  `${issue.sheetName}-${issue.rowNumber ?? 'header'}-${index}`
                }
                dataSource={preview.issues}
                columns={[
                  {
                    title: '位置',
                    render: (_, issue) =>
                      issue.rowNumber
                        ? `${issue.sheetName} 第 ${issue.rowNumber} 行`
                        : `${issue.sheetName} 表头`
                  },
                  {
                    title: '级别',
                    dataIndex: 'severity',
                    render: (value) => (value === 'error' ? '错误' : '警告')
                  },
                  { title: '说明', dataIndex: 'message' },
                  { title: '建议', dataIndex: 'suggestion' }
                ]}
              />
            )}
          </>
        )}
      </Space>
    </Drawer>
  );
}
