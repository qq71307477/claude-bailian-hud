import type { UsageData } from './types.js';

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function getColorForPercent(percent: number): string {
  if (percent >= 90) return colors.red;
  if (percent >= 70) return colors.yellow;
  return colors.green;
}

export function render(data: UsageData | null, error?: string, note?: string): string {
  if (error) {
    return `${colors.red}[bailian-hud] 错误: ${error}${colors.reset}`;
  }

  if (!data) {
    return `${colors.dim}[bailian-hud] 等待数据...${colors.reset}`;
  }

  const fiveHourColor = getColorForPercent(data.fiveHour);
  const weekColor = getColorForPercent(data.week);
  const monthColor = getColorForPercent(data.month);

  // 第一行：用量百分比
  const line1 = `${colors.cyan}[${data.planName}]${colors.reset} ` +
    `5h: ${fiveHourColor}${data.fiveHour}%${colors.reset} │ ` +
    `周: ${weekColor}${data.week}%${colors.reset} │ ` +
    `月: ${monthColor}${data.month}%${colors.reset}`;

  // 第二行：重置时间
  const extra = note ? ` · ${note}` : '';
  const line2 = `${colors.dim}       重置: ${data.fiveHourReset} │ ${data.weekReset} │ ${data.monthReset}${extra}${colors.reset}`;

  return `${line1}\n${line2}`;
}
