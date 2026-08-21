import { App } from 'antd';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CourseDrawer } from '../../src/ui/components/CourseDrawer';
import { makeCourse } from '../unit/test-course';

describe('CourseDrawer', () => {
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
