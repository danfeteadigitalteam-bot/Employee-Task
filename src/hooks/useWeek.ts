import { useMemo } from "react";
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks, isWithinInterval } from "date-fns";

export function useWeek(referenceDate?: Date) {
  return useMemo(() => {
    const now = referenceDate || new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return {
      weekStart,
      weekEnd,
      weekStartStr: format(weekStart, "yyyy-MM-dd"),
      weekEndStr: format(weekEnd, "yyyy-MM-dd"),
      displayRange: `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`,
      nextWeek: {
        weekStart: startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }),
        weekEnd: endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }),
        weekStartStr: format(startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        weekEndStr: format(endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd"),
      },
      prevWeek: {
        weekStart: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
        weekEnd: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
        weekStartStr: format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd"),
        weekEndStr: format(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), "yyyy-MM-dd"),
      },
    };
  }, [referenceDate]);
}

export function formatWeekRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (s.getMonth() === e.getMonth()) {
    return `${format(s, "MMM d")}–${format(e, "d, yyyy")}`;
  }
  return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}

export function isDateInWeek(date: string | Date, weekStart: string, weekEnd: string): boolean {
  const d = typeof date === "string" ? new Date(date) : date;
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  return isWithinInterval(d, { start, end });
}
