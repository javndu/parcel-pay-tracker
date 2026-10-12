import type { Entry, Settings } from '@/types';

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function isSaturday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 6;
}

export function calcHoursWorked(start: string, end: string, breakDeducted: boolean): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60;
  if (breakDeducted) diff -= 30;
  return Math.max(0, diff / 60);
}

export function calcEntryPay(entry: Entry, settings: Settings): number {
  if (entry.is_saturday) {
    return (entry.hours_worked || 0) * settings.saturday_hourly_rate;
  }
  const normalPay = entry.normal * settings.normal_rate;
  const expressPay = entry.express * settings.express_rate;
  let transferPay = 0;
  if (entry.transfer_type === 'Normal') {
    transferPay = entry.transfer_qty * settings.normal_rate;
  } else if (entry.transfer_type === 'Express') {
    transferPay = entry.transfer_qty * settings.express_rate;
  }
  return normalPay + expressPay + transferPay;
}

export function calcPayForInput(
  isSaturday: boolean,
  normal: number,
  express: number,
  transferType: string | null,
  transferQty: number,
  hoursWorked: number | null,
  settings: Settings
): number {
  if (isSaturday) {
    return (hoursWorked || 0) * settings.saturday_hourly_rate;
  }
  const normalPay = normal * settings.normal_rate;
  const expressPay = express * settings.express_rate;
  let transferPay = 0;
  if (transferType === 'Normal') {
    transferPay = transferQty * settings.normal_rate;
  } else if (transferType === 'Express') {
    transferPay = transferQty * settings.express_rate;
  }
  return normalPay + expressPay + transferPay;
}

export function formatCurrency(amount: number): string {
  return '$' + amount.toFixed(2);
}

export function getMonthName(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
