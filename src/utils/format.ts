export const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
export const formatDateTime = (value: string) => new Date(value).toLocaleString();
