import type { Counterparty } from './types';

export function cpLabel(cp: Pick<Counterparty, 'name' | 'razonSocial' | 'rut'>): string {
  const parts: string[] = [cp.name];
  if (cp.razonSocial && cp.razonSocial !== cp.name) parts.push(`(${cp.razonSocial})`);
  if (cp.rut) parts.push(`· ${cp.rut}`);
  return parts.join(' ');
}

export function cpMatchesQuery(cp: Pick<Counterparty, 'name' | 'razonSocial' | 'rut'>, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    cp.name.toLowerCase().includes(lower) ||
    (cp.razonSocial?.toLowerCase().includes(lower) ?? false) ||
    (cp.rut?.includes(lower) ?? false)
  );
}
