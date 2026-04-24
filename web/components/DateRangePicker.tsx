"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// =============================================
// DateRangePicker — Siding Depot brand
// Single button → calendar opens → user clicks
// first date (start), then second date (end).
// Range is highlighted visually.
// =============================================

interface Props {
  startDate: string;       // "YYYY-MM-DD" or ""
  endDate: string;         // "YYYY-MM-DD" or ""
  onRangeChange: (start: string, end: string) => void;
  placeholder?: string;
  className?: string;
  alignRight?: boolean;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

/** "YYYY-MM-DD" → local Date at noon */
const fromIso = (s: string) => new Date(s + "T12:00:00");

/** Date → "YYYY-MM-DD" */
const toIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** "04/14/2026" display string */
const formatDisplay = (iso: string): string => {
  if (!iso) return "";
  const d = fromIso(iso);
  if (isNaN(d.getTime())) return "";
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`;
};

/** All days to display in a month grid */
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

export default function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  placeholder = "Select date range",
  className = "",
  alignRight = false,
}: Props) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const initialDate = startDate ? fromIso(startDate) : today;
  const [open, setOpen]           = useState(false);
  const [viewY, setViewY]         = useState(initialDate.getFullYear());
  const [viewM, setViewM]         = useState(initialDate.getMonth());
  const [isMounted, setIsMounted] = useState(false);

  // Selection state: "idle" → click sets tempStart → "picking_end" → click sets end → done
  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd]     = useState<string>(endDate);
  const [phase, setPhase]         = useState<"picking_start" | "picking_end">("picking_start");
  // Hover for range preview
  const [hoverDate, setHoverDate] = useState<string>("");

  useEffect(() => { setIsMounted(true); }, []);

  // Sync external values when they change
  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  // Portal position
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 320 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const CALENDAR_W = 320;
    const CALENDAR_H = 430;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    let top  = rect.bottom + 8;
    let left = alignRight ? rect.right - CALENDAR_W : rect.left;

    if (left + CALENDAR_W > viewportW) left = viewportW - CALENDAR_W - 8;
    if (left < 8) left = 8;
    if (rect.bottom + CALENDAR_H > viewportH) top = rect.top - CALENDAR_H - 8;

    setDropPos({ top, left, width: CALENDAR_W });
  }, [alignRight]);

  const toggleOpen = () => {
    if (!open) {
      updatePosition();
      // Reset phase based on current state
      if (tempStart && tempEnd) {
        setPhase("picking_start");
      } else if (tempStart) {
        setPhase("picking_end");
      } else {
        setPhase("picking_start");
      }
    }
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

  const handleDayClick = (d: Date) => {
    const iso = toIso(d);
    if (phase === "picking_start") {
      setTempStart(iso);
      setTempEnd("");
      setPhase("picking_end");
    } else {
      // picking_end
      if (iso < tempStart) {
        // Clicked before start → swap: this becomes start, old start becomes end
        setTempEnd(tempStart);
        setTempStart(iso);
      } else {
        setTempEnd(iso);
      }
      // Apply range and close
      const finalStart = iso < tempStart ? iso : tempStart;
      const finalEnd   = iso < tempStart ? tempStart : iso;
      onRangeChange(finalStart, finalEnd);
      setOpen(false);
      setPhase("picking_start");
    }
  };

  const handleClear = () => {
    setTempStart("");
    setTempEnd("");
    setHoverDate("");
    setPhase("picking_start");
    onRangeChange("", "");
    setOpen(false);
  };

  const gridDays = getGridDays(viewY, viewM);
  const todayTs  = today.getTime();

  // Determine range for highlighting
  const rangeStartTs = tempStart ? fromIso(tempStart).setHours(12,0,0,0) : null;
  const rangeEndTs   = (() => {
    if (tempEnd) return fromIso(tempEnd).setHours(12,0,0,0);
    if (phase === "picking_end" && hoverDate) return fromIso(hoverDate).setHours(12,0,0,0);
    return null;
  })();

  // Display text
  const displayText = (() => {
    if (startDate && endDate) return `${formatDisplay(startDate)}  →  ${formatDisplay(endDate)}`;
    if (startDate) return `${formatDisplay(startDate)}  →  ...`;
    return placeholder;
  })();

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
      {/* Phase indicator */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-2">
        <span
          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full transition-all ${
            phase === "picking_start"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-outline-variant"
          }`}
        >
          Start
        </span>
        <span className="text-outline-variant text-xs">→</span>
        <span
          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full transition-all ${
            phase === "picking_end"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-outline-variant"
          }`}
        >
          End
        </span>
        {tempStart && (
          <span className="text-[11px] text-on-surface-variant ml-auto font-bold">
            {formatDisplay(tempStart)}
            {tempEnd ? ` — ${formatDisplay(tempEnd)}` : ""}
          </span>
        )}
      </div>

      {/* Month/Year navigation */}
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(71,72,70,0.2)" }}>
        <button
          type="button"
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]" translate="no">chevron_left</span>
        </button>

        <span className="text-sm font-black text-on-surface tracking-wide">
          {MONTH_NAMES[viewM]} <span className="text-primary">{viewY}</span>
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
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
          const ts             = new Date(d).setHours(12, 0, 0, 0);
          const isToday        = ts === todayTs;

          // Range logic
          const isRangeStart = rangeStartTs !== null && ts === rangeStartTs;
          const isRangeEnd   = rangeEndTs !== null && ts === rangeEndTs;
          const isInRange    = rangeStartTs !== null && rangeEndTs !== null &&
            ts >= Math.min(rangeStartTs, rangeEndTs) && ts <= Math.max(rangeStartTs, rangeEndTs);
          const isEndpoint   = isRangeStart || isRangeEnd;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDayClick(d)}
              onMouseEnter={() => {
                if (phase === "picking_end") setHoverDate(toIso(d));
              }}
              onMouseLeave={() => {
                if (phase === "picking_end") setHoverDate("");
              }}
              className="relative flex items-center justify-center text-sm font-bold transition-all h-9 w-full"
              style={{
                borderRadius: isEndpoint
                  ? "8px"
                  : isInRange
                  ? "0"
                  : "8px",
                color: isEndpoint
                  ? "#121412"
                  : isInRange
                  ? "#aeee2a"
                  : !isCurrentMonth
                  ? "#3a3c3a"
                  : isToday
                  ? "#aeee2a"
                  : "#faf9f5",
                background: isEndpoint
                  ? "#aeee2a"
                  : isInRange
                  ? "rgba(174,238,42,0.1)"
                  : "transparent",
                cursor: "pointer",
              }}
            >
              {d.getDate()}
              {isToday && !isEndpoint && (
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
          onClick={handleClear}
          className="text-[11px] font-black uppercase tracking-widest text-outline-variant hover:text-on-surface-variant transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            const t = new Date(); t.setHours(12,0,0,0);
            const iso = toIso(t);
            if (phase === "picking_start") {
              setTempStart(iso);
              setTempEnd("");
              setPhase("picking_end");
            } else {
              const finalStart = iso < tempStart ? iso : tempStart;
              const finalEnd   = iso < tempStart ? tempStart : iso;
              setTempStart(finalStart);
              setTempEnd(finalEnd);
              onRangeChange(finalStart, finalEnd);
              setOpen(false);
              setPhase("picking_start");
            }
            setViewY(t.getFullYear());
            setViewM(t.getMonth());
          }}
          className="text-[11px] font-black uppercase tracking-widest text-primary hover:brightness-110 transition-colors"
        >
          Today
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative ${className}`} style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        className="w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant/20 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-colors hover:border-outline-variant/50 cursor-pointer"
        style={{ color: startDate ? "#faf9f5" : "#474846" }}
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary" translate="no">date_range</span>
          <span className="whitespace-nowrap">{displayText}</span>
        </span>
        <span
          className="material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          translate="no"
        >
          expand_more
        </span>
      </button>

      {calendarPanel}
    </div>
  );
}
