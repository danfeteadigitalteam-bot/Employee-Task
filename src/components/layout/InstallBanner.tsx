import { Download, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Button } from "@/components/ui/button";

export function InstallBanner() {
  const { canInstall, install, dismiss } = usePwaInstall();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe">
      <div className="mx-auto max-w-lg bg-[#1a1a2e] text-white rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-[#F4C542]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install Workspace</p>
          <p className="text-xs text-white/60 mt-0.5">
            Add to your home screen for quick access
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="bg-[#F4C542] hover:bg-[#e0b33b] text-[#1a1a2e] font-semibold text-xs h-8 px-4 rounded-lg cursor-pointer"
            onClick={install}
          >
            Install
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
