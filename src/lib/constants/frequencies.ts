export const FREQUENCIES = [
  { value: "monthly", label: "Monthly", monthMultiplier: 1 },
  { value: "yearly", label: "Yearly", monthMultiplier: 12 },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["value"];

export function normalizeToMonthly(
  amount: number,
  frequency: Frequency
): number {
  if (frequency === "yearly") {
    return amount / 12;
  }
  return amount;
}

export function normalizeToYearly(amount: number, frequency: Frequency): number {
  if (frequency === "monthly") {
    return amount * 12;
  }
  return amount;
}

export function getFrequencyLabel(frequency: Frequency): string {
  const freq = FREQUENCIES.find((f) => f.value === frequency);
  return freq?.label ?? frequency;
}
