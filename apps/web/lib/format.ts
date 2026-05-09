import type { DisplayCurrency } from '@/hooks/useCurrency';

export function fmtCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtUSD(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtAmount(clpAmount: number, display: DisplayCurrency, usdRate: number): string {
  if (display === 'USD') return fmtUSD(clpAmount / usdRate);
  return fmtCLP(clpAmount);
}
