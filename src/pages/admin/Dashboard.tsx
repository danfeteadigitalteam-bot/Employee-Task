//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\pages\admin\Dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWeek } from "@/hooks/useWeek";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Building2, ChevronRight, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DepartmentStats {
  department_id: string;
  department_name: string;
  total: number;
  submitted: number;
  not_submitted: number;
}

export default function AdminDashboard() {
  const week = useWeek();
  const navigate = useNavigate();
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalSubmitted, setTotalSubmitted] = useState(0);
  const [totalNotSubmitted, setTotalNotSubmitted] = useState(0);
  const [totalDepartments, setTotalDepartments] = useState(0);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch departments
      const { data: departments } = await supabase.from("departments").select("*");
      if (departments) setTotalDepartments(departments.length);

      // Fetch all active employees
      const { data: employees } = await supabase
        .from("employees")
        .select("*, departments(name)")
        .eq("is_active", true)
        .neq("role", "admin");

      if (employees) {
        setTotalEmployees(employees.length);

        // Fetch current week reports
        const { data: reports } = await supabase
          .from("weekly_reports")
          .select("employee_id, status")
          .eq("week_start", week.weekStartStr);

        const reportMap = new Map<string, string>();
        if (reports) {
          reports.forEach((r: any) => reportMap.set(r.employee_id, r.status));
        }

        let submitted = 0;
        let notSubmitted = 0;
        const statsMap = new Map<string, DepartmentStats>();

        employees.forEach((emp: any) => {
          const deptName = emp.departments?.name || "Unknown";
          const deptId = emp.department_id;

          if (!statsMap.has(deptId)) {
            statsMap.set(deptId, {
              department_id: deptId,
              department_name: deptName,
              total: 0,
              submitted: 0,
              not_submitted: 0,
            });
          }

          const stats = statsMap.get(deptId)!;
          stats.total++;

          const reportStatus = reportMap.get(emp.id);
          if (reportStatus === "submitted") {
            submitted++;
            stats.submitted++;
          } else {
            notSubmitted++;
            stats.not_submitted++;
          }
        });

        setTotalSubmitted(submitted);
        setTotalNotSubmitted(notSubmitted);
        setDepartmentStats(Array.from(statsMap.values()));
      }
      setLoading(false);
    };

    fetchData();
  }, [week.weekStartStr]);

  const submissionRate = totalEmployees > 0 ? Math.round((totalSubmitted / totalEmployees) * 100) : 0;

  return (
    <PageLayout title="Admin Dashboard" description={`Week of ${week.displayRange}`}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Employees</p>
                  <p className="text-2xl font-semibold mt-1.5">{totalEmployees}</p>
                </div>
                <div className="p-2.5 bg-accent rounded-xl shrink-0">
                  <Users className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submitted</p>
                  <p className="text-2xl font-semibold mt-1.5">{totalSubmitted}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl shrink-0">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${submissionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Not Submitted</p>
                  <p className="text-2xl font-semibold mt-1.5">{totalNotSubmitted}</p>
                </div>
                <div className="p-2.5 bg-red-50 rounded-xl shrink-0">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-interactive">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Departments</p>
                  <p className="text-2xl font-semibold mt-1.5">{totalDepartments}</p>
                </div>
                <div className="p-2.5 bg-accent rounded-xl shrink-0">
                  <Building2 className="h-4 w-4 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <div className="h-14 bg-muted/60 rounded-xl animate-pulse" />
                <div className="h-14 bg-muted/60 rounded-xl animate-pulse" />
                <div className="h-14 bg-muted/60 rounded-xl animate-pulse" />
              </div>
            ) : departmentStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10">
                <div className="p-3 bg-accent rounded-full mb-3">
                  <LayoutGrid className="h-5 w-5 text-accent-foreground" />
                </div>
                <p className="text-sm font-medium">No departments found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {departmentStats.map((dept) => {
                  const rate = dept.total > 0 ? Math.round((dept.submitted / dept.total) * 100) : 0;
                  return (
                    <div
                      key={dept.department_id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border card-interactive cursor-pointer"
                      onClick={() => navigate(`/admin/reports?department=${dept.department_id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-muted rounded-lg shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{dept.department_name}</p>
                          <p className="text-xs text-muted-foreground">{dept.total} employees</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:block w-24">
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-emerald-600 font-medium">{dept.submitted} submitted</span>
                          <span className="text-red-600 font-medium">{dept.not_submitted} pending</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}