"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleLogout = async () => {
    // Limpa o cookie de sessão diretamente no cliente também
    document.cookie = 'siding_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="bg-[#121412] h-screen w-64 flex flex-col py-6 z-50 overflow-y-auto shrink-0">
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

      {/* Logout */}
      <div className="px-4 pb-2 mt-2">
        <button
          onClick={handleLogout}
          className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
        >
          <span className="material-symbols-outlined" translate="no">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
