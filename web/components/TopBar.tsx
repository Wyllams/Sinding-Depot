"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSidebar } from "./SidebarContext";
import { useUndo } from "./UndoContext";
import { supabase } from "../lib/supabase";
import { NotificationBell } from "./NotificationBell";

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
      <header className="safe-area-top sticky top-0 z-40 flex justify-between items-center px-4 sm:px-8 bg-[#0d0f0d]/80 backdrop-blur-3xl border-b border-[#474846]/20" style={{ minHeight: "56px" }}>
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

        {/* History Action Button */}
        <div className="relative mr-2 sm:mr-3" ref={historyRef}>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all ${history.length > 0 ? "text-[#aeee2a] bg-[#aeee2a]/10 hover:bg-[#aeee2a]/20" : "text-[#ababa8] bg-transparent hover:bg-white/5"}`}
            title="History"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[22px]" translate="no">history</span>
            {history.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#aeee2a] rounded-full border-2 border-[#181a18]"></span>}
          </button>

          {historyOpen && (
            <div className="absolute right-0 mt-3 w-64 sm:w-80 bg-[#181a18] rounded-xl shadow-2xl border border-white/5 overflow-hidden z-20 origin-top-right animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center">
                <span className="text-xs font-bold text-[#faf9f5]">Session History</span>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-[10px] text-[#ff7351] hover:underline uppercase font-bold tracking-wider cursor-pointer">Clear</button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="p-6 text-center text-[#ababa8] text-xs">No recent actions recorded.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {history.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => { setConfirmUndo(action); setHistoryOpen(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-[#242624] transition-colors flex flex-col gap-1 group cursor-pointer"
                      >
                        <span className="text-xs font-bold text-[#faf9f5] group-hover:text-[#aeee2a] transition-colors line-clamp-2">{action.message}</span>
                        <span className="text-[10px] text-[#ababa8]">{action.date.toLocaleTimeString()}</span>
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
        <div className="hidden sm:block w-px h-8 bg-[#474846]/50 mx-1" />

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

      {/* Confirm Undo Action Modal */}
      {confirmUndo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#181a18] border border-[#aeee2a]/30 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-[#aeee2a]/10 mx-auto flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#aeee2a] text-2xl" translate="no">undo</span>
            </div>
            <h3 className="text-lg font-bold text-[#faf9f5] mb-2">Undo Action?</h3>
            <p className="text-sm text-[#ababa8] mb-6">
              Are you sure you want to undo:<br/>
              <strong className="text-white mt-1 block">{confirmUndo.message}</strong>
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setConfirmUndo(null)} 
                className="px-5 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] font-bold hover:bg-[#242624] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await executeUndo(confirmUndo.id);
                  setConfirmUndo(null);
                }} 
                disabled={isUndoing} 
                className="flex-1 py-2.5 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
