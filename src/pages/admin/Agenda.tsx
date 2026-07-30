//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\admin\Agenda.tsx
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useWeek } from "@/hooks/useWeek";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Calendar, Copy, Save, FileText, ChevronLeft, ChevronRight, Users2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { addWeeks, subWeeks } from "date-fns";

interface AgendaDepartment {
  department_id: string;
  department_name: string;
  employees: {
    employee_name: string;
    employee_code: string;
    planned_tasks: string[];
    completed_tasks: string[];
    notes: string;
  }[];
}

export default function AdminAgenda() {
  const { employee: admin } = useAuth();
  const now = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const referenceDate = weekOffset === 0 ? now : (weekOffset > 0 ? addWeeks(now, weekOffset) : subWeeks(now, Math.abs(weekOffset)));
  const week = useWeek(referenceDate);

  const [agenda, setAgenda] = useState<AgendaDepartment[]>([]);
  const [generated, setGenerated] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("Weekly Meeting");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const generateAgenda = async () => {
    // Fetch all submitted reports for the selected week
    const { data: reports } = await supabase
      .from("weekly_reports")
      .select("*, employees(full_name, employee_code), departments(name), weekly_tasks(*)")
      .eq("week_start", week.weekStartStr)
      .eq("status", "submitted");

    if (!reports || reports.length === 0) {
      toast.error("No submitted reports found for this week");
      return;
    }

    // Group by department
    const deptMap = new Map<string, AgendaDepartment>();

    reports.forEach((report: any) => {
      const deptId = report.department_id;
      const deptName = report.departments?.name || "Unknown";

      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, {
          department_id: deptId,
          department_name: deptName,
          employees: [],
        });
      }

      const tasks = report.weekly_tasks || [];
      const planned = tasks.filter((t: any) => t.task_type === "planned").map((t: any) => t.task_text);
      const completed = tasks.filter((t: any) => t.task_type === "completed").map((t: any) => t.task_text);

      deptMap.get(deptId)!.employees.push({
        employee_name: report.employees?.full_name || "Unknown",
        employee_code: report.employees?.employee_code || "",
        planned_tasks: planned,
        completed_tasks: completed,
        notes: report.notes || "",
      });
    });

    const agendaData = Array.from(deptMap.values()).sort((a, b) =>
      a.department_name.localeCompare(b.department_name)
    );

    setAgenda(agendaData);
    setGenerated(true);
    toast.success(`Agenda generated from ${reports.length} reports`);
  };

  const getAgendaText = () => {
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let text = `Weekly Meeting Agenda\nDate: ${dateStr}\n\n`;

    agenda.forEach((dept, i) => {
      text += `${i + 1}. ${dept.department_name} Department\n\n`;

      dept.employees.forEach((emp) => {
        text += `${emp.employee_name}\n\n`;

        if (emp.planned_tasks.length > 0) {
          text += `Tasks planned:\n`;
          emp.planned_tasks.forEach((t) => { text += `• ${t}\n`; });
          text += `\n`;
        }

        if (emp.completed_tasks.length > 0) {
          text += `Work completed:\n`;
          emp.completed_tasks.forEach((t) => { text += `• ${t}\n`; });
          text += `\n`;
        }

        if (emp.notes) {
          text += `Notes:\n${emp.notes}\n\n`;
        }
      });
    });

    return text;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getAgendaText());
      toast.success("Agenda copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const saveMeeting = async () => {
    if (!admin) return;
    setSaving(true);

    const agendaText = getAgendaText();
    const attendees = agenda.flatMap((d) => d.employees.map((e) => e.employee_name));

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        title: meetingTitle,
        meeting_date: meetingDate,
        week_start: week.weekStartStr,
        week_end: week.weekEndStr,
        attendees: [...new Set(attendees)],
        agenda_content: agendaText,
        status: "draft",
        created_by: admin.id,
      })
      .select()
      .single();

    if (!error && data) {
      // Batch insert department notes
      if (agenda.length > 0) {
        await supabase.from("meeting_department_notes").insert(
          agenda.map((dept) => ({
            meeting_id: data.id,
            department_id: dept.department_id,
            discussion: "",
            decisions: "",
          }))
        );
      }

      toast.success("Meeting created. Go to Meeting Minutes to add discussions and tasks.");
      setShowSaveDialog(false);
    } else {
      toast.error("Failed to save meeting");
    }

    setSaving(false);
  };

  const totalEmployeesInAgenda = agenda.reduce((sum, d) => sum + d.employees.length, 0);

  return (
    <PageLayout title="Meeting Agenda" description="Generate a meeting agenda from submitted reports">
      <div className="space-y-6">
        {/* Week Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-accent rounded-lg">
                  <Calendar className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="text-sm font-medium">Reporting Week</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[180px] text-center">{week.displayRange}</span>
                <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)} disabled={weekOffset >= 0}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {weekOffset !== 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Current</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        {!generated && (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="inline-flex p-3 bg-accent rounded-full mb-3">
                <FileText className="h-5 w-5 text-accent-foreground" />
              </div>
              <p className="text-sm font-medium mb-1">Ready to generate an agenda</p>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                Compiles every submitted weekly report for {week.displayRange} into one agenda, grouped by department.
              </p>
              <Button onClick={generateAgenda} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generate Agenda
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Generated Agenda */}
        {generated && agenda.length > 0 && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Users2 className="h-3.5 w-3.5" />
                {agenda.length} departments · {totalEmployeesInAgenda} employees
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </Button>
                <Button size="sm" onClick={() => setShowSaveDialog(true)} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  Save as Meeting
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setGenerated(false); setAgenda([]); }}>
                  Regenerate
                </Button>
              </div>
            </div>

            {agenda.map((dept) => (
              <Card key={dept.department_id}>
                <CardHeader>
                  <CardTitle className="text-base">{dept.department_name} Department</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dept.employees.map((emp, idx) => (
                    <div key={emp.employee_code}>
                      <p className="text-sm font-semibold mb-2">{emp.employee_name}</p>

                      {emp.planned_tasks.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Tasks planned:</p>
                          <ul className="text-sm space-y-0.5">
                            {emp.planned_tasks.map((t, i) => (
                              <li key={i}>• {t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {emp.completed_tasks.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Work completed:</p>
                          <ul className="text-sm space-y-0.5">
                            {emp.completed_tasks.map((t, i) => (
                              <li key={i}>• {t}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {emp.notes && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                          <p className="text-sm whitespace-pre-wrap bg-muted/50 p-2.5 rounded-lg border border-border/70">{emp.notes}</p>
                        </div>
                      )}

                      {idx < dept.employees.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </>
        )}

        {generated && agenda.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No submitted reports found for this week.</p>
              <Button variant="ghost" className="mt-2" onClick={() => setGenerated(false)}>Go Back</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting Title</Label>
              <Input value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Meeting Date</Label>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSaveDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveMeeting} disabled={saving}>{saving ? "Saving..." : "Save Meeting"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}