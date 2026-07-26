import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  FileText,
  History,
  Users,
  Building2,
  BarChart3,
  Calendar,
  BookOpen,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const employeeLinks = [
  { to: "/employee/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/employee/report", label: "This Week", icon: FileText },
  { to: "/employee/reports", label: "Previous Reports", icon: History },
  { to: "/employee/meetings", label: "Meeting Minutes", icon: BookOpen },
  { to: "/employee/profile", label: "Profile", icon: User },
];

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/employees", label: "Employees", icon: Users },
  { to: "/admin/departments", label: "Departments", icon: Building2 },
  { to: "/admin/reports", label: "Reports", icon: BarChart3 },
  { to: "/admin/agenda", label: "Meeting Agenda", icon: Calendar },
  { to: "/admin/meetings", label: "Meeting Minutes", icon: BookOpen },
];

export function Sidebar() {
  const { employee, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = employee?.role === "admin";
  const links = isAdmin ? adminLinks : employeeLinks;

  const initials = employee?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r bg-card h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-lg font-semibold tracking-tight">Employee Workspace</h1>
        <p className="text-xs text-muted-foreground mt-1">{isAdmin ? "Admin Panel" : "Employee Panel"}</p>
      </div>

      <Separator />

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{employee?.full_name}</p>
            <p className="text-xs text-muted-foreground">{employee?.employee_code}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
