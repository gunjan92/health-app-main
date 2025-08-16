export function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7; // Mon=0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target.getTime() - new Date(firstThursday.getFullYear(), 0, 4).getTime();
  const week = 1 + Math.round(diff / 604800000);
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function capWaterMl(ml: number): number {
  return Math.max(0, Math.min(3000, ml));
}
