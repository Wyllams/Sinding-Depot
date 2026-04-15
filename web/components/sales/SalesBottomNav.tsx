"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, UserRound } from "lucide-react";

export default function SalesBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "HOME", href: "/sales", icon: Home, isActive: pathname === "/sales" },
    { label: "MY DEALS", href: "/sales/jobs", icon: Briefcase, isActive: pathname.startsWith("/sales/jobs") },
    { label: "PROFILE", href: "/sales/profile", icon: UserRound, isActive: pathname.startsWith("/sales/profile") },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#050505]/95 backdrop-blur-md border-t border-zinc-800 px-6 py-3 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <ul className="flex justify-between items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label} className="w-1/3">
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                  item.isActive 
                    ? "text-[var(--color-siding-green)] scale-110" 
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <div className={`relative flex items-center justify-center ${item.isActive ? 'drop-shadow-[0_0_8px_rgba(174,238,42,0.5)]' : ''}`}>
                   <Icon size={22} strokeWidth={item.isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-bold tracking-wider ${item.isActive ? 'opacity-100' : 'opacity-70'}`}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
