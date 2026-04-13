"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "./SidebarContext";

// =============================================
// TopBar — Componente padrão de cabeçalho
// Usado em todas as páginas do shell
// =============================================

interface TopBarProps {
  /** Título principal exibido à esquerda (ex: "Command Center", "OAKWOOD OFFICE PARK") */
  title?: string;
  /** Subtítulo/label acima do título */
  subtitle?: string;
  /** Conteúdo extra à esquerda (ex: input de busca) */
  leftSlot?: React.ReactNode;
  /** Conteúdo extra à direita, renderizado antes dos ícones de notificação */
  rightSlot?: React.ReactNode;
}

export function TopBar({ title, subtitle, leftSlot, rightSlot }: TopBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toggle } = useSidebar();

  const handleLogout = () => {
    setIsProfileOpen(false);
    document.cookie = 'siding_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
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

        {/* leftSlot (e.g. search) — hidden on small screens if needed */}
        <div className="hidden sm:flex">{leftSlot}</div>
      </div>

      {/* Right side — always the same */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {rightSlot && <>{rightSlot}<div className="hidden sm:block w-px h-6 bg-[#474846]/50" /></>}

        {/* Bell */}
        <button className="p-2 text-[#ababa8] hover:text-[#faf9f5] transition-colors rounded-full hover:bg-[#242624]">
          <span className="material-symbols-outlined text-[22px]" translate="no">
            notifications
          </span>
        </button>

        {/* Help — hidden on small screens */}
        <button className="hidden sm:flex p-2 text-[#ababa8] hover:text-[#faf9f5] transition-colors rounded-full hover:bg-[#242624]">
          <span className="material-symbols-outlined text-[22px]" translate="no">
            help
          </span>
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 bg-[#474846]/50 mx-1" />

        {/* User info */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
          >
            {/* Name + role — hidden on very small screens */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-[#faf9f5] leading-tight flex items-center justify-end gap-1">
                Nick
                <span
                  className="material-symbols-outlined text-[16px] text-[#ababa8] transition-transform duration-200"
                  style={{ transform: isProfileOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  translate="no"
                >
                  expand_more
                </span>
              </p>
              <p className="text-xs text-[#ababa8]">Project Director</p>
            </div>
            <img
              alt="Nick"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-[#aeee2a]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAig0qP2tCvaqMkR48Ot_E4RW5IgQeZHmBFz2qa70hMgq_L-31oOGUl8xFhUNhp5FKNtcwavpqHmP3lo6b9DP779zu-l6oAE8qVU-IGkW5WRLoH8LbKF8tvkVM6LTsydTaT1I55MDzh3Qbgx_Ub_HYrr1MUPXVSfeCJdDOn9l5JFY0ITn9OWH1ppGCGeEHM7JmgykMt8hgUvXoCqjx7S7jVZJiuTLpSOcN3GhURkGgMj2KvkBC3Y3tHoxdpuBP145xWk5zFnHIz5a0"
            />
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-48 bg-[#181a18] rounded-xl shadow-2xl border border-white/5 overflow-hidden py-1 z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200">
              <button
                className="w-full text-left px-4 py-3 text-sm text-[#faf9f5] hover:bg-[#242624] transition-colors flex items-center gap-3"
                onClick={() => setIsProfileOpen(false)}
              >
                <span className="material-symbols-outlined text-[18px] text-[#ababa8]" translate="no">person</span>
                Profile
              </button>
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
