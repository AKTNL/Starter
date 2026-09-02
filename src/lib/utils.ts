import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** 合并 className，后写的 Tailwind 类覆盖先写的冲突类 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** 1234.5 -> "¥1,234.50" */
export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** 42000 -> "42.0k"，用于图表 Y 轴 */
export function formatCompact(value: number): string {
  return `${(value / 1000).toFixed(1)}k`
}
