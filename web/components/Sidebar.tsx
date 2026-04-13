"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", icon: "dashboard", label: "Dashboard", filled: true },
  { href: "/projects", icon: "engineering", label: "Projects" },
  { href: "/services", icon: "construction", label: "Services" },
  { href: "/crews", icon: "groups", label: "Crews" },
  { href: "/change-orders", icon: "request_quote", label: "Change Orders" },
  { href: "/cash-payments", icon: "payments", label: "Cash Payments" },
  { href: "/windows-tracker", icon: "window", label: "Windows Tracker" },
  { href: "/issues", icon: "report_problem", label: "Issues" },
  { href: "/schedule", icon: "calendar_today", label: "Schedule" },
  { href: "/reports", icon: "assessment", label: "Reports" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-[#121412] h-screen w-64 flex flex-col py-6 z-50 overflow-y-auto shrink-0">
      {/* Logo */}
      <div className="px-6 mb-10 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#aeee2a] rounded-lg flex items-center justify-center">
          <span
            className="material-symbols-outlined text-[#3a5400] text-xl"
            translate="no"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            architecture
          </span>
        </div>
        <div>
          <h1
            className="text-2xl font-bold tracking-tighter text-[#aeee2a]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            BuildFlow
          </h1>
          <p className="text-[10px] text-[#ababa8] tracking-widest uppercase">
            Construction Management
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const isActive =
            item.href !== "#" &&
            (pathname === item.href || pathname.startsWith(item.href + "/") || (item.href === "/projects" && pathname.startsWith("/new-project")));
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                isActive
                  ? "text-[#aeee2a] font-bold border-r-4 border-[#aeee2a] bg-[#242624]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-[#242624]"
              }`}
            >
              <span
                className="material-symbols-outlined"
                translate="no"
                style={
                  item.filled && isActive
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>


    </aside>
  );
}
