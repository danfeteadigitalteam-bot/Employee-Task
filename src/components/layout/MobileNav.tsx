import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Menu,
  X,
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
  Coffee,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  { to: "/admin/danfe", label: "Danfe Tea Meetings", icon: Coffee },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  };

  const handleNav = () => {
    setOpen(false);
  };

  return (
    <div className="lg:hidden sticky top-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Employee Workspace</h1>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{isAdmin ? "Admin Panel" : "Employee Panel"}</p>
          </div>

          <nav className="px-4 space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={handleNav}
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

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
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
        </SheetContent>
      </Sheet>

      <h1 className="text-base font-semibold">Employee Workspace</h1>

      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
      </Avatar>
    </div>
  );
}
