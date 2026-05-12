export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

export function effectiveDueDate(tx: { date: string; dueDate: string | null }): Date {
  if (tx.dueDate) return new Date(tx.dueDate);
  return addBusinessDays(new Date(tx.date), 5);
}

export type AgingStatus = 'OVERDUE' | 'DUE_SOON' | 'OK';

export function getAgingStatus(dueDate: Date, today: Date): AgingStatus {
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays <= 7) return 'DUE_SOON';
  return 'OK';
}

export function getDaysLabel(dueDate: Date, today: Date): string {
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Vence hoy';
  if (diffDays === 1) return 'Vence mañana';
  if (diffDays === -1) return 'Venció ayer';
  if (diffDays < 0) return `Venció hace ${Math.abs(diffDays)}d`;
  return `Vence en ${diffDays}d`;
}
