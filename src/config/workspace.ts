import {
  Home,
  ClipboardList,
  ListTodo,
  Clock3,
  LayoutDashboard,
  FileText,
  History,
  Users,
  Building2,
  BarChart3,
  Calendar,
  BookOpen,
  User,
  Coffee,
} from "lucide-react";
import type { ComponentType } from "react";

export interface WorkspaceApp {
  id: string;
  name: string;
  description: string;
  route: string;
  icon: ComponentType<{ className?: string }>;
  type: "internal" | "embedded";
  source?: string;
}

export const workspaceApps: WorkspaceApp[] = [
  {
    id: "employee",
    name: "Employee Workspace",
    description: "Weekly work, employee updates, notes and meeting information.",
    route: "/workspace",
    icon: ClipboardList,
    type: "internal",
  },
  {
    id: "tasks",
    name: "Task Automation",
    description: "Manage tasks, projects and automated workflows.",
    route: "/apps/tasks",
    icon: ListTodo,
    type: "embedded",
    source: "https://danfexnte.vercel.app/",
  },
  {
    id: "clock",
    name: "Clock In",
    description: "Clock in, clock out, manage breaks and view attendance.",
    route: "/apps/clock-in",
    icon: Clock3,
    type: "embedded",
    source: "https://nte-clockin.web.app/",
  },
];

export interface NavItem {
  label: string;
  route: string;
  icon: ComponentType<{ className?: string }>;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

// Internal workspace links for employees
export const employeeWorkspaceLinks: NavItem[] = [
  { route: "/workspace/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { route: "/workspace/report", label: "This Week", icon: FileText },
  { route: "/workspace/reports", label: "Previous Reports", icon: History },
  { route: "/workspace/meetings", label: "Meeting Minutes", icon: BookOpen },
  { route: "/workspace/profile", label: "Profile", icon: User },
];

// Internal workspace links for admins
export const adminWorkspaceLinks: NavItem[] = [
  { route: "/workspace/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { route: "/workspace/admin/employees", label: "Employees", icon: Users },
  { route: "/workspace/admin/departments", label: "Departments", icon: Building2 },
  { route: "/workspace/admin/reports", label: "Reports", icon: BarChart3 },
  { route: "/workspace/admin/agenda", label: "Meeting Agenda", icon: Calendar },
  { route: "/workspace/admin/meetings", label: "Meeting Minutes", icon: BookOpen },
  { route: "/workspace/admin/danfe", label: "Danfe Tea Meetings", icon: Coffee },
];

// Global top-level navigation
export const globalNavGroups: NavGroup[] = [
  {
    title: "",
    items: [{ label: "Home", route: "/", icon: Home }],
  },
  {
    title: "WORK",
    items: [
      { label: "Employee Workspace", route: "/workspace", icon: ClipboardList },
      { label: "Task Automation", route: "/apps/tasks", icon: ListTodo },
    ],
  },
  {
    title: "TIME",
    items: [{ label: "Clock In", route: "/apps/clock-in", icon: Clock3 }],
  },
];
