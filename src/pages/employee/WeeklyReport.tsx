import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeek } from "@/hooks/useWeek";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2, Check, X, Send } from "lucide-react";
import { toast } from "sonner";
import type { WeeklyReport, WeeklyTask } from "@/types/database";

export default function WeeklyReportPage() {
  const { employee } = useAuth();
  const week = useWeek();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<WeeklyTask[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Inline editing state
  const [newTaskText, setNewTaskText] = useState("");
  const [newCompletedText, setNewCompletedText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");

  const isReadOnly = report?.status === "submitted";

  const fetchReport = useCallback(async () => {
    if (!employee) return;

    const { data: reportData } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("week_start", week.weekStartStr)
      .single();

    if (reportData) {
      setReport(reportData as WeeklyReport);
      setNotes((reportData as any).notes || "");

      const { data: tasksData } = await supabase
        .from("weekly_tasks")
        .select("*")
        .eq("report_id", reportData.id)
        .order("sort_order");

      if (tasksData) {
        setTasks(tasksData.filter((t: any) => t.task_type === "planned"));
        setCompletedTasks(tasksData.filter((t: any) => t.task_type === "completed"));
      }
    } else {
      // Create new report
      const { data: newReport } = await supabase
        .from("weekly_reports")
        .insert({
          employee_id: employee.id,
          department_id: employee.department_id,
          week_start: week.weekStartStr,
          week_end: week.weekEndStr,
          status: "draft",
        })
        .select()
        .single();

      if (newReport) {
        setReport(newReport as WeeklyReport);
      }
    }
    setLoading(false);
  }, [employee, week.weekStartStr, week.weekEndStr]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Autosave notes
  const saveNotes = useCallback(async () => {
    if (!report || isReadOnly) return;
    await supabase.from("weekly_reports").update({ notes }).eq("id", report.id);
  }, [report, notes, isReadOnly]);

  useEffect(() => {
    const timer = setTimeout(saveNotes, 1000);
    return () => clearTimeout(timer);
  }, [saveNotes]);

  // Add planned task
  const addTask = async () => {
    if (!newTaskText.trim() || !report || isReadOnly) return;

    const { data } = await supabase
      .from("weekly_tasks")
      .insert({
        report_id: report.id,
        employee_id: employee!.id,
        task_type: "planned",
        task_text: newTaskText.trim(),
        source: "employee",
        sort_order: tasks.length,
      })
      .select()
      .single();

    if (data) {
      setTasks([...tasks, data as WeeklyTask]);
      setNewTaskText("");
    }
  };

  // Add completed task
  const addCompletedTask = async () => {
    if (!newCompletedText.trim() || !report || isReadOnly) return;

    const { data } = await supabase
      .from("weekly_tasks")
      .insert({
        report_id: report.id,
        employee_id: employee!.id,
        task_type: "completed",
        task_text: newCompletedText.trim(),
        source: "employee",
        sort_order: completedTasks.length,
      })
      .select()
      .single();

    if (data) {
      setCompletedTasks([...completedTasks, data as WeeklyTask]);
      setNewCompletedText("");
    }
  };

  // Toggle task
  const toggleTask = async (task: WeeklyTask) => {
    if (isReadOnly) return;
    const newChecked = !task.is_checked;
    await supabase.from("weekly_tasks").update({ is_checked: newChecked }).eq("id", task.id);

    if (task.task_type === "planned") {
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, is_checked: newChecked } : t)));
    } else {
      setCompletedTasks(completedTasks.map((t) => (t.id === task.id ? { ...t, is_checked: newChecked } : t)));
    }
  };

  // Update task text
  const updateTask = async (task: WeeklyTask, newText: string) => {
    if (!newText.trim()) return;
    await supabase.from("weekly_tasks").update({ task_text: newText.trim() }).eq("id", task.id);

    if (task.task_type === "planned") {
      setTasks(tasks.map((t) => (t.id === task.id ? { ...t, task_text: newText.trim() } : t)));
    } else {
      setCompletedTasks(completedTasks.map((t) => (t.id === task.id ? { ...t, task_text: newText.trim() } : t)));
    }
    setEditingTaskId(null);
  };

  // Delete task
  const deleteTask = async (task: WeeklyTask) => {
    await supabase.from("weekly_tasks").delete().eq("id", task.id);

    if (task.task_type === "planned") {
      setTasks(tasks.filter((t) => t.id !== task.id));
    } else {
      setCompletedTasks(completedTasks.filter((t) => t.id !== task.id));
    }
  };

  // Submit report
  const submitReport = async () => {
    if (!report) return;

    const { error } = await supabase
      .from("weekly_reports")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", report.id);

    setShowSubmitConfirm(false);

    if (!error) {
      setReport({ ...report, status: "submitted", submitted_at: new Date().toISOString() });
      toast.success("Weekly report submitted successfully!");
    } else {
      toast.error("Failed to submit report");
    }
  };

  if (loading) {
    return (
      <PageLayout title="This Week's Report">
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="This Week's Report"
      description={week.displayRange}
      actions={
        report ? <StatusBadge status={report.status} /> : undefined
      }
    >
      <div className="space-y-6">
        {/* Section 1: Tasks for This Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks for This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 group">
                <Checkbox
                  checked={task.is_checked}
                  onCheckedChange={() => toggleTask(task)}
                  disabled={isReadOnly}
                  className="mt-0.5"
                />
                {editingTaskId === task.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editingTaskText}
                      onChange={(e) => setEditingTaskText(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateTask(task, editingTaskText);
                        if (e.key === "Escape") setEditingTaskId(null);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateTask(task, editingTaskText)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTaskId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className={`flex-1 text-sm ${task.is_checked ? "line-through text-muted-foreground" : ""}`}>
                      {task.task_text}
                    </span>
                    {task.source === "meeting" && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Meeting</span>
                    )}
                    {!isReadOnly && (
                      <div className="hidden group-hover:flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setEditingTaskText(task.task_text);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteTask(task)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {!isReadOnly && (
              <div className="flex items-center gap-2 pt-2">
                <Input
                  placeholder="Add a task..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTask();
                  }}
                />
                <Button size="sm" variant="outline" onClick={addTask} disabled={!newTaskText.trim()}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Task
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: What I Did This Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What I Did This Week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 group">
                <Checkbox
                  checked={task.is_checked}
                  onCheckedChange={() => toggleTask(task)}
                  disabled={isReadOnly}
                  className="mt-0.5"
                />
                {editingTaskId === task.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      value={editingTaskText}
                      onChange={(e) => setEditingTaskText(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateTask(task, editingTaskText);
                        if (e.key === "Escape") setEditingTaskId(null);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateTask(task, editingTaskText)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTaskId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className={`flex-1 text-sm ${task.is_checked ? "line-through text-muted-foreground" : ""}`}>
                      {task.task_text}
                    </span>
                    {!isReadOnly && (
                      <div className="hidden group-hover:flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingTaskId(task.id);
                            setEditingTaskText(task.task_text);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteTask(task)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {!isReadOnly && (
              <div className="flex items-center gap-2 pt-2">
                <Input
                  placeholder="Add completed work..."
                  value={newCompletedText}
                  onChange={(e) => setNewCompletedText(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCompletedTask();
                  }}
                />
                <Button size="sm" variant="outline" onClick={addCompletedTask} disabled={!newCompletedText.trim()}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Weekly Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write a short note about this week's work, discussion points, challenges, or anything that should be mentioned in the meeting."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadOnly}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        {!isReadOnly && report && (
          <div className="flex justify-end">
            <Button onClick={() => setShowSubmitConfirm(true)} className="gap-2">
              <Send className="h-4 w-4" />
              Submit Weekly Report
            </Button>
          </div>
        )}

        {isReadOnly && report && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Report submitted on {report.submitted_at ? new Date(report.submitted_at).toLocaleString() : "—"}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showSubmitConfirm}
        onOpenChange={setShowSubmitConfirm}
        title="Submit Weekly Report"
        description="Once submitted, your report will be read-only. Are you sure you want to submit?"
        confirmLabel="Submit"
        onConfirm={submitReport}
      />
    </PageLayout>
  );
}
