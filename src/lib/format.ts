export function formatMoney(cents: number | null | undefined, currency = "ZAR") {
  const amount = (cents ?? 0) / 100;

  if (currency === "ZAR") {
    return `R${amount.toFixed(2)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMoneyPrecise(cents: number | null | undefined, currency = "ZAR") {
  const amount = (cents ?? 0) / 100;

  if (currency === "ZAR") {
    return `R${amount.toFixed(2)}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function compactDate(value: Date) {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(value);
}

