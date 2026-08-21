export function formatDecimal(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) throw new Error('计算结果不是有限数');
  return value.toFixed(fractionDigits);
}

export function formatResult(value: number): string {
  return formatDecimal(value, 2);
}
