//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\components\shared\StatusBadge.tsx
import { CheckCircle2, PenLine, RotateCcw, Radio, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType = "draft" | "submitted" | "reopened" | "published" | "active" | "inactive";

const statusConfig: Record<
  StatusType,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: PenLine,
  },
  submitted: {
    label: "Submitted",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  reopened: {
    label: "Reopened",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: RotateCcw,
  },
  published: {
    label: "Published",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Radio,
  },
  active: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  inactive: {
    label: "Inactive",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as StatusType] || statusConfig.draft;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
        config.className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}