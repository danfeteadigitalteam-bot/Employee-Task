import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useWeek } from "@/hooks/useWeek";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Plus, Trash2, Send, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Meeting, MeetingTask } from "@/types/database";

export default function EmployeeMeetings() {
  const { employee } = useAuth();
  const week = useWeek();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [myTasks, setMyTasks] = useState<MeetingTask[]>([]);
  const [adminTasks, setAdminTasks] = useState<MeetingTask[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [myNoteId, setMyNoteId] = useState<string | null>(null);
  const [discussion, setDiscussion] = useState("");
  const [decisions, setDecisions] = useState("");

  useEffect(() => {
    if (!employee) return;
    let cancelled = false;
    const fetchMeetings = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .order("meeting_date", { ascending: false });
      if (!cancelled) {
        if (data) setMeetings(data as Meeting[]);
        setLoading(false);
      }
    };
    fetchMeetings();
    return () => { cancelled = true; };
  }, [employee]);

  const openMeeting = async (meeting: Meeting) => {
    if (!employee) return;
    setSelectedMeeting(meeting);
    setDialogLoading(true);
    // Reset stale state immediately
    setMyTasks([]);
    setAdminTasks([]);
    setHasSubmitted(false);
    setMyNoteId(null);
    setDiscussion("");
    setDecisions("");

    // Parallelize all three independent queries
    const [myTasksRes, adminTasksRes, noteRes] = await Promise.all([
      supabase
        .from("meeting_tasks")
        .select("*")
        .eq("meeting_id", meeting.id)
        .eq("employee_id", employee.id)
        .eq("source", "employee")
        .order("created_at"),
      supabase
        .from("meeting_tasks")
        .select("*")
        .eq("meeting_id", meeting.id)
        .eq("employee_id", employee.id)
        .eq("source", "admin")
        .order("created_at"),
      supabase
        .from("meeting_department_notes")
        .select("*")
        .eq("meeting_id", meeting.id)
        .eq("employee_id", employee.id)
        .single(),
    ]);

    // Process my tasks
    if (myTasksRes.error) {
      toast.error("Failed to load tasks");
    } else if (myTasksRes.data) {
      setMyTasks(myTasksRes.data as MeetingTask[]);
      setHasSubmitted(myTasksRes.data.some((t: any) => t.status === "submitted"));
    }

    // Process admin tasks
    setAdminTasks((adminTasksRes.data as MeetingTask[]) || []);

    // Process notes
    const myNote = noteRes.data;
    if (myNote) {
      setMyNoteId(myNote.id);
      setDiscussion(myNote.discussion || "");
      setDecisions(myNote.decisions || "");
      if (myNote.status === "submitted") setHasSubmitted(true);
    }

    setDialogLoading(false);
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

  const toggleTask = async (task: MeetingTask) => {
    const newChecked = !task.is_checked;
    await supabase.from("meeting_tasks").update({ is_checked: newChecked }).eq("id", task.id);
    setMyTasks(myTasks.map((t) => (t.id === task.id ? { ...t, is_checked: newChecked } : t)));
  };

  const toggleAdminTask = async (task: MeetingTask) => {
    const newChecked = !task.is_checked;
    await supabase.from("meeting_tasks").update({ is_checked: newChecked }).eq("id", task.id);
    setAdminTasks(adminTasks.map((t) => (t.id === task.id ? { ...t, is_checked: newChecked } : t)));
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("meeting_tasks").delete().eq("id", taskId);
    setMyTasks(myTasks.filter((t) => t.id !== taskId));
  };

  const submitTasks = async () => {
    if (!employee || !selectedMeeting) return;
    setIsSubmitting(true);

    // Save discussion/decisions to meeting_department_notes
    if (myNoteId) {
      await supabase
        .from("meeting_department_notes")
        .update({
          discussion: discussion.trim(),
          decisions: decisions.trim(),
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", myNoteId);
    } else if (discussion.trim() || decisions.trim()) {
      const { data: newNote } = await supabase
        .from("meeting_department_notes")
        .insert({
          meeting_id: selectedMeeting.id,
          employee_id: employee.id,
          department_id: employee.department_id,
          discussion: discussion.trim(),
          decisions: decisions.trim(),
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (newNote) setMyNoteId(newNote.id);
    }

    // Mark all my tasks as submitted
    await supabase
      .from("meeting_tasks")
      .update({ status: "submitted" })
      .eq("meeting_id", selectedMeeting.id)
      .eq("employee_id", employee.id)
      .eq("source", "employee")
      .eq("status", "draft");

    // Find or create report once (not per task)
    let reportId: string | null = null;
    const { data: existingReport } = await supabase
      .from("weekly_reports")
      .select("id")
      .eq("employee_id", employee.id)
      .eq("week_start", week.weekStartStr)
      .single();

    if (existingReport) {
      reportId = existingReport.id;
    } else {
      const weekEnd = new Date(week.weekStartStr);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const { data: newReport } = await supabase
        .from("weekly_reports")
        .insert({
          employee_id: employee.id,
          department_id: employee.department_id,
          week_start: week.weekStartStr,
          week_end: weekEnd.toISOString().split("T")[0],
          status: "draft",
        })
        .select("id")
        .single();
      reportId = newReport?.id || null;
    }

    // Batch insert all tasks in one query
    if (reportId && myTasks.length > 0) {
      // Filter out tasks already in weekly_tasks
      const { data: existingTasks } = await supabase
        .from("weekly_tasks")
        .select("task_text")
        .eq("employee_id", employee.id)
        .eq("source", "meeting");

      const existingTexts = new Set((existingTasks || []).map((t: any) => t.task_text));
      const newTasks = myTasks.filter((t) => !existingTexts.has(t.task_text));

      if (newTasks.length > 0) {
        const { data: maxOrderRow } = await supabase
          .from("weekly_tasks")
          .select("sort_order")
          .eq("report_id", reportId)
          .order("sort_order", { ascending: false })
          .limit(1)
          .single();

        let sortBase = (maxOrderRow?.sort_order ?? -1) + 1;

        await supabase.from("weekly_tasks").insert(
          newTasks.map((task, i) => ({
            report_id: reportId,
            employee_id: employee.id,
            task_type: task.is_checked ? "completed" : "planned",
            task_text: task.task_text,
            source: "meeting",
            sort_order: sortBase + i,
          }))
        );
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
      <Dialog open={!!selectedMeeting} onOpenChange={(open) => {
        if (!open) {
          setSelectedMeeting(null);
          setMyTasks([]);
          setAdminTasks([]);
          setHasSubmitted(false);
          setMyNoteId(null);
          setDiscussion("");
          setDecisions("");
          setNewTaskText("");
        }
      }}>
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
            {dialogLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading meeting data...</p>
            ) : (<>
            {/* Meeting Agenda */}
            {selectedMeeting?.agenda_content && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">MEETING AGENDA</p>
                <div className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg border">
                  {selectedMeeting.agenda_content}
                </div>
              </div>
            )}

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
                            <Checkbox
                              checked={task.is_checked}
                              onCheckedChange={() => toggleAdminTask(task)}
                              disabled={hasSubmitted}
                            />
                            <span className={`flex-1 ${task.is_checked ? "line-through text-muted-foreground" : ""}`}>{task.task_text}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              Week of {task.assigned_week_start}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Discussion & Decisions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Discussion & Decisions</CardTitle>
                      {hasSubmitted && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Submitted
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">What was discussed in the meeting?</label>
                      <Textarea
                        placeholder="Write down what was discussed..."
                        value={discussion}
                        onChange={(e) => setDiscussion(e.target.value)}
                        rows={3}
                        disabled={hasSubmitted}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">What decisions were made?</label>
                      <Textarea
                        placeholder="Write down any decisions..."
                        value={decisions}
                        onChange={(e) => setDecisions(e.target.value)}
                        rows={3}
                        disabled={hasSubmitted}
                      />
                    </div>
                  </CardContent>
                </Card>

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
                            <Checkbox
                              checked={task.is_checked}
                              onCheckedChange={() => toggleTask(task)}
                              disabled={hasSubmitted}
                            />
                            <span className={`flex-1 ${task.is_checked ? "line-through text-muted-foreground" : ""}`}>{task.task_text}</span>
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

                    {!hasSubmitted && (myTasks.length > 0 || discussion.trim() || decisions.trim()) && (
                      <Button onClick={submitTasks} disabled={isSubmitting} className="gap-2">
                        <Send className="h-4 w-4" />
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
            </>)}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
