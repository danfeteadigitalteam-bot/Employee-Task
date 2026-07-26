import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatWeekRange } from "@/hooks/useWeek";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Eye, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { WeeklyReport, WeeklyTask } from "@/types/database";

export default function PreviousReports() {
  const { employee } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [reportTasks, setReportTasks] = useState<WeeklyTask[]>([]);

  useEffect(() => {
    if (!employee) return;

    const fetchReports = async () => {
      const { data } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("employee_id", employee.id)
        .order("week_start", { ascending: false });

      if (data) setReports(data as WeeklyReport[]);
    };

    fetchReports();
  }, [employee]);

  const viewReport = async (report: WeeklyReport) => {
    const { data } = await supabase
      .from("weekly_tasks")
      .select("*")
      .eq("report_id", report.id)
      .order("sort_order");

    if (data) setReportTasks(data as WeeklyTask[]);
    setSelectedReport(report);
  };

  return (
    <PageLayout title="Previous Reports" description="View your past weekly reports">
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reports yet. Submit your first weekly report to see it here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{formatWeekRange(report.week_start, report.week_end)}</p>
                    {report.submitted_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submitted {new Date(report.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={report.status} />
                    <Button variant="ghost" size="sm" onClick={() => viewReport(report)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Report: {selectedReport && formatWeekRange(selectedReport.week_start, selectedReport.week_end)}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">PLANNED TASKS</p>
                {reportTasks.filter((t) => t.task_type === "planned").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks</p>
                ) : (
                  <ul className="space-y-1">
                    {reportTasks
                      .filter((t) => t.task_type === "planned")
                      .map((task) => (
                        <li key={task.id} className="flex items-center gap-2 text-sm">
                          <span className={task.is_checked ? "text-emerald-500" : "text-muted-foreground"}>
                            {task.is_checked ? "✓" : "○"}
                          </span>
                          <span className={task.is_checked ? "line-through text-muted-foreground" : ""}>
                            {task.task_text}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">COMPLETED WORK</p>
                {reportTasks.filter((t) => t.task_type === "completed").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed work recorded</p>
                ) : (
                  <ul className="space-y-1">
                    {reportTasks
                      .filter((t) => t.task_type === "completed")
                      .map((task) => (
                        <li key={task.id} className="flex items-center gap-2 text-sm">
                          <span className={task.is_checked ? "text-emerald-500" : "text-muted-foreground"}>
                            {task.is_checked ? "✓" : "○"}
                          </span>
                          <span className={task.is_checked ? "line-through text-muted-foreground" : ""}>
                            {task.task_text}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {selectedReport.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">NOTES</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
