"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const NAV_ITEMS = [
  { href: "/customer",              label: "Dashboard",      icon: "dashboard" },
  { href: "/customer/change-orders",label: "Change Orders",  icon: "request_quote" },
  { href: "/customer/documents",    label: "Documents",      icon: "folder_open" },
  { href: "/customer/colors",       label: "Colors",         icon: "format_paint" },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [customerName, setCustomerName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile) setCustomerName(profile.full_name);
    })();
  }, []);

  async function handleSignOut(): Promise<void> {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="bg-background min-h-screen font-body text-on-surface">
      {/* Header */}
      <header className="safe-area-top bg-surface-container border-b border-outline-variant sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <Link href="/customer" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-surface-container-low text-primary flex items-center justify-center font-bold text-sm font-headline rounded-lg">
                SD
              </div>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-on-surface tracking-tight leading-none text-base">Siding Depot</span>
                <span className="text-on-surface-variant text-[9px] font-bold uppercase tracking-widest leading-none mt-1.5">Client Portal</span>
              </div>
            </Link>
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-bold transition-colors flex items-center gap-1.5 pb-0.5 ${
                    active
                      ? "text-on-surface border-b-2 border-primary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* Customer name */}
            {customerName && (
              <span className="hidden sm:block text-xs font-bold text-on-surface-variant">{customerName}</span>
            )}

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="flex items-center gap-1.5 text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]" translate="no">logout</span>
            </button>

            {/* Theme Toggle */}
            <div className="hidden md:block border-l border-outline-variant pl-6 ml-2">
              <ThemeSwitcher />
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="material-symbols-outlined text-[22px] text-on-surface" translate="no">
                {menuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-surface-container border-t border-outline-variant px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors ${
                    active
                      ? "bg-primary/10 text-on-surface"
                      : "text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" translate="no">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            {customerName && (
              <div className="pt-2 border-t border-outline-variant mt-2">
                <p className="px-3 py-2 text-xs font-bold text-on-surface-variant">Signed in as {customerName}</p>
              </div>
            )}
            <div className="pt-2 border-t border-outline-variant mt-2 px-3 pb-2">
              <ThemeSwitcher />
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-10 border-t border-outline-variant mt-12">
        <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest text-center">
          © {new Date().getFullYear()} Siding Depot. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
