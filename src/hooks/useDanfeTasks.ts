import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Employee, Meeting, MeetingTask } from "@/types/database";

interface DanfeMeetingGroup {
  meeting: Meeting;
  tasks: MeetingTask[];
}

export function useDanfeTasks(employee: Employee | null) {
  const [danfeMeetings, setDanfeMeetings] = useState<DanfeMeetingGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) {
      setDanfeMeetings([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchDanfe = async () => {
      setLoading(true);
      const { data: meetings } = await supabase
        .from("meetings")
        .select("*")
        .eq("company", "danfe")
        .contains("attendees", [employee.id])
        .order("meeting_date", { ascending: false });

      if (cancelled) return;

      if (!meetings || meetings.length === 0) {
        setDanfeMeetings([]);
        setLoading(false);
        return;
      }

      const { data: meetingTasks } = await supabase
        .from("meeting_tasks")
        .select("*")
        .in("meeting_id", meetings.map((m) => m.id))
        .eq("employee_id", employee.id)
        .eq("status", "submitted")
        .order("created_at");

      if (cancelled) return;

      const taskMap = new Map<string, MeetingTask[]>();
      for (const task of meetingTasks || []) {
        const list = taskMap.get(task.meeting_id) || [];
        list.push(task);
        taskMap.set(task.meeting_id, list);
      }

      setDanfeMeetings(
        (meetings as Meeting[]).map((meeting) => ({
          meeting,
          tasks: taskMap.get(meeting.id) || [],
        }))
      );
      setLoading(false);
    };

    fetchDanfe();

    return () => { cancelled = true; };
  }, [employee]);

  const toggleTask = useCallback(async (task: MeetingTask) => {
    const newChecked = !task.is_checked;
    await supabase.from("meeting_tasks").update({ is_checked: newChecked }).eq("id", task.id);
    setDanfeMeetings((prev) =>
      prev.map((group) => ({
        ...group,
        tasks: group.tasks.map((t) => (t.id === task.id ? { ...t, is_checked: newChecked } : t)),
      }))
    );
  }, []);

  return { danfeMeetings, loading, toggleTask };
}
