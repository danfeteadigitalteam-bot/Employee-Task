//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\admin\DanfeMeetings.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Eye, Plus, Trash2, CalendarDays, ChevronRight, Coffee, UserRound } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Meeting, Employee } from "@/types/database";

interface DanfeMeeting extends Meeting {
  total_employees?: number;
  submitted_count?: number;
  attendee_names?: { full_name: string; employee_code: string }[];
}

export default function AdminDanfeMeetings() {
  const { employee: admin } = useAuth();
  const navigate = useNavigate();
  const week = useWeek();
  const [meetings, setMeetings] = useState<DanfeMeeting[]>([]);
  const [danfeEmployees, setDanfeEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("Danfe Tea Meeting");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<DanfeMeeting | null>(null);

  const toggleAttendee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const fetchMeetings = async () => {
    setLoading(true);
    const [meetingsRes, employeesRes] = await Promise.all([
      supabase
        .from("meetings")
        .select("*")
        .eq("company", "danfe")
        .order("meeting_date", { ascending: false }),
      supabase
        .from("employees")
        .select("id, full_name, employee_code, department_id")
        .eq("is_active", true)
        .eq("role", "employee")
        .contains("companies", ["danfe"])
        .order("full_name"),
    ]);

    const data = meetingsRes.data as DanfeMeeting[] | null;

    const empMap = new Map<string, Employee>();
    if (employeesRes.data) {
      for (const emp of employeesRes.data as Employee[]) {
        empMap.set(emp.id, emp);
      }
      setDanfeEmployees(employeesRes.data as Employee[]);
    }

    const submittedMap = new Map<string, number>();
    if (data && data.length > 0) {
      const { data: submittedData } = await supabase
        .from("meeting_tasks")
        .select("meeting_id")
        .in("meeting_id", data.map((m) => m.id))
        .eq("source", "employee")
        .eq("status", "submitted");
      if (submittedData) {
        for (const row of submittedData) {
          submittedMap.set(row.meeting_id, (submittedMap.get(row.meeting_id) || 0) + 1);
        }
      }
    }

    if (data) {
      setMeetings(
        data.map((meeting) => {
          const attendeeNames = (meeting.attendees || [])
            .map((id) => empMap.get(id))
            .filter((e): e is Employee => !!e)
            .map((e) => ({ full_name: e.full_name, employee_code: e.employee_code }));
          return {
            ...meeting,
            attendee_names: attendeeNames,
            submitted_count: submittedMap.get(meeting.id) || 0,
          } as DanfeMeeting;
        })
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const createNewMeeting = async () => {
    if (!admin || selectedEmployeeIds.length === 0) return;

    const emps = danfeEmployees.filter((e) => selectedEmployeeIds.includes(e.id));
    if (emps.length === 0) return;

    const names = emps.map((e) => e.full_name);

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        title: newTitle.trim() || `Meeting with ${names.join(", ")}`,
        meeting_date: newDate,
        week_start: week.weekStartStr,
        week_end: week.weekEndStr,
        attendees: emps.map((e) => e.id),
        agenda_content: "",
        overall_minutes: "",
        status: "draft",
        created_by: admin.id,
        company: "danfe",
        employee_id: emps[0].id,
      })
      .select()
      .single();

    if (data && !error) {
      toast.success(`Meeting started with ${names.join(", ")}. They can now add their checklists.`);
      setShowNewDialog(false);
      setSelectedEmployeeIds([]);
      navigate(`/admin/meetings/${data.id}`);
    } else {
      toast.error("Failed to create meeting");
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
      title="Danfe Tea Meetings"
      description="Start meetings by choosing one or more employees"
      actions={
        <Button onClick={() => { setSelectedEmployeeIds([]); setShowNewDialog(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Start Meeting
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
              <Coffee className="h-5 w-5 text-accent-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No Danfe Tea meetings yet</p>
            <p className="text-sm text-muted-foreground mb-4">Choose one or more employees to start a meeting with.</p>
            <Button onClick={() => { setSelectedEmployeeIds([]); setShowNewDialog(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Start Meeting
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
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-medium truncate">{meeting.title}</p>
                        {meeting.attendee_names && meeting.attendee_names.length > 0 && (
                          <span className="flex flex-wrap gap-1 shrink-0">
                            {meeting.attendee_names.map((a) => (
                              <span key={a.full_name} className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md">
                                <UserRound className="h-3 w-3" />
                                {a.full_name}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(meeting.meeting_date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      {meeting.status === "draft" && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meeting.submitted_count ? "Checklist submitted" : "Waiting for employee checklist"}
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
            <DialogTitle>Start Danfe Tea Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employees</Label>
              {danfeEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-border rounded-lg px-3 py-2.5">
                  No Danfe Tea employees yet. Add one from the Employees page first.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border/70 bg-muted/20 p-2">
                  {danfeEmployees.map((emp) => {
                    const checked = selectedEmployeeIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium cursor-pointer transition-colors ${checked ? "bg-accent" : "hover:bg-muted"}`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleAttendee(emp.id)}
                        />
                        <span className="flex-1 truncate">{emp.full_name}</span>
                        <span className="text-xs text-muted-foreground font-normal">{emp.employee_code}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
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
            <Button onClick={createNewMeeting} disabled={selectedEmployeeIds.length === 0}>
              {selectedEmployeeIds.length > 1 ? `Start (${selectedEmployeeIds.length} employees)` : "Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
