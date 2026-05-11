'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, getCompanies, markTransactionPaid, cancelTransaction, createTransaction, getTaxesMonthly, getTaxesAnnual, getTransaction, addPayment, moveTransactionCompany } from './api';
import type { CreateTransactionInput, CreatePaymentInput } from './types';

export const queryKeys = {
  companies: ['companies'] as const,
  transactions: (params: Record<string, string>) => ['transactions', params] as const,
  transaction: (id: string) => ['transactions', id] as const,
  taxesMonthly: (companyId: string, year: number, month: number) => ['taxes', 'monthly', companyId, year, month] as const,
  taxesAnnual: (companyId: string, year: number) => ['taxes', 'annual', companyId, year] as const,
};

export function useCompanies() {
  return useQuery({ queryKey: queryKeys.companies, queryFn: getCompanies });
}

export function useTransactions(params: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: () => getTransactions(params),
  });
}

export function useMarkPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markTransactionPaid,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: () => getTransaction(id),
    enabled: !!id,
  });
}

export function useCancelTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelTransaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, dto }: { transactionId: string; dto: CreatePaymentInput }) =>
      addPayment(transactionId, dto),
    onSuccess: (_, { transactionId }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaction(transactionId) });
    },
  });
}

export function useMoveTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, companyId }: { id: string; companyId: string }) =>
      moveTransactionCompany(id, companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionInput) => createTransaction(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useTaxesMonthly(companyId: string, year: number, month: number) {
  return useQuery({
    queryKey: queryKeys.taxesMonthly(companyId, year, month),
    queryFn: () => getTaxesMonthly(companyId, year, month),
    enabled: !!companyId,
  });
}

export function useTaxesAnnual(companyId: string, year: number) {
  return useQuery({
    queryKey: queryKeys.taxesAnnual(companyId, year),
    queryFn: () => getTaxesAnnual(companyId, year),
    enabled: !!companyId,
  });
}
