"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";

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
  const { isOpen, close } = useSidebar();

  const sidebarContent = (
    <aside className="bg-[#121412] h-full w-64 flex flex-col py-6 z-50 overflow-y-auto shrink-0">
      {/* Logo */}
      <div className="w-full flex justify-center mb-6 mt-2">
        <img
          src="/logo-new.png"
          alt="Siding Depot Logo"
          className="w-[110px] h-auto object-contain"
          style={{ filter: "drop-shadow(0px 0px 8px rgba(174, 238, 42, 0.6)) drop-shadow(0px 0px 15px rgba(174, 238, 42, 0.3))" }}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const isActive =
            item.href !== "#" &&
            (pathname === item.href ||
              pathname.startsWith(item.href + "/") ||
              (item.href === "/projects" && pathname.startsWith("/new-project")));
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={close}
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

  return (
    <>
      {/* ── Desktop: sidebar estática ── */}
      <div className="hidden lg:flex h-screen shrink-0">
        {sidebarContent}
      </div>

      {/* ── Mobile: overlay + drawer ── */}
      {/* Overlay escuro */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-50 h-full transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button inside drawer header */}
        <div className="relative h-full">
          <button
            onClick={close}
            className="absolute top-4 right-[-44px] z-50 w-9 h-9 rounded-full bg-[#242624] border border-white/10 flex items-center justify-center text-[#ababa8] hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[20px]" translate="no">close</span>
          </button>
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
