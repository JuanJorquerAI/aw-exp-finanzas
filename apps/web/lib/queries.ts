'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTransactions, getCompanies, markTransactionPaid, createTransaction } from './api';
import type { CreateTransactionInput } from './types';

export const queryKeys = {
  companies: ['companies'] as const,
  transactions: (params: Record<string, string>) => ['transactions', params] as const,
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

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionInput) => createTransaction(dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
  });
}
