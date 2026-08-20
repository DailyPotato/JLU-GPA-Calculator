import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';

test('manual course workflow calculates, switches result views, exports and persists', async ({
  page
}) => {
  await page.goto('./');
  await expect(page.getByRole('complementary', { name: '功能栏' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '课程清单' })).toBeVisible();
  await expect(page.getByText('非吉林大学官方系统', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/规则未核验 · 数据仅存本机/)).toHaveCount(0);

  const summaries = page.locator('.result-summary');
  await expect(summaries).toHaveCount(3);
  await expect(summaries.nth(0)).toContainText('保研 GPA');
  await expect(summaries.nth(1)).toContainText('加权平均分');
  await expect(summaries.nth(2)).toContainText('不加权平均分');

  await page
    .getByRole('button', { name: /添加课程/ })
    .first()
    .click();
  await expect(page.getByRole('dialog', { name: '添加课程' })).toBeVisible();
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
  await expect(row).toContainText('4.0000');
  await expect(row.getByRole('switch', { name: '虚构测试课程保研课程' })).toBeChecked();

  await page.getByRole('button', { name: /开始计算/ }).click();
  await expect(page.getByRole('button', { name: '保研 GPA 4.0000', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '加权平均分 90.0000', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '不加权平均分 90.0000', exact: true })
  ).toBeVisible();

  await page.getByRole('button', { name: '加权平均分 90.0000', exact: true }).click();
  await expect(page.getByRole('heading', { name: '加权平均分课程' })).toBeVisible();
  await expect(page.getByText('显示排除项', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '结果导出', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '结果导出' })).toBeVisible();
  await expect(page.getByTestId('course-ledger')).toBeVisible();

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
    '不加权平均分尚未计算'
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
});

test('imports a synthetic CSV through the right-side preview drawer', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '导入成绩', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '导入成绩表' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '课程清单' })).toBeVisible();

  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByText('点击或拖入成绩表').click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: '虚构成绩.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('课程号,课程名,总成绩,学分\nCSV-001,虚构导入课程,88,3', 'utf8')
  });

  await expect(page.getByText('可导入')).toBeVisible();
  await expect(page.getByText('虚构成绩.csv')).toBeVisible();
  await page.getByRole('button', { name: '确认导入' }).click();
  await expect(page.getByText('虚构导入课程')).toBeVisible();

  await page.getByRole('button', { name: /开始计算/ }).click();
  await expect(page.getByRole('button', { name: '加权平均分 88.0000', exact: true })).toBeVisible();
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

  await page.getByRole('button', { name: '计算规则', exact: true }).click();
  const drawerWidth = await page
    .getByRole('dialog', { name: '计算规则设置' })
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(drawerWidth).toBe(390);
});
