export const isEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

export const validateBetAmount = (amount: number, min = 1, max = 10000): string | null => {
  if (Number.isNaN(amount)) return 'Amount is required';
  if (amount < min) return `Minimum bet is ${min}`;
  if (amount > max) return `Maximum bet is ${max}`;
  return null;
};
