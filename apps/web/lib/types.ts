export interface TransactionPayment {
  id: string;
  transactionId: string;
  amount: string;
  currency: 'CLP' | 'USD' | 'UF' | 'EUR';
  paidAt: string;
  note: string | null;
  accountId: string | null;
  createdAt: string;
}

export interface TransactionAuditLog {
  id: string;
  transactionId: string;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  fromLabel: string | null;
  toLabel: string | null;
  note: string | null;
  createdAt: string;
}

export interface TransactionAllocation {
  id: string;
  transactionId: string;
  companyId: string;
  percentage: string;
  amountCLP: string;
}

export type TransactionDocType = 'FACTURA' | 'BOLETA_HONORARIOS' | 'OTRO';

export interface Transaction {
  id: string;
  companyId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  status: 'PENDING' | 'PAID' | 'RECONCILED' | 'CANCELLED';
  amount: string;
  currency: 'CLP' | 'USD' | 'UF' | 'EUR';
  amountCLP: string;
  date: string;
  dueDate: string | null;
  paidAt: string | null;
  description: string;
  comment: string | null;
  docType: TransactionDocType | null;
  isAfecta: boolean;
  allocations: TransactionAllocation[];
  payments?: TransactionPayment[];
  auditLogs?: TransactionAuditLog[];
  counterparty: { id: string; name: string; type: string } | null;
  category: { id: string; name: string; color: string | null } | null;
}

export interface Company {
  id: string;
  name: string;
  shortCode: string;
  isActive: boolean;
}

export interface CreateTransactionInput {
  companyId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  currency?: 'CLP' | 'USD' | 'UF' | 'EUR';
  amountCLP: number;
  date: string;
  description: string;
  counterpartyId?: string;
  categoryId?: string;
  dueDate?: string;
  docType?: TransactionDocType;
  isAfecta?: boolean;
  allocations?: Array<{ companyId: string; percentage: number }>;
}

export interface CreatePaymentInput {
  amount: number;
  currency?: 'CLP' | 'USD' | 'UF' | 'EUR';
  paidAt?: string;
  note?: string;
  accountId?: string;
}

export interface TaxBreakdown {
  incomeAfecta: number;
  incomeExenta: number;
  expenseAfectaFactura: number;
  ppm: number;
  ivaDebito: number;
  ivaCredito: number;
  ivaNeto: number;
  retencionHonorarios: number;
  total: number;
}

export interface MonthlyTax {
  year: number;
  month: number;
  companyId: string;
  breakdown: TaxBreakdown;
}

export interface Account {
  id: string;
  companyId: string;
  name: string;
  type: string;
  currency: string;
  bankName: string | null;
  accountNumber: string | null;
  isActive: boolean;
}

export interface BankImportResult {
  imported: number;
  skipped: number;
  pending: number;
}
