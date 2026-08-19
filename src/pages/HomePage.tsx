import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { workspaceApps } from "@/config/workspace";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import {
  ArrowRight,
  Download,
  Smartphone,
  Monitor,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Share,
  Plus,
  MoreVertical,
} from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function getPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function ManualInstructions({ platform }: { platform: "ios" | "android" | "desktop" }) {
  if (platform === "ios") {
    return (
      <ol className="mt-3 space-y-2 text-xs text-[#71717A] list-decimal list-inside">
        <li>Tap the <strong className="text-[#18181B]">Share</strong> button <Share className="inline h-3 w-3" /> in Safari</li>
        <li>Scroll down and tap <strong className="text-[#18181B]">Add to Home Screen</strong> <Plus className="inline h-3 w-3" /></li>
        <li>Tap <strong className="text-[#18181B]">Add</strong> to confirm</li>
      </ol>
    );
  }
  if (platform === "android") {
    return (
      <ol className="mt-3 space-y-2 text-xs text-[#71717A] list-decimal list-inside">
        <li>Tap the <strong className="text-[#18181B]">three dots</strong> <MoreVertical className="inline h-3 w-3" /> menu in Chrome</li>
        <li>Tap <strong className="text-[#18181B]">Add to Home screen</strong></li>
        <li>Tap <strong className="text-[#18181B]">Add</strong> to confirm</li>
      </ol>
    );
  }
  return (
    <ol className="mt-3 space-y-2 text-xs text-[#71717A] list-decimal list-inside">
      <li>Click the <strong className="text-[#18181B]">install icon</strong> in the address bar (or click the three dots menu)</li>
      <li>Click <strong className="text-[#18181B]">Install</strong> or <strong className="text-[#18181B]">Add to taskbar</strong></li>
    </ol>
  );
}

export default function HomePage() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const { canInstall, install } = usePwaInstall();
  const [showInstructions, setShowInstructions] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  const firstName = employee?.full_name?.split(" ")[0] ?? "there";
  const installed = isStandalone();

  useEffect(() => {
    setPlatform(getPlatform());
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F5]">
      <header className="border-b border-[#E7E7E4]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-[#18181B]">
              DANFE × NTE
            </h1>
            <p className="text-xs text-[#71717A]">
              Employee Workspace
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="mb-10 md:mb-14">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#18181B]">
            {getGreeting()}, {firstName}
          </h2>
          <p className="text-sm md:text-base mt-2 max-w-lg text-[#71717A]">
            Everything you need, in one place. Access your work, tasks and
            attendance from one workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaceApps.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                onClick={() => navigate(app.route)}
                className="group text-left p-5 rounded-[14px] border border-[#E7E7E4] bg-white transition-all duration-150 hover:border-[#d4d4d0] hover:shadow-sm cursor-pointer"
              >
                <div className="h-9 w-9 rounded-lg flex items-center justify-center mb-4 bg-[#F7F7F5]">
                  <Icon className="h-4.5 w-4.5 text-foreground" />
                </div>
                <h3 className="text-sm font-medium mb-1 text-[#18181B]">
                  {app.name}
                </h3>
                <p className="text-xs leading-relaxed mb-4 text-[#71717A]">
                  {app.description}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#F4C542] transition-colors">
                  {app.name}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </div>

        {/* Install App Section */}
        {installed ? (
          <div className="mt-12 p-6 rounded-2xl border border-[#E7E7E4] bg-white flex items-center gap-5">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#18181B]">
                App Installed
              </h3>
              <p className="text-xs text-[#71717A] mt-1">
                You're using the installed version of Workspace. Enjoy the full experience!
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-[#E7E7E4] bg-white overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-5">
                <div className="h-12 w-12 rounded-xl bg-[#1a1a2e] flex items-center justify-center shrink-0">
                  <Download className="h-6 w-6 text-[#F4C542]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#18181B]">
                    Install Workspace
                  </h3>
                  <p className="text-xs text-[#71717A] mt-1">
                    Add to your home screen for instant access, just like a native app.
                  </p>
                </div>
                {canInstall && (
                  <button
                    onClick={install}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a1a2e] bg-[#F4C542] hover:bg-[#e0b33b] px-4 py-2 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Install
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E7E7E4]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
                  <Smartphone className="h-3.5 w-3.5" />
                  Works on mobile
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
                  <Monitor className="h-3.5 w-3.5" />
                  Works on desktop
                </div>
              </div>
            </div>

            {/* Manual instructions toggle */}
            <div className="border-t border-[#E7E7E4]">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full px-6 py-3 flex items-center justify-between text-xs text-[#71717A] hover:bg-[#F7F7F5] transition-colors cursor-pointer"
              >
                <span>
                  {canInstall
                    ? "Or install manually"
                    : platform === "ios"
                      ? "How to install on iPhone"
                      : platform === "android"
                        ? "How to install on Android"
                        : "How to install on your browser"}
                </span>
                {showInstructions ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {showInstructions && (
                <div className="px-6 pb-5">
                  <ManualInstructions platform={platform} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
