export const timeZones = [
  ["Asia/Kolkata", "India Standard Time (Asia/Kolkata)"],
  ["Asia/Dubai", "Gulf Standard Time (Asia/Dubai)"],
  ["Europe/London", "United Kingdom (Europe/London)"],
  ["America/New_York", "Eastern Time (America/New_York)"],
  ["America/Los_Angeles", "Pacific Time (America/Los_Angeles)"],
  ["Asia/Singapore", "Singapore Time (Asia/Singapore)"],
  ["Australia/Sydney", "Sydney Time (Australia/Sydney)"],
  ["UTC", "Coordinated Universal Time (UTC)"],
] as const;
export function timeZoneLabel(zone: string) {
  return timeZones.find(([value]) => value === zone)?.[1] ?? zone;
}
