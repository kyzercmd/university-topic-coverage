import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Sparkles,
  Settings,
} from "lucide-react";

type NavItem = {
  label: string;
  to: LinkProps["to"];
  description: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  {
    label: "Overview",
    to: "/overview",
    description: "Analytics & coverage",
    icon: LayoutDashboard,
  },
  {
    label: "Submission",
    to: "/submission",
    description: "Student & faculty forms",
    icon: Inbox,
  },
  {
    label: "Course Materials",
    to: "/course-outline",
    description: "Curriculum",
    icon: FileText,
  },
  {
    label: "Assessment Intelligence",
    to: "/assessment",
    description: "AI question analysis",
    icon: Sparkles,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-72 shrink-0 border-r flex flex-col">
        <div className="h-20 flex items-center px-6 border-b">
          <Link to="/overview" className="flex items-center gap-3">
            <div className="flex items-center justify-center bg-primary text-primary-foreground font-bold text-xl rounded-md w-8 h-8 shrink-0">
              A
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight">AICAS</span>
              <span className="text-[11px] text-muted-foreground tracking-tight">
                Academic Intelligence
              </span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "group flex items-start gap-3 p-3 rounded-xl border transition-all " +
                  (active
                    ? "border-foreground/15 bg-secondary shadow-sm"
                    : "border-transparent hover:border-border hover:bg-secondary/50")
                }
              >
                <div
                  className={
                    "h-9 w-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors " +
                    (active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card text-foreground/70 group-hover:text-foreground")
                  }
                >
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="text-sm font-medium leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
            <div className="h-9 w-9 rounded-lg bg-foreground text-background flex items-center justify-center text-xs font-semibold">
              AD
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium leading-tight">Admin</div>
              <div className="text-[11px] text-muted-foreground truncate">
                admin@university.edu
              </div>
            </div>
            <Settings
              size={15}
              className="ml-auto text-muted-foreground shrink-0"
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-10 py-14">{children}</div>
      </main>
    </div>
  );
}
