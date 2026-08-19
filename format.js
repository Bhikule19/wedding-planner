/* Shared currency/number formatting helpers. */
export const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const compact = (number) =>
  number >= 100000
    ? `₹${(number / 100000).toFixed(number % 100000 ? 2 : 0)}L`
    : number >= 1000
      ? `₹${Math.round(number / 1000)}k`
      : currency.format(number || 0);

export const formatDate = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
