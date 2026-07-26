import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/LoginPage";
import EmployeeDashboard from "@/pages/employee/Dashboard";
import WeeklyReportPage from "@/pages/employee/WeeklyReport";
import PreviousReports from "@/pages/employee/PreviousReports";
import EmployeeMeetings from "@/pages/employee/EmployeeMeetings";
import EmployeeProfile from "@/pages/employee/Profile";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminEmployees from "@/pages/admin/Employees";
import AdminDepartments from "@/pages/admin/Departments";
import AdminReports from "@/pages/admin/Reports";
import AdminAgenda from "@/pages/admin/Agenda";
import AdminMeetings from "@/pages/admin/Meetings";
import MeetingDetail from "@/pages/admin/MeetingDetail";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: ReactNode; allowedRole?: string }) {
  const { employee, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!employee) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && employee.role !== allowedRole) {
    const redirectPath = employee.role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
    return <Navigate to={redirectPath} replace />;
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
    const redirectPath = employee.role === "admin" ? "/admin/dashboard" : "/employee/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Employee routes */}
      <Route path="/employee/dashboard" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/employee/report" element={<ProtectedRoute><WeeklyReportPage /></ProtectedRoute>} />
      <Route path="/employee/reports" element={<ProtectedRoute><PreviousReports /></ProtectedRoute>} />
      <Route path="/employee/meetings" element={<ProtectedRoute><EmployeeMeetings /></ProtectedRoute>} />
      <Route path="/employee/profile" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/employees" element={<ProtectedRoute allowedRole="admin"><AdminEmployees /></ProtectedRoute>} />
      <Route path="/admin/departments" element={<ProtectedRoute allowedRole="admin"><AdminDepartments /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRole="admin"><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/agenda" element={<ProtectedRoute allowedRole="admin"><AdminAgenda /></ProtectedRoute>} />
      <Route path="/admin/meetings" element={<ProtectedRoute allowedRole="admin"><AdminMeetings /></ProtectedRoute>} />
      <Route path="/admin/meetings/:id" element={<ProtectedRoute allowedRole="admin"><MeetingDetail /></ProtectedRoute>} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
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
