export function minorUnitsToDecimal(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error('Payment amount must be a non-negative safe integer');
  }
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`;
}

export function decimalToMinorUnits(value: string | number): number {
  const normalized = String(value).replace(/,/g, '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`Invalid decimal amount: ${normalized}`);
  }
  const [major, fraction = ''] = normalized.split('.');
  const amount = Number(major) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount)) throw new Error('Amount exceeds safe integer range');
  return amount;
}
