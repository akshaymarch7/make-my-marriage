import { z } from "zod";
const localDate = z.iso.date();
const localTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export function eventDateParts(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}
/** Resolve a wall-clock input without using the browser's timezone or silently moving DST gaps. */
export function eventLocalToUtc(date: string, time: string, timeZone: string): string {
  if (!localDate.safeParse(date).success || !localTime.safeParse(time).success) throw new Error("Choose a valid date and time.");
  const nominal = Date.parse(`${date}T${time}:00Z`);
  const offsets = new Set<number>();
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const sample = nominal + hours * 3600000;
    const parts = eventDateParts(new Date(sample).toISOString(), timeZone);
    offsets.add(Date.parse(`${parts.date}T${parts.time}:00Z`) - sample);
  }
  const matches = [...offsets].map(offset => nominal - offset).filter(candidate => {
    const parts = eventDateParts(new Date(candidate).toISOString(), timeZone);
    return parts.date === date && parts.time === time;
  });
  if (!matches.length) throw new Error("This time does not exist in your wedding’s time zone. Choose another time.");
  if (matches.length > 1) throw new Error("This time occurs twice when the clocks change. Choose an unambiguous time.");
  return new Date(matches[0]).toISOString();
}
export const eventDayLabel = (instant: string, timeZone: string) => new Intl.DateTimeFormat("en-IN", { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(instant));
export const eventTimeLabel = (instant: string, timeZone: string) => new Intl.DateTimeFormat("en-IN", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(instant));
export function eventTimeRange(startsAt: string, endsAt: string | null, timeZone: string) {
  if (!endsAt) return eventTimeLabel(startsAt, timeZone);
  const anotherDay = eventDateParts(startsAt, timeZone).date !== eventDateParts(endsAt, timeZone).date;
  return `${eventTimeLabel(startsAt, timeZone)} – ${anotherDay ? eventDayLabel(endsAt, timeZone) + ', ' : ''}${eventTimeLabel(endsAt, timeZone)}`;
}

export function upcomingEvents<T extends { startsAt: string; archivedAt: string | null }>(events: T[], now = new Date()) {
  return events.filter(event => !event.archivedAt && Date.parse(event.startsAt) >= now.getTime()).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0, 3);
}
