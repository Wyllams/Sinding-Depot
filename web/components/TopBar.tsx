"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSidebar } from "./SidebarContext";
import { supabase } from "../lib/supabase";

// =============================================
// TopBar — Componente padrão de cabeçalho
// Usado em todas as páginas do shell
// =============================================

interface TopBarProps {
  /** Título principal exibido à esquerda (ex: "Command Center") */
  title?: string;
  /** Subtítulo/label acima do título */
  subtitle?: string;
  /** Conteúdo extra à esquerda (ex: input de busca) */
  leftSlot?: React.ReactNode;
  /** Conteúdo extra à direita, renderizado antes dos ícones de notificação */
  rightSlot?: React.ReactNode;
}

interface UserProfile {
  full_name: string;
  role: string;
  avatar_url: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin:       "Admin",
  salesperson: "Salesperson",
  partner:     "Partner / Crew",
  customer:    "Customer",
};

export function TopBar({ title, subtitle, leftSlot, rightSlot }: TopBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toggle } = useSidebar();

  // ── Fetch logged-in user profile ─────────────────────
  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        const { data } = await supabase
          .from("profiles")
          .select("full_name, role, avatar_url")
          .eq("id", user.id)
          .single();

        if (data && mounted) {
          setProfile({
            full_name:  data.full_name  || user.email?.split("@")[0] || "User",
            role:       data.role       || "admin",
            avatar_url: data.avatar_url || null,
          });
        }
      } catch (e) {
        console.error("TopBar: failed to load profile", e);
      }
    };

    loadProfile();

    // Re-fetch whenever the settings page saves the profile
    const handleProfileUpdated = () => loadProfile();
    window.addEventListener("profile-updated", handleProfileUpdated);

    return () => {
      mounted = false;
      window.removeEventListener("profile-updated", handleProfileUpdated);
    };
  }, []);


  const handleLogout = async () => {
    setIsProfileOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Display helpers ───────────────────────────────────
  const displayName  = profile?.full_name || "…";
  const displayRole  = profile ? (ROLE_LABELS[profile.role] || profile.role) : "…";
  const initials     = displayName.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex justify-between items-center px-4 sm:px-8 py-3 sm:py-4 bg-[#0d0f0d]/80 backdrop-blur-3xl border-b border-[#474846]/20">
      {/* Left side */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Hamburger — only visible on mobile */}
        <button
          onClick={toggle}
          className="lg:hidden p-2 text-[#ababa8] hover:text-[#faf9f5] hover:bg-[#242624] rounded-lg transition-colors shrink-0"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[22px]" translate="no">menu</span>
        </button>

        {subtitle && title ? (
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-[#aeee2a] tracking-widest uppercase truncate">
              {subtitle}
            </span>
            <h2
              className="text-base sm:text-xl font-black text-[#faf9f5] uppercase truncate"
              style={{ fontFamily: "Manrope, system-ui, sans-serif", letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
          </div>
        ) : title ? (
          <span
            className="text-base sm:text-lg font-black uppercase tracking-widest text-[#faf9f5] truncate"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {title}
          </span>
        ) : null}

        {/* leftSlot (e.g. search) — hidden on small screens */}
        <div className="hidden sm:flex">{leftSlot}</div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {rightSlot && <>{rightSlot}<div className="hidden sm:block w-px h-6 bg-[#474846]/50" /></>}

        {/* Bell */}
        <button className="hidden sm:flex p-2 text-[#ababa8] hover:text-[#faf9f5] transition-colors rounded-full hover:bg-[#242624]">
          <span className="material-symbols-outlined text-[22px]" translate="no">notifications</span>
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-[#474846]/50 mx-1" />

        {/* User profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
          >
            {/* Name + role */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-[#faf9f5] leading-tight flex items-center justify-end gap-1">
                {displayName}
                <span
                  className="material-symbols-outlined text-[16px] text-[#ababa8] transition-transform duration-200"
                  style={{ transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  translate="no"
                >
                  expand_more
                </span>
              </p>
              <p className="text-xs text-[#ababa8]">{displayRole}</p>
            </div>

            {/* Avatar */}
            {profile?.avatar_url ? (
              <img
                alt={displayName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-[#aeee2a]"
                src={profile.avatar_url}
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#aeee2a]/20 border-2 border-[#aeee2a] flex items-center justify-center">
                <span className="text-[#aeee2a] text-xs font-black">{initials || "SD"}</span>
              </div>
            )}
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-52 bg-[#181a18] rounded-xl shadow-2xl border border-white/5 overflow-hidden py-1 z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200">
              {/* User header */}
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-xs font-bold text-[#faf9f5] truncate">{displayName}</p>
                <p className="text-[10px] text-[#ababa8] mt-0.5 truncate">{displayRole}</p>
              </div>
              <Link
                href="/settings"
                className="w-full text-left px-4 py-3 text-sm text-[#faf9f5] hover:bg-[#242624] transition-colors flex items-center gap-3"
                onClick={() => setIsProfileOpen(false)}
              >
                <span className="material-symbols-outlined text-[18px] text-[#ababa8]" translate="no">person</span>
                My Profile
              </Link>
              <div className="h-px bg-white/5 my-1" />
              <button
                className="w-full text-left px-4 py-3 text-sm text-[#ff7351] hover:bg-[#ff7351]/10 transition-colors flex items-center gap-3"
                onClick={handleLogout}
              >
                <span className="material-symbols-outlined text-[18px]" translate="no">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
