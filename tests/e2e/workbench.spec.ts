import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

test('manual course workflow calculates, switches result views, exports and persists', async ({
  page
}) => {
  await page.goto('./');
  await expect(page.getByRole('complementary', { name: '功能栏' })).toBeVisible();
  await expect(page.locator('.sidebar-avatar-slot')).toHaveCount(1);
  await expect(page.locator('.sidebar-avatar-slot img')).toHaveAttribute('src', /headshot\.jpg$/);
  await expect(page.locator('.sidebar-brand-mark')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '课程清单' })).toBeVisible();
  await expect(page.getByRole('switch', { name: '显示排除项' })).toBeChecked();
  await expect(page.getByRole('button', { name: '导入成绩', exact: true })).toHaveCount(0);
  await expect(page.getByText('非吉林大学官方系统', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/规则未核验 · 数据仅存本机/)).toHaveCount(0);

  const summaries = page.locator('.result-summary');
  await expect(summaries).toHaveCount(3);
  await expect(summaries.nth(0)).toContainText('保研 GPA');
  await expect(summaries.nth(1)).toContainText('加权平均分');
  await expect(summaries.nth(2)).toContainText('算术平均分');
  await expect(page.getByRole('button', { name: /排除规则/ })).toHaveCount(3);

  await page
    .getByRole('button', { name: /添加课程/ })
    .first()
    .click();
  const addCourseDrawer = page.getByRole('dialog', { name: '添加课程' });
  await expect(addCourseDrawer).toBeVisible();
  expect(await addCourseDrawer.evaluate((element) => element.getBoundingClientRect().width)).toBe(
    620
  );
  await addCourseDrawer.getByRole('combobox', { name: /^课程类别/ }).click();
  await page.getByRole('option', { name: '专业教育课程' }).click();
  await addCourseDrawer.getByRole('combobox', { name: /^课程性质/ }).click();
  await page.getByRole('option', { name: '必修课' }).click();
  await page.getByLabel('课程号', { exact: true }).fill('TEST-001');
  await page.getByLabel('课程名', { exact: true }).fill('虚构测试课程');
  await page.getByLabel('百分制成绩', { exact: true }).fill('90');
  await page.getByLabel('学分', { exact: true }).fill('2');
  await expect(page.getByRole('switch', { name: /保研课程/ })).toBeChecked();
  await expect(page.getByText(/自动判断|强制纳入|强制排除/)).toHaveCount(0);
  await page.getByRole('button', { name: '保存课程' }).click();

  const row = page.getByRole('row', { name: /虚构测试课程 TEST-001/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText('90');
  await expect(row).toContainText('2');
  await expect(row).toContainText('4.0');
  await expect(row.getByRole('switch', { name: '虚构测试课程保研课程' })).toBeChecked();

  await page.getByRole('button', { name: /开始计算/ }).click();
  await expect(page.getByRole('button', { name: '保研 GPA 4.00', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '加权平均分 90.00', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '算术平均分 90.00', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '加权平均分 90.00', exact: true }).click();
  await expect(page.getByRole('heading', { name: '加权平均分课程' })).toBeVisible();
  await expect(page.getByText('显示排除项', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: '显示排除项' })).toBeChecked();

  await page.getByRole('button', { name: '结果导出', exact: true }).click();
  const exportDrawer = page.getByRole('dialog', { name: '结果导出' });
  await expect(exportDrawer).toBeVisible();
  await expect(exportDrawer.locator('.export-preview-results strong')).toHaveText([
    '4.0',
    '90.0',
    '90.0'
  ]);
  await expect(page.getByTestId('course-ledger')).toBeVisible();

  const workbookDownloadPromise = page.waitForEvent('download');
  await exportDrawer.getByRole('button', { name: '导出适配表格' }).click();
  expect((await workbookDownloadPromise).suggestedFilename()).toMatch(/\.xlsx$/);

  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PNG 图片' }).click();
  expect((await pngDownloadPromise).suggestedFilename()).toMatch(/\.png$/);

  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PDF 文档' }).click();
  expect((await pdfDownloadPromise).suggestedFilename()).toMatch(/\.pdf$/);

  await page.reload();
  await expect(page.getByText('虚构测试课程')).toBeVisible();
  await expect(page.locator('.result-summary')).toContainText([
    '保研 GPA尚未计算',
    '加权平均分尚未计算',
    '算术平均分尚未计算'
  ]);

  await page
    .getByRole('button', { name: /添加课程/ })
    .first()
    .click();
  await page.getByLabel('课程号', { exact: true }).fill('UNSAVED-001');
  await page
    .getByRole('dialog', { name: '添加课程' })
    .getByRole('button', { name: '关闭' })
    .click();
  await expect(page.locator('.ant-modal-confirm-title')).toHaveText('放弃未保存的修改？');
  await page.getByRole('button', { name: '放弃修改' }).click();
  await expect(page.getByRole('dialog', { name: '添加课程' })).toBeHidden();

  await page.getByRole('button', { name: /清空课程/ }).click();
  await expect(page.locator('.ant-modal-confirm-title')).toHaveText('清空全部课程？');
  await expect(page.getByText(/删除当前保存的 1 门课程，并重置全部计算结果/)).toBeVisible();
  await page.getByRole('button', { name: '确认清空' }).click();

  await expect(page.getByText('共 0 门课程')).toBeVisible();
  await expect(page.getByText('虚构测试课程')).toHaveCount(0);
  await expect(page.locator('.result-summary')).toContainText([
    '保研 GPA尚未计算',
    '加权平均分尚未计算',
    '算术平均分尚未计算'
  ]);
  await expect(page.getByRole('button', { name: /清空课程/ })).toBeDisabled();
});

test('configures independent result exclusions and synchronizes them to one result', async ({
  page
}) => {
  await page.goto('./');
  await page
    .getByRole('button', { name: /添加课程/ })
    .first()
    .click();
  const addDrawer = page.getByRole('dialog', { name: '添加课程' });
  await expect(addDrawer.getByText('从成绩表批量添加')).toBeVisible();
  await addDrawer.getByRole('button', { name: '导入成绩表' }).click();
  await expect(page.getByRole('dialog', { name: '导入成绩表' })).toBeVisible();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByText('点击或拖入成绩表').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: '排除规则测试.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      '课程号,课程名,总成绩,学分\nKEEP-001,保留课程,90,2\nDROP-001,自动排除课程,80,2',
      'utf8'
    )
  });
  await page.getByRole('button', { name: '确认导入' }).click();

  await page.getByRole('button', { name: '加权平均分排除规则', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: '加权平均分 · 排除规则' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(/所有条件均为空时，不会额外排除课程/)).toBeVisible();
  await expect(drawer.getByRole('button', { name: '同步应用于保研 GPA计算' })).toBeVisible();
  await expect(drawer.getByRole('button', { name: '同步应用于算术平均分计算' })).toBeVisible();

  const keywordInput = drawer.getByRole('combobox', { name: '关键词排除' });
  await keywordInput.fill('排除');
  await keywordInput.press('Enter');
  await keywordInput.fill('待删除');
  await keywordInput.press('Enter');
  const removableKeyword = drawer.locator('.ant-select-selection-item').filter({
    hasText: '待删除'
  });
  await removableKeyword.locator('.ant-select-selection-item-remove').click();

  const codeInput = drawer.getByRole('combobox', { name: '课程编号排除' });
  await codeInput.fill('ignore-999');
  await codeInput.press('Enter');
  await drawer.getByRole('button', { name: '同步应用于算术平均分计算' }).click();
  await expect(page.getByText('排除规则已保存并同步')).toBeVisible();
  await drawer.getByRole('button', { name: '取消' }).click();

  await page.getByRole('button', { name: /开始计算/ }).click();
  await expect(page.getByRole('button', { name: '保研 GPA 3.50', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '加权平均分 90.00', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '算术平均分 90.00', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '结果导出', exact: true }).click();
  const workbookDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出适配表格' }).click();
  const workbookDownload = await workbookDownloadPromise;
  const workbookPath = await workbookDownload.path();
  expect(workbookPath).not.toBeNull();
  const workbook = XLSX.read(await readFile(workbookPath!), { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[workbook.SheetNames[0]]
  );
  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ 课程号: 'KEEP-001', 是否排除: '否' }),
      expect.objectContaining({ 课程号: 'DROP-001', 是否排除: '是' })
    ])
  );

  await page
    .getByRole('dialog', { name: '结果导出' })
    .getByRole('button', { name: '关闭' })
    .click();
  const configDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出过滤配置' }).click();
  const configDownload = await configDownloadPromise;
  expect(configDownload.suggestedFilename()).toMatch(/过滤配置-.*\.json$/);
  const configPath = await configDownload.path();
  expect(configPath).not.toBeNull();
  const configText = await readFile(configPath!, 'utf8');
  const config = JSON.parse(configText) as {
    format: string;
    version: number;
    exclusions: Record<string, { keywords: string[] }>;
  };
  expect(config).toMatchObject({ format: 'jlu-gpa-filter-config', version: 1 });
  expect(config.exclusions['weighted-average'].keywords).toEqual(['排除']);

  const configChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '导入过滤配置' }).click();
  const configChooser = await configChooserPromise;
  await configChooser.setFiles({
    name: '过滤配置.json',
    mimeType: 'application/json',
    buffer: Buffer.from(configText, 'utf8')
  });
  await expect(page.getByText('过滤配置已导入并应用')).toBeVisible();
});

test('imports a synthetic CSV through the right-side preview drawer', async ({ page }) => {
  await page.goto('./');
  await page
    .getByRole('button', { name: /添加课程/ })
    .first()
    .click();
  const addDrawer = page.getByRole('dialog', { name: '添加课程' });
  await expect(addDrawer.getByText('从成绩表批量添加')).toBeVisible();
  await addDrawer.getByRole('button', { name: '导入成绩表' }).click();
  await expect(page.getByRole('dialog', { name: '导入成绩表' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '课程清单' })).toBeVisible();

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByText('点击或拖入成绩表').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: '虚构成绩.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('课程号,课程名,总成绩,学分,是否排除\nCSV-001,虚构导入课程,88,3,是', 'utf8')
  });

  await expect(page.getByText('可导入')).toBeVisible();
  await expect(page.getByText('虚构成绩.csv')).toBeVisible();
  await expect(page.getByText('检测到绩点计算器适配表格')).toBeVisible();
  await expect(
    page.getByText('确认导入后，将恢复 1 门课程的手动排除状态。', { exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: '确认导入' }).click();
  await expect(page.getByText('虚构导入课程')).toBeVisible();

  await page.getByRole('button', { name: /开始计算/ }).click();
  await expect(
    page.getByRole('button', { name: '加权平均分 无可计算课程', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: '加权平均分 无可计算课程', exact: true }).click();
  await expect(page.getByText('用户手动排除')).toBeVisible();
});

test('uses an icon rail and keeps horizontal scrolling inside the course table at 390px', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');

  const layout = await page.evaluate(() => {
    const sidebar = document.querySelector<HTMLElement>('.app-sidebar');
    const table = document.querySelector<HTMLElement>('.ant-table-content');
    return {
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      sidebarWidth: sidebar?.getBoundingClientRect().width,
      tableClientWidth: table?.clientWidth,
      tableScrollWidth: table?.scrollWidth
    };
  });

  expect(layout.bodyScrollWidth).toBe(layout.bodyClientWidth);
  expect(layout.sidebarWidth).toBe(64);
  expect(layout.tableScrollWidth).toBeGreaterThan(layout.tableClientWidth ?? 0);
  await expect(page.getByRole('button', { name: '导出过滤配置' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导入过滤配置' })).toBeVisible();

  await page.getByRole('button', { name: '计算规则', exact: true }).click();
  await expect(page.getByText('保研课程排除规则')).toHaveCount(0);
  const drawerWidth = await page
    .getByRole('dialog', { name: '计算规则设置' })
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(drawerWidth).toBeCloseTo(390, 3);
});
