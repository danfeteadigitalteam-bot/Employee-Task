import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeek, formatWeekRange } from "@/hooks/useWeek";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CheckCircle, Clock, FileText } from "lucide-react";

interface ReportSummary {
  status: string;
  submitted_at: string | null;
  task_count: number;
  completed_count: number;
}

export default function EmployeeDashboard() {
  const { employee } = useAuth();
  const week = useWeek();
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [recentReports, setRecentReports] = useState<{ week_start: string; week_end: string; status: string }[]>([]);

  useEffect(() => {
    if (!employee) return;

    const fetchData = async () => {
      // Fetch current week report
      const { data: reportData } = await supabase
        .from("weekly_reports")
        .select("status, submitted_at, weekly_tasks(id, task_type)")
        .eq("employee_id", employee.id)
        .eq("week_start", week.weekStartStr)
        .maybeSingle();

      if (reportData) {
        const tasks = (reportData as any).weekly_tasks || [];
        setReport({
          status: reportData.status,
          submitted_at: reportData.submitted_at,
          task_count: tasks.filter((t: any) => t.task_type === "planned").length,
          completed_count: tasks.filter((t: any) => t.task_type === "planned" && t.is_checked).length,
        });
      }

      // Fetch recent reports
      const { data: recentData } = await supabase
        .from("weekly_reports")
        .select("week_start, week_end, status")
        .eq("employee_id", employee.id)
        .order("week_start", { ascending: false })
        .limit(4);

      if (recentData) {
        setRecentReports(recentData);
      }
    };

    fetchData();
  }, [employee, week.weekStartStr]);

  return (
    <PageLayout title="Dashboard" description={`Welcome back, ${employee?.full_name}`}>
      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium">{(employee as any)?.department?.name || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Clock className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Week</p>
                <p className="text-sm font-medium">{week.displayRange}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tasks Completed</p>
                <p className="text-sm font-medium">
                  {report ? `${report.completed_count} / ${report.task_count}` : "0 / 0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <FileText className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Report Status</p>
                <div className="mt-0.5">
                  {report ? <StatusBadge status={report.status} /> : <StatusBadge status="draft" />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports yet. Start by writing your first weekly report.</p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((r) => (
                <div key={r.week_start} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-medium">{formatWeekRange(r.week_start, r.week_end)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}
