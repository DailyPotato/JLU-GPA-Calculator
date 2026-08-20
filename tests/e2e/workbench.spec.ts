import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';

test('manual course workflow calculates and persists locally', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('非吉林大学官方系统', { exact: true })).toBeVisible();
  await expect(page.getByText('尚未计算')).toHaveCount(3);

  await page.getByRole('button', { name: '手动添加课程' }).click();
  await page.getByLabel('课程号').fill('TEST-001');
  await page.getByLabel('课程名').fill('虚构测试课程');
  await page.getByLabel('百分制成绩').fill('90');
  await page.getByLabel('学分').fill('2');
  await page.getByRole('button', { name: '保存课程' }).click();

  await expect(page.getByText('虚构测试课程')).toBeVisible();
  await page.getByRole('button', { name: '开始计算' }).click();
  await expect(page.getByRole('button', { name: '保研 GPA 4.0000', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '加权平均分 90.0000', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: '不加权平均分 90.0000', exact: true })
  ).toBeVisible();

  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PNG' }).click();
  expect((await pngDownloadPromise).suggestedFilename()).toMatch(/\.png$/);

  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PDF' }).click();
  expect((await pdfDownloadPromise).suggestedFilename()).toMatch(/\.pdf$/);

  await page.getByRole('button', { name: '加权平均分 90.0000', exact: true }).click();
  await expect(page.getByRole('heading', { name: '加权平均分课程明细' })).toBeVisible();

  await page.reload();
  await expect(page.getByText('虚构测试课程')).toBeVisible();
  await expect(page.getByText('尚未计算')).toHaveCount(3);
});

test('imports a synthetic CSV through the preview flow', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: '导入成绩表' }).click();

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

  await page.getByRole('button', { name: '开始计算' }).click();
  await expect(page.getByRole('button', { name: '加权平均分 88.0000', exact: true })).toBeVisible();
});
