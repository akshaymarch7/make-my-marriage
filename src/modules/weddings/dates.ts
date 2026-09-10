export function weddingDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function daysUntilWedding(date: string, timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  const localDate = `${get("year").padStart(4, "0")}-${get("month")}-${get("day")}`;
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${localDate}T00:00:00Z`)) / 86400000);
}

export function countdownLabel(days: number) {
  if (days === 0) return "Today is your wedding day";
  const count = Math.abs(days);
  return days > 0 ? `${count} ${count === 1 ? "day" : "days"} to go` : `Celebrated ${count} ${count === 1 ? "day" : "days"} ago`;
}
