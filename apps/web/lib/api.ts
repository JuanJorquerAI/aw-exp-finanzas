import type { Transaction, Company, CreateTransactionInput, MonthlyTax, CreatePaymentInput, TransactionPayment, Account, BankImportResult } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export function getTransactions(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return fetchApi<Transaction[]>(`/transactions?${qs}`);
}

export function getCompanies() {
  return fetchApi<Company[]>('/companies');
}

export function markTransactionPaid(id: string) {
  return fetchApi<Transaction>(`/transactions/${id}/paid`, { method: 'PATCH' });
}

export function createTransaction(dto: CreateTransactionInput) {
  return fetchApi<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function cancelTransaction(id: string) {
  return fetchApi<Transaction>(`/transactions/${id}/cancel`, { method: 'PATCH' });
}

export function moveTransactionCompany(id: string, companyId: string) {
  return fetchApi<Transaction>(`/transactions/${id}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ companyId }),
  });
}

export function getTransaction(id: string) {
  return fetchApi<Transaction>(`/transactions/${id}`);
}

export function addPayment(transactionId: string, dto: CreatePaymentInput) {
  return fetchApi<TransactionPayment>(`/transactions/${transactionId}/payments`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function getTaxesMonthly(companyId: string, year: number, month: number) {
  return fetchApi<MonthlyTax>(`/taxes/monthly?companyId=${companyId}&year=${year}&month=${month}`);
}

export function getTaxesAnnual(companyId: string, year: number) {
  return fetchApi<MonthlyTax[]>(`/taxes/annual?companyId=${companyId}&year=${year}`);
}

export function getAccounts() {
  return fetchApi<Account[]>('/accounts');
}

export async function importBankFile(
  file: File,
  accountId: string,
  fileType: 'detallado' | 'historico',
): Promise<BankImportResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('accountId', accountId);
  form.append('bank', 'BCI');
  form.append('fileType', fileType);

  const response = await fetch(`${API_URL}/importers/bank`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error al importar: ${response.status} ${text}`);
  }
  return response.json() as Promise<BankImportResult>;
}
