"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Brand Health" },
  { href: "/issues", label: "Issue Trends" },
  { href: "/responses", label: "Response Queue" },
  { href: "/brief", label: "Weekly Brief" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-slate-700">
          <div className="text-sm font-semibold tracking-wide text-slate-300">OPPTRA</div>
          <div className="text-xs text-slate-500 mt-0.5">Brand Health Agent</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded text-sm font-medium transition-colors ${
                  active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-500">
          Demo Mode — Seeded Data
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">Tower Cookware</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">24cm Frying Pan</span>
            <span className="text-xs text-slate-400">SKU: TWR-24CM-FRY</span>
          </div>
          <div className="text-xs text-slate-400">Last updated: 2024-11-07</div>
        </header>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </main>
    </div>
  );
}
