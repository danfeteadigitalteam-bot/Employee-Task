import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Employee, WeeklyReport, WeeklyTask } from "@/types/database";

export function useActiveWeek(employee: Employee | null) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    const { data } = await supabase
      .from("weekly_reports")
      .select("*, weekly_tasks(*)")
      .eq("employee_id", employee.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const rep = data as WeeklyReport & { weekly_tasks: WeeklyTask[] };
      setReport(rep);
      setTasks((rep.weekly_tasks || []).sort((a, b) => a.sort_order - b.sort_order));
    } else {
      setReport(null);
      setTasks([]);
    }
    setLoading(false);
  }, [employee]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { report, tasks, loading, refresh };
}
