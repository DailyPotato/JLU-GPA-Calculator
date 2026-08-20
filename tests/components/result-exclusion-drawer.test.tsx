import { App } from 'antd';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultExclusionDrawer } from '../../src/ui/components/ResultExclusionDrawer';

describe('ResultExclusionDrawer', () => {
  it('saves an entirely empty rule safely', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <App>
        <ResultExclusionDrawer open kind="recommendation-gpa" onClose={onClose} onSave={onSave} />
      </App>
    );

    fireEvent.click(screen.getByRole('button', { name: '保存规则' }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        'recommendation-gpa': { courseType: 'none', keywords: [], courseCodes: [] }
      })
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('adds multiple entries and synchronizes the draft to one target calculation', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <App>
        <ResultExclusionDrawer
          open
          kind="weighted-average"
          rule={{
            courseType: 'none',
            keywords: ['英语', '体育'],
            courseCodes: ['abc-001']
          }}
          onClose={vi.fn()}
          onSave={onSave}
        />
      </App>
    );

    fireEvent.click(screen.getByText('选修', { exact: true }));
    expect(screen.getByText('英语')).toBeInTheDocument();
    expect(screen.getByText('体育')).toBeInTheDocument();
    expect(screen.getByText('ABC-001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /同步应用于算术平均分计算/ }));

    const expected = {
      courseType: 'elective' as const,
      keywords: ['英语', '体育'],
      courseCodes: ['ABC-001']
    };
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        'weighted-average': expected,
        'arithmetic-average': expected
      })
    );
  });
});
