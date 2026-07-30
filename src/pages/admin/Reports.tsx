//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\admin\Reports.tsx
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useWeek } from "@/hooks/useWeek";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, RotateCcw, ChevronLeft, ChevronRight, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { addWeeks, subWeeks } from "date-fns";
import type { WeeklyReport, WeeklyTask, Employee, Department } from "@/types/database";

interface ReportWithEmployee extends WeeklyReport {
  employee?: Employee;
  departments?: { name: string };
  weekly_tasks?: WeeklyTask[];
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminReports() {
  const [searchParams] = useSearchParams();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState(searchParams.get("department") || "all");
  const [reports, setReports] = useState<ReportWithEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportWithEmployee | null>(null);
  const [reportTasks, setReportTasks] = useState<WeeklyTask[]>([]);
  const [reopeningReport, setReopeningReport] = useState<ReportWithEmployee | null>(null);

  const now = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const referenceDate = weekOffset === 0 ? now : (weekOffset > 0 ? addWeeks(now, weekOffset) : subWeeks(now, Math.abs(weekOffset)));
  const week = useWeek(referenceDate);

  const fetchData = useCallback(async () => {
    const { data: depts } = await supabase.from("departments").select("*").order("name");
    if (depts) setDepartments(depts as Department[]);

    const { data: emps } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true)
      .neq("role", "admin");
    if (emps) setAllEmployees(emps as Employee[]);

    let query = supabase
      .from("weekly_reports")
      .select("*, employees(*), departments(name), weekly_tasks(*)")
      .eq("week_start", week.weekStartStr)
      .order("created_at");

    if (selectedDept !== "all") {
      query = query.eq("department_id", selectedDept);
    }

    const { data } = await query;
    if (data) setReports(data as ReportWithEmployee[]);
  }, [week.weekStartStr, selectedDept]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Find employees who haven't submitted
  const submittedIds = new Set(reports.map((r) => r.employee_id));
  const missingEmployees = allEmployees
    .filter((emp) => !submittedIds.has(emp.id))
    .filter((emp) => selectedDept === "all" || emp.department_id === selectedDept);

  const viewReport = async (report: ReportWithEmployee) => {
    setReportTasks(report.weekly_tasks || []);
    setSelectedReport(report);
  };

  const handleReopen = async () => {
    if (!reopeningReport) return;

    const { error } = await supabase
      .from("weekly_reports")
      .update({ status: "reopened" })
      .eq("id", reopeningReport.id);

    if (!error) {
      toast.success("Report reopened");
      setReopeningReport(null);
      fetchData();
    } else {
      toast.error("Failed to reopen report");
    }
  };

  return (
    <PageLayout title="Reports" description={`Week of ${week.displayRange}`}>
      <div className="space-y-4">
        {/* Controls */}
        <Card>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <Select value={selectedDept} onValueChange={(v) => setSelectedDept(v ?? "all")}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[180px] text-center">{week.displayRange}</span>
              <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)} disabled={weekOffset >= 0}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {weekOffset !== 0 && (
                <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Current Week</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submitted Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submitted Reports ({reports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <div className="p-3 bg-accent rounded-full mb-3">
                  <FileText className="h-5 w-5 text-accent-foreground" />
                </div>
                <p className="text-sm font-medium">No reports for this week</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border card-interactive">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground shrink-0">
                        {initialsOf((report as any).employees?.full_name || "?")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{(report as any).employees?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{(report as any).employees?.employee_code} · {(report as any).departments?.name}</p>
                        {report.submitted_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Submitted {new Date(report.submitted_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <StatusBadge status={report.status} />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewReport(report)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {report.status === "submitted" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setReopeningReport(report)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Not Submitted */}
        {missingEmployees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                Not Submitted ({missingEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {missingEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between py-2 px-1">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center text-xs font-semibold text-red-600 shrink-0">
                        {initialsOf(emp.full_name)}
                      </div>
                      <div>
                        <p className="text-sm">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">Pending</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{(selectedReport as any)?.employees?.full_name}'s Report</DialogTitle>
            <p className="text-sm text-muted-foreground">{week.displayRange}</p>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">Planned Tasks</p>
                {reportTasks.filter((t) => t.task_type === "planned").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks</p>
                ) : (
                  <ul className="space-y-1.5 bg-muted/40 rounded-xl p-3 border border-border/70">
                    {reportTasks.filter((t) => t.task_type === "planned").map((task) => (
                      <li key={task.id} className="flex items-center gap-2 text-sm">
                        <span className={task.is_checked ? "text-emerald-600" : "text-muted-foreground"}>
                          {task.is_checked ? "✓" : "○"}
                        </span>
                        <span className={`flex-1 ${task.is_checked ? "line-through text-muted-foreground" : ""}`}>{task.task_text}</span>
                        {task.source === "meeting" && <Badge variant="secondary" className="text-xs">Meeting</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">Completed Work</p>
                {reportTasks.filter((t) => t.task_type === "completed").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed work</p>
                ) : (
                  <ul className="space-y-1.5 bg-muted/40 rounded-xl p-3 border border-border/70">
                    {reportTasks.filter((t) => t.task_type === "completed").map((task) => (
                      <li key={task.id} className="flex items-center gap-2 text-sm">
                        <span className={task.is_checked ? "text-emerald-600" : "text-muted-foreground"}>
                          {task.is_checked ? "✓" : "○"}
                        </span>
                        <span className={task.is_checked ? "line-through text-muted-foreground" : ""}>{task.task_text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedReport.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">Notes</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/40 rounded-xl p-3 border border-border/70">{selectedReport.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!reopeningReport}
        onOpenChange={() => setReopeningReport(null)}
        title="Reopen Report"
        description="This will allow the employee to edit their report again. Are you sure?"
        confirmLabel="Reopen"
        onConfirm={handleReopen}
      />
    </PageLayout>
  );
}