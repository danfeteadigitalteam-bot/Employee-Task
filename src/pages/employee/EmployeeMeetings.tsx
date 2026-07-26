import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Plus, Send, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Meeting, MeetingDepartmentNote, MeetingTask } from "@/types/database";

export default function EmployeeMeetings() {
  const { employee } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingTasks, setMeetingTasks] = useState<MeetingTask[]>([]);
  const [myContribution, setMyContribution] = useState<MeetingDepartmentNote | null>(null);
  const [discussion, setDiscussion] = useState("");
  const [decisions, setDecisions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Fetch or create my contribution for this meeting
    const { data: existing } = await supabase
      .from("meeting_department_notes")
      .select("*, departments(name), employees(full_name, employee_code)")
      .eq("meeting_id", meeting.id)
      .eq("employee_id", employee.id)
      .single();

    if (existing) {
      setMyContribution(existing as any);
      setDiscussion(existing.discussion || "");
      setDecisions(existing.decisions || "");
    } else {
      // Auto-create a draft contribution row for this employee
      const { data: newNote } = await supabase
        .from("meeting_department_notes")
        .insert({
          meeting_id: meeting.id,
          department_id: employee.department_id,
          employee_id: employee.id,
          discussion: "",
          decisions: "",
          status: "draft",
        })
        .select("*, departments(name), employees(full_name, employee_code)")
        .single();

      if (newNote) {
        setMyContribution(newNote as any);
        setDiscussion("");
        setDecisions("");
      }
    }

    // Fetch my assigned tasks
    const { data: tasks } = await supabase
      .from("meeting_tasks")
      .select("*, departments(name)")
      .eq("meeting_id", meeting.id)
      .eq("employee_id", employee.id);

    if (tasks) setMeetingTasks(tasks as any);

    setSelectedMeeting(meeting);
  };

  const submitContribution = async () => {
    if (!myContribution || !employee) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from("meeting_department_notes")
      .update({
        discussion,
        decisions,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", myContribution.id);

    if (!error) {
      setMyContribution({
        ...myContribution,
        discussion,
        decisions,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });
      toast.success("Contribution submitted successfully");
    } else {
      toast.error("Failed to submit");
    }

    setIsSubmitting(false);
  };

  const addTasksToChecklist = async () => {
    if (!selectedMeeting || !employee) return;

    for (const task of meetingTasks) {
      if (task.is_checked) continue;

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
        const { data: existingTask } = await supabase
          .from("weekly_tasks")
          .select("id")
          .eq("report_id", reportId)
          .eq("task_text", task.task_text)
          .eq("source", "meeting")
          .single();

        if (!existingTask) {
          await supabase.from("weekly_tasks").insert({
            report_id: reportId,
            employee_id: employee.id,
            task_type: "planned",
            task_text: task.task_text,
            source: "meeting",
            sort_order: 0,
          });
        }
      }
    }

    toast.success("Tasks added to your weekly checklist!");
    setSelectedMeeting(null);
  };

  return (
    <PageLayout title="Meeting Minutes" description="Write your contributions and view published minutes">
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
            {/* Published minutes - show compiled version */}
            {selectedMeeting?.status === "published" && selectedMeeting.overall_minutes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">MEETING MINUTES</p>
                <div className="text-sm whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                  {selectedMeeting.overall_minutes}
                </div>
              </div>
            )}

            {/* Draft meeting - show contribution form */}
            {selectedMeeting?.status === "draft" && myContribution && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Your Contribution</CardTitle>
                    {myContribution.status === "submitted" ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Submitted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Draft
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Discussion</Label>
                    <Textarea
                      placeholder="What topics need to be discussed? What updates do you have for your department?"
                      value={discussion}
                      onChange={(e) => setDiscussion(e.target.value)}
                      rows={4}
                      disabled={myContribution.status === "submitted"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Decisions & Strategies</Label>
                    <Textarea
                      placeholder="What decisions were made? What strategies were agreed upon?"
                      value={decisions}
                      onChange={(e) => setDecisions(e.target.value)}
                      rows={4}
                      disabled={myContribution.status === "submitted"}
                    />
                  </div>
                  {myContribution.status !== "submitted" && (
                    <Button
                      onClick={submitContribution}
                      disabled={isSubmitting || (!discussion.trim() && !decisions.trim())}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {isSubmitting ? "Submitting..." : "Submit Contribution"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Assigned Tasks */}
            {meetingTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">YOUR ASSIGNED TASKS</p>
                <div className="space-y-2">
                  {meetingTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={task.is_checked} disabled />
                      <span>{task.task_text}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        Week of {task.assigned_week_start}
                      </span>
                    </div>
                  ))}
                </div>
                <Button size="sm" className="mt-3 gap-1" onClick={addTasksToChecklist}>
                  <Plus className="h-3 w-3" />
                  Add to My Checklist
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
