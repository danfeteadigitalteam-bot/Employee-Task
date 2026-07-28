import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Eye, Plus, Calendar, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { useWeek } from "@/hooks/useWeek";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Meeting } from "@/types/database";

interface MeetingWithStats extends Meeting {
  total_employees?: number;
  submitted_count?: number;
}

export default function AdminMeetings() {
  const { employee: admin } = useAuth();
  const navigate = useNavigate();
  const week = useWeek();
  const [meetings, setMeetings] = useState<MeetingWithStats[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("Weekly Meeting");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [deleteTarget, setDeleteTarget] = useState<MeetingWithStats | null>(null);

  useEffect(() => {
    const fetchMeetings = async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .order("meeting_date", { ascending: false });

      if (!data) return;

      // Get employee count
      const { count: empCount } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .neq("role", "admin");

      // Get task counts per meeting
      const meetingsWithStats: MeetingWithStats[] = await Promise.all(
        data.map(async (meeting) => {
          const { count: submitted } = await supabase
            .from("meeting_tasks")
            .select("*", { count: "exact", head: true })
            .eq("meeting_id", meeting.id)
            .eq("source", "employee")
            .eq("status", "submitted");

          return {
            ...meeting,
            total_employees: empCount || 0,
            submitted_count: submitted || 0,
          };
        })
      );

      setMeetings(meetingsWithStats);
    };

    fetchMeetings();
  }, []);

  const createNewMeeting = async () => {
    if (!admin) return;

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        title: newTitle,
        meeting_date: newDate,
        week_start: week.weekStartStr,
        week_end: week.weekEndStr,
        attendees: [],
        agenda_content: "",
        overall_minutes: "",
        status: "draft",
        created_by: admin.id,
      })
      .select()
      .single();

    if (data && !error) {
      toast.success("Meeting created. Employees can now write their contributions.");
      setShowNewDialog(false);
      navigate(`/admin/meetings/${data.id}`);
    }
  };

  const deleteMeeting = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("meetings").delete().eq("id", deleteTarget.id);
    if (!error) {
      setMeetings((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      toast.success("Meeting deleted");
    }
    setDeleteTarget(null);
  };

  return (
    <PageLayout
      title="Meeting Minutes"
      description="Create meetings and review employee contributions"
      actions={
        <Button onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Meeting
        </Button>
      }
    >
      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No meetings yet. Create a new meeting for employees to contribute.</p>
            <Button onClick={() => setShowNewDialog(true)}>New Meeting</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Card
              key={meeting.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
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
                    {meeting.status === "draft" && meeting.total_employees !== undefined && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {meeting.submitted_count} of {meeting.total_employees} employees submitted
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={meeting.status} />
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(meeting);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Meeting"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This will also remove all associated tasks and notes. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={deleteMeeting}
      />

      {/* New Meeting Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={createNewMeeting}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
