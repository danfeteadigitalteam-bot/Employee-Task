//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\employee\WeeklyReport.tsx
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveWeek } from "@/hooks/useActiveWeek";
import { formatWeekRange } from "@/hooks/useWeek";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { NewWeekButton } from "@/components/shared/NewWeekButton";
import { Plus, Pencil, Trash2, Check, X, Send, RotateCcw, ListTodo, CheckCircle2, NotebookPen, Link2, Lock } from "lucide-react";
import { toast } from "sonner";
import type { WeeklyTask } from "@/types/database";

export default function WeeklyReportPage() {
  const { employee } = useAuth();
  const { report: activeReport, tasks: activeTasks, loading, refresh } = useActiveWeek(employee);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<WeeklyTask[]>([]);
  const [notes, setNotes] = useState("");
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Inline editing state
  const [newTaskText, setNewTaskText] = useState("");
  const [newCompletedText, setNewCompletedText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");

  const report = activeReport;
  const isReadOnly = report?.status === "submitted";

  // Sync local state from the active week
  useEffect(() => {
    if (!activeReport) {
      setTasks([]);
      setCompletedTasks([]);
      setNotes("");
      return;
    }
    setNotes(activeReport.notes || "");
    setNotesLoaded(true);
    setTasks(activeTasks.filter((t) => t.task_type === "planned"));
    setCompletedTasks(activeTasks.filter((t) => t.task_type === "completed"));
  }, [activeReport, activeTasks]);

  const saveNotes = useCallback(async () => {
    if (!report || isReadOnly || !notesLoaded) return;
    await supabase.from("weekly_reports").update({ notes }).eq("id", report.id);
  }, [report, notes, isReadOnly, notesLoaded]);

  useEffect(() => {
    const timer = setTimeout(saveNotes, 1000);
    return () => clearTimeout(timer);
  }, [saveNotes]);

  // Add planned task
  const addTask = async () => {
    if (!newTaskText.trim() || !report || isReadOnly) return;

    const { data, error } = await supabase
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

    if (error) {
      console.error("Add task error:", error);
      toast.error("Failed to add task: " + error.message);
      return;
    }

    if (data) {
      setTasks([...tasks, data as WeeklyTask]);
      setNewTaskText("");
    }
  };

  // Add completed task
  const addCompletedTask = async () => {
    if (!newCompletedText.trim() || !report || isReadOnly) return;

    const { data, error } = await supabase
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

    if (error) {
      console.error("Add completed task error:", error);
      toast.error("Failed to add task: " + error.message);
      return;
    }

    if (data) {
      setCompletedTasks([...completedTasks, data as WeeklyTask]);
      setNewCompletedText("");
    }
  };

  // Toggle task - moves between planned/completed on check/uncheck
  const toggleTask = async (task: WeeklyTask) => {
    if (isReadOnly) return;

    if (task.task_type === "planned") {
      // Checked → move to completed
      await supabase.from("weekly_tasks").update({ is_checked: true, task_type: "completed" }).eq("id", task.id);
      const updated: WeeklyTask = { ...task, is_checked: true, task_type: "completed" };
      setTasks(tasks.filter((t) => t.id !== task.id));
      setCompletedTasks([...completedTasks, updated]);
    } else {
      // Unchecked → move back to planned
      await supabase.from("weekly_tasks").update({ is_checked: false, task_type: "planned" }).eq("id", task.id);
      const updated: WeeklyTask = { ...task, is_checked: false, task_type: "planned" };
      setCompletedTasks(completedTasks.filter((t) => t.id !== task.id));
      setTasks([...tasks, updated]);
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

  // Reset report to draft
  const resetReport = async () => {
    if (!report) return;
    const { error } = await supabase
      .from("weekly_reports")
      .update({ status: "draft", submitted_at: null })
      .eq("id", report.id);

    if (!error) {
      refresh();
      toast.success("Report reset to draft");
    } else {
      toast.error("Failed to reset report");
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
      refresh();
      toast.success("Weekly report submitted successfully!");
    } else {
      toast.error("Failed to submit report");
    }
  };

  if (loading) {
    return (
      <PageLayout title="This Week's Report">
        <div className="space-y-4">
          <div className="h-24 bg-muted/60 rounded-xl animate-pulse" />
          <div className="h-40 bg-muted/60 rounded-xl animate-pulse" />
          <div className="h-40 bg-muted/60 rounded-xl animate-pulse" />
        </div>
      </PageLayout>
    );
  }

  const totalTasks = tasks.length + completedTasks.length;

  return (
    <PageLayout
      title="This Week's Report"
      description={report ? formatWeekRange(report.week_start, report.week_end) : "No active week yet"}
      actions={
        <div className="flex items-center gap-2">
          {report && <StatusBadge status={report.status} />}
          {employee && <NewWeekButton employee={employee} onStarted={refresh} />}
        </div>
      }
    >
      <div className="space-y-6">
        {report ? (
          <>
        {isReadOnly && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              This report was submitted on{" "}
              <span className="font-medium text-foreground">
                {report?.submitted_at ? new Date(report.submitted_at).toLocaleString() : "—"}
              </span>{" "}
              and is now read-only.
            </p>
          </div>
        )}

        {/* Section 1: Tasks for This Week */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
                Tasks for This Week
              </CardTitle>
              {totalTasks > 0 && (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {completedTasks.length}/{totalTasks} done
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No planned tasks yet — add what you intend to work on below.</p>
            )}
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 group -mx-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
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
                      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md shrink-0">
                        <Link2 className="h-3 w-3" />
                        Meeting
                      </span>
                    )}
                    {!isReadOnly && (
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
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
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteTask(task)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {!isReadOnly && (
              <div className="flex items-center gap-2 pt-3 mt-2 border-t border-border/60">
                <Input
                  placeholder="Add a task..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  className="h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTask();
                  }}
                />
                <Button size="sm" variant="outline" onClick={addTask} disabled={!newTaskText.trim()} className="shrink-0">
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
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              What I Did This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {completedTasks.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">Nothing logged yet — check off a planned task or add completed work directly.</p>
            )}
            {completedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 group -mx-2 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
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
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0">
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
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteTask(task)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {!isReadOnly && (
              <div className="flex items-center gap-2 pt-3 mt-2 border-t border-border/60">
                <Input
                  placeholder="Add completed work..."
                  value={newCompletedText}
                  onChange={(e) => setNewCompletedText(e.target.value)}
                  className="h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCompletedTask();
                  }}
                />
                <Button size="sm" variant="outline" onClick={addCompletedTask} disabled={!newCompletedText.trim()} className="shrink-0">
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
            <CardTitle className="text-base flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-muted-foreground" />
              Weekly Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write a short note about this week's work, discussion points, challenges, or anything that should be mentioned in the meeting."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadOnly}
              rows={4}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Submit Button */}
        {!isReadOnly && report && (
          <div className="flex justify-end">
            <Button onClick={() => setShowSubmitConfirm(true)} className="gap-2" size="lg">
              <Send className="h-4 w-4" />
              Submit Weekly Report
            </Button>
          </div>
        )}

        {isReadOnly && report && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)} className="gap-2">
              <RotateCcw className="h-3 w-3" />
              Reset to Draft
            </Button>
          </div>
        )}
          </>
        ) : (
          <Card>
            <CardContent className="py-14 text-center space-y-4">
              <div className="inline-flex p-3 bg-accent rounded-full">
                <ListTodo className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No active week yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Click "New Week" to start your weekly checklist, or wait for tasks discussed in Sunday's meeting to be
                  added.
                </p>
              </div>
              {employee && <NewWeekButton employee={employee} onStarted={refresh} />}
            </CardContent>
          </Card>
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

      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reset Report to Draft"
        description="This will set your report back to draft status so you can edit it again. Continue?"
        confirmLabel="Reset"
        onConfirm={resetReport}
      />
    </PageLayout>
  );
}