"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FieldBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "HOME", href: "/field", icon: "home", isActive: pathname === "/field" },
    { label: "MY JOBS", href: "/field/jobs", icon: "handyman", isActive: pathname.startsWith("/field/jobs") },
    { label: "SERVICES", href: "/field/services", icon: "warning", isActive: pathname.startsWith("/field/services") },
    { label: "PROFILE", href: "/field/profile", icon: "person", isActive: pathname.startsWith("/field/profile") },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#050505]/95 backdrop-blur-md border-t border-zinc-800 px-6 py-3 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <ul className="flex justify-between items-center">
        {navItems.map((item) => (
          <li key={item.label} className="w-1/4">
            <Link
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                item.isActive
                  ? "text-[var(--color-siding-green)] scale-110"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <div
                className={`relative flex items-center justify-center ${
                  item.isActive ? "drop-shadow-[0_0_8px_rgba(174,238,42,0.5)]" : ""
                }`}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  translate="no"
                  style={{
                    fontVariationSettings: item.isActive ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  {item.icon}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold tracking-wider ${
                  item.isActive ? "opacity-100" : "opacity-70"
                }`}
              >
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
