import * as XLSX from 'xlsx';
import { parse as parseDate } from 'date-fns';

export interface BankImportRow {
  externalId: string;
  date: Date;
  valueDate: Date;
  description: string;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  txType: string;
  counterName?: string;
  counterRut?: string;
  counterBank?: string;
  comment?: string;
  balance?: number;
}

export interface BankParser {
  readonly bankName: string;
  parse(buffer: Buffer): BankImportRow[];
}

export type BankFileType = 'detallado' | 'historico';

function parseCLPString(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(String(val).replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Strips dots from RUT (BCI provides "77757710-7" — already no dots, keep as-is)
function normalizeRut(rut: string): string {
  return rut.replace(/\./g, '').trim();
}

// ─── BCI Movimientos Detallado ─────────────────────────────────────────────
// Columnas (0-indexed):
// 0=Fecha tx  1=Hora  2=Fecha contable  3=Código transacción (externalId)
// 4=Cód transferencia  5=Tipo  6=N°serie  7=Glosa
// 8=Ingreso(+)  9=Egreso(-)  10=Saldo  11=Nombre  12=RUT
// 13=N°Cuenta  14=Tipo cuenta  15=Banco  16=Email  17=Comentario

export class BciBankParser implements BankParser {
  readonly bankName = 'BCI';

  parse(buffer: Buffer): BankImportRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

    const result: BankImportRow[] = [];

    for (let i = 1; i < raw.length; i++) {
      const row = raw[i] as unknown[];
      const externalId = String(row[3] ?? '').trim();
      if (!externalId) continue;

      const ingreso = typeof row[8] === 'number' ? (row[8] as number) : null;
      const egreso = typeof row[9] === 'number' ? (row[9] as number) : null;
      const direction: 'CREDIT' | 'DEBIT' = ingreso !== null ? 'CREDIT' : 'DEBIT';
      const amount = Math.abs(ingreso ?? egreso ?? 0);

      const date = row[0] instanceof Date ? row[0] : new Date(String(row[0]));
      const valueDate = row[2] instanceof Date ? row[2] : new Date(String(row[2]));

      const rawRut = typeof row[12] === 'string' ? row[12] : null;
      const counterRut = rawRut ? normalizeRut(rawRut) : undefined;
      const counterName = typeof row[11] === 'string' && row[11] ? (row[11] as string).trim() : undefined;
      const counterBank = typeof row[15] === 'string' && row[15] ? (row[15] as string).trim() : undefined;
      const comment = typeof row[17] === 'string' && row[17] ? (row[17] as string).trim() : undefined;
      const balance = typeof row[10] === 'number' ? (row[10] as number) : undefined;

      result.push({
        externalId,
        date,
        valueDate,
        description: String(row[7] ?? '').trim(),
        amount,
        direction,
        txType: String(row[5] ?? '').trim(),
        counterName,
        counterRut: counterRut || undefined,
        counterBank,
        comment,
        balance,
      });
    }

    return result;
  }
}

// ─── BCI Cartola Histórica ─────────────────────────────────────────────────
// Filas 1-22 son encabezado/resumen. Datos desde fila 24 (índice 23, base 0).
// Columnas (valores en posiciones pares por celdas combinadas):
// 0=Fecha(string DD/MM/YYYY)  5=Descripción  7=N°Documento
// 9=Cargos(string "1.000.000")  10=Abonos  11=Saldo

export class BciHistoricoParser implements BankParser {
  readonly bankName = 'BCI';

  parse(buffer: Buffer): BankImportRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });

    const result: BankImportRow[] = [];

    for (let i = 23; i < raw.length; i++) {
      const row = raw[i] as unknown[];
      const dateStr = typeof row[0] === 'string' ? (row[0] as string).trim() : null;
      if (!dateStr || !dateStr.includes('/')) continue;

      const date = parseDate(dateStr, 'dd/MM/yyyy', new Date());
      const description = String(row[5] ?? '').trim();
      const docNumber = String(row[7] ?? '').trim();

      const cargo = parseCLPString(row[9]);
      const abono = parseCLPString(row[10]);
      const balance = parseCLPString(row[11]);

      if (cargo === null && abono === null) continue;

      const direction: 'CREDIT' | 'DEBIT' = abono !== null ? 'CREDIT' : 'DEBIT';
      const amount = Math.abs(abono ?? cargo ?? 0);

      // Sin código único — usamos hash basado en fecha+doc+monto
      const externalId = `BCI_HIST_${dateStr.replace(/\//g, '')}_${docNumber}_${amount}`;

      result.push({
        externalId,
        date,
        valueDate: date,
        description,
        amount,
        direction,
        txType: direction === 'CREDIT' ? 'ABONO' : 'CARGO',
        balance: balance ?? undefined,
      });
    }

    return result;
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────

export function createBankParser(bank: string, fileType: BankFileType = 'detallado'): BankParser {
  const key = bank.toUpperCase();
  if (key === 'BCI') {
    return fileType === 'historico' ? new BciHistoricoParser() : new BciBankParser();
  }
  throw new Error(`Parser no disponible para banco: ${bank}. Disponibles: BCI`);
}
