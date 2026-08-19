import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";

// Lazy load page components for code splitting
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const AppFrame = lazy(() =>
  import("@/components/workspace/AppFrame").then((m) => ({ default: m.AppFrame }))
);
const EmployeeDashboard = lazy(() => import("@/pages/employee/Dashboard"));
const WeeklyReportPage = lazy(() => import("@/pages/employee/WeeklyReport"));
const PreviousReports = lazy(() => import("@/pages/employee/PreviousReports"));
const EmployeeMeetings = lazy(() => import("@/pages/employee/EmployeeMeetings"));
const EmployeeProfile = lazy(() => import("@/pages/employee/Profile"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const AdminEmployees = lazy(() => import("@/pages/admin/Employees"));
const AdminDepartments = lazy(() => import("@/pages/admin/Departments"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));
const AdminAgenda = lazy(() => import("@/pages/admin/Agenda"));
const AdminMeetings = lazy(() => import("@/pages/admin/Meetings"));
const AdminDanfeMeetings = lazy(() => import("@/pages/admin/DanfeMeetings"));
const MeetingDetail = lazy(() => import("@/pages/admin/MeetingDetail"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  );
}

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { employee, isLoading } = useAuth();

  if (isLoading && !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!employee) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { employee, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (employee) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function WorkspaceLayout() {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        <Outlet />
      </div>
    </div>
  );
}

function WorkspaceShell() {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

function WorkspaceRedirect() {
  const { employee } = useAuth();
  if (employee?.role === "admin") {
    return <Navigate to="/workspace/admin/dashboard" replace />;
  }
  return <Navigate to="/workspace/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

        {/* Authenticated workspace layout (with sidebar + mobile nav) */}
        <Route element={<ProtectedRoute><WorkspaceLayout /></ProtectedRoute>}>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace" element={<WorkspaceRedirect />} />

          {/* Employee routes */}
          <Route path="/workspace/dashboard" element={<EmployeeDashboard />} />
          <Route path="/workspace/report" element={<WeeklyReportPage />} />
          <Route path="/workspace/reports" element={<PreviousReports />} />
          <Route path="/workspace/meetings" element={<EmployeeMeetings />} />
          <Route path="/workspace/profile" element={<EmployeeProfile />} />

          {/* Admin routes */}
          <Route path="/workspace/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/workspace/admin/employees" element={<AdminEmployees />} />
          <Route path="/workspace/admin/departments" element={<AdminDepartments />} />
          <Route path="/workspace/admin/reports" element={<AdminReports />} />
          <Route path="/workspace/admin/agenda" element={<AdminAgenda />} />
          <Route path="/workspace/admin/meetings" element={<AdminMeetings />} />
          <Route path="/workspace/admin/meetings/:id" element={<MeetingDetail />} />
          <Route path="/workspace/admin/danfe" element={<AdminDanfeMeetings />} />
        </Route>

        {/* Embedded apps (with sidebar only, no mobile nav - AppFrame has its own toolbar) */}
        <Route element={<ProtectedRoute><WorkspaceShell /></ProtectedRoute>}>
          <Route path="/apps/tasks" element={<AppFrame src="https://danfexnte.vercel.app/" title="Task Automation" />} />
          <Route path="/apps/clock-in" element={<AppFrame src="https://nte-clockin.web.app/" title="Clock In" />} />
        </Route>

        {/* Legacy redirects - keep old URLs working */}
        <Route path="/employee/*" element={<Navigate to="/workspace" replace />} />
        <Route path="/admin/*" element={<Navigate to="/workspace" replace />} />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
