import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Currency = 'CRC' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  toggleCurrency: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('estate-manual-currency');
    if (saved === 'CRC' || saved === 'USD') return saved;
    return 'USD';
  });

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('estate-manual-currency', c);
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency(currency === 'CRC' ? 'USD' : 'CRC');
  }, [currency, setCurrency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, toggleCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider');
  return context;
}
