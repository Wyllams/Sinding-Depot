"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// Guard against SSR — document.body is only available on the client

// =============================================
// CustomDatePicker — Siding Depot brand
// Dark mode, #aeee2a accent, Sundays blocked
// Calendar renders via Portal (escapes overflow-hidden modals)
// =============================================

interface Props {
  value: string;           // "YYYY-MM-DD" or ""
  onChange: (iso: string) => void;
  placeholder?: string;
  disableSundays?: boolean;
  label?: string;
  className?: string;
  alignRight?: boolean;    // abrir dropdown alinhado à direita (evita overflow)
  variant?: "default" | "ghost";
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

/** "YYYY-MM-DD" → local Date at noon */
const fromIso = (s: string) => new Date(s + "T12:00:00");

/** Date → "YYYY-MM-DD" */
const toIso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** "Apr 14, 2026" display string */
const formatDisplay = (iso: string) => {
  if (!iso || iso === "0" || iso.toLowerCase() === "null") return "—";
  const d = fromIso(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

/** All days to display in a month grid (including padding from prev/next month) */
const getGridDays = (year: number, month: number): Date[] => {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  const days: Date[] = [];
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(first);
    d.setDate(d.getDate() - i - 1);
    days.push(d);
  }
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) {
    const d = new Date(days[days.length - 1]);
    d.setDate(d.getDate() + 1);
    days.push(d);
  }
  return days;
};

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disableSundays = true,
  label,
  className = "",
  alignRight = false,
  variant = "default",
}: Props) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const initialDate = value ? fromIso(value) : today;
  const [open,      setOpen]      = useState(false);
  const [viewY,     setViewY]     = useState(initialDate.getFullYear());
  const [viewM,     setViewM]     = useState(initialDate.getMonth());
  const [isMounted, setIsMounted] = useState(false);

  // Only render portals after the component mounts on the client (avoids SSR crash)
  useEffect(() => { setIsMounted(true); }, []);

  // Position of the dropdown (viewport coords — used with position:fixed)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 300 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);

  // Calculate portal position when opening.
  // Since the panel uses position:fixed, getBoundingClientRect() already gives
  // viewport-relative coords — do NOT add scrollX/scrollY.
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const CALENDAR_W = 300;
    const CALENDAR_H = 380; // approx height
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    // Open below trigger, flip up if not enough space
    let top  = rect.bottom + 8;
    let left = alignRight
      ? rect.right - CALENDAR_W
      : rect.left;

    // Clamp horizontally so it never overflows the viewport
    if (left + CALENDAR_W > viewportW) {
      left = viewportW - CALENDAR_W - 8;
    }
    if (left < 8) left = 8;

    // Flip vertically if the calendar would render below the viewport
    if (rect.bottom + CALENDAR_H > viewportH) {
      top = rect.top - CALENDAR_H - 8;
    }

    setDropPos({ top, left, width: CALENDAR_W });
  }, [alignRight]);

  const toggleOpen = () => {
    if (!open) updatePosition();
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        dropRef.current   && !dropRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Re-position on scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => updatePosition();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, updatePosition]);

  const prevMonth = useCallback(() => {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1); }
    else setViewM(m => m - 1);
  }, [viewM]);

  const nextMonth = useCallback(() => {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1); }
    else setViewM(m => m + 1);
  }, [viewM]);

  const select = (d: Date) => {
    if (disableSundays && d.getDay() === 0) return;
    onChange(toIso(d));
    setOpen(false);
  };

  const gridDays   = getGridDays(viewY, viewM);
  const selectedTs = value ? fromIso(value).setHours(12, 0, 0, 0) : null;
  const todayTs    = today.getTime();

  // Calendar panel (rendered via portal — guarded with isMounted to avoid SSR crash)
  const calendarPanel = open && isMounted ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: "fixed",
        top: dropPos.top,
        left: dropPos.left,
        width: dropPos.width,
        zIndex: 99999,
        fontFamily: "Manrope, system-ui, sans-serif",
        background: "#181a18",
        border: "1px solid rgba(174,238,42,0.15)",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}
    >
      {/* Month/Year navigation */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(71,72,70,0.2)" }}>
        <button
          type="button"
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#ababa8] hover:text-[#aeee2a] hover:bg-[#aeee2a]/10 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]" translate="no">chevron_left</span>
        </button>

        <span className="text-sm font-black text-[#faf9f5] tracking-wide">
          {MONTH_NAMES[viewM]} <span className="text-[#aeee2a]">{viewY}</span>
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#ababa8] hover:text-[#aeee2a] hover:bg-[#aeee2a]/10 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]" translate="no">chevron_right</span>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-3 pt-3 pb-1">
        {DAY_HEADERS.map((h, i) => (
          <div
            key={h}
            className="text-center text-[10px] font-black uppercase tracking-widest py-1"
            style={{ color: i === 6 ? "#3a3c3a" : "#ababa8" }}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 px-3 pb-4 gap-y-0.5">
        {gridDays.map((d, idx) => {
          const isCurrentMonth = d.getMonth() === viewM;
          const ts             = d.setHours(12, 0, 0, 0);
          const isSelected     = selectedTs !== null && ts === selectedTs;
          const isToday        = ts === todayTs;
          const isSunday       = d.getDay() === 0;
          const isDisabled     = disableSundays && isSunday;

          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => select(d)}
              className="relative flex items-center justify-center rounded-lg text-sm font-bold transition-all h-9 w-full"
              style={{
                color: isDisabled
                  ? "#2a2c2a"
                  : isSelected
                  ? "#3a5400"
                  : !isCurrentMonth
                  ? "#3a3c3a"
                  : isSunday
                  ? "#3a3c3a"
                  : isToday
                  ? "#aeee2a"
                  : "#faf9f5",
                background: isSelected ? "#aeee2a" : "transparent",
                cursor: isDisabled ? "not-allowed" : "pointer",
              }}
              onMouseEnter={e => {
                if (!isDisabled && !isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(174,238,42,0.12)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#aeee2a";
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = isDisabled
                    ? "#2a2c2a"
                    : !isCurrentMonth
                    ? "#3a3c3a"
                    : isSunday
                    ? "#3a3c3a"
                    : isToday
                    ? "#aeee2a"
                    : "#faf9f5";
                }
              }}
            >
              {d.getDate()}
              {isToday && !isSelected && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: "#aeee2a" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid rgba(71,72,70,0.2)" }}>
        <button
          type="button"
          onClick={() => { onChange(""); setOpen(false); }}
          className="text-[11px] font-black uppercase tracking-widest text-[#474846] hover:text-[#ababa8] transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            const t = new Date(); t.setHours(12,0,0,0);
            if (!disableSundays || t.getDay() !== 0) select(t);
            setViewY(t.getFullYear());
            setViewM(t.getMonth());
          }}
          className="text-[11px] font-black uppercase tracking-widest text-[#aeee2a] hover:brightness-110 transition-colors"
        >
          Today
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative ${className}`} style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className={variant === "ghost"
          ? `w-full block text-left font-bold cursor-pointer hover:text-[#aeee2a] transition-colors outline-none whitespace-nowrap ${!value ? "text-[#ababa8]" : "text-[#faf9f5]"}`
          : `w-full flex items-center justify-between gap-2 bg-[#121412] border border-[#474846]/20 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:border-[#aeee2a] transition-colors hover:border-[#474846]/50 cursor-pointer`
        }
        style={variant === "ghost" ? {} : { color: value ? "#faf9f5" : "#474846" }}
      >
        {variant === "ghost" ? (
          value ? formatDisplay(value) : "—"
        ) : (
          <>
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#aeee2a]" translate="no">calendar_month</span>
              {value ? formatDisplay(value) : placeholder}
            </span>
            <span
              className="material-symbols-outlined text-[18px] text-[#ababa8] transition-transform duration-200"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
              translate="no"
            >
              expand_more
            </span>
          </>
        )}
      </button>

      {/* Calendar via Portal — escapes overflow:hidden containers */}
      {calendarPanel}
    </div>
  );
}
