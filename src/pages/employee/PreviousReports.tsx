//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\employee\PreviousReports.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { deleteReport } from "@/lib/weekService";
import { formatWeekRange } from "@/hooks/useWeek";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Linkify } from "@/components/shared/Linkify";
import { Eye, Calendar, FileText, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { WeeklyReport, WeeklyTask } from "@/types/database";

export default function PreviousReports() {
  const { employee } = useAuth();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [reportTasks, setReportTasks] = useState<WeeklyTask[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<WeeklyReport | null>(null);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteReport(deleteTarget.id);
      toast.success("Report deleted");
      setReports((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      if (selectedReport?.id === deleteTarget.id) setSelectedReport(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete report");
    }
    setDeleteTarget(null);
  };

  return (
    <PageLayout title="Previous Reports" description="View your past weekly reports">
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-3 bg-accent rounded-full mb-3">
              <Calendar className="h-5 w-5 text-accent-foreground" />
            </div>
            <p className="text-sm font-medium">No reports yet</p>
            <p className="text-sm text-muted-foreground mt-1">Submit your first weekly report to see it here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="card-interactive">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-muted rounded-xl shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{formatWeekRange(report.week_start, report.week_end)}</p>
                    {report.submitted_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Submitted {new Date(report.submitted_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={report.status} />
                  <Button variant="ghost" size="sm" onClick={() => viewReport(report)} className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                  {report.status === "draft" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(report)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
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
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">Planned Tasks</p>
                {reportTasks.filter((t) => t.task_type === "planned").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks</p>
                ) : (
                  <ul className="space-y-1.5 bg-muted/40 rounded-xl p-3 border border-border/70">
                    {reportTasks
                      .filter((t) => t.task_type === "planned")
                      .map((task) => (
                        <li key={task.id} className="flex items-center gap-2 text-sm">
                          <span className={task.is_checked ? "text-emerald-600" : "text-muted-foreground"}>
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
                <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">Completed Work</p>
                {reportTasks.filter((t) => t.task_type === "completed").length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed work recorded</p>
                ) : (
                  <ul className="space-y-1.5 bg-muted/40 rounded-xl p-3 border border-border/70">
                    {reportTasks
                      .filter((t) => t.task_type === "completed")
                      .map((task) => (
                        <li key={task.id} className="flex items-center gap-2 text-sm">
                          <span className={task.is_checked ? "text-emerald-600" : "text-muted-foreground"}>
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
                  <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide uppercase">Notes</p>
                  <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded-xl p-3 border border-border/70">
                    <Linkify>{selectedReport.notes}</Linkify>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Report"
        description={`Are you sure you want to delete the report for ${deleteTarget ? formatWeekRange(deleteTarget.week_start, deleteTarget.week_end) : ""}? This will also remove all its tasks. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </PageLayout>
  );
}