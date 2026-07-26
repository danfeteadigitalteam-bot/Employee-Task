import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "draft" | "submitted" | "reopened" | "published" | "active" | "inactive";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700 hover:bg-slate-100" },
  submitted: { label: "Submitted", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  reopened: { label: "Reopened", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
  published: { label: "Published", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  inactive: { label: "Inactive", className: "bg-red-100 text-red-700 hover:bg-red-100" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as StatusType] || statusConfig.draft;
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
