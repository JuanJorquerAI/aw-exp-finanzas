import type { Transaction, Company, CreateTransactionInput, MonthlyTax, CreatePaymentInput, TransactionPayment, Account, BankImportResult, Category, Counterparty, UpdateTransactionInput, CategorizationRule, CreateCategorizationRuleInput, TestRuleResult } from './types';

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

export function getCategories() {
  return fetchApi<Category[]>('/categories');
}

export function getCounterparties() {
  return fetchApi<Counterparty[]>('/counterparties');
}

export function createCounterparty(dto: { name: string; type: string; rut?: string; razonSocial?: string; isPersonaNatural?: boolean; email?: string; phone?: string; notes?: string }) {
  return fetchApi<Counterparty>('/counterparties', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function updateCounterparty(id: string, dto: { name?: string; type?: string; rut?: string; razonSocial?: string; isPersonaNatural?: boolean; email?: string; phone?: string; notes?: string }) {
  return fetchApi<Counterparty>(`/counterparties/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export function updateTransaction(id: string, dto: UpdateTransactionInput) {
  return fetchApi<Transaction>(`/transactions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export function getAccounts(companyId?: string) {
  const qs = companyId ? `?companyId=${companyId}` : '';
  return fetchApi<Account[]>(`/accounts${qs}`);
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

export function getCategorizationRules() {
  return fetchApi<CategorizationRule[]>('/categories/rules');
}

export function createCategorizationRule(dto: CreateCategorizationRuleInput) {
  return fetchApi<CategorizationRule>('/categories/rules', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function updateCategorizationRule(id: string, dto: Partial<CreateCategorizationRuleInput & { isActive: boolean }>) {
  return fetchApi<CategorizationRule>(`/categories/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export function deleteCategorizationRule(id: string) {
  return fetchApi<{ deleted: boolean }>(`/categories/rules/${id}`, { method: 'DELETE' });
}

export function testCategorizationRule(text: string) {
  return fetchApi<TestRuleResult>('/categories/rules/test', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function getDocuments(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/documents${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Error al cargar documentos');
  return res.json();
}

export async function linkDocument(transactionId: string, documentId: string, note?: string) {
  const res = await fetch(`${API_URL}/transaction-documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId, documentId, note }),
  });
  if (!res.ok) throw new Error('Error al vincular documento');
  return res.json();
}

export async function unlinkDocument(linkId: string) {
  const res = await fetch(`${API_URL}/transaction-documents/${linkId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al desvincular documento');
}

export async function addTransactionNote(transactionId: string, content: string) {
  const res = await fetch(`${API_URL}/transactions/${transactionId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Error al agregar nota');
  return res.json();
}

export async function updateTransactionStatus(id: string, status: string) {
  const res = await fetch(`${API_URL}/transactions/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Error al actualizar estado');
  return res.json();
}
