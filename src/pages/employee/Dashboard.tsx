//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\employee\Dashboard.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatWeekRange } from "@/hooks/useWeek";
import { useActiveWeek } from "@/hooks/useActiveWeek";
import { supabase } from "@/lib/supabase";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { NewWeekButton } from "@/components/shared/NewWeekButton";
import { Building2, Calendar, ListChecks, FileText, ChevronRight, ClipboardList, Link2, CheckCircle2, ListTodo, RotateCcw } from "lucide-react";
import type { WeeklyTask } from "@/types/database";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function EmployeeDashboard() {
  const { employee } = useAuth();
  const { report, tasks, loading, error, refresh, retry } = useActiveWeek(employee);
  const [recentReports, setRecentReports] = useState<{ week_start: string; week_end: string; status: string }[]>([]);

  useEffect(() => {
    if (!employee) return;

    const fetchRecent = async () => {
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

    fetchRecent();
  }, [employee]);

  const firstName = employee?.full_name?.split(" ")[0] || "";
  const plannedTasks = tasks.filter((t) => t.task_type === "planned");
  const completedTasks = tasks.filter((t) => t.task_type === "completed");
  const completionPct =
    report && tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const activeRange = report ? formatWeekRange(report.week_start, report.week_end) : "No active week yet";

  const renderTask = (task: WeeklyTask) => (
    <div key={task.id} className="flex items-start gap-3 py-1.5 -mx-2 px-2 rounded-lg">
      <span className={`text-sm flex-1 ${task.is_checked ? "line-through text-muted-foreground" : ""}`}>
        {task.task_text}
      </span>
      {task.source === "meeting" && (
        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md shrink-0">
          <Link2 className="h-3 w-3" />
          Meeting
        </span>
      )}
    </div>
  );

  return (
    <PageLayout
      title={`${getGreeting()}, ${firstName}`}
      description={activeRange}
      actions={
        employee ? <NewWeekButton employee={employee} onStarted={refresh} /> : undefined
      }
    >
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
                <p className="text-lg font-semibold mt-1.5 truncate">{activeRange}</p>
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
                  {report ? `${completedTasks.length} / ${tasks.length}` : "0 / 0"}
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

      {/* This Week's Task Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-muted-foreground" />
            This Week's Task Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 py-2">
              <div className="h-4 bg-muted/60 rounded animate-pulse" />
              <div className="h-4 bg-muted/60 rounded animate-pulse" />
              <div className="h-4 bg-muted/60 rounded animate-pulse" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <p className="text-sm font-medium">Couldn't load your checklist</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={retry} className="mt-3 gap-1.5">
                <RotateCcw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="p-3 bg-accent rounded-full mb-3">
                <ListTodo className="h-5 w-5 text-accent-foreground" />
              </div>
              <p className="text-sm font-medium">No active week yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tasks discussed in Sunday's meeting will appear here once your week is started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {plannedTasks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 tracking-wide uppercase">
                    Planned ({plannedTasks.length})
                  </p>
                  <div className="divide-y divide-border/60">{plannedTasks.map(renderTask)}</div>
                </div>
              )}
              {completedTasks.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1 tracking-wide uppercase">
                    Completed ({completedTasks.length})
                  </p>
                  <div className="divide-y divide-border/60">
                    {completedTasks.map((t) => (
                      <div key={t.id} className="flex items-start gap-3 py-1.5 -mx-2 px-2 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span className="text-sm line-through text-muted-foreground flex-1">{t.task_text}</span>
                        {t.source === "meeting" && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md shrink-0">
                            <Link2 className="h-3 w-3" />
                            Meeting
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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