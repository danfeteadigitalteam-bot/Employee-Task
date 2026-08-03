import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { startNewWeek } from "@/lib/weekService";
import type { Employee, WeeklyReport } from "@/types/database";

interface NewWeekButtonProps {
  employee: Employee;
  onStarted?: (report: WeeklyReport) => void;
  compact?: boolean;
}

export function NewWeekButton({ employee, onStarted, compact }: NewWeekButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const report = await startNewWeek(employee);
      toast.success("New week started");
      onStarted?.(report);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start new week");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={busy}
        className="gap-2"
        variant={compact ? "outline" : "default"}
        size={compact ? "sm" : "default"}
      >
        <CalendarPlus className="h-4 w-4" />
        New Week
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Start New Week"
        description="This starts a new week based on the latest Sunday meeting. Your current week stays saved as a draft and its tasks will no longer show on your dashboard. Continue?"
        confirmLabel="Start New Week"
        onConfirm={handleConfirm}
      />
    </>
  );
}
