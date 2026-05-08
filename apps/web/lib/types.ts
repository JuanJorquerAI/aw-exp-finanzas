export interface TransactionAllocation {
  id: string;
  transactionId: string;
  companyId: string;
  percentage: string;
  amountCLP: string;
}

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
  allocations: TransactionAllocation[];
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
  allocations?: Array<{ companyId: string; percentage: number }>;
}
