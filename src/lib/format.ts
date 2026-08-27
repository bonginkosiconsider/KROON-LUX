export function formatMoney(cents: number | null | undefined, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
}

export function compactDate(value: Date) {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(value);
}

