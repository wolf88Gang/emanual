// Costa Rica Colones exchange rate (approximate as of March 2026)
// In production, this should be fetched from an API
const CRC_PER_USD = 520;

export function formatCurrency(amount: number, currency: string = 'CRC'): string {
  if (currency === 'CRC') {
    return `₡${amount.toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrencyDual(amount: number, currency: string = 'CRC'): string {
  if (currency === 'CRC') {
    const usd = amount / CRC_PER_USD;
    return `₡${amount.toLocaleString('es-CR', { maximumFractionDigits: 0 })} (~$${usd.toFixed(0)})`;
  }
  const crc = amount * CRC_PER_USD;
  return `$${amount.toFixed(2)} (~₡${crc.toLocaleString('es-CR', { maximumFractionDigits: 0 })})`;
}

export function convertToUSD(amount: number, fromCurrency: string): number {
  if (fromCurrency === 'CRC') return amount / CRC_PER_USD;
  return amount;
}

export function convertToCRC(amount: number, fromCurrency: string): number {
  if (fromCurrency === 'USD') return amount * CRC_PER_USD;
  return amount;
}

export { CRC_PER_USD };
