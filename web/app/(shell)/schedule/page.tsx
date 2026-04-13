"use client";

import { useState, useMemo } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";

// =============================================
// Operational Schedule — Weekly Gantt
// Partners & Services — Real Data
// Jobs use real ISO date strings
// =============================================

// ─── Service Categories ───────────────────────
type ServiceId = "siding" | "doors_windows" | "paint" | "gutters" | "roofing";

const SERVICE_CATEGORIES: {
  id: ServiceId;
  label: string;
  color: string;
  icon: string;
  partners: string[];
}[] = [
  { id: "siding",       label: "Siding",         color: "#aeee2a", icon: "home_work",    partners: ["XICARA", "XICARA 2", "WILMAR", "WILMAR 2", "SULA", "LUIS"] },
  { id: "doors_windows",label: "Doors / Windows", color: "#60b8f5", icon: "sensor_door",  partners: ["SERGIO"] },
  { id: "paint",        label: "Paint",           color: "#f5a623", icon: "format_paint", partners: ["OSVIN", "OSVIN 2", "VICTOR", "JUAN"] },
  { id: "gutters",      label: "Gutters",         color: "#c084fc", icon: "water_drop",   partners: ["LEANDRO"] },
  { id: "roofing",      label: "Roofing",         color: "#fb923c", icon: "roofing",      partners: ["JOSUE"] },
];

// ─── Job Model (real dates) ──────────────────
interface ScheduledJob {
  id: string;
  clientName: string;
  serviceType: ServiceId;
  partnerName: string;
  startDate: string;    // ISO "YYYY-MM-DD"
  durationDays: number;
  status: "scheduled" | "in_progress" | "done";
  address?: string;
}

// ─── Helpers ────────────────────────────────────
const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MS_DAY = 86_400_000;

/** Returns the Monday of the week containing `date` */
const getMondayOf = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun…6=Sat
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
};

/** 7 Date objects starting from Monday */
const getWeekDates = (monday: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

/** "Apr 16" */
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** "2026-04-16" from a Date */
const toIso = (d: Date) => d.toISOString().split("T")[0];

/** Date from ISO string, noon local time to avoid TZ shifts */
const fromIso = (s: string): Date => new Date(s + "T12:00:00");

/** Position of a job's startDate relative to the visible Monday (0–6, or -1 if outside week) */
const dayIndex = (job: ScheduledJob, monday: Date): number => {
  const start = fromIso(job.startDate).setHours(0, 0, 0, 0);
  const base  = new Date(monday).setHours(0, 0, 0, 0);
  return Math.round((start - base) / MS_DAY); // can be negative or >6
};

/** Add `delta` days to an ISO date string, skipping Sundays */
const shiftDate = (iso: string, delta: number): string => {
  const d = fromIso(iso);
  const sign = delta > 0 ? 1 : -1;
  let remaining = Math.abs(delta);
  while (remaining > 0) {
    d.setDate(d.getDate() + sign);
    if (d.getDay() !== 0) remaining--; // skip Sundays
  }
  return toIso(d);
};

/** Is an ISO date string a Sunday? */
const isSundayIso = (iso: string) => fromIso(iso).getDay() === 0;

/** Conflict detection on real dates */
const detectConflicts = (jobs: ScheduledJob[]): Set<string> => {
  const ids = new Set<string>();
  jobs.forEach((a, i) => {
    jobs.forEach((b, j) => {
      if (i >= j || a.partnerName !== b.partnerName) return;
      const startA = fromIso(a.startDate).getTime();
      const endA   = startA + a.durationDays * MS_DAY;
      const startB = fromIso(b.startDate).getTime();
      const endB   = startB + b.durationDays * MS_DAY;
      if (startA < endB && startB < endA) { ids.add(a.id); ids.add(b.id); }
    });
  });
  return ids;
};

const STATUS_CONFIG = {
  scheduled:   { color: "#ababa8", label: "Scheduled" },
  in_progress: { color: "#aeee2a", label: "In Progress" },
  done:        { color: "#474846", label: "Done" },
};

// ─── Mock data — dates relative to THIS week's Monday ─────
const buildInitialJobs = (): ScheduledJob[] => {
  const mon = getMondayOf(new Date());
  const d = (offset: number) => {
    const dt = new Date(mon);
    dt.setDate(dt.getDate() + offset);
    return toIso(dt);
  };
  return [
    { id:"j1",  clientName:"Eric Lefebvre",  serviceType:"siding",        partnerName:"XICARA",   startDate:d(0), durationDays:3, status:"in_progress", address:"Downtown Hub" },
    { id:"j2",  clientName:"Brandon White",  serviceType:"siding",        partnerName:"XICARA",   startDate:d(4), durationDays:2, status:"scheduled",   address:"Oak Creek Resid." },
    { id:"j3",  clientName:"Sarah Jenkins",  serviceType:"siding",        partnerName:"XICARA 2", startDate:d(1), durationDays:4, status:"in_progress", address:"River Heights" },
    { id:"j4",  clientName:"Joe Castano",    serviceType:"siding",        partnerName:"WILMAR",   startDate:d(0), durationDays:2, status:"in_progress", address:"Main St. Plaza" },
    { id:"j5",  clientName:"Max Edei",       serviceType:"siding",        partnerName:"WILMAR",   startDate:d(3), durationDays:3, status:"scheduled",   address:"Industrial Park" },
    { id:"j6",  clientName:"Anna Brito",     serviceType:"siding",        partnerName:"SULA",     startDate:d(2), durationDays:2, status:"scheduled",   address:"North Side" },
    { id:"j7",  clientName:"Rick Flores",    serviceType:"doors_windows", partnerName:"SERGIO",   startDate:d(0), durationDays:1, status:"done",        address:"West End" },
    { id:"j8",  clientName:"Paul Gomez",     serviceType:"doors_windows", partnerName:"SERGIO",   startDate:d(2), durationDays:2, status:"scheduled",   address:"East Ave." },
    { id:"j9",  clientName:"Chris Mora",     serviceType:"paint",         partnerName:"OSVIN",    startDate:d(1), durationDays:2, status:"in_progress", address:"Sunset Blvd" },
    { id:"j10", clientName:"Linda Park",     serviceType:"paint",         partnerName:"VICTOR",   startDate:d(3), durationDays:2, status:"scheduled",   address:"Harbor View" },
    { id:"j11", clientName:"Tom Harris",     serviceType:"gutters",       partnerName:"LEANDRO",  startDate:d(1), durationDays:1, status:"scheduled",   address:"Green Hills" },
    { id:"j12", clientName:"Sue Kim",        serviceType:"roofing",       partnerName:"JOSUE",    startDate:d(0), durationDays:5, status:"in_progress", address:"Central Park Rd." },
  ];
};

// ─── Main Component ─────────────────────────────
export default function SchedulePage() {
  const [jobs,        setJobs]        = useState<ScheduledJob[]>(() => buildInitialJobs());
  const [weekBase,    setWeekBase]    = useState<Date>(() => getMondayOf(new Date()));
  const [filterSvc,   setFilterSvc]   = useState<ServiceId | "ALL">("ALL");
  const [editJob,     setEditJob]     = useState<ScheduledJob | null>(null);
  const [editDate,    setEditDate]    = useState<string>("");
  const [editDur,     setEditDur]     = useState<number>(1);

  const weekDates    = getWeekDates(weekBase);
  const conflictIds  = useMemo(() => detectConflicts(jobs), [jobs]);
  const today        = new Date();
  const todayIndex   = weekDates.findIndex(d => d.toDateString() === today.toDateString());

  // ── Navigation ───────────────────────────────
  const prevWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); };
  const nextWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); };
  const goToday  = () => setWeekBase(getMondayOf(new Date()));

  // ── Reschedule ───────────────────────────────
  const openReschedule = (job: ScheduledJob) => {
    setEditJob(job);
    setEditDate(job.startDate);
    setEditDur(job.durationDays);
  };

  /** Jobs of same partner that start ON OR AFTER the original job's date */
  const getAffected = (job: ScheduledJob, newDate: string): ScheduledJob[] => {
    const origMs = fromIso(job.startDate).getTime();
    const delta  = Math.round((fromIso(newDate).getTime() - origMs) / MS_DAY);
    if (delta === 0) return [];
    return jobs
      .filter(j => j.partnerName === job.partnerName && j.id !== job.id && fromIso(j.startDate).getTime() >= origMs)
      .map(j => ({ ...j, startDate: shiftDate(j.startDate, delta) }));
  };

  const confirmReschedule = () => {
    if (!editJob || isSundayIso(editDate)) return;
    const origMs = fromIso(editJob.startDate).getTime();
    const delta  = Math.round((fromIso(editDate).getTime() - origMs) / MS_DAY);

    setJobs(prev => prev.map(j => {
      if (j.id === editJob.id) return { ...j, startDate: editDate, durationDays: editDur };
      if (j.partnerName === editJob.partnerName && fromIso(j.startDate).getTime() >= origMs) {
        return { ...j, startDate: shiftDate(j.startDate, delta) };
      }
      return j;
    }));
    setEditJob(null);
  };

  // ── Filter ───────────────────────────────────
  const visibleCats = filterSvc === "ALL"
    ? SERVICE_CATEGORIES
    : SERVICE_CATEGORIES.filter(c => c.id === filterSvc);

  const partnerJobs = (name: string) => jobs.filter(j => j.partnerName === name);

  // ── Gantt card position (% within the 7-col area) ──
  // Returns null if job is entirely outside this week
  const cardStyle = (job: ScheduledJob): { left: string; width: string } | null => {
    const idx = dayIndex(job, weekBase); // can be <0 or >6
    const end = idx + job.durationDays;
    if (end <= 0 || idx >= 7) return null;   // fully outside
    if (idx === 6) return null;              // starts on Sunday ⛔
    const clampedStart = Math.max(idx, 0);
    const clampedEnd   = Math.min(end, 6);  // stop before Sunday (col 6)
    const w = clampedEnd - clampedStart;
    if (w <= 0) return null;
    return {
      left:  `calc(${(clampedStart / 7) * 100}% + 3px)`,
      width: `calc(${(w           / 7) * 100}% - 6px)`,
    };
  };

  // ─────────────────────────────────────────────
  return (
    <>
      <TopBar title="Operational Schedule" />

      <div className="flex flex-col p-6 min-h-screen">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1
              className="tracking-tighter text-3xl font-extrabold text-[#faf9f5] mb-1"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Operational Schedule
            </h1>
            <p className="text-[#ababa8] text-sm">
              {fmtDate(weekDates[0])} → {fmtDate(weekDates[5])}
              {conflictIds.size > 0 && (
                <span className="ml-3 text-[#eedc47] font-bold text-xs">
                  ⚠ {conflictIds.size} conflict{conflictIds.size > 1 ? "s" : ""} detected
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Week navigation */}
            <div className="flex items-center gap-1 bg-[#121412] rounded-xl p-1">
              <button onClick={prevWeek} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#ababa8] hover:text-[#faf9f5] hover:bg-[#1e201e] transition-colors">
                <span className="material-symbols-outlined text-[18px]" translate="no">chevron_left</span>
              </button>
              <button onClick={goToday} className="px-4 py-1.5 text-sm font-bold text-[#faf9f5] hover:text-[#aeee2a] transition-colors">
                Today
              </button>
              <button onClick={nextWeek} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#ababa8] hover:text-[#faf9f5] hover:bg-[#1e201e] transition-colors">
                <span className="material-symbols-outlined text-[18px]" translate="no">chevron_right</span>
              </button>
            </div>

            {/* Service filter */}
            <select
              value={filterSvc}
              onChange={e => setFilterSvc(e.target.value as ServiceId | "ALL")}
              className="bg-[#121412] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
            >
              <option value="ALL">All Services</option>
              {SERVICE_CATEGORIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Gantt Grid ── */}
        <div className="rounded-2xl overflow-hidden flex flex-col flex-1" style={{ background: "#121412", border: "1px solid rgba(71,72,70,0.2)" }}>

          {/* Day headers */}
          <div className="grid" style={{ gridTemplateColumns: "200px repeat(7, 1fr)", background: "#1e201e", borderBottom: "1px solid rgba(71,72,70,0.2)" }}>
            <div className="px-5 py-4 text-[#ababa8] text-[10px] font-bold uppercase tracking-widest border-r border-white/5">
              Partner / Service
            </div>
            {DAY_LABELS.map((label, i) => {
              const date    = weekDates[i];
              const isToday = i === todayIndex;
              const isSun   = i === 6;
              return (
                <div key={label} className="py-4 text-center flex flex-col border-r border-white/5 last:border-r-0" style={{ opacity: isSun ? 0.35 : 1 }}>
                  <span className="text-[#ababa8] text-[9px] font-black uppercase tracking-widest">{label}</span>
                  <span
                    className={`text-lg font-black mt-0.5 ${isToday ? "text-[#aeee2a]" : isSun ? "text-[#474846]" : "text-[#faf9f5]"}`}
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    {date.getDate()}
                  </span>
                  {isToday && <span className="w-1 h-1 rounded-full bg-[#aeee2a] mx-auto mt-1" />}
                  {isSun   && <span className="text-[9px] text-[#474846] font-bold mt-0.5">OFF</span>}
                </div>
              );
            })}
          </div>

          {/* Partner rows */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#242624 #0d0f0d" }}>
            {visibleCats.map(cat => (
              <div key={cat.id}>

                {/* Category separator */}
                <div
                  className="px-5 py-2 flex items-center gap-2"
                  style={{ background: `${cat.color}08`, borderBottom: `1px solid ${cat.color}20`, borderTop: "1px solid rgba(71,72,70,0.1)" }}
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ color: cat.color }} translate="no">{cat.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cat.color }}>{cat.label}</span>
                  <span className="text-[10px] text-[#474846] font-bold ml-1">— {cat.partners.length} partner{cat.partners.length > 1 ? "s" : ""}</span>
                </div>

                {cat.partners.map(name => {
                  const pJobs      = partnerJobs(name);
                  const hasConflict = pJobs.some(j => conflictIds.has(j.id));

                  return (
                    <div
                      key={name}
                      className="grid border-b border-white/[0.04] hover:bg-[#141614]/40 transition-colors"
                      style={{ gridTemplateColumns: "200px 1fr", minHeight: "80px" }}
                    >
                      {/* Partner info */}
                      <div className="px-5 py-4 border-r border-white/5 flex flex-col justify-center gap-1" style={{ borderLeft: `2px solid ${cat.color}40` }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-[#faf9f5] tracking-wide" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                            {name}
                          </span>
                          {hasConflict && <span className="material-symbols-outlined text-[#eedc47] text-[14px]" title="Schedule conflict" translate="no">warning</span>}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${cat.color}99` }}>{cat.label}</span>
                        <span className="text-[9px] text-[#474846] font-bold">{pJobs.length} job{pJobs.length !== 1 ? "s" : ""}</span>
                      </div>

                      {/* Gantt area */}
                      <div className="relative" style={{ minHeight: "80px" }}>

                        {/* Column lines */}
                        <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                          {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className={i < 6 ? "border-r border-white/[0.04] h-full" : "h-full"} style={
                              i === 6
                                ? { background: "rgba(10,10,10,0.5)", borderLeft: "1px dashed rgba(71,72,70,0.25)" }
                                : i === todayIndex
                                ? { background: "rgba(174,238,42,0.03)" }
                                : {}
                            } />
                          ))}
                        </div>

                        {/* Job cards */}
                        {pJobs.map(job => {
                          const pos = cardStyle(job);
                          if (!pos) return null; // outside this week
                          const isConflict = conflictIds.has(job.id);
                          const sc = STATUS_CONFIG[job.status];

                          return (
                            <button
                              key={job.id}
                              onClick={() => openReschedule(job)}
                              title="Click to reschedule"
                              className="absolute top-2 bottom-2 flex flex-col justify-between z-10 rounded-xl cursor-pointer hover:brightness-110 transition-all text-left group/card px-3 py-2"
                              style={{
                                left: pos.left,
                                width: pos.width,
                                background: isConflict ? "rgba(238,220,71,0.1)" : "rgba(36,38,36,0.5)",
                                border: isConflict ? "1px solid rgba(238,220,71,0.4)" : `1px solid ${cat.color}20`,
                                backdropFilter: "blur(16px)",
                              }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-bold truncate" style={{ color: isConflict ? "#eedc47" : "#faf9f5" }}>
                                  {job.clientName}
                                </span>
                                {isConflict
                                  ? <span className="material-symbols-outlined text-[#eedc47] text-[12px] shrink-0" translate="no">warning</span>
                                  : <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                                }
                              </div>
                              {job.address && (
                                <span className="text-[9px] truncate" style={{ color: isConflict ? "rgba(238,220,71,0.7)" : "#ababa8" }}>
                                  {job.address}
                                </span>
                              )}
                              <span className="text-[8px] opacity-0 group-hover/card:opacity-100 transition-all" style={{ color: cat.color }}>
                                click to reschedule
                              </span>
                            </button>
                          );
                        })}

                        {pJobs.length === 0 && (
                          <div className="absolute inset-0 flex items-center px-4">
                            <span className="text-[10px] text-[#474846] font-bold italic">No jobs scheduled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="mt-5 flex items-center flex-wrap gap-6 px-1">
          {[
            { color: "#aeee2a", label: "In Progress" },
            { color: "#ababa8", label: "Scheduled" },
            { color: "#474846", label: "Done" },
            { color: "#eedc47", label: "Conflict" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">{l.label}</span>
            </div>
          ))}
          <div className="ml-auto text-[#ababa8] text-xs">
            {conflictIds.size > 0 && <span className="text-[#eedc47] font-bold mr-4">⚠ {conflictIds.size} conflict{conflictIds.size > 1 ? "s" : ""}</span>}
            Partners: <span className="text-[#faf9f5] font-bold">{SERVICE_CATEGORIES.reduce((a, c) => a + c.partners.length, 0)}</span>
            {" | "}Jobs this week: <span className="text-[#faf9f5] font-bold">{jobs.filter(j => { const idx = dayIndex(j, weekBase); return idx >= 0 && idx < 7; }).length}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RESCHEDULE MODAL
      ══════════════════════════════════════════════ */}
      {editJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setEditJob(null); }}
        >
          <div className="w-full max-w-md rounded-2xl p-8 relative" style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.15)" }}>
            <button onClick={() => setEditJob(null)} className="absolute top-5 right-5 text-[#ababa8] hover:text-[#faf9f5] transition-colors">
              <span className="material-symbols-outlined" translate="no">close</span>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#aeee2a] text-[18px]" translate="no">event</span>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  Reschedule Job
                </h2>
                <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest">
                  {editJob.clientName} · {editJob.partnerName}
                </p>
              </div>
            </div>

            <div className="space-y-4">

              {/* Date picker — brand calendar */}
              <CustomDatePicker
                label="Start Date"
                value={editDate}
                onChange={val => setEditDate(val)}
                disableSundays={true}
                placeholder="Pick a date"
              />
              {editDate && (
                <p className="text-[10px] text-[#ababa8] -mt-2">
                  {fromIso(editDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}

              {/* Duration */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">
                  Duration (days)
                </label>
                <select
                  value={editDur}
                  onChange={e => setEditDur(Number(e.target.value))}
                  className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6].map(d => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
                </select>
              </div>

              {/* Cascade preview */}
              {editDate && editDate !== editJob.startDate && (() => {
                const affected = getAffected(editJob, editDate);
                return affected.length > 0 ? (
                  <div className="p-4 rounded-xl bg-[#aeee2a]/5 border border-[#aeee2a]/15">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#aeee2a] mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]" translate="no">auto_fix_high</span>
                      Cascade Effect — {affected.length} job{affected.length > 1 ? "s" : ""} will shift
                    </p>
                    {affected.map(j => {
                      const orig = jobs.find(x => x.id === j.id)!;
                      return (
                        <div key={j.id} className="flex items-center justify-between text-[11px] py-1 border-b border-[#aeee2a]/10 last:border-0">
                          <span className="font-bold text-[#faf9f5]">{j.clientName}</span>
                          <span className="text-[#ababa8]">
                            {fmtDate(fromIso(orig.startDate))} → {fmtDate(fromIso(j.startDate))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditJob(null)}
                className="flex-1 py-3 bg-[#1e201e] text-[#faf9f5] font-bold rounded-xl border border-[#474846]/20 hover:bg-[#242624] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmReschedule}
                disabled={!editDate || isSundayIso(editDate)}
                className="flex-1 py-3 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(174,238,42,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Confirm & Cascade
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
