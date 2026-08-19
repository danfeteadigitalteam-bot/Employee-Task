import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { workspaceApps } from "@/config/workspace";
import { ArrowRight } from "lucide-react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { employee } = useAuth();
  const navigate = useNavigate();

  const firstName = employee?.full_name?.split(" ")[0] ?? "there";

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
      </main>
    </div>
  );
}
