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
import { Plus, Trash2, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useWeek } from "@/hooks/useWeek";
import type { Meeting, MeetingDepartmentNote, MeetingTask, Employee, Department } from "@/types/database";

interface DeptWithNotes extends Department {
  notes?: MeetingDepartmentNote;
}

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const week = useWeek();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [departments, setDepartments] = useState<DeptWithNotes[]>([]);
  const [meetingTasks, setMeetingTasks] = useState<MeetingTask[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // New task form
  const [newTaskEmployee, setNewTaskEmployee] = useState("");
  const [newTaskText, setNewTaskText] = useState("");

  // Next week assignment
  const [nextWeekStart, setNextWeekStart] = useState(week.nextWeek.weekStartStr);

  const fetchData = useCallback(async () => {
    if (!id) return;

    const { data: meetingData } = await supabase
      .from("meetings")
      .select("*")
      .eq("id", id)
      .single();

    if (meetingData) {
      setMeeting(meetingData as Meeting);

      // Fetch department notes
      const { data: notes } = await supabase
        .from("meeting_department_notes")
        .select("*, departments(name)")
        .eq("meeting_id", id);

      // Fetch departments
      const { data: depts } = await supabase.from("departments").select("*").order("name");

      if (depts && notes) {
        const deptWithNotes = (depts as Department[]).map((dept) => {
          const note = (notes as any[]).find((n) => n.department_id === dept.id);
          return { ...dept, notes: note || null };
        });
        setDepartments(deptWithNotes);
      }

      // Fetch meeting tasks
      const { data: tasks } = await supabase
        .from("meeting_tasks")
        .select("*, employees(full_name, employee_code), departments(name)")
        .eq("meeting_id", id)
        .order("created_at");

      if (tasks) setMeetingTasks(tasks as any);

      // Fetch all active employees
      const { data: emps } = await supabase
        .from("employees")
        .select("*, departments(name)")
        .eq("is_active", true)
        .order("full_name");

      if (emps) setAllEmployees(emps as any);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update discussion/decisions
  const updateNotes = async (deptId: string, field: "discussion" | "decisions", value: string) => {
    if (!id) return;

    const dept = departments.find((d) => d.id === deptId);
    if (!dept?.notes) return;

    await supabase
      .from("meeting_department_notes")
      .update({ [field]: value })
      .eq("id", dept.notes.id);

    setDepartments(
      departments.map((d) =>
        d.id === deptId
          ? { ...d, notes: { ...d.notes!, [field]: value } }
          : d
      )
    );
  };

  // Add meeting task
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
        is_checked: false,
        assigned_week_start: nextWeekStart,
      })
      .select("*, employees(full_name, employee_code), departments(name)")
      .single();

    if (data && !error) {
      setMeetingTasks([...meetingTasks, data as any]);
      setNewTaskText("");
      setNewTaskEmployee("");
    }
  };

  // Delete meeting task
  const deleteTask = async (taskId: string) => {
    await supabase.from("meeting_tasks").delete().eq("id", taskId);
    setMeetingTasks(meetingTasks.filter((t) => t.id !== taskId));
  };

  // Publish meeting
  const publishMeeting = async () => {
    if (!id) return;
    setIsPublishing(true);

    // Update meeting status
    const { error } = await supabase
      .from("meetings")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to publish meeting");
      setIsPublishing(false);
      setShowPublishConfirm(false);
      return;
    }

    // Create weekly tasks from meeting tasks
    for (const task of meetingTasks) {
      if (task.is_checked) continue;

      // Find or create report for the assigned week
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
        // Check for duplicate
        const { data: existing } = await supabase
          .from("weekly_tasks")
          .select("id")
          .eq("report_id", reportId)
          .eq("task_text", task.task_text)
          .eq("source", "meeting")
          .single();

        if (!existing) {
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

    setIsPublishing(false);
    setShowPublishConfirm(false);
    setMeeting({ ...meeting!, status: "published", published_at: new Date().toISOString() });
    toast.success("Meeting published. Tasks assigned to employees.");
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
          {meeting.status === "draft" && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/meetings")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button size="sm" onClick={() => setShowPublishConfirm(true)} className="gap-1" disabled={isPublishing}>
                <Send className="h-3 w-3" />
                Publish
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Attendees */}
        {meeting.attendees && meeting.attendees.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">ATTENDEES</p>
              <div className="flex flex-wrap gap-2">
                {meeting.attendees.map((name, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Department Discussions */}
        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardHeader>
              <CardTitle className="text-base">{dept.name} Department</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Discussion</Label>
                <Textarea
                  placeholder={`Discuss ${dept.name} department topics...`}
                  value={dept.notes?.discussion || ""}
                  onChange={(e) => updateNotes(dept.id, "discussion", e.target.value)}
                  disabled={meeting.status === "published"}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Decisions & Strategies</Label>
                <Textarea
                  placeholder="Record decisions and strategies..."
                  value={dept.notes?.decisions || ""}
                  onChange={(e) => updateNotes(dept.id, "decisions", e.target.value)}
                  disabled={meeting.status === "published"}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Next-Week Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next-Week Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {meetingTasks.length > 0 && (
              <div className="space-y-2">
                {meetingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded border">
                    <Checkbox checked={task.is_checked} disabled />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{task.task_text}</p>
                      <p className="text-xs text-muted-foreground">
                        {(task as any).employees?.full_name} · Week of {task.assigned_week_start}
                      </p>
                    </div>
                    {meeting.status === "draft" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {meeting.status === "draft" && (
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
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showPublishConfirm}
        onOpenChange={setShowPublishConfirm}
        title="Publish Meeting Minutes"
        description="This will publish the meeting minutes, make them visible to employees, and assign tasks to employee checklists. Continue?"
        confirmLabel="Publish"
        onConfirm={publishMeeting}
      />
    </PageLayout>
  );
}
