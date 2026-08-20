export function formatResult(value: number): string {
  if (!Number.isFinite(value)) throw new Error('计算结果不是有限数');
  return value.toFixed(4);
}
