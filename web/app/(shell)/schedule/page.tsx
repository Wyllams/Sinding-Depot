"use client";

import { useState, useMemo, useEffect } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { supabase } from "../../../lib/supabase";

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
  { id: "siding",       label: "Siding",         color: "#aeee2a", icon: "home_work",    partners: ["XICARA 01", "XICARA 02", "WILMAR 01", "WILMAR 02", "SULA", "LUIS"] },
  { id: "doors_windows",label: "Doors / Windows", color: "#60b8f5", icon: "sensor_door",  partners: ["SERGIO"] },
  { id: "paint",        label: "Paint",           color: "#f5a623", icon: "format_paint", partners: ["OSVIN 01", "OSVIN 02", "VICTOR", "JUAN"] },
  { id: "gutters",      label: "Gutters",         color: "#c084fc", icon: "water_drop",   partners: ["LEANDRO"] },
  { id: "roofing",      label: "Roofing",         color: "#fb923c", icon: "roofing",      partners: ["JOSUE"] },
];

// ─── Job Model (real dates) ──────────────────
interface ScheduledJob {
  id: string;
  jobId?: string;             // parent jobs.id — used to update jobs.status
  clientName: string;
  serviceType: ServiceId;
  partnerName: string;
  salesperson?: string;
  startDate: string;    // ISO "YYYY-MM-DD"
  durationDays: number;
  status: "scheduled" | "in_progress" | "done";
  jobStartStatus?: "active" | "draft" | "on_hold";
  address?: string;
  contract_amount?: number;
  phone?: string;
  email?: string;
  title?: string;
  serviceNames?: string[];       // e.g. ["Roofing", "Windows"]
  jobServiceIds?: string[];      // UUIDs of job_services rows
  serviceCodes?: string[];       // raw service_type.code per service (parallel to jobServiceIds)
  isPending?: boolean;           // true = pending_scheduling job
}

type SalespersonId = "MATHEUS" | "RUBY" | "ARMANDO";

const SALES_CATEGORIES: {
  id: SalespersonId;
  label: string;
  color: string;
  icon: string;
  persons: string[];
}[] = [
  { id: "MATHEUS", label: "Matheus (Matt)", color: "#22c55e", icon: "badge", persons: ["Matheus (Matt)"] },
  { id: "RUBY",    label: "Ruby",           color: "#a855f7", icon: "badge", persons: ["Ruby"] },
  { id: "ARMANDO", label: "Armando",        color: "#ef4444", icon: "badge", persons: ["Armando"] },
];

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
    { id:"j1",  clientName:"Eric Lefebvre",  serviceType:"siding",        partnerName:"XICARA",   salesperson: "Matheus (Matt)", startDate:d(0), durationDays:3, status:"in_progress", jobStartStatus: "active", address:"Downtown Hub" },
    { id:"j2",  clientName:"Brandon White",  serviceType:"siding",        partnerName:"XICARA",   salesperson: "Ruby",           startDate:d(4), durationDays:2, status:"scheduled",   jobStartStatus: "draft", address:"Oak Creek Resid." },
    { id:"j3",  clientName:"Sarah Jenkins",  serviceType:"siding",        partnerName:"XICARA 2", salesperson: "Armando",        startDate:d(1), durationDays:4, status:"in_progress", jobStartStatus: "on_hold", address:"River Heights" },
    { id:"j4",  clientName:"Joe Castano",    serviceType:"siding",        partnerName:"WILMAR",   salesperson: "Matheus (Matt)", startDate:d(0), durationDays:2, status:"in_progress", jobStartStatus: "active", address:"Main St. Plaza" },
    { id:"j5",  clientName:"Max Edei",       serviceType:"siding",        partnerName:"WILMAR",   salesperson: "Ruby",           startDate:d(3), durationDays:3, status:"scheduled",   jobStartStatus: "draft", address:"Industrial Park" },
    { id:"j6",  clientName:"Anna Brito",     serviceType:"siding",        partnerName:"SULA",     salesperson: "Armando",        startDate:d(2), durationDays:2, status:"scheduled",   jobStartStatus: "draft", address:"North Side" },
    { id:"j7",  clientName:"Rick Flores",    serviceType:"doors_windows", partnerName:"SERGIO",   salesperson: "Matheus (Matt)", startDate:d(0), durationDays:1, status:"done",        jobStartStatus: "active", address:"West End" },
    { id:"j8",  clientName:"Paul Gomez",     serviceType:"doors_windows", partnerName:"SERGIO",   salesperson: "Ruby",           startDate:d(2), durationDays:2, status:"scheduled",   jobStartStatus: "draft", address:"East Ave." },
    { id:"j9",  clientName:"Chris Mora",     serviceType:"paint",         partnerName:"OSVIN",    salesperson: "Armando",        startDate:d(1), durationDays:2, status:"in_progress", jobStartStatus: "active", address:"Sunset Blvd" },
    { id:"j10", clientName:"Linda Park",     serviceType:"paint",         partnerName:"VICTOR",   salesperson: "Matheus (Matt)", startDate:d(3), durationDays:2, status:"scheduled",   jobStartStatus: "on_hold", address:"Harbor View" },
    { id:"j11", clientName:"Tom Harris",     serviceType:"gutters",       partnerName:"LEANDRO",  salesperson: "Ruby",           startDate:d(1), durationDays:1, status:"scheduled",   jobStartStatus: "draft", address:"Green Hills" },
    { id:"j12", clientName:"Sue Kim",        serviceType:"roofing",       partnerName:"JOSUE",    salesperson: "Armando",        startDate:d(0), durationDays:5, status:"in_progress", jobStartStatus: "active", address:"Central Park Rd." },
  ];
};

// ─── Main Component ─────────────────────────────
export default function SchedulePage() {
  const [viewMode,    setViewMode]    = useState<"operational" | "sales">("operational");
  const [jobs,        setJobs]        = useState<ScheduledJob[]>([]);
  const [weekBase,    setWeekBase]    = useState<Date>(() => getMondayOf(new Date()));
  const [filterSvc,   setFilterSvc]   = useState<ServiceId | "ALL">("ALL");
  const [editJob,     setEditJob]     = useState<ScheduledJob | null>(null);
  const [editDate,    setEditDate]    = useState<string>("");
  const [editDur,     setEditDur]     = useState<number>(1);
  const [editStatus,  setEditStatus]  = useState<"active" | "draft" | "on_hold">("active");
  // Per-service crew selection: jobServiceId → selected crewId
  const [selectedCrewIds, setSelectedCrewIds] = useState<Record<string, string>>({});
  // Options fetched per service from the DB
  const [serviceCrewOptions, setServiceCrewOptions] = useState<{
    jobServiceId: string;
    serviceName: string;
    specialtyId: string;
    crews: { id: string; name: string; partnerName: string }[];
  }[]>([]);
  const [confirmingSchedule, setConfirmingSchedule] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    const { data: assignments, error } = await supabase.from("service_assignments").select(`
      id,
      status,
      scheduled_start_at,
      scheduled_end_at,
      crews(name),
      job_services!service_assignments_job_service_id_fkey(
        service_types!job_services_service_type_id_fkey(code),
        jobs!job_services_job_id_fkey(
          status,
          city,
          salesperson_id,
          customers!jobs_customer_id_fkey(full_name)
        )
      )
    `);

    if (error) {
      console.error("Error fetching schedule:", error.message);
      return;
    }

    const mapped: ScheduledJob[] = (assignments || []).map((a: any) => {
      const js = a.job_services;
      const jb = js?.jobs;
      const c = jb?.customers;
      
      const startIso = a.scheduled_start_at ? a.scheduled_start_at.split('T')[0] : shiftDate(toIso(new Date()), 1);

      return {
        id: a.id,
        clientName: c && c.full_name ? c.full_name : "Unknown",
        serviceType: mapCodeToServiceId(js?.service_types?.code),
        partnerName: a.crews?.name || "Unassigned",
        salesperson: "Matheus (Matt)", // we can map from salesperson_id if we want
        startDate: startIso,
        durationDays: a.scheduled_end_at && a.scheduled_start_at 
           ? Math.max(1, Math.round((new Date(a.scheduled_end_at).getTime() - new Date(a.scheduled_start_at).getTime()) / MS_DAY))
           : 1,
        status: (a.status === 'in_progress' ? 'in_progress' : a.status === 'completed' ? 'done' : 'scheduled') as any,
        jobStartStatus: (jb?.status === "active" || jb?.status === "on_hold" || jb?.status === "draft") ? jb.status : "active",
        address: jb?.city || "Unknown"
      };
    });

    // Fetch pending scheduling jobs with their services
    const { data: pendingJobs, error: err2 } = await supabase
      .from("jobs")
      .select(`
        id, job_number, title, status, created_at,
        service_address_line_1, city, contract_amount,
        target_completion_date,
        salespersons(full_name),
        customers(full_name, phone, email),
        job_services(id, service_types(name, code))
      `)
      .eq("status", "pending_scheduling");
      
    if (err2) console.error("Error fetching pending jobs:", err2);

    const mappedPending: ScheduledJob[] = (pendingJobs || []).map((j: any) => {
      let spName = j.salespersons?.full_name || "Unassigned";
      if (spName.toLowerCase().includes("matheus") || spName.toLowerCase().includes("matt")) spName = "Matheus (Matt)";
      else if (spName.toLowerCase().includes("ruby")) spName = "Ruby";
      else if (spName.toLowerCase().includes("armando")) spName = "Armando";

      // Extract service types from job_services
      const jobSvcs = j.job_services || [];
      const svcNames: string[] = jobSvcs.map((js: any) => js.service_types?.name).filter(Boolean);
      const svcIds: string[]   = jobSvcs.map((js: any) => js.id).filter(Boolean);
      const svcCodes: string[] = jobSvcs.map((js: any) => js.service_types?.code || "siding");
      const firstCode: string  = jobSvcs[0]?.service_types?.code || "siding";

      // ─── Business Rule #3 ────────────────────────────────────────────
      // target_completion_date filled → Operational calendar (isPending: false)
      // target_completion_date null   → Sales/Awaiting Approval (isPending: true)
      const hasTargetDate = !!j.target_completion_date;
      const startDate = hasTargetDate
        ? j.target_completion_date          // use the real scheduled date
        : j.created_at.split('T')[0];       // fallback reference date (Sales tab only)

      return {
        id: j.id,
        clientName: j.customers?.full_name || "Unknown",
        serviceType: mapCodeToServiceId(firstCode),
        partnerName: hasTargetDate ? "Unassigned" : "N/A",
        salesperson: spName,
        startDate,
        durationDays: 1,
        status: "scheduled" as const,
        jobStartStatus: "draft" as const,
        address: j.service_address_line_1 || j.city || "Unknown",
        contract_amount: j.contract_amount,
        phone: j.customers?.phone,
        email: j.customers?.email,
        title: j.title,
        serviceNames: svcNames.length > 0 ? svcNames : ["Siding"],
        serviceCodes: svcCodes.length > 0 ? svcCodes : ["siding"],
        jobServiceIds: svcIds,
        isPending: !hasTargetDate,  // false = Operational tab | true = Sales tab
      };
    });
    
    setJobs([...mapped, ...mappedPending]);
  };

  const mapCodeToServiceId = (code: string): ServiceId => {
    // Basic mapping matching the UI groups
    if (!code) return "siding";
    const c = code.toLowerCase();
    if (c.includes("siding") || c.includes("ext")) return "siding";
    if (c.includes("roof")) return "roofing";
    if (c.includes("paint")) return "paint";
    if (c.includes("gutter") || c.includes("downspout")) return "gutters";
    if (c.includes("window") || c.includes("door")) return "doors_windows";
    return "siding";
  };

  const weekDates    = getWeekDates(weekBase);
  const conflictIds  = useMemo(() => detectConflicts(jobs), [jobs]);
  const today        = new Date();
  const todayIndex   = weekDates.findIndex(d => d.toDateString() === today.toDateString());

  // ── Navigation ───────────────────────────────
  const prevWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); };
  const nextWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); };
  const goToday  = () => setWeekBase(getMondayOf(new Date()));

  // ── Reschedule / Open modal ───────────────────
  const openReschedule = async (job: ScheduledJob) => {
    setEditJob(job);
    setEditDate(job.isPending ? "" : job.startDate);
    setEditDur(job.durationDays);
    setEditStatus(job.jobStartStatus ?? "active");
    setSelectedCrewIds({});
    setServiceCrewOptions([]);
    setConfirmingSchedule(false);

    // Map ServiceId to specialty code (same mapping used when creating assignments)
    const specialtyCodeMap: Record<string, string> = {
      siding:        "siding_installation",
      doors_windows: "windows",
      paint:         "painting",
      gutters:       "gutters",
      roofing:       "roofing",
    };

    if (job.isPending && job.jobServiceIds && job.jobServiceIds.length > 0) {
      // Fetch all active crews as a fallback pool
      const { data: allCrews } = await supabase
        .from("crews")
        .select("id, name")
        .eq("active", true)
        .order("name");

      const options: typeof serviceCrewOptions = [];

      for (let i = 0; i < job.jobServiceIds.length; i++) {
        const jsId      = job.jobServiceIds[i];
        const svcName   = job.serviceNames?.[i]  || "Service";
        const rawCode   = job.serviceCodes?.[i]  || "siding";
        const serviceId = mapCodeToServiceId(rawCode);
        const specCode  = specialtyCodeMap[serviceId] || "siding_installation";

        // Look up the specialty row
        const { data: specialty } = await supabase
          .from("specialties")
          .select("id")
          .eq("code", specCode)
          .maybeSingle();

        let filteredCrews: { id: string; name: string; partnerName: string }[] = [];

        if (specialty) {
          // Get crews that have this specialty, including partner_name for grouping
          const { data: crewSpecs } = await supabase
            .from("crew_specialties")
            .select("crews!crew_specialties_crew_id_fkey(id, name, partner_name)")
            .eq("specialty_id", specialty.id);

          filteredCrews = (crewSpecs || [])
            .map((cs: any) => cs.crews)
            .filter((c: any) => c?.id && c?.name)
            .map((c: any) => ({ id: c.id, name: c.name, partnerName: c.partner_name || c.name }));
        }

        // If no specialty-filtered crews, fall back to all active crews with partner_name
        const fallback = (allCrews || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          partnerName: c.partner_name || c.name,
        }));
        const crews = filteredCrews.length > 0 ? filteredCrews : fallback;

        options.push({
          jobServiceId: jsId,
          serviceName:  svcName,
          specialtyId:  specialty?.id || "",
          crews,
        });
      }

      setServiceCrewOptions(options);
    }
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

  const confirmReschedule = async () => {
    if (!editJob || isSundayIso(editDate)) return;
    const origMs = fromIso(editJob.startDate).getTime();
    const delta  = Math.round((fromIso(editDate).getTime() - origMs) / MS_DAY);

    // Calc new local state — optimistic update
    // When user confirms, status becomes in_progress immediately
    const newJobs = jobs.map(j => {
      if (j.id === editJob.id)
        return { ...j, startDate: editDate, durationDays: editDur, jobStartStatus: editStatus, status: "in_progress" as const };
      // Cascade date shift in Operational view
      if (viewMode === "operational" && j.partnerName === editJob.partnerName && fromIso(j.startDate).getTime() >= origMs) {
        return { ...j, startDate: shiftDate(j.startDate, delta) };
      }
      return j;
    });

    setJobs(newJobs);
    setEditJob(null);

    // Persist to Supabase
    try {
      const endAt = new Date(editDate);
      endAt.setDate(endAt.getDate() + editDur);

      // Update service_assignment: new dates + status = in_progress
      await supabase.from("service_assignments").update({
        scheduled_start_at: new Date(editDate).toISOString(),
        scheduled_end_at:   endAt.toISOString(),
        status:             "in_progress",
      }).eq("id", editJob.id);

      // Also update the parent job status to active (= in progress)
      if (editJob.jobId) {
        await supabase.from("jobs").update({ status: "active" }).eq("id", editJob.jobId);
      }
    } catch (err) {
      console.error("Failed to persist reschedule:", err);
    }
  };

  // ── Filter ───────────────────────────────────
  const visibleCats = filterSvc === "ALL"
    ? SERVICE_CATEGORIES
    : SERVICE_CATEGORIES.filter(c => c.id === filterSvc);

  const partnerJobs = (name: string) => jobs.filter(j => j.partnerName === name);
  const salesJobs   = (name: string) => jobs.filter(j => j.salesperson === name);

  // ── Gantt card position (% within the 7-col area) ──
  // Returns null if job is entirely outside this week
  const cardStyle = (job: ScheduledJob): { left: string; width: string } | null => {
    const idx = dayIndex(job, weekBase); // can be <0 or >6
    const dur = viewMode === "sales" ? 1 : job.durationDays;
    const end = idx + dur;
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
            <div className="flex items-center gap-4 mb-2">
              <h1
                className="tracking-tighter text-3xl font-extrabold text-[#faf9f5]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {viewMode === "operational" ? "Operational Schedule" : "Awaiting Approval"}
              </h1>
              <div className="flex items-center bg-[#121412] p-1 rounded-lg border border-[#474846]/20">
                <button 
                  onClick={() => setViewMode("operational")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === "operational" ? "bg-[#1e201e] text-[#faf9f5] shadow-sm" : "text-[#ababa8] hover:text-[#faf9f5]"}`}
                >
                  Operational
                </button>
                <button 
                  onClick={() => setViewMode("sales")}
                  className={`px-3 py-1 text-xs font-black rounded-md transition-all ${viewMode === "sales" ? "bg-[#aeee2a] text-[#3a5400] shadow-[0_0_10px_rgba(174,238,42,0.2)]" : "text-[#ababa8] hover:text-[#faf9f5]"}`}
                >
                  Awaiting Appr.
                </button>
              </div>
            </div>
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
              {viewMode === "operational" ? "Partner / Service" : "Salesperson"}
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

          {/* Main rows */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#242624 #0d0f0d" }}>
            
            {viewMode === "operational" && visibleCats.map(cat => (
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
                                border: isConflict ? "1px solid rgba(238,220,71,0.4)" : job.jobStartStatus === "draft" ? `1px dashed ${cat.color}60` : `1px solid ${cat.color}20`,
                                backdropFilter: "blur(16px)",
                                opacity: job.jobStartStatus === "on_hold" ? 0.5 : 1,
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
                              <div className="flex items-center justify-between gap-1 w-full mt-0.5">
                                {job.address && (
                                  <span className="text-[9px] truncate" style={{ color: isConflict ? "rgba(238,220,71,0.7)" : "#ababa8" }}>
                                    {job.address}
                                  </span>
                                )}
                                {job.jobStartStatus && (
                                  <span 
                                    className="px-1 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-sm border shrink-0"
                                    style={{
                                      backgroundColor: job.jobStartStatus === "active" ? "rgba(34, 197, 94, 0.1)" : job.jobStartStatus === "draft" ? "rgba(227, 235, 93, 0.1)" : "rgba(255, 115, 81, 0.1)",
                                      color: job.jobStartStatus === "active" ? "#22c55e" : job.jobStartStatus === "draft" ? "#e3eb5d" : "#ff7351",
                                      borderColor: job.jobStartStatus === "active" ? "rgba(34, 197, 94, 0.2)" : job.jobStartStatus === "draft" ? "rgba(227, 235, 93, 0.2)" : "rgba(255, 115, 81, 0.2)"
                                    }}
                                  >
                                    {job.jobStartStatus === "active" ? "CONF" : job.jobStartStatus === "draft" ? "TENT" : "PEND"}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8px] opacity-0 group-hover/card:opacity-100 transition-all font-bold" style={{ color: cat.color }}>
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

            {viewMode === "sales" && SALES_CATEGORIES.map(cat => (
               <div key={cat.id}>
                <div
                  className="px-5 py-2 flex items-center gap-2"
                  style={{ background: `${cat.color}08`, borderBottom: `1px solid ${cat.color}20`, borderTop: "1px solid rgba(71,72,70,0.1)" }}
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ color: cat.color }} translate="no">{cat.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cat.color }}>{cat.label}</span>
                </div>

                {cat.persons.map(name => {
                  const pJobs      = salesJobs(name);
                  const hasConflict = pJobs.some(j => conflictIds.has(j.id));
                  
                  // Pre-calculate levels for stacking
                  const levels: number[] = [];
                  pJobs.forEach((job, i) => {
                    const pos = cardStyle(job);
                    if (!pos) {
                      levels.push(-1);
                      return;
                    }
                    let level = 0;
                    while(true) {
                      const conflict = pJobs.slice(0, i).some((pJob, j) => {
                        if (levels[j] !== level || levels[j] === -1) return false;
                        const s1 = new Date(job.startDate).getTime();
                        const e1 = s1 + (job.durationDays - 1) * 86400000;
                        const s2 = new Date(pJob.startDate).getTime();
                        const e2 = s2 + (pJob.durationDays - 1) * 86400000;
                        return s1 <= e2 && e1 >= s2;
                      });
                      if (!conflict) break;
                      level++;
                    }
                    levels.push(level);
                  });

                  const maxLevel = Math.max(0, ...levels);
                  const dynamicHeight = Math.max(180, 16 + (maxLevel + 1) * 48);

                  return (
                    <div
                      key={name}
                      className="grid border-b border-white/[0.04] hover:bg-[#141614]/40 transition-colors"
                      style={{ gridTemplateColumns: "200px 1fr", minHeight: `${dynamicHeight}px` }}
                    >
                      <div className="px-5 py-4 border-r border-white/5 flex flex-col justify-center gap-1" style={{ borderLeft: `2px solid ${cat.color}40` }}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-[#faf9f5] tracking-wide" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                            {name}
                          </span>
                          {hasConflict && <span className="material-symbols-outlined text-[#eedc47] text-[14px]" title="Schedule conflict" translate="no">warning</span>}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${cat.color}99` }}>Salesperson</span>
                        <span className="text-[9px] text-[#474846] font-bold">{pJobs.length} job{pJobs.length !== 1 ? "s" : ""}</span>
                      </div>

                      <div className="relative" style={{ minHeight: `${dynamicHeight}px` }}>
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

                        {pJobs.map((job, i) => {
                          const pos = cardStyle(job);
                          if (!pos) return null;
                          const isConflict = conflictIds.has(job.id);
                          const sc = STATUS_CONFIG[job.status];
                          const level = levels[i];

                          return (
                            <button
                              key={job.id}
                              onClick={() => openReschedule(job)}
                              title="Click to reschedule"
                              className="absolute flex flex-col justify-center z-10 rounded-xl cursor-pointer hover:brightness-110 transition-all text-left px-3 py-1.5"
                              style={{
                                left: pos.left, width: pos.width,
                                top: `${8 + level * 48}px`, height: "40px",
                                background: isConflict ? "rgba(238,220,71,0.1)" : "rgba(36,38,36,0.85)",
                                border: isConflict ? "1px solid rgba(238,220,71,0.4)" : `1px solid ${cat.color}30`,
                                backdropFilter: "blur(16px)",
                              }}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <span className="text-[11px] font-bold truncate" style={{ color: isConflict ? "#eedc47" : "#faf9f5" }}>
                                  {job.clientName}
                                </span>
                              {isConflict
                                  ? <span className="material-symbols-outlined text-[#eedc47] text-[12px] shrink-0" translate="no">warning</span>
                                  : <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                                }
                              </div>
                              <div className="flex items-center justify-between gap-1 w-full mt-0.5">
                                {job.address && (
                                  <span className="text-[9px] truncate" style={{ color: isConflict ? "rgba(238,220,71,0.7)" : "#ababa8" }}>
                                    {job.address}
                                  </span>
                                )}
                                {job.jobStartStatus && (
                                  <span 
                                    className="px-1 py-[1px] text-[7px] font-black uppercase tracking-widest rounded-sm border shrink-0"
                                    style={{
                                      backgroundColor: job.jobStartStatus === "active" ? "rgba(34, 197, 94, 0.1)" : job.jobStartStatus === "draft" ? "rgba(227, 235, 93, 0.1)" : "rgba(255, 115, 81, 0.1)",
                                      color: job.jobStartStatus === "active" ? "#22c55e" : job.jobStartStatus === "draft" ? "#e3eb5d" : "#ff7351",
                                      borderColor: job.jobStartStatus === "active" ? "rgba(34, 197, 94, 0.2)" : job.jobStartStatus === "draft" ? "rgba(227, 235, 93, 0.2)" : "rgba(255, 115, 81, 0.2)"
                                    }}
                                  >
                                    {job.jobStartStatus === "active" ? "CONF" : job.jobStartStatus === "draft" ? "TENT" : "PEND"}
                                  </span>
                                )}
                              </div>
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
                <div className="flex items-center gap-3">
                  <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest">
                    {editJob.clientName} · {editJob.partnerName}
                  </p>
                  {editJob.jobStartStatus && (
                    <span 
                      className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border"
                      style={{
                        backgroundColor: editJob.jobStartStatus === "active" ? "rgba(34, 197, 94, 0.1)" : editJob.jobStartStatus === "draft" ? "rgba(227, 235, 93, 0.1)" : "rgba(255, 115, 81, 0.1)",
                        color: editJob.jobStartStatus === "active" ? "#22c55e" : editJob.jobStartStatus === "draft" ? "#e3eb5d" : "#ff7351",
                        borderColor: editJob.jobStartStatus === "active" ? "rgba(34, 197, 94, 0.2)" : editJob.jobStartStatus === "draft" ? "rgba(227, 235, 93, 0.2)" : "rgba(255, 115, 81, 0.2)"
                      }}
                    >
                      {editJob.jobStartStatus === "active" ? "CONFIRMED" : editJob.jobStartStatus === "draft" ? "TENTATIVE" : "PENDING"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">

              {/* Date picker — brand calendar (hide in sales + confirmed since we show it inline) */}
              {!(viewMode === "sales" && editStatus === "active") && (
                <>
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
                </>
              )}

              {/* Status Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                    className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="active">Confirmed</option>
                    <option value="draft">Tentative</option>
                    <option value="on_hold">Pending</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#ababa8] pointer-events-none text-[18px]" translate="no">expand_more</span>
                </div>
              </div>

              {/* Duration - Hidden in Sales View */}
              {viewMode === "operational" && (
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
              )}

              {/* Cascade preview */}
              {viewMode === "operational" && editDate && editDate !== editJob.startDate && (() => {
                const affected = getAffected(editJob, editDate);
                return affected.length > 0 ? (
                  <div className="p-3 bg-[#eedc47]/10 rounded-xl border border-[#eedc47]/20 flex gap-3">
                    <span className="material-symbols-outlined text-[#eedc47] text-[16px] mt-0.5" translate="no">info</span>
                    <div>
                      <p className="text-xs text-[#eedc47] font-bold">This will shift {affected.length} other job{affected.length > 1 ? "s" : ""}:</p>
                      <ul className="mt-1 text-[10px] text-[#faf9f5] font-bold">
                        {affected.slice(0, 2).map(a => <li key={a.id} className="truncate">• {a.clientName} (new: {fmtDate(fromIso(a.startDate))})</li>)}
                        {affected.length > 2 && <li className="text-[#ababa8] mt-0.5">...and {affected.length - 2} more</li>}
                      </ul>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Actions (Only in operational mode for this basic edit part) */}
            {viewMode === "operational" && (
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
            )}

            {/* Sales Details + Confirm Logic */}
            {viewMode === "sales" && (
              <div className="mt-2 text-left space-y-4">

                {/* ── Services Info ── */}
                {editJob.serviceNames && editJob.serviceNames.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editJob.serviceNames.map((svc, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[#aeee2a]/10 text-[#aeee2a] border border-[#aeee2a]/20"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                )}

                {/* ── Schedule for Crew / Change Partner (active OR in_progress) ── */}
                {(editStatus === "active" || editJob?.status === "in_progress") && (
                  <div className={`p-4 rounded-xl space-y-4 ${editJob?.status === "in_progress" ? "bg-[#60b8f5]/5 border border-[#60b8f5]/15" : "bg-[#aeee2a]/5 border border-[#aeee2a]/15"}`}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm" style={{ color: editJob?.status === "in_progress" ? "#60b8f5" : "#aeee2a" }} translate="no">
                        {editJob?.status === "in_progress" ? "swap_horiz" : "event_available"}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: editJob?.status === "in_progress" ? "#60b8f5" : "#aeee2a" }}>
                        {editJob?.status === "in_progress" ? "Change Partner / Team" : "Schedule for Crew"}
                      </span>
                    </div>

                    {/* Date Picker */}
                    <CustomDatePicker
                      label=""
                      value={editDate}
                      onChange={val => setEditDate(val)}
                      disableSundays={true}
                      placeholder="Select start date"
                    />
                    {editDate && (
                      <p className="text-[10px] text-[#ababa8] -mt-2">
                        {fromIso(editDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}

                    {/* ── Per-Service Crew Selectors ── */}
                    {serviceCrewOptions.length === 0 ? (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[#121412] border border-white/5">
                        <div className="w-3 h-3 border-2 border-[#aeee2a]/30 border-t-[#aeee2a] rounded-full animate-spin" />
                        <span className="text-[11px] text-[#474846] font-bold">Loading available crews...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {serviceCrewOptions.map((svcOpt) => {
                          // Group crews by partnerName for <optgroup> display
                          const grouped = svcOpt.crews.reduce<Record<string, typeof svcOpt.crews>>((acc, c) => {
                            const partner = c.partnerName;
                            if (!acc[partner]) acc[partner] = [];
                            acc[partner].push(c);
                            return acc;
                          }, {});

                          return (
                            <div key={svcOpt.jobServiceId} className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <span className="text-[#ababa8]">Assign Crew</span>
                                <span className="text-[#aeee2a]">— {svcOpt.serviceName}</span>
                              </label>
                              <div className="relative">
                                <select
                                  value={selectedCrewIds[svcOpt.jobServiceId] || ""}
                                  onChange={e => setSelectedCrewIds(prev => ({
                                    ...prev,
                                    [svcOpt.jobServiceId]: e.target.value,
                                  }))}
                                  className="w-full bg-[#0d0f0d] border border-white/10 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                                >
                                  <option value="">Selecionar parceiro / equipe...</option>
                                  {Object.entries(grouped).map(([partnerName, teams]) =>
                                    teams.length === 1 ? (
                                      // Single-team partner: flat option showing just the partner name
                                      <option key={teams[0].id} value={teams[0].id}>
                                        {partnerName}
                                      </option>
                                    ) : (
                                      // Multi-team partner: optgroup with team options
                                      <optgroup key={partnerName} label={`── ${partnerName} ──`}>
                                        {teams.map(t => (
                                          <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                      </optgroup>
                                    )
                                  )}
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#ababa8] pointer-events-none text-[18px]" translate="no">expand_more</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Info Grid ── */}
                <div className="grid grid-cols-2 bg-[#121412] rounded-xl border border-white/5 overflow-hidden">
                  <div className="p-4 border-r border-b border-white/5">
                    <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest block mb-1">Nome do Vendedor</span>
                    <div className="text-sm font-semibold text-[#faf9f5] flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#aeee2a]" translate="no">person</span>
                      {editJob.salesperson || "Não informado"}
                    </div>
                  </div>
                  
                  <div className="p-4 border-b border-white/5">
                    <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest block mb-1">Valor do Serviço</span>
                    <div className="text-sm font-semibold text-[#faf9f5] flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#aeee2a]" translate="no">payments</span>
                      {editJob.contract_amount ? `$${editJob.contract_amount.toLocaleString()}` : "Não informado"}
                    </div>
                  </div>

                  <div className="p-4 border-r border-white/5">
                    <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest block mb-1">Email / Telefone</span>
                    <div className="text-xs font-semibold text-[#faf9f5] flex flex-col gap-1">
                      <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px] opacity-70" translate="no">call</span> {editJob.phone || "---"}</span>
                      <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px] opacity-70" translate="no">mail</span> {editJob.email || "---"}</span>
                    </div>
                  </div>

                  <div className="p-4 border-white/5">
                    <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest block mb-1">Endereço do Cliente</span>
                    <div className="text-xs font-semibold text-[#faf9f5] flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm text-[#aeee2a] mt-0.5" translate="no">location_on</span>
                      {editJob.address || "Endereço não preenchido"}
                    </div>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditJob(null)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#ababa8] hover:text-[#faf9f5] transition-colors bg-[#121412] border border-[#474846]/20"
                  >
                    Fechar
                  </button>
                  {editStatus === "active" && editDate && !isSundayIso(editDate) &&
                   serviceCrewOptions.length > 0 &&
                   serviceCrewOptions.every(svc => !!selectedCrewIds[svc.jobServiceId]) && (
                    <button
                      type="button"
                      disabled={confirmingSchedule}
                      onClick={async () => {
                        if (!editJob || !editDate || serviceCrewOptions.length === 0) return;
                        setConfirmingSchedule(true);
                        try {
                          const startAt = new Date(editDate + "T08:00:00").toISOString();
                          const endAt = new Date(editDate + "T08:00:00");
                          endAt.setDate(endAt.getDate() + 1);

                          // Create one service_assignment per service, each with its own crew
                          for (const svcOpt of serviceCrewOptions) {
                            const crewId = selectedCrewIds[svcOpt.jobServiceId];
                            if (!crewId) {
                              console.warn("⚠ No crew selected for service:", svcOpt.serviceName);
                              continue;
                            }
                            if (!svcOpt.specialtyId) {
                              console.error("❌ No specialty resolved for service:", svcOpt.serviceName);
                              continue;
                            }
                            const { error: insertErr } = await supabase
                              .from("service_assignments")
                              .insert({
                                job_service_id:    svcOpt.jobServiceId,
                                crew_id:           crewId,
                                specialty_id:      svcOpt.specialtyId,
                                status:            "scheduled",
                                scheduled_start_at: startAt,
                                scheduled_end_at:   endAt.toISOString(),
                              });
                            if (insertErr) console.error("❌ Insert error for", svcOpt.serviceName, insertErr);
                          }

                          // Update job status to 'active'
                          await supabase
                            .from("jobs")
                            .update({ status: "active" })
                            .eq("id", editJob.id);

                          // Refresh and close
                          setEditJob(null);
                          fetchSchedule();
                          console.log("✅ Job confirmed and scheduled:", editJob.clientName, editDate);
                        } catch (err) {
                          console.error("❌ Error confirming schedule:", err);
                        } finally {
                          setConfirmingSchedule(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl text-sm font-black bg-[#aeee2a] text-[#3a5400] flex items-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(174,238,42,0.2)] disabled:opacity-50"
                      style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                    >
                      {confirmingSchedule ? (
                        <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm" translate="no">check_circle</span>
                          Confirm Scheduling
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
