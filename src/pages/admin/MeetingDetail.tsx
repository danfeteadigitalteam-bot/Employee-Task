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
import { Plus, Trash2, Send, ArrowLeft, CheckCircle2, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import { useWeek } from "@/hooks/useWeek";
import { printMeetingMinutes } from "@/lib/printMeeting";
import type { Meeting, MeetingTask, MeetingDepartmentNote, Employee } from "@/types/database";

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
  const [departmentNotes, setDepartmentNotes] = useState<MeetingDepartmentNote[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [overallMinutes, setOverallMinutes] = useState("");

  const [newTaskEmployee, setNewTaskEmployee] = useState("");
  const [newTaskText, setNewTaskText] = useState("");
  const [nextWeekStart, setNextWeekStart] = useState(week.weekStartStr);

  const fetchData = useCallback(async () => {
    if (!id) return;

    // First: get the meeting
    const { data: meetingData } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!meetingData) return;
    setMeeting(meetingData as Meeting);
    setOverallMinutes(meetingData.overall_minutes || "");

    // Parallelize all independent queries
    const [tasksRes, notesRes, empsRes] = await Promise.all([
      supabase
        .from("meeting_tasks")
        .select("*, employees(full_name, employee_code, department_id), departments(name)")
        .eq("meeting_id", id)
        .order("created_at"),
      supabase
        .from("meeting_department_notes")
        .select("*, employees(full_name, employee_code), departments(name)")
        .eq("meeting_id", id)
        .order("created_at"),
      supabase
        .from("employees")
        .select("*, departments(name)")
        .eq("is_active", true)
        .neq("role", "admin")
        .order("full_name"),
    ]);

    // Process tasks
    const empMap = new Map<string, EmployeeTasks>();
    if (tasksRes.data) {
      for (const task of tasksRes.data as any[]) {
        const empId = task.employee_id;
        if (!empMap.has(empId)) {
          empMap.set(empId, { employee: task.employees, tasks: [], submitted: false });
        }
        empMap.get(empId)!.tasks.push(task);
      }
    }
    for (const [, group] of empMap) {
      group.submitted = group.tasks.some((t) => t.source === "employee" && t.status === "submitted");
    }
    setEmployeeGroups(Array.from(empMap.values()).sort((a, b) =>
      a.employee.full_name.localeCompare(b.employee.full_name)
    ));

    if (notesRes.data) setDepartmentNotes(notesRes.data as any);
    if (empsRes.data) setAllEmployees(empsRes.data as any);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription for meeting changes
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`meeting-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_department_notes", filter: `meeting_id=eq.${id}` },
        () => { fetchData(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_tasks", filter: `meeting_id=eq.${id}` },
        () => { fetchData(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchData]);

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
      // Also copy to weekly_tasks so it appears in employee's weekly report
      const { data: existingReport } = await supabase
        .from("weekly_reports")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("week_start", nextWeekStart)
        .maybeSingle();

      let reportId = existingReport?.id;

      if (!reportId) {
        const weekEnd = new Date(nextWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const { data: newReport } = await supabase
          .from("weekly_reports")
          .insert({
            employee_id: emp.id,
            department_id: emp.department_id,
            week_start: nextWeekStart,
            week_end: weekEnd.toISOString().split("T")[0],
            status: "draft",
          })
          .select("id")
          .maybeSingle();
        reportId = newReport?.id;
      }

      if (reportId) {
        const { data: maxOrder } = await supabase
          .from("weekly_tasks")
          .select("sort_order")
          .eq("report_id", reportId)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        await supabase.from("weekly_tasks").insert({
          report_id: reportId,
          employee_id: emp.id,
          task_type: "planned",
          task_text: newTaskText.trim(),
          source: "meeting",
          sort_order: (maxOrder?.sort_order ?? -1) + 1,
        });
      }

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

    // Meeting Agenda section
    if (meeting!.agenda_content) {
      text += `--- Meeting Agenda ---\n\n${meeting!.agenda_content}\n\n`;
    }

    // Employee tasks section
    const employeesWithTasks = employeeGroups.filter((g) => g.tasks.length > 0);
    if (employeesWithTasks.length > 0) {
      text += `--- Employee Tasks ---\n\n`;
      employeeGroups.forEach((group) => {
        if (group.tasks.length === 0) return;
        const empTasks = group.tasks.filter((t) => t.source === "employee");
        const adminTasks = group.tasks.filter((t) => t.source === "admin");

        text += `${group.employee.full_name} (${group.employee.employee_code})\n`;

        if (empTasks.length > 0) {
          const completed = empTasks.filter((t) => t.is_checked);
          const incomplete = empTasks.filter((t) => !t.is_checked);
          if (completed.length > 0) {
            text += `  Completed:\n`;
            completed.forEach((t) => { text += `    ✓ ${t.task_text}\n`; });
          }
          if (incomplete.length > 0) {
            text += `  Incomplete:\n`;
            incomplete.forEach((t) => { text += `    ○ ${t.task_text}\n`; });
          }
        }
        if (adminTasks.length > 0) {
          const completed = adminTasks.filter((t) => t.is_checked);
          const incomplete = adminTasks.filter((t) => !t.is_checked);
          if (completed.length > 0) {
            text += `  Assigned by Admin (Completed):\n`;
            completed.forEach((t) => { text += `    ✓ ${t.task_text}\n`; });
          }
          if (incomplete.length > 0) {
            text += `  Assigned by Admin (Incomplete):\n`;
            incomplete.forEach((t) => { text += `    ○ ${t.task_text}\n`; });
          }
        }
        text += `\n`;
      });
    }

    // Discussion & Decisions section from department notes
    const notesWithContent = departmentNotes.filter(
      (n) => (n.discussion && n.discussion.trim()) || (n.decisions && n.decisions.trim())
    );
    if (notesWithContent.length > 0) {
      text += `--- Discussion & Decisions ---\n\n`;
      notesWithContent.forEach((note) => {
        const empName = (note as any).employees?.full_name || "Unknown";
        const empCode = (note as any).employees?.employee_code || "";
        text += `${empName} (${empCode})\n`;
        if (note.discussion && note.discussion.trim()) {
          text += `  Discussion:\n    ${note.discussion.trim().replace(/\n/g, "\n    ")}\n`;
        }
        if (note.decisions && note.decisions.trim()) {
          text += `  Decisions:\n    ${note.decisions.trim().replace(/\n/g, "\n    ")}\n`;
        }
        text += `\n`;
      });
    }

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

  const downloadPDF = () => {
    if (!meeting) return;
    const dateStr = new Date(meeting.meeting_date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    let contentHtml = "";

    if (meeting.agenda_content) {
      contentHtml += `<div class="section"><h2>Meeting Agenda</h2><div class="discussion">${meeting.agenda_content}</div></div>`;
    }

    if (employeeGroups.length > 0) {
      contentHtml += `<div class="section"><h2>Employee Tasks</h2>`;
      employeeGroups.forEach((group) => {
        if (group.tasks.length === 0) return;
        const empTasks = group.tasks.filter((t) => t.source === "employee");
        const adminTasks = group.tasks.filter((t) => t.source === "admin");
        contentHtml += `<h3>${group.employee.full_name} (${group.employee.employee_code})</h3>`;
        if (empTasks.length > 0) {
          contentHtml += `<ul class="task-list">`;
          empTasks.forEach((t) => {
            contentHtml += `<li class="${t.is_checked ? "checked" : "unchecked"}">${t.is_checked ? "✓" : "○"} ${t.task_text}</li>`;
          });
          contentHtml += `</ul>`;
        }
        if (adminTasks.length > 0) {
          contentHtml += `<p class="label">Assigned by Admin:</p><ul class="task-list">`;
          adminTasks.forEach((t) => {
            contentHtml += `<li class="${t.is_checked ? "checked" : "unchecked"}">${t.is_checked ? "✓" : "○"} ${t.task_text} <span style="color:#999;font-size:0.75rem">(Week of ${t.assigned_week_start})</span></li>`;
          });
          contentHtml += `</ul>`;
        }
      });
      contentHtml += `</div>`;
    }

    const notesWithContent = departmentNotes.filter(
      (n) => (n.discussion && n.discussion.trim()) || (n.decisions && n.decisions.trim())
    );
    if (notesWithContent.length > 0) {
      contentHtml += `<div class="section"><h2>Discussion &amp; Decisions</h2>`;
      notesWithContent.forEach((note) => {
        const empName = (note as any).employees?.full_name || "Unknown";
        if (note.discussion && note.discussion.trim()) {
          contentHtml += `<p class="label">${empName} — Discussion</p><div class="discussion">${note.discussion}</div>`;
        }
        if (note.decisions && note.decisions.trim()) {
          contentHtml += `<p class="label">${empName} — Decisions</p><div class="decision">${note.decisions}</div>`;
        }
      });
      contentHtml += `</div>`;
    }

    if (overallMinutes) {
      contentHtml += `<div class="section"><h2>Overall Meeting Minutes</h2><div class="discussion">${overallMinutes}</div></div>`;
    }

    printMeetingMinutes(meeting.title, dateStr, contentHtml);
  };

  const publishMeeting = async () => {
    if (!id) return;
    setIsPublishing(true);

    const allTasks = employeeGroups.flatMap((g) => g.tasks);

    // Group tasks by employee and week
    const tasksByEmployeeWeek = new Map<string, typeof allTasks>();
    for (const task of allTasks) {
      const key = `${task.employee_id}::${task.assigned_week_start}`;
      if (!tasksByEmployeeWeek.has(key)) {
        tasksByEmployeeWeek.set(key, []);
      }
      tasksByEmployeeWeek.get(key)!.push(task);
    }

    // Process each employee/week group
    const insertPromises: any[] = [];
    for (const [key, empTasks] of tasksByEmployeeWeek) {
      const [empId, weekStart] = key.split("::");

      // Find existing report
      const { data: existingReport } = await supabase
        .from("weekly_reports")
        .select("id")
        .eq("employee_id", empId)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (existingReport) {
        await Promise.all([
          supabase.from("weekly_tasks").delete().eq("report_id", existingReport.id).eq("source", "meeting"),
          supabase.from("weekly_reports").update({ status: "draft", submitted_at: null }).eq("id", existingReport.id),
        ]);
      }

      let reportId = existingReport?.id;

      if (!reportId) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const { data: newReport } = await supabase
          .from("weekly_reports")
          .insert({
            employee_id: empId,
            department_id: empTasks[0].department_id,
            week_start: weekStart,
            week_end: weekEnd.toISOString().split("T")[0],
            status: "draft",
          })
          .select("id")
          .maybeSingle();
        reportId = newReport?.id;
      }

      if (!reportId) continue;

      // Batch insert all tasks for this employee/week in one query
      insertPromises.push(
        supabase.from("weekly_tasks").insert(
          empTasks.map((task, i) => ({
            report_id: reportId,
            employee_id: task.employee_id,
            task_type: "planned",
            task_text: task.task_text,
            source: "meeting",
            sort_order: i,
          }))
        )
      );
    }

    // Execute all batch inserts in parallel
    await Promise.all(insertPromises);

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
      toast.success("Meeting published. Tasks added to employee weekly reports.");
    } else {
      toast.error("Failed to publish");
    }
  };

  const deleteMeeting = async () => {
    if (!id) return;
    setIsDeleting(true);
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    if (!error) {
      toast.success("Meeting deleted");
      navigate("/admin/meetings");
    } else {
      toast.error("Failed to delete meeting");
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
          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          {meeting.status === "draft" && (
            <Button size="sm" onClick={() => setShowPublishConfirm(true)} className="gap-1" disabled={isPublishing}>
              <Send className="h-3 w-3" />
              Publish
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={downloadPDF} className="gap-1">
            <Download className="h-3 w-3" />
            PDF
          </Button>
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

        {/* Meeting Agenda */}
        {meeting.agenda_content && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meeting Agenda</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg border">
                {meeting.agenda_content}
              </div>
            </CardContent>
          </Card>
        )}

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
                      <span className={`flex-1 text-sm ${task.is_checked ? "line-through text-muted-foreground" : ""}`}>{task.task_text}</span>
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

        {/* Employee Discussion & Decisions */}
        {departmentNotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employee Discussion & Decisions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {departmentNotes.map((note) => {
                const empName = (note as any).employees?.full_name || "Unknown";
                const empCode = (note as any).employees?.employee_code || "";
                const hasContent = (note.discussion && note.discussion.trim()) || (note.decisions && note.decisions.trim());
                if (!hasContent) return null;
                return (
                  <div key={note.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {empName}
                        <span className="text-xs text-muted-foreground font-normal ml-2">{empCode}</span>
                      </p>
                      {note.status === "submitted" && (
                        <Badge variant="default" className="gap-1 text-xs">
                          <CheckCircle2 className="h-3 w-3" />
                          Submitted
                        </Badge>
                      )}
                    </div>
                    {note.discussion && note.discussion.trim() && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Discussion</p>
                        <p className="text-sm whitespace-pre-wrap bg-muted/50 p-2 rounded">{note.discussion}</p>
                      </div>
                    )}
                    {note.decisions && note.decisions.trim() && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Decisions</p>
                        <p className="text-sm whitespace-pre-wrap bg-muted/50 p-2 rounded">{note.decisions}</p>
                      </div>
                    )}
                  </div>
                );
              })}
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

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Meeting"
        description="Are you sure you want to delete this meeting? All tasks, notes, and minutes will be permanently removed. This action cannot be undone."
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={deleteMeeting}
      />
    </PageLayout>
  );
}
