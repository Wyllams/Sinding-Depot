"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useProfile } from "@/components/ProfileContext";
import { useTranslations } from "next-intl";

// =============================================
// FieldTopBar — Header padrão mobile do Parceiro
// Padrão unificado: Hamburger | Título central | Avatar
// =============================================

const ROUTE_KEYS: Record<string, string> = {
  "/field": "home",
  "/field/jobs": "myJobs",
  "/field/alerts": "alerts",
  "/field/profile": "profile",
};

export function FieldTopBar({ title: _fallback }: { title?: string; showBack?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("MobileNav");
  const [menuOpen, setMenuOpen] = useState(false);
  const { profile } = useProfile();
  const menuRef = useRef<HTMLDivElement>(null);

  // Sub-page detection (e.g., /field/jobs/[id])
  const isSubPage = pathname.split("/").filter(Boolean).length > 2
    && !pathname.endsWith("/profile") && !pathname.endsWith("/alerts");

  // Resolve title
  const titleKey = ROUTE_KEYS[pathname];
  const title = titleKey ? t(titleKey) : (_fallback || t("fieldCrew"));

  // Derive initials from profile
  const initials = profile?.initials ?? "SD";

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
    <header className="safe-area-top sticky top-0 z-50 bg-background/80 backdrop-blur-3xl border-b border-outline-variant/20 flex items-center justify-between px-4 min-h-14 relative">

      {/* Left — Hamburger or Back */}
      <div className="w-10 flex items-center justify-start relative" ref={menuRef}>
        {isSubPage ? (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" translate="no">arrow_back_ios_new</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-9 h-9 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" translate="no">menu</span>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-surface-container border border-white/5 rounded-xl shadow-2xl overflow-hidden z-50 origin-top-left animate-in fade-in zoom-in-95 duration-200">
                <Link
                  href="/field/profile"
                  className="w-full text-left px-4 py-3.5 text-sm text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-3"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant" translate="no">person</span>
                  {t("profile")}
                </Link>
                <div className="h-px bg-white/5 mx-3" />
                <button
                  className="w-full text-left px-4 py-3.5 text-sm text-error hover:bg-error/10 transition-colors flex items-center gap-3"
                  onClick={handleLogout}
                >
                  <span className="material-symbols-outlined text-[18px]" translate="no">logout</span>
                  {t("signOut")}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Center — Title */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-on-surface font-bold text-[15px] font-headline tracking-tight">
        {title}
      </h1>

      {/* Right — Company Avatar */}
      <div className="w-10 flex items-center justify-end">
        <Link href="/field/profile" className="block">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-8 h-8 rounded-full object-cover border-2 border-primary"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center">
              <span className="text-primary text-[10px] font-black">
                {profile?.initials ?? "SD"}
              </span>
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
