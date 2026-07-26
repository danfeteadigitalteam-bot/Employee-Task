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
import { Eye, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { addWeeks, subWeeks } from "date-fns";
import type { WeeklyReport, WeeklyTask, Employee, Department } from "@/types/database";

interface ReportWithEmployee extends WeeklyReport {
  employee?: Employee;
  departments?: { name: string };
  weekly_tasks?: WeeklyTask[];
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
        <div className="flex flex-col sm:flex-row gap-3">
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
        </div>

        {/* Submitted Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submitted Reports ({reports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports for this week.</p>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{(report as any).employees?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{(report as any).employees?.employee_code} · {(report as any).departments?.name}</p>
                      {report.submitted_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted {new Date(report.submitted_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <StatusBadge status={report.status} />
                      <Button size="sm" variant="ghost" onClick={() => viewReport(report)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {report.status === "submitted" && (
                        <Button size="sm" variant="ghost" onClick={() => setReopeningReport(report)}>
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
              <CardTitle className="text-base text-red-600">Not Submitted ({missingEmployees.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {missingEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-2">
                    <div>
                      <p className="text-sm">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
                    </div>
                    <Badge variant="outline" className="text-xs text-red-600">Pending</Badge>
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
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">PLANNED TASKS</p>
                {reportTasks.filter((t) => t.task_type === "planned").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks</p>
                ) : (
                  <ul className="space-y-1">
                    {reportTasks.filter((t) => t.task_type === "planned").map((task) => (
                      <li key={task.id} className="flex items-center gap-2 text-sm">
                        <span className={task.is_checked ? "text-emerald-500" : "text-muted-foreground"}>
                          {task.is_checked ? "✓" : "○"}
                        </span>
                        <span className={task.is_checked ? "line-through text-muted-foreground" : ""}>{task.task_text}</span>
                        {task.source === "meeting" && <Badge variant="secondary" className="text-xs">Meeting</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">COMPLETED WORK</p>
                {reportTasks.filter((t) => t.task_type === "completed").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed work</p>
                ) : (
                  <ul className="space-y-1">
                    {reportTasks.filter((t) => t.task_type === "completed").map((task) => (
                      <li key={task.id} className="flex items-center gap-2 text-sm">
                        <span className={task.is_checked ? "text-emerald-500" : "text-muted-foreground"}>
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
                  <p className="text-xs font-medium text-muted-foreground mb-2">NOTES</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{selectedReport.notes}</p>
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
