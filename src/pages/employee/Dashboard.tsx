//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\employee\Dashboard.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeek, formatWeekRange } from "@/hooks/useWeek";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Building2, Calendar, ListChecks, FileText, ChevronRight, ClipboardList } from "lucide-react";

interface ReportSummary {
  status: string;
  submitted_at: string | null;
  task_count: number;
  completed_count: number;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

  const firstName = employee?.full_name?.split(" ")[0] || "";
  const completionPct =
    report && report.task_count > 0 ? Math.round((report.completed_count / report.task_count) * 100) : 0;

  return (
    <PageLayout title={`${getGreeting()}, ${firstName}`} description={week.displayRange}>
      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="card-interactive">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</p>
                <p className="text-lg font-semibold mt-1.5 truncate">
                  {(employee as any)?.department?.name || "—"}
                </p>
              </div>
              <div className="p-2.5 bg-accent rounded-xl shrink-0">
                <Building2 className="h-4 w-4 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Week</p>
                <p className="text-lg font-semibold mt-1.5 truncate">{week.displayRange}</p>
              </div>
              <div className="p-2.5 bg-accent rounded-xl shrink-0">
                <Calendar className="h-4 w-4 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tasks Completed</p>
                <p className="text-lg font-semibold mt-1.5">
                  {report ? `${report.completed_count} / ${report.task_count}` : "0 / 0"}
                </p>
              </div>
              <div className="p-2.5 bg-accent rounded-xl shrink-0">
                <ListChecks className="h-4 w-4 text-accent-foreground" />
              </div>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Report Status</p>
                <div className="mt-2">
                  {report ? <StatusBadge status={report.status} /> : <StatusBadge status="draft" />}
                </div>
              </div>
              <div className="p-2.5 bg-accent rounded-xl shrink-0">
                <FileText className="h-4 w-4 text-accent-foreground" />
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
            <div className="flex flex-col items-center justify-center text-center py-10">
              <div className="p-3 bg-accent rounded-full mb-3">
                <ClipboardList className="h-5 w-5 text-accent-foreground" />
              </div>
              <p className="text-sm font-medium">No reports yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start by writing your first weekly report.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentReports.map((r) => (
                <div
                  key={r.week_start}
                  className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-muted rounded-lg shrink-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium truncate">{formatWeekRange(r.week_start, r.week_end)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={r.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}