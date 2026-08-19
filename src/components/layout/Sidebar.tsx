import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  globalNavGroups,
  employeeWorkspaceLinks,
  adminWorkspaceLinks,
} from "@/config/workspace";

export function Sidebar() {
  const { employee, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = employee?.role === "admin";
  const inWorkspace = location.pathname.startsWith("/workspace");
  const workspaceLinks = isAdmin ? adminWorkspaceLinks : employeeWorkspaceLinks;

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
    <aside className="hidden lg:flex lg:flex-col lg:w-[220px] lg:border-r bg-card h-screen sticky top-0 shrink-0">
      <div className="px-5 py-5">
        <h1 className="text-sm font-semibold tracking-tight text-foreground">
          DANFE × NTE
        </h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Employee Workspace
        </p>
      </div>

      <Separator />

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {/* Global nav groups */}
        {globalNavGroups.map((group) => (
          <div key={group.title || "primary"}>
            {group.title && (
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isWorkspaceLink =
                  item.route === "/workspace" && inWorkspace;
                return (
                  <NavLink
                    key={item.route}
                    to={item.route}
                    end={item.route === "/"}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                        isActive || isWorkspaceLink
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}

        {/* Internal workspace links - only when inside /workspace */}
        {inWorkspace && (
          <>
            <Separator />
            <div>
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {isAdmin ? "ADMIN" : "WORKSPACE"}
              </p>
              <div className="space-y-0.5">
                {workspaceLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.route}
                      to={item.route}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>

      <div className="p-3 border-t">
        <div className="flex items-center gap-2.5 px-2 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-[10px] bg-muted">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-foreground">
              {employee?.full_name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {employee?.employee_code}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground h-8 text-xs"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
