import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Employee, WeeklyReport, WeeklyTask } from "@/types/database";

export function useActiveWeek(employee: Employee | null) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const refresh = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("weekly_reports")
      .select("*, weekly_tasks(*)")
      .eq("employee_id", employee.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

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
  }, [refresh, reload]);

  return { report, tasks, loading, error, refresh, retry: () => setReload((r) => r + 1) };
}
