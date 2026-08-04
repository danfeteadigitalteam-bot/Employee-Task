//C:\Users\ACER\Desktop\NTE Loyalty\Employee Workspace\src\components\shared\CompanyBadge.tsx
import { cn } from "@/lib/utils";
import type { Company } from "@/types/database";

const companyConfig: Record<Company, { label: string; className: string }> = {
  nte: {
    label: "NTE Loyalty",
    className: "bg-blue-50 text-blue-600",
  },
  danfe: {
    label: "Danfe Tea",
    className: "bg-green-50 text-green-600",
  },
};

export function CompanyBadge({ company, className }: { company: Company; className?: string }) {
  const config = companyConfig[company] || companyConfig.nte;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
