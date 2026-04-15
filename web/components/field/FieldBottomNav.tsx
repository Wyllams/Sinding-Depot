"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FieldBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/field", icon: "home" },
    { name: "My Jobs", href: "/field/jobs", icon: "handyman" },
    { name: "Alerts", href: "/field/alerts", icon: "notifications" },
    { name: "Profile", href: "/field/profile", icon: "person" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#121412]/95 backdrop-blur-xl border-t border-[#242624] px-6 py-4 pb-safe flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        // Active if exact match for home, or starts with for others (like /field/jobs/123)
        const isActive = 
          item.href === "/field" 
            ? pathname === "/field" 
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center gap-1.5 transition-all w-16 ${
              isActive ? "text-[#aeee2a] drop-shadow-[0_0_8px_rgba(174,238,42,0.6)]" : "text-[#ababa8] hover:text-[#faf9f5]"
            }`}
          >
            <span 
              className={`material-symbols-outlined text-[28px] ${isActive ? "font-variation-settings-[\\'FILL\\'_1]" : ""}`} 
              translate="no"
            >
              {item.icon}
            </span>
            <span className={`text-[10px] uppercase tracking-widest font-bold ${isActive ? "opacity-100" : "opacity-60"}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
