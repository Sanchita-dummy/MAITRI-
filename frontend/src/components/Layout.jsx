import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Building2,
  BriefcaseBusiness,
  FileCheck2,
  Rocket,
  Handshake,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Bell,
  CircleUserRound,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/challenges", label: "Challenges", icon: Sparkles },
  { to: "/startups", label: "Startup Discovery", icon: Building2 },
  { to: "/applications", label: "Applications", icon: BriefcaseBusiness },
  { to: "/evaluations", label: "Evaluations", icon: FileCheck2 },
  { to: "/pilots", label: "Pilots", icon: Rocket },
  { to: "/contracts", label: "Contracts & Payments", icon: Handshake },
  { to: "/validation", label: "Validation", icon: ShieldCheck },
  { to: "/scale-up", label: "Scale-up", icon: TrendingUp },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#eef3f7]">
      <aside className="fixed inset-y-0 left-0 flex w-72 flex-col bg-[#122b43] text-white shadow-[12px_0_32px_rgba(15,23,42,0.12)] max-md:w-20">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5 max-md:justify-center max-md:px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b] text-lg font-black text-[#0f172a] shadow-lg shadow-[#f59e0b]/30">
            M
          </div>
          <div className="max-md:hidden">
            <div className="text-[28px] font-black leading-none tracking-[-0.07em]">MAITRI</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
              Innovation &amp; Impact
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-item ${
                  isActive
                    ? "bg-white/10 text-white shadow-inner shadow-white/5"
                    : "text-slate-200/80 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="max-md:hidden">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4 text-[11px] uppercase tracking-[0.14em] text-slate-400 max-md:hidden">
          Government workspace
        </div>
      </aside>

      <main className="ml-72 min-h-screen p-6 max-md:ml-20 xl:p-8">
        <div className="mx-auto max-w-[1500px]">
          <header className="mb-7 flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="font-semibold text-slate-700">Government</span>
              <span className="text-slate-300">/</span>
              <span>Workspace</span>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-700">
                <Bell className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f59e0b] text-xs font-bold text-[#0f172a]">
                  G
                </div>
                <div className="text-left max-md:hidden">
                  <div className="text-sm font-semibold text-slate-800">GovAdmin</div>
                  <div className="text-[11px] text-slate-500">Government workspace</div>
                </div>
                <CircleUserRound className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}
