import { startOfWeek, endOfWeek, addDays, format } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { Employee, WeeklyReport, Meeting } from "@/types/database";

function currentCalendarWeek() {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(new Date(), { weekStartsOn: 1 });
  return {
    weekStart: new Date(format(start, "yyyy-MM-dd") + "T00:00:00"),
    weekEnd: new Date(format(end, "yyyy-MM-dd") + "T00:00:00"),
  };
}

export async function fetchActiveReport(employeeId: string): Promise<WeeklyReport | null> {
  const { data } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("employee_id", employeeId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as WeeklyReport) || null;
}

export async function fetchLatestMeeting(): Promise<Meeting | null> {
  const { data } = await supabase
    .from("meetings")
    .select("week_start, week_end")
    .order("meeting_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Meeting) || null;
}

export async function startNewWeek(employee: Employee): Promise<WeeklyReport> {
  const [active, latestMeeting] = await Promise.all([fetchActiveReport(employee.id), fetchLatestMeeting()]);

  const base =
    latestMeeting?.week_start && latestMeeting.week_end
      ? {
          weekStart: new Date(latestMeeting.week_start + "T00:00:00"),
          weekEnd: new Date(latestMeeting.week_end + "T00:00:00"),
        }
      : currentCalendarWeek();

  let weekStart = base.weekStart;
  let weekEnd = base.weekEnd;

  if (active?.week_start) {
    const activeStart = new Date(active.week_start + "T00:00:00");
    while (weekStart <= activeStart) {
      weekStart = addDays(weekStart, 7);
      weekEnd = addDays(weekEnd, 7);
    }
  }

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("weekly_reports")
    .insert({
      employee_id: employee.id,
      department_id: employee.department_id,
      week_start: weekStartStr,
      week_end: weekEndStr,
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to start new week");
  }
  return data as WeeklyReport;
}

export async function deleteReport(reportId: string) {
  const { error } = await supabase.from("weekly_reports").delete().eq("id", reportId);
  if (error) throw new Error(error.message);
}
