"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// =============================================
// SalesTopBar — Header padrão mobile do Vendedor
// Padrão unificado: Hamburger | Título central | Avatar
// =============================================

interface UserProfile {
  full_name: string;
  initials: string;
  avatar_url: string | null;
}

const ROUTE_TITLES: Record<string, string> = {
  "/sales": "Dashboard",
  "/sales/jobs": "My Deals",
  "/sales/profile": "Profile",
};

export default function SalesTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sub-page detection (e.g. /sales/jobs/[id])
  const isSubPage = pathname.split("/").filter(Boolean).length > 2
    && !pathname.endsWith("/profile");

  // Resolve title
  const title = ROUTE_TITLES[pathname] || (isSubPage ? "Deal Details" : "Sales");

  // Load profile
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .single();
        if (data && mounted) {
          const name = data.full_name || user.email?.split("@")[0] || "Sales";
          const initials = name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();
          setProfile({ full_name: name, initials, avatar_url: data.avatar_url });
        }
      } catch (e) {
        console.error("[SalesTopBar] profile load error:", e);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Click outside to close menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    window.location.href = "/api/logout";
  };

  return (
    <header className="safe-area-top sticky top-0 z-50 bg-[#0d0f0d]/80 backdrop-blur-3xl border-b border-[#474846]/20 flex items-center justify-between px-4 min-h-14 relative">

      {/* Left — Hamburger or Back */}
      <div className="w-10 flex items-center justify-start relative" ref={menuRef}>
        {isSubPage ? (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-[#181a18] border border-[#474846]/30 flex items-center justify-center text-[#ababa8] hover:text-[#faf9f5] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" translate="no">arrow_back_ios_new</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-xl bg-[#181a18] border border-[#474846]/30 flex items-center justify-center text-[#ababa8] hover:text-[#faf9f5] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" translate="no">menu</span>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-[#181a18] border border-white/5 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-left animate-in fade-in zoom-in-95 duration-200">
                <Link
                  href="/sales/profile"
                  className="w-full text-left px-4 py-3.5 text-sm text-[#faf9f5] hover:bg-[#242624] transition-colors flex items-center gap-3"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#ababa8]" translate="no">person</span>
                  Profile
                </Link>
                <div className="h-px bg-white/5 mx-3" />
                <button
                  className="w-full text-left px-4 py-3.5 text-sm text-[#ff7351] hover:bg-[#ff7351]/10 transition-colors flex items-center gap-3"
                  onClick={handleLogout}
                >
                  <span className="material-symbols-outlined text-[18px]" translate="no">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Center — Title */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-[#faf9f5] font-bold text-[15px] font-headline tracking-tight">
        {title}
      </h1>

      {/* Right — Profile Avatar */}
      <div className="w-10 flex items-center justify-end">
        <Link href="/sales/profile" className="block">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-8 h-8 rounded-full object-cover border-2 border-[#aeee2a]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#aeee2a]/15 border-2 border-[#aeee2a]/40 flex items-center justify-center">
              <span className="text-[#aeee2a] text-[10px] font-black">
                {profile?.initials ?? "SD"}
              </span>
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
