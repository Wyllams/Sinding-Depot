"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSidebar } from "./SidebarContext";
import { useUndo } from "./UndoContext";
import { supabase } from "../lib/supabase";
import { NotificationBell } from "./NotificationBell";
import { ThemeSwitcher } from "./ThemeSwitcher";

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
  const historyRef = useRef<HTMLDivElement>(null);
  const { toggle } = useSidebar();
  const { history, executeUndo, clearHistory, removeAction, isUndoing } = useUndo();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState<any>(null);

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
    // Use the server-side logout route so auth cookies are cleared
    // *before* the middleware runs, preventing it from redirecting back
    window.location.href = '/api/logout';
  };


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setHistoryOpen(false);
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
    <>
      <header className="safe-area-top sticky top-0 z-40 flex justify-between items-center px-4 sm:px-8 bg-background/80 backdrop-blur-3xl border-b border-outline-variant/20" style={{ minHeight: "56px" }}>
      {/* Left side */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Hamburger — only visible on mobile */}
        <button
          onClick={toggle}
          className="lg:hidden p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-lg transition-colors shrink-0"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[22px]" translate="no">menu</span>
        </button>

        {subtitle && title ? (
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-primary tracking-widest uppercase truncate">
              {subtitle}
            </span>
            <h2
              className="text-base sm:text-xl font-black text-on-surface uppercase truncate"
              style={{ fontFamily: "Manrope, system-ui, sans-serif", letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
          </div>
        ) : title ? (
          <span
            className="text-base sm:text-lg font-black uppercase tracking-widest text-on-surface truncate"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            {title}
          </span>
        ) : null}

        {/* leftSlot (e.g. search) — hidden on small screens */}
        <div className="hidden sm:flex">{leftSlot}</div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {rightSlot && <>{rightSlot}<div className="hidden sm:block w-px h-6 bg-outline-variant/50" /></>}

        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* History Action Button */}
        <div className="relative" ref={historyRef}>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all ${history.length > 0 ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-on-surface-variant bg-transparent hover:bg-white/5"}`}
            title="History"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[22px]" translate="no">history</span>
            {history.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-surface-container"></span>}
          </button>

          {historyOpen && (
            <div className="absolute right-0 mt-3 w-64 sm:w-80 bg-surface-container rounded-xl shadow-2xl border border-white/5 overflow-hidden z-20 origin-top-right animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                <span className="text-xs font-bold text-on-surface">Session History</span>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-[10px] text-error hover:underline uppercase font-bold tracking-wider cursor-pointer">Clear</button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="p-6 text-center text-on-surface-variant text-xs">No recent actions recorded.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {history.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => { setConfirmUndo(action); setHistoryOpen(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-surface-container-highest transition-colors flex flex-col gap-1 group cursor-pointer"
                      >
                        <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">{action.message}</span>
                        <span className="text-[10px] text-on-surface-variant">{action.date.toLocaleTimeString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bell */}
        <NotificationBell />

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-outline-variant/50 mx-1" />

        {/* User profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
          >

            {/* Avatar */}
            {profile?.avatar_url ? (
              <img
                alt={displayName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-primary"
                src={profile.avatar_url}
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                <span className="text-primary text-xs font-black">{initials || "SD"}</span>
              </div>
            )}
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-52 bg-surface-container rounded-xl shadow-2xl border border-white/5 overflow-hidden py-1 z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200">
              {/* User header */}
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-xs font-bold text-on-surface truncate">{displayName}</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">{displayRole}</p>
              </div>
              <Link
                href="/settings"
                className="w-full text-left px-4 py-3 text-sm text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-3"
                onClick={() => setIsProfileOpen(false)}
              >
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant" translate="no">person</span>
                My Profile
              </Link>
              <div className="h-px bg-white/5 my-1" />
              <button
                className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-3"
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

      {/* Confirm Undo Action Modal */}
      {confirmUndo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-primary/30 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary text-2xl" translate="no">undo</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Undo Action?</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Are you sure you want to undo:<br/>
              <strong className="text-white mt-1 block">{confirmUndo.message}</strong>
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setConfirmUndo(null)} 
                className="px-5 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-bold hover:bg-surface-container-highest transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await executeUndo(confirmUndo.id);
                  setConfirmUndo(null);
                }} 
                disabled={isUndoing} 
                className="flex-1 py-2.5 bg-primary text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isUndoing ? <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" /> : "Yes, Undo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
