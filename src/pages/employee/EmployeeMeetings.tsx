import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Meeting, MeetingDepartmentNote, MeetingTask } from "@/types/database";

export default function EmployeeMeetings() {
  const { employee } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingTasks, setMeetingTasks] = useState<MeetingTask[]>([]);
  const [meetingNotes, setMeetingNotes] = useState<MeetingDepartmentNote[]>([]);

  useEffect(() => {
    if (!employee) return;

    const fetchMeetings = async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("status", "published")
        .order("meeting_date", { ascending: false });

      if (data) setMeetings(data as Meeting[]);
    };

    fetchMeetings();
  }, [employee]);

  const viewMeeting = async (meeting: Meeting) => {
    // Fetch department notes
    const { data: notes } = await supabase
      .from("meeting_department_notes")
      .select("*, departments(name)")
      .eq("meeting_id", meeting.id);

    // Fetch tasks assigned to this employee
    const { data: tasks } = await supabase
      .from("meeting_tasks")
      .select("*, departments(name)")
      .eq("meeting_id", meeting.id)
      .eq("employee_id", employee!.id);

    if (notes) setMeetingNotes(notes as any);
    if (tasks) setMeetingTasks(tasks as any);
    setSelectedMeeting(meeting);
  };

  const addTasksToChecklist = async () => {
    if (!selectedMeeting || !employee) return;

    // Find or create report for the assigned week
    for (const task of meetingTasks) {
      if (task.is_checked) continue;

      // Check if report exists for that week
      const { data: existingReport } = await supabase
        .from("weekly_reports")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("week_start", task.assigned_week_start)
        .single();

      let reportId = existingReport?.id;

      if (!reportId) {
        // Create report for that week
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
        // Check if task already exists
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
    <PageLayout title="Meeting Minutes" description="View published meeting minutes and assigned tasks">
      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No meeting minutes published yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => viewMeeting(meeting)}>
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
                  <Badge variant="outline" className="text-xs">Published</Badge>
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
            {/* Attendees */}
            {selectedMeeting?.attendees && selectedMeeting.attendees.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">ATTENDEES</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMeeting.attendees.map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Department Discussions */}
            {meetingNotes.map((note) => (
              <div key={note.id}>
                <p className="text-sm font-semibold mb-2">{(note as any).departments?.name} Department</p>

                {note.discussion && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Discussion</p>
                    <p className="text-sm whitespace-pre-wrap">{note.discussion}</p>
                  </div>
                )}

                {note.decisions && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Decisions & Strategies</p>
                    <p className="text-sm whitespace-pre-wrap">{note.decisions}</p>
                  </div>
                )}

                <Separator className="my-4" />
              </div>
            ))}

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
