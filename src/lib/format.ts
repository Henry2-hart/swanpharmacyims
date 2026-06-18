export const currency = (n: number) =>
  new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0,
  }).format(n);

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const daysUntil = (iso: string) =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
