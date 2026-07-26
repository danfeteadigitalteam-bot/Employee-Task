import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useWeek } from "@/hooks/useWeek";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Plus, Trash2, Send, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Meeting, MeetingTask } from "@/types/database";

export default function EmployeeMeetings() {
  const { employee } = useAuth();
  const week = useWeek();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [myTasks, setMyTasks] = useState<MeetingTask[]>([]);
  const [adminTasks, setAdminTasks] = useState<MeetingTask[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (!employee) return;

    const fetchMeetings = async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .order("meeting_date", { ascending: false });

      if (data) setMeetings(data as Meeting[]);
    };

    fetchMeetings();
  }, [employee]);

  const openMeeting = async (meeting: Meeting) => {
    if (!employee) return;
    setSelectedMeeting(meeting);

    // Fetch my tasks for this meeting
    const { data: myTasksData, error: myTasksError } = await supabase
      .from("meeting_tasks")
      .select("*")
      .eq("meeting_id", meeting.id)
      .eq("employee_id", employee.id)
      .eq("source", "employee")
      .order("created_at");

    if (myTasksError) {
      console.error("Fetch tasks error:", myTasksError);
      toast.error("Failed to load tasks: " + myTasksError.message);
      setMyTasks([]);
      setHasSubmitted(false);
    } else if (myTasksData) {
      setMyTasks(myTasksData as MeetingTask[]);
      setHasSubmitted(myTasksData.some((t) => t.status === "submitted"));
    } else {
      setMyTasks([]);
      setHasSubmitted(false);
    }

    // Fetch admin-assigned tasks for this employee
    const { data: adminTasksData } = await supabase
      .from("meeting_tasks")
      .select("*")
      .eq("meeting_id", meeting.id)
      .eq("employee_id", employee.id)
      .eq("source", "admin")
      .order("created_at");

    setAdminTasks((adminTasksData as MeetingTask[]) || []);
  };

  const addTask = async () => {
    if (!selectedMeeting || !employee || !newTaskText.trim()) return;

    const { data, error } = await supabase
      .from("meeting_tasks")
      .insert({
        meeting_id: selectedMeeting.id,
        employee_id: employee.id,
        department_id: employee.department_id,
        task_text: newTaskText.trim(),
        source: "employee",
        status: "draft",
        is_checked: false,
        assigned_week_start: week.weekStartStr,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Add task error:", error);
      toast.error("Failed to add task: " + error.message);
      return;
    }

    if (data) {
      setMyTasks([...myTasks, data as MeetingTask]);
      setNewTaskText("");
    }
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("meeting_tasks").delete().eq("id", taskId);
    setMyTasks(myTasks.filter((t) => t.id !== taskId));
  };

  const submitTasks = async () => {
    if (!employee || myTasks.length === 0) return;
    setIsSubmitting(true);

    // Mark all my tasks as submitted
    await supabase
      .from("meeting_tasks")
      .update({ status: "submitted" })
      .eq("meeting_id", selectedMeeting!.id)
      .eq("employee_id", employee.id)
      .eq("source", "employee")
      .eq("status", "draft");

    // Copy tasks to weekly_tasks
    for (const task of myTasks) {
      const { data: existing } = await supabase
        .from("weekly_tasks")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("task_text", task.task_text)
        .eq("source", "meeting")
        .single();

      if (!existing) {
        // Find or create report for the assigned week
        const { data: existingReport } = await supabase
          .from("weekly_reports")
          .select("id")
          .eq("employee_id", employee.id)
          .eq("week_start", task.assigned_week_start)
          .single();

        let reportId = existingReport?.id;

        if (!reportId) {
          const weekEnd = new Date(task.assigned_week_start);
          weekEnd.setDate(weekEnd.getDate() + 6);

          const { data: newReport } = await supabase
            .from("weekly_reports")
            .insert({
              employee_id: employee.id,
              department_id: employee.department_id,
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
            employee_id: employee.id,
            task_type: "planned",
            task_text: task.task_text,
            source: "meeting",
            sort_order: (maxOrder?.sort_order ?? -1) + 1,
          });
        }
      }
    }

    setMyTasks(myTasks.map((t) => ({ ...t, status: "submitted" as const })));
    setHasSubmitted(true);
    setIsSubmitting(false);
    toast.success("Tasks submitted and added to your weekly checklist!");
  };

  return (
    <PageLayout title="Meeting Minutes" description="Add your task checklist and view meeting details">
      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No meetings yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Card
              key={meeting.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => openMeeting(meeting)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(meeting.meeting_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={meeting.status === "published" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {meeting.status === "published" ? "Published" : "Open for Input"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Meeting Detail Dialog */}
      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMeeting?.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedMeeting && new Date(selectedMeeting.meeting_date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Published meeting - show tasks */}
            {selectedMeeting?.status === "published" && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">MEETING TASKS</p>
                {selectedMeeting.overall_minutes ? (
                  <div className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {selectedMeeting.overall_minutes}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No minutes recorded.</p>
                )}
              </div>
            )}

            {/* Draft meeting - task checklist */}
            {selectedMeeting?.status === "draft" && (
              <>
                {/* Admin-assigned tasks */}
                {adminTasks.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tasks Assigned by Admin</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {adminTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={task.is_checked} disabled />
                            <span>{task.task_text}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              Week of {task.assigned_week_start}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Employee's own tasks */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Your Task Checklist</CardTitle>
                      {hasSubmitted && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Submitted
                        </Badge>
                      )}
                      {!hasSubmitted && myTasks.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Draft
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {myTasks.length > 0 && (
                      <div className="space-y-2">
                        {myTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={task.is_checked} disabled />
                            <span className="flex-1">{task.task_text}</span>
                            <span className="text-xs text-muted-foreground">
                              Week of {task.assigned_week_start}
                            </span>
                            {!hasSubmitted && (
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
                    )}

                    {myTasks.length === 0 && !hasSubmitted && (
                      <p className="text-sm text-muted-foreground">
                        Add your planned tasks for next week below.
                      </p>
                    )}

                    {!hasSubmitted && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a task for next week..."
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                        />
                        <Button onClick={addTask} disabled={!newTaskText.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {!hasSubmitted && myTasks.length > 0 && (
                      <Button onClick={submitTasks} disabled={isSubmitting} className="gap-2">
                        <Send className="h-4 w-4" />
                        {isSubmitting ? "Submitting..." : "Submit Tasks"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
