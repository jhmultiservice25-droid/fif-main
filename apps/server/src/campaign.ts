export function fullName(lastName: string, postnom: string, firstName: string) {
  return [lastName, postnom, firstName].filter(Boolean).join(" ");
}

const TZ = "Africa/Kinshasa";

export function kinshasaDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function lastDays(count: number) {
  const stamp = kinshasaDay(new Date());
  const year = Number(stamp.slice(0, 4));
  const month = Number(stamp.slice(5, 7));
  const day = Number(stamp.slice(8, 10));
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(year, month - 1, day - i));
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}
