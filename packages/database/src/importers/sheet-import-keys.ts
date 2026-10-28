import { endOfMonth, parseISO, startOfMonth } from "date-fns";

// Claves naturales para que importar el mismo sheet dos veces no duplique datos.
// Las fechas se calculan en la zona horaria del proceso, igual que el importador.

export interface MonthRange {
  readonly start: Date;
  readonly end: Date;
}

export interface InvoiceKeyInput {
  readonly type: string;
  readonly number: string;
  readonly rut: string;
  readonly counterparty: string;
  readonly total: number;
}

export function monthRange(month: string): MonthRange {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error(`Mes inválido: "${month}" (formato esperado AAAA-MM)`);
  }
  const date = parseISO(`${month}-01`);
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function normalizeFolio(
  number: string | null | undefined,
): string | null {
  const folio = (number ?? "").trim();
  return folio === "" ? null : folio;
}

export function normalizeRut(rut: string | null | undefined): string | null {
  const clean = (rut ?? "").replace(/[.\s]/g, "").toUpperCase();
  return clean === "" ? null : clean;
}

// Con folio: tipo + folio + RUT del cliente (el sheet no dice qué empresa emite).
// Sin folio (factura aún no emitida): tipo + cliente + monto, dentro del mes.
export function invoiceKey(inv: InvoiceKeyInput): string {
  const folio = normalizeFolio(inv.number);
  const who =
    normalizeRut(inv.rut) ?? `nombre:${inv.counterparty.trim().toLowerCase()}`;
  return folio
    ? `factura|${inv.type}|${folio}|${who}`
    : `factura|${inv.type}|S/N|${who}|${inv.total}`;
}

// Pagos y visa comparten clave: en la base ambos son gastos del mes con esa glosa.
export function expenseKey(item: string): string {
  return `gasto|${item.trim()}`;
}

export function opportunityKey(name: string, companyCode: string): string {
  return `oportunidad|${companyCode}|${name.trim()}`;
}

// Devuelve cuántas veces se ha visto cada clave (1, 2, ...). Permite que dos
// líneas idénticas del mismo sheet sigan creando dos registros.
export function createOccurrenceCounter(): (key: string) => number {
  const seen = new Map<string, number>();
  return (key: string): number => {
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return n;
  };
}
