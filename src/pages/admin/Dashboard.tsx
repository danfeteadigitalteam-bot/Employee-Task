import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWeek } from "@/hooks/useWeek";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, XCircle, Building2 } from "lucide-react";
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

  useEffect(() => {
    const fetchData = async () => {
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
    };

    fetchData();
  }, [week.weekStartStr]);

  return (
    <PageLayout title="Admin Dashboard" description={`Week of ${week.displayRange}`}>
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="text-2xl font-semibold">{totalEmployees}</p>
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
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="text-2xl font-semibold">{totalSubmitted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Not Submitted</p>
                  <p className="text-2xl font-semibold">{totalNotSubmitted}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Building2 className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Departments</p>
                  <p className="text-2xl font-semibold">{totalDepartments}</p>
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
            {departmentStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departments found.</p>
            ) : (
              <div className="space-y-3">
                {departmentStats.map((dept) => (
                  <div
                    key={dept.department_id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/admin/reports?department=${dept.department_id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{dept.department_name}</p>
                      <p className="text-xs text-muted-foreground">{dept.total} employees</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-emerald-600">{dept.submitted} submitted</span>
                      <span className="text-red-600">{dept.not_submitted} pending</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
