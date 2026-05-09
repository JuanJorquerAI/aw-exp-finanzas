'use client';
import { useState, useEffect, useCallback } from 'react';

export type DisplayCurrency = 'CLP' | 'USD';

const DEFAULT_USD_RATE = 950;

export function useCurrency() {
  const [currency, setCurrency] = useState<DisplayCurrency>('CLP');
  const [usdRate, setUsdRate] = useState<number>(DEFAULT_USD_RATE);

  useEffect(() => {
    const saved = localStorage.getItem('aw-currency') as DisplayCurrency | null;
    const savedRate = localStorage.getItem('aw-usd-rate');
    if (saved) setCurrency(saved);
    if (savedRate) setUsdRate(parseFloat(savedRate));
  }, []);

  const toggle = useCallback(() => {
    setCurrency((prev) => {
      const next = prev === 'CLP' ? 'USD' : 'CLP';
      localStorage.setItem('aw-currency', next);
      return next;
    });
  }, []);

  const updateRate = useCallback((rate: number) => {
    setUsdRate(rate);
    localStorage.setItem('aw-usd-rate', String(rate));
  }, []);

  return { currency, usdRate, toggle, updateRate };
}
