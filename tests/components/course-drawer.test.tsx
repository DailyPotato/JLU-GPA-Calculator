import { App } from 'antd';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CourseDrawer } from '../../src/ui/components/CourseDrawer';
import { makeCourse } from '../unit/test-course';

describe('CourseDrawer', () => {
  it('uses a wider drawer and fixed course category and nature choices', () => {
    render(
      <App>
        <CourseDrawer
          open
          onClose={vi.fn()}
          onImport={vi.fn()}
          onSave={vi.fn().mockResolvedValue(undefined)}
        />
      </App>
    );

    expect(document.querySelector('.ant-drawer-content-wrapper')).toHaveStyle({ width: '620px' });

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^课程类别/ }));
    for (const category of ['通识教育课程', '学科基础课程', '专业教育课程', '跨学科拓展课程']) {
      expect(screen.getByRole('option', { name: category })).toBeInTheDocument();
    }

    fireEvent.mouseDown(screen.getByRole('combobox', { name: /^课程性质/ }));
    expect(screen.getByRole('option', { name: '必修课' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '选修课' })).toBeInTheDocument();
  });

  it('offers spreadsheet import as part of the add-course flow', () => {
    const onImport = vi.fn();

    render(
      <App>
        <CourseDrawer
          open
          onClose={vi.fn()}
          onImport={onImport}
          onSave={vi.fn().mockResolvedValue(undefined)}
        />
      </App>
    );

    expect(screen.getByText('从成绩表批量添加')).toBeInTheDocument();
    expect(screen.getByText(/支持 XLS、XLSX 和 CSV/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '导入成绩表' }));

    expect(onImport).toHaveBeenCalledOnce();
  });

  it('keeps the import entry out of the edit-course flow', () => {
    render(
      <App>
        <CourseDrawer
          open
          course={makeCourse('existing', 90)}
          recommendationIncluded
          onClose={vi.fn()}
          onImport={vi.fn()}
          onSave={vi.fn().mockResolvedValue(undefined)}
        />
      </App>
    );

    expect(screen.queryByText('从成绩表批量添加')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导入成绩表' })).not.toBeInTheDocument();
  });
});
