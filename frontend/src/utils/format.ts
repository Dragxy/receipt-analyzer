export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}.${month}.${year}`;
}

export function fmtCurrency(amount: number | null | undefined, currency = "EUR"): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("de-AT", { style: "currency", currency }).format(amount);
}
