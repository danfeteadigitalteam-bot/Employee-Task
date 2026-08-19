import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  globalNavGroups,
  employeeWorkspaceLinks,
  adminWorkspaceLinks,
} from "@/config/workspace";

export function MobileNav() {
  const [open, setOpen] = useState(false);
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
    setOpen(false);
  };

  const handleNav = () => {
    setOpen(false);
  };

  return (
    <div className="lg:hidden sticky top-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger>
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="px-5 py-5">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-semibold">DANFE × NTE</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Employee Workspace
            </p>
          </div>

          <nav className="px-3 space-y-5">
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
                        onClick={handleNav}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
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

            {/* Internal workspace links */}
            {inWorkspace && (
              <>
                <div className="px-3">
                  <div className="h-px bg-border" />
                </div>
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
                          onClick={handleNav}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
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

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <div className="flex items-center gap-2.5 mb-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[10px] bg-muted">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
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
        </SheetContent>
      </Sheet>

      <h1 className="text-sm font-semibold">DANFE × NTE</h1>

      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-[10px] bg-muted">
          {initials}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
