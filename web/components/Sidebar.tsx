"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  filled?: boolean;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: "/", icon: "dashboard", label: "Dashboard", filled: true, roles: ["admin"] },
  { href: "/projects", icon: "engineering", label: "Projects", roles: ["admin", "salesperson", "partner", "crew"] },
  { href: "/crews", icon: "groups", label: "Crews", roles: ["admin"] },
  { href: "/change-orders", icon: "request_quote", label: "Change Orders", roles: ["admin", "salesperson", "partner", "crew"] },
  { href: "/cash-payments", icon: "payments", label: "Cash Payments", roles: ["admin"] },
  { href: "/windows-tracker", icon: "window", label: "Windows Tracker", roles: ["admin"] },
  { href: "/services", icon: "warning", label: "Services", roles: ["admin"] },
  { href: "/schedule", icon: "calendar_today", label: "Job Schedule", roles: ["admin", "salesperson", "partner", "crew"] },
  { href: "/sales-reports", icon: "assessment", label: "Sales", roles: ["admin", "salesperson"] },
  { href: "/team", icon: "admin_panel_settings", label: "Users & Permissions", roles: ["admin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (data) setUserRole(data.role);
      }
    })();
  }, []);

  // Filter nav items based on role
  const visibleItems = navItems.filter(item => {
    if (!userRole) return false;
    if (userRole === "admin") return true;
    return item.roles?.includes(userRole);
  });

  const sidebarContent = (
    <aside className="bg-[#121412] h-full w-64 flex flex-col z-50 overflow-y-auto shrink-0">
      {/* Logo — aligned with TopBar header height */}
      <div className="w-full flex items-center justify-center px-4 shrink-0 border-b border-[#474846]/20" style={{ height: "56px" }}>
        <img
          src="/logo-new.png"
          alt="Siding Depot Logo"
          className="w-[80px] h-auto object-contain"
          style={{ filter: "drop-shadow(0px 0px 8px rgba(174, 238, 42, 0.6)) drop-shadow(0px 0px 15px rgba(174, 238, 42, 0.3))" }}
        />
        {/* Close button — only inside mobile drawer */}
        {isOpen && (
          <button
            onClick={close}
            className="lg:hidden absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#242624] border border-white/10 flex items-center justify-center text-[#ababa8] hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-[18px]" translate="no">close</span>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-4 pt-4 pb-6">
        {visibleItems.map((item) => {
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

      {/* Settings — pinned to bottom */}
      <div className="px-4 pb-4 pt-2 border-t border-[#474846]/20 shrink-0">
        <Link
          href="/settings"
          onClick={close}
          className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
            pathname === "/settings" || pathname.startsWith("/settings/")
              ? "text-[#aeee2a] font-bold border-r-4 border-[#aeee2a] bg-[#242624]"
              : "text-zinc-500 hover:text-zinc-200 hover:bg-[#242624]"
          }`}
        >
          <span className="material-symbols-outlined" translate="no">settings</span>
          <span>Settings</span>
        </Link>
      </div>
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
        {sidebarContent}
      </div>
    </>
  );
}
