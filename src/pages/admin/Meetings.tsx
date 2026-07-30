//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\admin\Meetings.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Eye, Plus, Calendar, Trash2, CalendarDays, ChevronRight } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("Weekly Meeting");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [deleteTarget, setDeleteTarget] = useState<MeetingWithStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMeetings = async () => {
      setLoading(true);
      // Parallelize independent queries
      const [meetingsRes, empCountRes] = await Promise.all([
        supabase.from("meetings").select("*").order("meeting_date", { ascending: false }),
        supabase.from("employees").select("*", { count: "exact", head: true }).eq("is_active", true).neq("role", "admin"),
      ]);

      if (cancelled) return;
      const data = meetingsRes.data;
      if (!data) { setLoading(false); return; }

      const empCount = empCountRes.count || 0;

      // Fetch all submitted counts in one query instead of N+1
      const { data: submittedData } = await supabase
        .from("meeting_tasks")
        .select("meeting_id")
        .eq("source", "employee")
        .eq("status", "submitted");

      if (cancelled) return;

      // Count submitted per meeting in memory
      const submittedMap = new Map<string, number>();
      if (submittedData) {
        for (const row of submittedData) {
          submittedMap.set(row.meeting_id, (submittedMap.get(row.meeting_id) || 0) + 1);
        }
      }

      setMeetings(
        data.map((meeting) => ({
          ...meeting,
          total_employees: empCount,
          submitted_count: submittedMap.get(meeting.id) || 0,
        }))
      );
      setLoading(false);
    };

    fetchMeetings();
    return () => { cancelled = true; };
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
      {loading ? (
        <div className="space-y-3">
          <div className="h-20 bg-muted/60 rounded-xl animate-pulse" />
          <div className="h-20 bg-muted/60 rounded-xl animate-pulse" />
          <div className="h-20 bg-muted/60 rounded-xl animate-pulse" />
        </div>
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-3 bg-accent rounded-full mb-3">
              <Calendar className="h-5 w-5 text-accent-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No meetings yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create a new meeting for employees to contribute.</p>
            <Button onClick={() => setShowNewDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Meeting
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <Card
              key={meeting.id}
              className="cursor-pointer card-interactive"
              onClick={() => navigate(`/admin/meetings/${meeting.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-accent rounded-xl shrink-0">
                      <CalendarDays className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{meeting.title}</p>
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
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge status={meeting.status} />
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(meeting);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-1" />
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