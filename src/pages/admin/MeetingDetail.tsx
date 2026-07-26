import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Send, ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useWeek } from "@/hooks/useWeek";
import type { Meeting, MeetingTask, Employee } from "@/types/database";

interface EmployeeTasks {
  employee: Employee;
  tasks: MeetingTask[];
  submitted: boolean;
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const week = useWeek();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeTasks[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [overallMinutes, setOverallMinutes] = useState("");

  const [newTaskEmployee, setNewTaskEmployee] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [nextWeekStart, setNextWeekStart] = useState(week.weekStartStr);

  const fetchData = useCallback(async () => {
    if (!id) return;

    const { data: meetingData } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .single();

    if (!meetingData) return;
    setMeeting(meetingData as Meeting);
    setOverallMinutes(meetingData.overall_minutes || "");

    // Fetch all tasks for this meeting
    const { data: tasks } = await supabase
      .from("meeting_tasks")
      .select("*, employees(full_name, employee_code, department_id), departments(name)")
      .eq("meeting_id", id)
      .order("created_at");

    // Group tasks by employee
    const empMap = new Map<string, EmployeeTasks>();

    if (tasks) {
      for (const task of tasks as any[]) {
        const empId = task.employee_id;
        if (!empMap.has(empId)) {
          empMap.set(empId, {
            employee: task.employees,
            tasks: [],
            submitted: false,
          });
        }
        empMap.get(empId)!.tasks.push(task);
      }
    }

    // Check submission status per employee
    for (const [, group] of empMap) {
      const hasSubmitted = group.tasks.some((t) => t.source === "employee" && t.status === "submitted");
      group.submitted = hasSubmitted;
    }

    setEmployeeGroups(Array.from(empMap.values()).sort((a, b) =>
      a.employee.full_name.localeCompare(b.employee.full_name)
    ));

    // Fetch all active employees
    const { data: emps } = await supabase
      .from("employees")
      .select("*, departments(name)")
      .eq("is_active", true)
      .neq("role", "admin")
      .order("full_name");

    if (emps) setAllEmployees(emps as any);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addTask = async () => {
    if (!id || !newTaskEmployee || !newTaskText.trim()) return;

    const emp = allEmployees.find((e) => e.id === newTaskEmployee);
    if (!emp) return;

    const { data, error } = await supabase
      .from("meeting_tasks")
      .insert({
        meeting_id: id,
        employee_id: emp.id,
        department_id: emp.department_id,
        task_text: newTaskText.trim(),
        source: "admin",
        status: "submitted",
        is_checked: false,
        assigned_week_start: nextWeekStart,
      })
      .select("*, employees(full_name, employee_code, department_id), departments(name)")
      .single();

    if (data && !error) {
      setNewTaskText("");
      setNewTaskEmployee("");
      fetchData();
    }
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("meeting_tasks").delete().eq("id", taskId);
    fetchData();
  };

  const generateMinutes = () => {
    const dateStr = new Date(meeting!.meeting_date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let text = `Meeting Minutes - ${meeting!.title}\nDate: ${dateStr}\n\n`;

    employeeGroups.forEach((group) => {
      const empTasks = group.tasks.filter((t) => t.source === "employee");
      const adminTasks = group.tasks.filter((t) => t.source === "admin");

      text += `${group.employee.full_name} (${group.employee.employee_code})\n`;

      if (empTasks.length > 0) {
        text += `  Tasks:\n`;
        empTasks.forEach((t) => { text += `    - ${t.task_text}\n`; });
      }
      if (adminTasks.length > 0) {
        text += `  Assigned by Admin:\n`;
        adminTasks.forEach((t) => { text += `    - ${t.task_text}\n`; });
      }
      text += `\n`;
    });

    setOverallMinutes(text);
    toast.success("Minutes generated");
  };

  const saveMinutes = async () => {
    if (!id) return;

    const { error } = await supabase
      .from("meetings")
      .update({ overall_minutes: overallMinutes })
      .eq("id", id);

    if (!error) {
      setMeeting({ ...meeting!, overall_minutes: overallMinutes });
      toast.success("Minutes saved");
    }
  };

  const publishMeeting = async () => {
    if (!id) return;
    setIsPublishing(true);

    // Copy all tasks to weekly_tasks
    const allTasks = employeeGroups.flatMap((g) => g.tasks);

    for (const task of allTasks) {
      const { data: existing } = await supabase
        .from("weekly_tasks")
        .select("id")
        .eq("employee_id", task.employee_id)
        .eq("task_text", task.task_text)
        .eq("source", "meeting")
        .single();

      if (!existing) {
        const { data: existingReport } = await supabase
          .from("weekly_reports")
          .select("id")
          .eq("employee_id", task.employee_id)
          .eq("week_start", task.assigned_week_start)
          .single();

        let reportId = existingReport?.id;

        if (!reportId) {
          const weekEnd = new Date(task.assigned_week_start);
          weekEnd.setDate(weekEnd.getDate() + 6);

          const { data: newReport } = await supabase
            .from("weekly_reports")
            .insert({
              employee_id: task.employee_id,
              department_id: task.department_id,
              week_start: task.assigned_week_start,
              week_end: weekEnd.toISOString().split("T")[0],
              status: "draft",
            })
            .select("id")
            .single();

          reportId = newReport?.id;
        }

        if (reportId) {
          const { data: maxOrder } = await supabase
            .from("weekly_tasks")
            .select("sort_order")
            .eq("report_id", reportId)
            .order("sort_order", { ascending: false })
            .limit(1)
            .single();

          await supabase.from("weekly_tasks").insert({
            report_id: reportId,
            employee_id: task.employee_id,
            task_type: "planned",
            task_text: task.task_text,
            source: "meeting",
            sort_order: (maxOrder?.sort_order ?? -1) + 1,
          });
        }
      }
    }

    const { error } = await supabase
      .from("meetings")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        overall_minutes: overallMinutes,
      })
      .eq("id", id);

    setIsPublishing(false);
    setShowPublishConfirm(false);

    if (!error) {
      setMeeting({ ...meeting!, status: "published", published_at: new Date().toISOString() });
      toast.success("Meeting published. Tasks added to employee checklists.");
    } else {
      toast.error("Failed to publish");
    }
  };

  if (!meeting) {
    return (
      <PageLayout title="Meeting">
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </PageLayout>
    );
  }

  const totalTasks = employeeGroups.reduce((sum, g) => sum + g.tasks.length, 0);
  const submittedCount = employeeGroups.filter((g) => g.submitted).length;

  return (
    <PageLayout
      title={meeting.title}
      description={new Date(meeting.meeting_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
      actions={
        <div className="flex items-center gap-2">
          <StatusBadge status={meeting.status} />
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/meetings")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          {meeting.status === "draft" && (
            <Button size="sm" onClick={() => setShowPublishConfirm(true)} className="gap-1" disabled={isPublishing}>
              <Send className="h-3 w-3" />
              Publish
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Status Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Employee Tasks</p>
                <p className="text-xs text-muted-foreground">
                  {submittedCount} of {employeeGroups.length} employees submitted · {totalTasks} total tasks
                </p>
              </div>
              {meeting.status === "draft" && totalTasks > 0 && (
                <Button variant="outline" size="sm" onClick={generateMinutes} className="gap-1">
                  Generate Minutes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employee Tasks */}
        {employeeGroups.map((group) => (
          <Card key={group.employee.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {group.employee.full_name}
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    {group.employee.employee_code}
                  </span>
                </CardTitle>
                {group.submitted ? (
                  <Badge variant="default" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Submitted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {group.tasks.length > 0 ? (
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-2 rounded border">
                      <Checkbox checked={task.is_checked} disabled />
                      <span className="flex-1 text-sm">{task.task_text}</span>
                      <Badge variant={task.source === "admin" ? "secondary" : "outline"} className="text-xs">
                        {task.source === "admin" ? "Admin" : "Employee"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Week of {task.assigned_week_start}
                      </span>
                      {meeting.status === "draft" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-red-500"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              )}
            </CardContent>
          </Card>
        ))}

        {employeeGroups.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No employee tasks yet. Employees will add their checklists in the meeting.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Overall Minutes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Overall Meeting Minutes</CardTitle>
              {meeting.status === "draft" && overallMinutes && (
                <Button variant="outline" size="sm" onClick={() => {}}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {overallMinutes ? (
              <Textarea
                value={overallMinutes}
                onChange={(e) => setOverallMinutes(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                disabled={meeting.status === "published"}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Click "Generate Minutes" to compile all tasks into meeting minutes.
              </p>
            )}
            {meeting.status === "draft" && overallMinutes && (
              <Button size="sm" onClick={saveMinutes} className="mt-2">Save Minutes</Button>
            )}
          </CardContent>
        </Card>

        {/* Add Admin Task */}
        {meeting.status === "draft" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Task for Employee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={newTaskEmployee} onValueChange={(v) => setNewTaskEmployee(v ?? "")}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Task description..."
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                  />
                  <Button onClick={addTask} disabled={!newTaskEmployee || !newTaskText.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs whitespace-nowrap">Week of:</Label>
                  <Input
                    type="date"
                    value={nextWeekStart}
                    onChange={(e) => setNextWeekStart(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={showPublishConfirm}
        onOpenChange={setShowPublishConfirm}
        title="Publish Meeting"
        description="This will publish the meeting and add all tasks to employee weekly checklists. Continue?"
        confirmLabel="Publish"
        onConfirm={publishMeeting}
      />
    </PageLayout>
  );
}
