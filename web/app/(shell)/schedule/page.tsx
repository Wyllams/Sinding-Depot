"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { CustomDropdown } from "../../../components/CustomDropdown";
import { supabase } from "../../../lib/supabase";
import { calculateServiceDuration } from "../../../lib/duration-calculator";

// =============================================
// JOB SCHEDULE — Weekly Gantt with Drag & Drop
// Partners & Services — Real Data
// Global Undo System (50 actions)
// =============================================

// ─── Service Categories ───────────────────────
type ServiceId = "siding" | "doors_windows_decks" | "paint" | "gutters" | "roofing";

const SERVICE_CATEGORIES: {
  id: ServiceId;
  label: string;
  color: string;
  icon: string;
  partners: string[];
}[] = [
  { id: "siding",             label: "Siding",                  color: "#aeee2a", icon: "home_work",    partners: ["XICARA", "XICARA 02", "WILMAR", "WILMAR 02", "SULA", "LUIS"] },
  { id: "doors_windows_decks",label: "Doors / Windows / Decks", color: "#f5a623", icon: "sensor_door",  partners: ["SERGIO"] },
  { id: "paint",              label: "Paint",                   color: "#60b8f5", icon: "format_paint", partners: ["OSVIN", "OSVIN 02", "VICTOR", "JUAN"] },
  { id: "gutters",            label: "Gutters",                 color: "#c084fc", icon: "water_drop",   partners: ["LEANDRO"] },
  { id: "roofing",            label: "Roofing",                 color: "#ef4444", icon: "roofing",      partners: ["JOSUE"] },
];

// ─── Job Model (real dates) ──────────────────
interface ScheduledJob {
  id: string;
  jobId?: string;
  clientName: string;
  serviceType: ServiceId;
  partnerName: string;
  salesperson?: string;
  startDate: string;
  durationDays: number;
  status: "tentative" | "scheduled" | "in_progress" | "done";
  jobStartStatus?: "active" | "draft" | "on_hold";
  address?: string;
  contract_amount?: number;
  phone?: string;
  email?: string;
  title?: string;
  serviceNames?: string[];
  jobServiceIds?: string[];
  serviceCodes?: string[];
  isPending?: boolean;
  crewId?: string;
  sq?: number | null;
  city?: string;
  state?: string;
  zip?: string;
  street?: string;
  source?: "jobs" | "service_assignments";
}


// ─── Helpers ────────────────────────────────────
const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MS_DAY = 86_400_000;

const getMondayOf = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
};

const getWeekDates = (monday: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });

const fmtDate = (d: Date) =>
  `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;

const toIso = (d: Date) => d.toISOString().split("T")[0];
const fromIso = (s: string): Date => new Date(s + "T12:00:00");

const dayIndex = (job: ScheduledJob, monday: Date): number => {
  const start = fromIso(job.startDate).setHours(0, 0, 0, 0);
  const base  = new Date(monday).setHours(0, 0, 0, 0);
  return Math.round((start - base) / MS_DAY);
};

const shiftDate = (iso: string, delta: number): string => {
  const d = fromIso(iso);
  const sign = delta > 0 ? 1 : -1;
  let remaining = Math.abs(delta);
  while (remaining > 0) {
    d.setDate(d.getDate() + sign);
    if (d.getDay() !== 0) remaining--;
  }
  return toIso(d);
};

const isSundayIso = (iso: string) => fromIso(iso).getDay() === 0;

// ─── Dynamic Status Colors (6.3) ─────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  tentative:   { color: "#f5a623", label: "Pending",     bg: "rgba(245,166,35,0.12)" },
  scheduled:   { color: "#60b8f5", label: "Confirmed",   bg: "rgba(96,184,245,0.12)" },
  in_progress: { color: "#aeee2a", label: "In Progress", bg: "rgba(174,238,42,0.12)" },
  done:        { color: "#22c55e", label: "Done",        bg: "rgba(34,197,94,0.12)" },
};

// ─── Undo System (6.7) ────────────────────────────
interface UndoAction {
  id: string;
  label: string;
  timestamp: number;
  previousState: ScheduledJob[];
}

const MAX_UNDO = 50;

const getJobEndDate = (startDateIso: string, durationDays: number): Date => {
  const [y, m, d] = startDateIso.split("-").map(Number);
  const endDay = new Date(y, m - 1, d);
  let daysAdded = 0;
  while (daysAdded < (durationDays || 1) - 1) {
    endDay.setDate(endDay.getDate() + 1);
    if (endDay.getDay() !== 0) daysAdded++;
  }
  return endDay;
};

const getVisualStatus = (job: ScheduledJob): "tentative" | "scheduled" | "in_progress" | "done" => {
  if (job.status === "done") return "done";

  // Tentative: job not yet confirmed (draft status) — always orange regardless of date
  if (job.jobStartStatus === "draft") return "tentative";

  try {
    const end = getJobEndDate(job.startDate, job.durationDays);
    const fmtY = end.getFullYear();
    const fmtM = end.getMonth();
    const fmtD = end.getDate();
    
    // Check if the current time has passed 18:00 (6 PM) on the end date
    const at18PM = new Date(fmtY, fmtM, fmtD, 18, 0, 0);
    if (new Date() >= at18PM) return "done";
  } catch (e) {}
  
  // Show as In Progress when today is within the service date range
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(job.startDate + "T00:00:00");
    start.setHours(0, 0, 0, 0);
    const end = getJobEndDate(job.startDate, job.durationDays);
    end.setHours(23, 59, 59, 999);

    if (today >= start && today <= end) {
      return "in_progress";
    }
  } catch (e) {}

  return job.status || "scheduled";
};

const getInitials = (name?: string) => {
  if (!name) return "S";
  const clean = name.replace(/[^a-zA-Z\s]/g, "").trim();
  const w = clean.split(/\s+/);
  if (w.length === 0 || w[0] === "") return "S";
  return w[0][0].toUpperCase();
};

const SALES_COLORS: Record<string, { color: string, border: string, bg: string }> = {
  R: { color: "#9f7aea", border: "rgba(159, 122, 234, 0.4)", bg: "rgba(159, 122, 234, 0.08)" }, // Ruby - Purple
  A: { color: "#fc5c65", border: "rgba(252, 92, 101, 0.4)", bg: "rgba(252, 92, 101, 0.08)" }, // Armando - Red
  M: { color: "#2bcbba", border: "rgba(43, 203, 186, 0.4)", bg: "rgba(43, 203, 186, 0.08)" }, // Matheus - Green
};

const getSalesColors = (initial: string) => {
  return SALES_COLORS[initial] || { color: "#ababa8", border: "rgba(171,171,168,0.4)", bg: "rgba(171,171,168,0.08)" };
};

// ─── Main Component ─────────────────────────────
export default function SchedulePage() {
  const [jobs,        setJobs]        = useState<ScheduledJob[]>([]);
  const [weekBase,    setWeekBase]    = useState<Date>(() => getMondayOf(new Date()));
  const [filterSvc,   setFilterSvc]   = useState<ServiceId | "ALL">("ALL");
  const [editJob,     setEditJob]     = useState<ScheduledJob | null>(null);
  const [editDate,    setEditDate]    = useState<string>("");
  const [editDur,     setEditDur]     = useState<number>(1);
  const [editStatus,  setEditStatus]  = useState<"active" | "draft" | "on_hold">("active");
  const [editSq,      setEditSq]      = useState<string>("");
  const [selectedCrewIds, setSelectedCrewIds] = useState<Record<string, string>>({});
  const [serviceCrewOptions, setServiceCrewOptions] = useState<{
    jobServiceId: string;
    serviceName: string;
    specialtyId: string;
    crews: { id: string; name: string; partnerName: string }[];
  }[]>([]);
  const [confirmingSchedule, setConfirmingSchedule] = useState(false);
  const [allCrews, setAllCrews] = useState<{ id: string; name: string }[]>([]);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirming" | "deleting">("idle");

  // ─── Undo Stack ────────────────────────────────
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const undoToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Drag & Drop State (6.5) ───────────────────
  const [dragJob, setDragJob] = useState<ScheduledJob | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const pushUndo = useCallback((label: string, prevJobs: ScheduledJob[]) => {
    setUndoStack(prev => {
      const uid = Date.now().toString(36) + Math.random().toString(36).slice(2);
      const next = [...prev, { id: uid, label, timestamp: Date.now(), previousState: prevJobs }];
      return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
    });
    // Show toast
    setShowUndoToast(true);
    if (undoToastTimer.current) clearTimeout(undoToastTimer.current);
    undoToastTimer.current = setTimeout(() => setShowUndoToast(false), 3000);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setJobs(last.previousState);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, []);

  // ─── Real-time duration recalculation when SQ or crew changes ───
  useEffect(() => {
    if (!editJob) return;
    // Only recalculate for services that use SQ-based duration
    if (editJob.serviceType !== "siding" && editJob.serviceType !== "paint") return;
    if (!editSq || isNaN(parseFloat(editSq)) || parseFloat(editSq) <= 0) return;

    const newSq = parseFloat(editSq);
    const selectedCrewId = editJob.jobServiceIds && editJob.jobServiceIds.length > 0
      ? selectedCrewIds[editJob.jobServiceIds[0]]
      : undefined;
    const crewName = selectedCrewId
      ? allCrews.find(c => c.id === selectedCrewId)?.name || editJob.partnerName
      : editJob.partnerName;

    const svcNameMap: Record<string, string> = {
      siding: "siding",
      paint: "painting",
      gutters: "gutters",
      roofing: "roofing",
      doors_windows_decks: "doors_windows_decks",
    };
    const svcName = svcNameMap[editJob.serviceType] || editJob.serviceType;
    const newDur = calculateServiceDuration(crewName, svcName, newSq);

    setEditDur(newDur);
  }, [editSq, editJob, selectedCrewIds, allCrews]);

  const fetchSchedule = async () => {
    const { data: assignments, error } = await supabase.from("service_assignments").select(`
      id,
      status,
      scheduled_start_at,
      scheduled_end_at,
      crew_id,
      crews(name),
      job_services!service_assignments_job_service_id_fkey(
        id,
        quantity,
        unit_of_measure,
        service_types!job_services_service_type_id_fkey(code, name),
        jobs!job_services_job_id_fkey(
          id,
          status,
          city,
          state,
          postal_code,
          service_address_line_1,
          salesperson_id,
          sq,
          contract_amount,
          customers!jobs_customer_id_fkey(
            full_name,
            phone,
            email
          ),
          salespersons!jobs_salesperson_id_fkey(
            full_name
          )
        )
      )
    `);

    if (error) {
      console.error("Error fetching schedule:", error.message);
      return;
    }

    const { data: crewsData } = await supabase.from("crews").select("id, name");
    if (crewsData) setAllCrews(crewsData);

    const mapped: ScheduledJob[] = (assignments || []).map((a: any) => {
      const js = a.job_services;
      const jb = js?.jobs;
      const c = jb?.customers;
      const startIso = a.scheduled_start_at ? a.scheduled_start_at.split('T')[0] : shiftDate(toIso(new Date()), 1);

      // Auto-confirm: if today >= start date, status becomes active (Confirmed)
      const rawJobStatus = (jb?.status === "active" || jb?.status === "on_hold" || jb?.status === "draft") ? jb.status : "active";
      const todayIso = new Date().toISOString().split('T')[0];
      const autoConfirmedStatus = (rawJobStatus === "draft" && startIso <= todayIso) ? "active" as const : rawJobStatus;

      return {
        id: a.id,
        jobId: jb?.id,
        clientName: c && c.full_name ? c.full_name : "Unknown",
        serviceType: mapCodeToServiceId(js?.service_types?.code),
        partnerName: a.crews?.name || "Siding Depot",
        salesperson: jb?.salespersons?.full_name || "Not assigned",
        startDate: startIso,
        durationDays: a.scheduled_end_at && a.scheduled_start_at
           ? Math.max(1, Math.round((new Date(a.scheduled_end_at).getTime() - new Date(a.scheduled_start_at).getTime()) / MS_DAY))
           : 1,
        status: (a.status === 'in_progress' ? 'in_progress' : a.status === 'completed' ? 'done' : 'scheduled') as ScheduledJob["status"],
        jobStartStatus: autoConfirmedStatus,
        address: jb?.city || "Unknown",
        phone: c?.phone || "",
        email: c?.email || "",
        street: jb?.service_address_line_1 || "",
        city: jb?.city || "",
        state: jb?.state || "",
        zip: jb?.postal_code || "",
        source: "service_assignments",
        jobServiceIds: js?.id ? [js.id] : [],
        serviceCodes: js?.service_types?.code ? [js.service_types.code] : [],
        serviceNames: js?.service_types?.name ? [js.service_types.name] : [],
        crewId: a.crew_id,
        sq: jb?.sq != null ? Number(jb.sq) : (js?.unit_of_measure === 'SQ' && js?.quantity != null ? Number(js.quantity) : null),
        contract_amount: jb?.contract_amount != null ? Number(jb.contract_amount) : undefined,
      };
    });

    setJobs(mapped);
  };

  const mapCodeToServiceId = (code: string): ServiceId => {
    if (!code) return "siding";
    const c = code.toLowerCase();
    if (c.includes("siding") || c.includes("ext")) return "siding";
    if (c.includes("roof")) return "roofing";
    if (c.includes("paint")) return "paint";
    if (c.includes("gutter") || c.includes("downspout")) return "gutters";
    if (c.includes("deck") || c.includes("window") || c.includes("door")) return "doors_windows_decks";
    return "siding";
  };

  const weekDates    = getWeekDates(weekBase);
  const today        = new Date();
  const todayIndex   = weekDates.findIndex(d => d.toDateString() === today.toDateString());

  // Navigation
  const prevWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); };
  const nextWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); };
  const goToday  = () => setWeekBase(getMondayOf(new Date()));

  // ── Drag & Drop Handlers (6.5) ────────────────────
  const handleDragStart = (e: React.DragEvent, job: ScheduledJob) => {
    setDragJob(job);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", job.id);
    // Add a ghost style
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = "0.4";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDragJob(null);
    setDragOverDay(null);
  };

  const handleDayDragOver = (e: React.DragEvent, dayIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dayIdx !== 6) setDragOverDay(dayIdx); // Can't drop on Sunday
  };

  const handleDayDrop = (e: React.DragEvent, dayIdx: number, targetPartnerName?: string) => {
    e.preventDefault();
    setDragOverDay(null);
    if (!dragJob || dayIdx === 6) return; // Can't drop on Sunday

    const newDate = toIso(weekDates[dayIdx]);
    if (newDate === dragJob.startDate && (!targetPartnerName || targetPartnerName === dragJob.partnerName)) return; // Didn't move

    let targetCrewId = dragJob.crewId;
    let newPartnerName = dragJob.partnerName;
    const norm = (s?: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
    
    if (targetPartnerName && norm(targetPartnerName) !== norm(dragJob.partnerName)) {
      // ── Validate specialty match: block cross-specialty drops ──
      const targetCategory = SERVICE_CATEGORIES.find(sc =>
        sc.partners.some(p => norm(p) === norm(targetPartnerName))
      );
      const jobCategory = SERVICE_CATEGORIES.find(sc => sc.id === dragJob.serviceType);
      if (targetCategory && jobCategory && targetCategory.id !== jobCategory.id) {
        setAlertMessage(`Cannot move "${jobCategory.label}" service to ${targetPartnerName}.\n${targetPartnerName} handles "${targetCategory.label}" only.`);
        setDragJob(null);
        return;
      }

      const c = allCrews.find(crew => norm(crew.name) === norm(targetPartnerName));
      if (c) {
        targetCrewId = c.id;
        newPartnerName = c.name;
      } else {
        newPartnerName = targetPartnerName;
      }
    }

    // Save previous state for undo
    const prevJobs = [...jobs];
    pushUndo(`Moved "${dragJob.clientName}" to ${fmtDate(weekDates[dayIdx])}`, prevJobs);

    // ── Cascade Shifting Logic (Siding -> Window -> Paint -> Gutters -> Roofing) ─────────────
    const updatedJobs = jobs.map(j => {
      if (j.id === dragJob.id) return { ...j, startDate: newDate, partnerName: newPartnerName, crewId: targetCrewId };
      return j;
    });

    const getJobByService = (type: ServiceId) => 
       updatedJobs.find(pj => pj.serviceType === type && pj.clientName === dragJob.clientName && pj.id !== dragJob.id);

    const shiftJobByReference = (targetJob: ScheduledJob | undefined, refStartDate: string, refDuration: number) => {
       if (!targetJob) return targetJob;
       // targetJob starts 1 working day after ref finishes
       let nextDate = shiftDate(refStartDate, refDuration);
       if (isSundayIso(nextDate)) {
          nextDate = shiftDate(nextDate, 1);
       }
       const idx = updatedJobs.findIndex(j => j.id === targetJob.id);
       if (idx >= 0) {
          updatedJobs[idx] = { ...updatedJobs[idx], startDate: nextDate };
       }
       return updatedJobs[idx];
    };

    const jobsToPersist: ScheduledJob[] = [];

    if (dragJob.serviceType === "siding") {
       // Doors/Windows stays on the same day as Siding
       const doorsJob = getJobByService("doors_windows_decks");
       if (doorsJob) {
          const idx = updatedJobs.findIndex(j => j.id === doorsJob.id);
          if (idx >= 0) {
              updatedJobs[idx] = { ...updatedJobs[idx], startDate: newDate };
              jobsToPersist.push(updatedJobs[idx]);
          }
       }
       
       let paintJob = getJobByService("paint");
       let guttersJob = getJobByService("gutters");
       let roofJob = getJobByService("roofing");

       paintJob = shiftJobByReference(paintJob, newDate, dragJob.durationDays);
       if (paintJob) jobsToPersist.push(paintJob);

       if (paintJob && guttersJob) guttersJob = shiftJobByReference(guttersJob, paintJob.startDate, paintJob.durationDays);
       if (guttersJob) jobsToPersist.push(guttersJob);

       if (guttersJob && roofJob) roofJob = shiftJobByReference(roofJob, guttersJob.startDate, guttersJob.durationDays);
       if (roofJob) jobsToPersist.push(roofJob);

    } else if (dragJob.serviceType === "paint") {
       let guttersJob = getJobByService("gutters");
       let roofJob = getJobByService("roofing");
       
       guttersJob = shiftJobByReference(guttersJob, newDate, dragJob.durationDays);
       if (guttersJob) jobsToPersist.push(guttersJob);

       if (guttersJob && roofJob) roofJob = shiftJobByReference(roofJob, guttersJob.startDate, guttersJob.durationDays);
       if (roofJob) jobsToPersist.push(roofJob);

    } else if (dragJob.serviceType === "gutters") {
       let roofJob = getJobByService("roofing");
       roofJob = shiftJobByReference(roofJob, newDate, dragJob.durationDays);
       if (roofJob) jobsToPersist.push(roofJob);
    }

    setJobs(updatedJobs);

    // Persist to DB
    persistDateChange(dragJob, newDate, dragJob.durationDays, targetCrewId);

    // Also persist cascaded jobs
    jobsToPersist.forEach(j => {
       persistDateChange(j, j.startDate, j.durationDays, j.crewId);
    });
  };

  const persistDateChange = async (job: ScheduledJob, newDate: string, duration: number, newCrewId?: string) => {
    try {
      if (job.source === "jobs") {
         // It's a pending job mapped directly from jobs table, just update the target completion date.
         await supabase.from("jobs").update({
           target_completion_date: newDate
         }).eq("id", job.id);
         return;
      }

      const endAt = new Date(newDate + "T12:00:00");
      endAt.setDate(endAt.getDate() + (duration || 1));
      const startAt = new Date(newDate + "T08:00:00");
      
      const payload: any = {
        scheduled_start_at: startAt.toISOString(),
        scheduled_end_at: endAt.toISOString(),
      };
      if (newCrewId !== undefined) {
         payload.crew_id = newCrewId;
      }
      
      const { error } = await supabase.from("service_assignments").update(payload).eq("id", job.id);
      
      if (error) console.error("Update failed:", error);
    } catch (err) {
      console.error("Failed to persist date change:", err);
    }
  };

  // ── Reschedule / Open modal ───────────────────
  const openReschedule = async (job: ScheduledJob) => {
    setEditJob(job);
    setEditDate(job.isPending ? "" : job.startDate);
    setEditDur(job.durationDays);
    // Auto-confirm if start date is today or earlier
    const todayStr = new Date().toISOString().split('T')[0];
    const baseStatus = job.jobStartStatus ?? "active";
    const confirmedStatus = (baseStatus === "draft" && job.startDate <= todayStr) ? "active" : baseStatus;
    setEditStatus(confirmedStatus as "active" | "draft" | "on_hold");
    setEditSq(job.sq != null ? String(job.sq) : "");
    setSelectedCrewIds(
      job.jobServiceIds && job.jobServiceIds.length > 0 && job.crewId 
        ? { [job.jobServiceIds[0]]: job.crewId } 
        : {}
    );
    setServiceCrewOptions([]);
    setConfirmingSchedule(false);
    setDeleteStep("idle");

    const specialtyCodeMap: Record<string, string> = {
      siding:              "siding_installation",
      doors_windows_decks: "windows",
      paint:               "painting",
      gutters:             "gutters",
      roofing:             "roofing",
    };

    if (job.jobServiceIds && job.jobServiceIds.length > 0) {
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

        const { data: specialty } = await supabase
          .from("specialties")
          .select("id")
          .eq("code", specCode)
          .maybeSingle();

        let filteredCrews: { id: string; name: string; partnerName: string }[] = [];

        if (specialty) {
          const { data: crewSpecs } = await supabase
            .from("crew_specialties")
            .select("crews!crew_specialties_crew_id_fkey(id, name, partner_name)")
            .eq("specialty_id", specialty.id);

          filteredCrews = (crewSpecs || [])
            .map((cs: any) => cs.crews)
            .filter((c: any) => c?.id && c?.name)
            .map((c: any) => ({ id: c.id, name: c.name, partnerName: c.partner_name || c.name }));
        }

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

  const getAffected = (job: ScheduledJob, newDate: string): ScheduledJob[] => {
    if (job.serviceType !== "siding") return [];
    
    // Only show the Paint job shifting for the same client
    const paintJob = jobs.find(pj =>
      pj.serviceType === "paint" &&
      pj.clientName === job.clientName &&
      pj.id !== job.id
    );
    
    if (paintJob) {
      let paintDate = shiftDate(newDate, editDur || job.durationDays);
      if (isSundayIso(paintDate)) paintDate = shiftDate(paintDate, 1);
      return [{ ...paintJob, startDate: paintDate }];
    }
    
    return [];
  };

  const confirmReschedule = async () => {
    if (!editJob || isSundayIso(editDate) || confirmingSchedule) return;

    setConfirmingSchedule(true);
    try {
      pushUndo(`Rescheduled "${editJob.clientName}"`, [...jobs]);

      // ── Resolve crew and compute duration FIRST (before any DB write) ──
      const selectedCrewId = editJob.jobServiceIds && editJob.jobServiceIds.length > 0 ? selectedCrewIds[editJob.jobServiceIds[0]] : undefined;
      const newCrewName = selectedCrewId ? allCrews.find(c => c.id === selectedCrewId)?.name || editJob.partnerName : editJob.partnerName;

      // Automatically compute duration based on partner-specific SQ tables
      let finalDur = editDur;
      if (editSq && !isNaN(parseFloat(editSq))) {
         const newSq = parseFloat(editSq);
         const svcNameMap: Record<string, string> = {
           siding: "siding",
           paint: "painting",
           gutters: "gutters",
           roofing: "roofing",
           doors_windows_decks: "doors_windows_decks",
         };
         const svcName = svcNameMap[editJob.serviceType] || editJob.serviceType;
         finalDur = calculateServiceDuration(newCrewName, svcName, newSq);
      }

      // ── All DB writes now use finalDur for end date calculation ──
      const startAt = new Date(editDate + "T08:00:00").toISOString();
      const endAt = new Date(editDate + "T08:00:00");
      endAt.setDate(endAt.getDate() + finalDur);

      let anyCrewSelected = false;

      // Update crews if options are available and selected
      if (serviceCrewOptions.length > 0) {
        for (const svcOpt of serviceCrewOptions) {
          const crewId = selectedCrewIds[svcOpt.jobServiceId];
          if (!crewId || !svcOpt.specialtyId) continue;
          anyCrewSelected = true;

          // In operational view, all jobs should originate from service_assignments.
          if (editJob.source === "service_assignments") {
             const { error: updateErr } = await supabase.from("service_assignments").update({
                crew_id: crewId,
                status: "scheduled",
                scheduled_start_at: startAt,
                scheduled_end_at: endAt.toISOString()
             }).eq("id", editJob.id);
             
             if (updateErr) console.error("Crew update error:", updateErr);
          }
        }
      }

      // Fallback single update if no crews were selected/changed but dates changed
      if (!anyCrewSelected) {
        if (editJob.source === "jobs") {
          await supabase.from("jobs").update({ target_completion_date: editDate }).eq("id", editJob.id);
        } else {
          await supabase.from("service_assignments").update({
            scheduled_start_at: startAt,
            scheduled_end_at: endAt.toISOString(),
            status: "scheduled",
          }).eq("id", editJob.id);
        }
      }

      // Update job sq if provided and applicable
      if (editSq !== undefined && editJob.jobServiceIds && editJob.jobServiceIds.length > 0) {
        const qVal = parseFloat(editSq);
        const sqUpdatePayload = { quantity: isNaN(qVal) ? null : qVal, unit_of_measure: "SQ" };
        const { error: sqErr } = await supabase.from("job_services").update(sqUpdatePayload).eq("id", editJob.jobServiceIds[0]);
        if (sqErr) console.error("SQ update error:", sqErr);
      }

      // Sync SQ to jobs table (bidirectional sync with project detail page)
      if (editSq !== undefined && editJob.jobId) {
        const sqVal = parseFloat(editSq);
        const { error: jobSqErr } = await supabase.from("jobs").update({ sq: isNaN(sqVal) ? null : sqVal }).eq("id", editJob.jobId);
        if (jobSqErr) console.error("Job SQ sync error:", jobSqErr);
      }

      // Update JOB START STATUS only for Siding (main service controls job status)
      if (editJob.jobId && editJob.serviceType === "siding") {
        await supabase.from("jobs").update({ status: editStatus }).eq("id", editJob.jobId);
      }

      const newJobs = jobs.map(j => {
        if (j.id === editJob.id)
          return { ...j, startDate: editDate, durationDays: finalDur, jobStartStatus: editStatus, status: "scheduled" as const, crewId: selectedCrewId || j.crewId, partnerName: newCrewName };
        return j;
      });

      const getJobBySvc = (type: ServiceId) => 
         newJobs.find(pj => pj.serviceType === type && pj.clientName === editJob.clientName && pj.id !== editJob.id);

      const shiftInReschedule = (targetJob: ScheduledJob | undefined, refStartDate: string, refDuration: number) => {
         if (!targetJob) return targetJob;
         let nextDate = shiftDate(refStartDate, refDuration);
         if (isSundayIso(nextDate)) {
            nextDate = shiftDate(nextDate, 1);
         }
         const idx = newJobs.findIndex(j => j.id === targetJob.id);
         if (idx >= 0) newJobs[idx] = { ...newJobs[idx], startDate: nextDate };
         return newJobs[idx];
      };

      const jobsToUpdate: ScheduledJob[] = [];

      if (editJob.serviceType === "siding") {
         const doorsJob = getJobBySvc("doors_windows_decks");
         if (doorsJob) {
            const idx = newJobs.findIndex(j => j.id === doorsJob.id);
            if (idx >= 0) {
                newJobs[idx] = { ...newJobs[idx], startDate: editDate };
                jobsToUpdate.push(newJobs[idx]);
            }
         }
         
         let paintJob = getJobBySvc("paint");
         let guttersJob = getJobBySvc("gutters");
         let roofJob = getJobBySvc("roofing");

         paintJob = shiftInReschedule(paintJob, editDate, finalDur);
         if (paintJob) jobsToUpdate.push(paintJob);

         if (paintJob && guttersJob) guttersJob = shiftInReschedule(guttersJob, paintJob.startDate, paintJob.durationDays);
         if (guttersJob) jobsToUpdate.push(guttersJob);

         if (guttersJob && roofJob) roofJob = shiftInReschedule(roofJob, guttersJob.startDate, guttersJob.durationDays);
         if (roofJob) jobsToUpdate.push(roofJob);

      } else if (editJob.serviceType === "paint") {
         let guttersJob = getJobBySvc("gutters");
         let roofJob = getJobBySvc("roofing");
         
         guttersJob = shiftInReschedule(guttersJob, editDate, finalDur);
         if (guttersJob) jobsToUpdate.push(guttersJob);

         if (guttersJob && roofJob) roofJob = shiftInReschedule(roofJob, guttersJob.startDate, guttersJob.durationDays);
         if (roofJob) jobsToUpdate.push(roofJob);

      } else if (editJob.serviceType === "gutters") {
         let roofJob = getJobBySvc("roofing");
         roofJob = shiftInReschedule(roofJob, editDate, finalDur);
         if (roofJob) jobsToUpdate.push(roofJob);
      }

      setJobs(newJobs);

      // Persist the edited job because finalDur might have changed via SQ computation
      await persistDateChange(newJobs.find(j => j.id === editJob.id)!, editDate, finalDur, selectedCrewId);
      
      // Update cascades to db
      for (const j of jobsToUpdate) {
          await persistDateChange(j, j.startDate, j.durationDays);
      }

      setJobs(newJobs);
      setEditJob(null);
      fetchSchedule(); // Refresh to catch actual DB updates and generated paint jobs
      
    } catch (err) {
      console.error("Failed to persist reschedule:", err);
    } finally {
      setConfirmingSchedule(false);
    }
  };

  // ── Filter ───────────────────────────────────
  const visibleCats = filterSvc === "ALL"
    ? SERVICE_CATEGORIES
    : SERVICE_CATEGORIES.filter(c => c.id === filterSvc);

  const normString = (s?: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
  const partnerJobs = (name: string) => jobs.filter(j => normString(j.partnerName) === normString(name));
  const salesJobs   = (name: string) => jobs.filter(j => normString(j.salesperson) === normString(name));

  // ── Gantt card position ──
  const cardStyle = (job: ScheduledJob): { left: string; width: string } | null => {
    const idx = dayIndex(job, weekBase);
    const dur = job.durationDays;
    const end = idx + dur;
    if (end <= 0 || idx >= 7) return null;
    if (idx === 6) return null;
    const clampedStart = Math.max(idx, 0);
    const clampedEnd   = Math.min(end, 6);
    const w = clampedEnd - clampedStart;
    if (w <= 0) return null;
    return {
      left:  `calc(${(clampedStart / 7) * 100}% + 3px)`,
      width: `calc(${(w           / 7) * 100}% - 6px)`,
    };
  };

  // ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full absolute inset-0">
      <TopBar
        rightSlot={
          undoStack.length > 0 ? (
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#242624] border border-[#474846]/30 text-[#faf9f5] text-xs font-bold hover:bg-[#1e201e] hover:border-[#aeee2a]/30 transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-[#aeee2a]" translate="no">undo</span>
              <span>Undo</span>
              <span className="text-[10px] text-[#ababa8] font-bold">({undoStack.length})</span>
            </button>
          ) : undefined
        }
      />

      {/* Undo Toast */}
      {showUndoToast && undoStack.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#1a1c1a] border border-[#aeee2a]/20 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <span className="material-symbols-outlined text-[#aeee2a] text-[18px]" translate="no">undo</span>
          <span className="text-sm font-bold text-[#faf9f5]">{undoStack[undoStack.length - 1].label}</span>
          <button
            onClick={handleUndo}
            className="ml-2 px-3 py-1 rounded-lg text-xs font-black text-[#3a5400] bg-[#aeee2a] hover:brightness-110 transition-all active:scale-95 cursor-pointer"
          >
            Undo
          </button>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1c1a] border border-[#474846]/50 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 pt-5 pb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20">
                <span className="material-symbols-outlined text-[#ef4444] text-[22px]" translate="no">block</span>
              </div>
              <h3 className="text-[#faf9f5] font-extrabold text-base tracking-tight" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>Action Not Allowed</h3>
            </div>
            <div className="px-6 pb-5">
              <p className="text-[#ababa8] text-sm leading-relaxed whitespace-pre-line">{alertMessage}</p>
            </div>
            <div className="flex justify-end px-6 pb-5">
              <button
                onClick={() => setAlertMessage(null)}
                className="px-6 py-2.5 rounded-xl text-sm font-black bg-[#aeee2a] text-[#1a1c1a] hover:brightness-110 transition-all active:scale-95 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col p-6 flex-1 min-h-0">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <h1
              className="tracking-tighter text-3xl font-extrabold text-[#faf9f5]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Job Schedule
            </h1>
            <p className="text-[#ababa8] text-sm mt-1">
              {fmtDate(weekDates[0])} → {fmtDate(weekDates[5])}
              <span className="ml-3 text-[#60b8f5] font-bold text-xs">
                Drag cards to reschedule
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-[#121412] rounded-xl p-1 border border-[#474846]/20">
              <button onClick={prevWeek} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#ababa8] hover:text-[#faf9f5] hover:bg-[#1e201e] transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[18px]" translate="no">chevron_left</span>
              </button>
              <button onClick={goToday} className="px-4 py-1.5 text-sm font-bold text-[#faf9f5] hover:text-[#aeee2a] transition-colors cursor-pointer">
                Today
              </button>
              <button onClick={nextWeek} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#ababa8] hover:text-[#faf9f5] hover:bg-[#1e201e] transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-[18px]" translate="no">chevron_right</span>
              </button>
            </div>

            <input
              type="month"
              value={`${weekBase.getFullYear()}-${String(weekBase.getMonth() + 1).padStart(2, "0")}`}
              onClick={(e) => {
                try {
                  if ("showPicker" in HTMLInputElement.prototype) {
                    e.currentTarget.showPicker();
                  }
                } catch (err) {}
              }}
              onChange={(e) => {
                if (!e.target.value) return;
                const [y, m] = e.target.value.split("-").map(Number);
                // Navigate to the first Monday ON or AFTER the 1st of the selected month
                const firstDay = new Date(y, m - 1, 1);
                const dow = firstDay.getDay(); // 0=Sun, 1=Mon, ...
                if (dow === 1) {
                  // Already Monday
                  setWeekBase(firstDay);
                } else if (dow === 0) {
                  // Sunday → next Monday is the 2nd
                  setWeekBase(new Date(y, m - 1, 2));
                } else {
                  // Tue-Sat → advance to next Monday
                  setWeekBase(new Date(y, m - 1, 1 + (8 - dow)));
                }
              }}
              className="bg-[#121412] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors cursor-pointer [color-scheme:dark] relative"
              style={{ height: "42px" }}
            />

            <div className="relative">
              <CustomDropdown
                value={filterSvc}
                onChange={(val) => setFilterSvc(val as ServiceId | "ALL")}
                options={[
                  { value: "ALL", label: "All Services" },
                  ...SERVICE_CATEGORIES.map(s => ({ value: s.id, label: s.label }))
                ]}
                className="bg-[#121412] text-[#faf9f5] text-sm font-bold rounded-xl px-4 border border-[#474846]/20 outline-none hover:border-[#aeee2a]/50 flex items-center justify-between"
                style={{ height: "42px", minWidth: "160px" }}
              />
            </div>
          </div>
        </div>

        {/* ── Gantt Grid ── */}
        <div className="rounded-2xl overflow-hidden overflow-x-auto flex flex-col flex-1" style={{ background: "#121412", border: "1px solid rgba(71,72,70,0.2)" }}>
          <div className="min-w-[800px] flex flex-col flex-1 min-h-0">
            {/* Day headers — STICKY (6.2) */}
            <div className="grid sticky top-0 z-20" style={{ gridTemplateColumns: "200px repeat(7, 1fr)", background: "#1e201e", borderBottom: "1px solid rgba(71,72,70,0.2)" }}>
              <div className="px-5 py-4 text-[#ababa8] text-[10px] font-bold uppercase tracking-widest border-r border-white/5">
              Partner / Service
            </div>
            {DAY_LABELS.map((label, i) => {
              const date    = weekDates[i];
              const isToday = i === todayIndex;
              const isSun   = i === 6;
              return (
                <div
                  key={label}
                  className={`py-4 text-center flex flex-col border-r border-white/5 last:border-r-0 transition-colors ${dragOverDay === i ? "bg-[#aeee2a]/10" : ""}`}
                  style={{ opacity: isSun ? 0.35 : 1 }}
                  onDragOver={e => handleDayDragOver(e, i)}
                  onDrop={e => handleDayDrop(e, i)}
                >
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
                  const pJobs = partnerJobs(name).sort((a, b) => b.durationDays - a.durationDays);

                  // Compute max overlap to scale row height
                  const visiblePJobs = pJobs.filter(j => cardStyle(j) !== null);
                  let maxOverlap = 1;
                  for (const job of visiblePJobs) {
                    const jStart = dayIndex(job, weekBase);
                    const jEnd = jStart + job.durationDays;
                    const count = visiblePJobs.filter(o => {
                      const oS = dayIndex(o, weekBase);
                      const oE = oS + o.durationDays;
                      return oS < jEnd && oE > jStart;
                    }).length;
                    if (count > maxOverlap) maxOverlap = count;
                  }
                  const rowHeight = Math.max(80, maxOverlap * 60);

                  return (
                    <div
                      key={name}
                      className="grid border-b border-white/[0.04] hover:bg-[#141614]/40 transition-colors"
                      style={{ gridTemplateColumns: "200px 1fr", minHeight: `${rowHeight}px` }}
                    >
                      {/* Partner info */}
                      <div 
                        className="px-5 py-4 border-r border-white/5 flex flex-col justify-center gap-1" 
                        style={{ borderLeft: `2px solid ${cat.color}40` }}
                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                        onDrop={e => {
                          if (dragJob) {
                            const originalDayIdx = dayIndex(dragJob, weekBase);
                            handleDayDrop(e, originalDayIdx, name);
                          }
                        }}
                      >
                        <span className="text-sm font-extrabold text-[#faf9f5] tracking-wide" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                          {name}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: `${cat.color}99` }}>{cat.label}</span>
                        <span className="text-[9px] text-[#474846] font-bold">{pJobs.length} job{pJobs.length !== 1 ? "s" : ""}</span>
                      </div>

                      {/* Gantt area with drop zones */}
                      <div className="relative" style={{ minHeight: "80px" }}>
                        {/* Column lines + drop zones */}
                        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
                          {Array.from({ length: 7 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-full transition-colors ${i < 6 ? "border-r border-white/[0.04]" : ""}`}
                              style={
                                dragOverDay === i && i < 6
                                  ? { background: "rgba(174,238,42,0.08)", borderLeft: "2px dashed rgba(174,238,42,0.3)" }
                                  : i === 6
                                  ? { background: "rgba(10,10,10,0.5)", borderLeft: "1px dashed rgba(71,72,70,0.25)" }
                                  : i === todayIndex
                                  ? { background: "rgba(174,238,42,0.03)" }
                                  : {}
                              }
                              onDragOver={e => handleDayDragOver(e, i)}
                              onDrop={e => handleDayDrop(e, i, name)}
                            />
                          ))}
                        </div>

                        {/* Job cards — DRAGGABLE (6.5) */}
                        {(() => {
                          // Pre-compute overlap slots so stacked cards split 50/50
                          const visibleJobs = pJobs.filter(j => cardStyle(j) !== null);
                          const getOverlapSlot = (job: ScheduledJob) => {
                            const jStart = dayIndex(job, weekBase);
                            const jEnd = jStart + job.durationDays;
                            const overlapping = visibleJobs.filter(other => {
                              const oStart = dayIndex(other, weekBase);
                              const oEnd = oStart + other.durationDays;
                              return oStart < jEnd && oEnd > jStart;
                            });
                            const slotIdx = overlapping.findIndex(o => o.id === job.id);
                            return { slotIdx: Math.max(slotIdx, 0), total: overlapping.length };
                          };

                          return visibleJobs.map(job => {
                            const pos = cardStyle(job)!;
                            const visualStatus = getVisualStatus(job);
                            const sc = STATUS_CONFIG[visualStatus] || STATUS_CONFIG.scheduled;
                            const { slotIdx, total } = getOverlapSlot(job);

                            // Vertical positioning: split row height equally among overlapping cards
                            const gap = 4; // px gap between cards
                            const topPx = total <= 1
                              ? "8px"
                              : `calc(${(slotIdx / total) * 100}% + ${gap / 2}px)`;
                            const bottomPx = total <= 1
                              ? "8px"
                              : `calc(${((total - slotIdx - 1) / total) * 100}% + ${gap / 2}px)`;

                            return (
                              <button
                                key={job.id}
                                draggable={true}
                                onDragStart={e => handleDragStart(e, job)}
                                onDragEnd={handleDragEnd}
                                onClick={() => openReschedule(job)}
                                title="Drag to reschedule or click to edit"
                                className={`absolute flex flex-col justify-between z-10 rounded-xl cursor-grab active:cursor-grabbing hover:brightness-110 transition-all text-left group/card px-3 py-1.5 ${dragJob && dragJob.id !== job.id ? 'pointer-events-none' : ''}`}
                                style={{
                                  left: pos.left,
                                  width: pos.width,
                                  top: topPx,
                                  bottom: bottomPx,
                                  background: sc.bg.replace("0.12", "0.2"),
                                  border: `1px solid ${sc.color}40`,
                                  backdropFilter: "blur(16px)",
                                }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-bold truncate" style={{ color: sc.color }}>
                                  {job.clientName}
                                </span>
                                {job.salesperson && (
                                  (() => {
                                    const initial = getInitials(job.salesperson);
                                    const sColor = getSalesColors(initial);
                                    return (
                                      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 border" style={{ backgroundColor: sColor.bg, borderColor: sColor.border }}>
                                        <span className="text-[9px] font-black" style={{ color: sColor.color }}>
                                          {initial}
                                        </span>
                                      </div>
                                    );
                                  })()
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-1 w-full mt-0.5">
                                <span className="text-[9px] truncate" style={{ color: `${sc.color}90` }}>
                                  <span className="font-semibold uppercase tracking-wider text-[8px]" style={{ color: sc.color }}>{job.serviceNames?.[0] || job.serviceType.replace("_", " ")}</span>
                                  {job.city && <span className="opacity-80"> • {job.city}</span>}
                                </span>
                                {job.sq != null && (
                                  <span className="px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-sm border shrink-0 bg-black/20 text-white border-white/20">
                                    {job.sq} SQ
                                  </span>
                                )}
                              </div>
                              <span className="text-[8px] opacity-0 group-hover/card:opacity-100 transition-all font-bold" style={{ color: `${sc.color}90` }}>
                                drag or click to reschedule
                              </span>
                            </button>
                            );
                          });
                        })()}

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
        </div>

        {/* ── Legend ── */}
        <div className="mt-5 flex items-center flex-wrap gap-6 px-1">
          {[
            { color: "#f5a623", label: "Pending" },
            { color: "#60b8f5", label: "Confirmed" },
            { color: "#aeee2a", label: "In Progress" },
            { color: "#22c55e", label: "Done" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">{l.label}</span>
            </div>
          ))}
          <div className="ml-auto text-[#ababa8] text-xs">
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
          <div className="w-full max-w-2xl rounded-2xl relative flex flex-col max-h-[90vh]" style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.15)" }}>
            
            {/* Fixed Header */}
            <div className="px-8 pt-8 pb-4 shrink-0">
              <button onClick={() => setEditJob(null)} className="absolute top-5 right-5 text-[#ababa8] hover:text-[#faf9f5] transition-colors cursor-pointer z-10">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#aeee2a] text-[18px]" translate="no">event</span>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                    Reschedule Job
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
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
                        {editJob.jobStartStatus === "active" ? "CONFIRMED" : editJob.jobStartStatus === "draft" ? "PENDING" : "PENDING"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-8 pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#242624 transparent" }}>
              <div className="space-y-4">
              
                <div className="grid grid-cols-2 gap-4">
                  {/* Date picker */}
                  <div className="col-span-2">
                    <CustomDatePicker
                      label="Start Date"
                      value={editDate}
                      onChange={val => setEditDate(val)}
                      disableSundays={true}
                      placeholder="Pick a date"
                    />
                    {editDate && (
                      <p className="text-[10px] text-[#ababa8] mt-1.5 ml-1">
                        {(() => { const _d = fromIso(editDate); return `${(_d.getMonth() + 1).toString().padStart(2, '0')}/${_d.getDate().toString().padStart(2, '0')}/${_d.getFullYear()}`; })()}
                      </p>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">
                      Status
                    </label>
                    <div className="relative z-[60]">
                      <CustomDropdown
                        value={editStatus}
                        onChange={(val) => setEditStatus(val as "active" | "draft" | "on_hold")}
                        options={[
                          { value: "active", label: "Confirmed" },
                          { value: "draft", label: "Pending" },
                          { value: "on_hold", label: "Pending" }
                        ]}
                        className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold hover:border-[#aeee2a] transition-colors flex justify-between items-center"
                      />
                    </div>
                  </div>

                  {/* SQ Input — visible for siding & paint (both use SQ for duration calc) */}
                  {(editJob?.serviceType === "siding" || editJob?.serviceType === "paint") && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">
                        SQ (Square Footage)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 50"
                        value={editSq}
                        onChange={e => setEditSq(e.target.value)}
                        className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors"
                      />
                    </div>
                  )}

                  {/* Duration */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">
                      Duration (days)
                    </label>
                    <div className="relative z-50">
                      <CustomDropdown
                        value={editDur.toString()}
                        onChange={(val) => setEditDur(Number(val))}
                        options={[1, 2, 3, 4, 5, 6].map(d => ({ value: d.toString(), label: `${d} day${d > 1 ? "s" : ""}` }))}
                        className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold hover:border-[#aeee2a] transition-colors flex justify-between items-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Cascade preview */}
                {editDate && editDate !== editJob.startDate && (() => {
                  const affected = getAffected(editJob, editDate);
                  return affected.length > 0 ? (
                    <div className="p-3 bg-[#60b8f5]/10 rounded-xl border border-[#60b8f5]/20 flex gap-3">
                      <span className="material-symbols-outlined text-[#60b8f5] text-[16px] mt-0.5" translate="no">info</span>
                      <div>
                        <p className="text-xs text-[#60b8f5] font-bold">This will shift {affected.length} other job{affected.length > 1 ? "s" : ""}:</p>
                        <ul className="mt-1 text-[10px] text-[#faf9f5] font-bold">
                          {affected.slice(0, 2).map(a => <li key={a.id} className="truncate">• {a.clientName} (new: {fmtDate(fromIso(a.startDate))})</li>)}
                          {affected.length > 2 && <li className="text-[#ababa8] mt-0.5">...and {affected.length - 2} more</li>}
                        </ul>
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="w-full h-px bg-white/10 my-4" />

                {/* Per-Service Crew Selectors */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-sm text-[#aeee2a]" translate="no">
                    {editJob?.status === "in_progress" ? "swap_horiz" : "event_available"}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#aeee2a]">
                    Change Partner / Team
                  </span>
                </div>
                
                {serviceCrewOptions.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[#121412] border border-white/5">
                    <div className="w-3 h-3 border-2 border-[#aeee2a]/30 border-t-[#aeee2a] rounded-full animate-spin" />
                    <span className="text-[11px] text-[#474846] font-bold">Loading available crews...</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {serviceCrewOptions.map((svcOpt) => {
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
                          <div className="relative z-40">
                            <CustomDropdown
                              value={selectedCrewIds[svcOpt.jobServiceId] || ""}
                              onChange={(val) => setSelectedCrewIds(prev => ({
                                ...prev,
                                [svcOpt.jobServiceId]: val,
                              }))}
                              options={svcOpt.crews.map(c => {
                                const partnerTeams = grouped[c.partnerName];
                                return {
                                  value: c.id,
                                  label: partnerTeams.length === 1 ? c.partnerName : `${c.partnerName} — ${c.name}`
                                };
                              })}
                              placeholder="Select partner / team..."
                              className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold hover:border-[#aeee2a] transition-colors flex justify-between items-center"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-2 bg-[#121412] rounded-xl border border-white/5 overflow-hidden mt-4">
                  <div className="p-4 border-r border-b border-white/5">
                    <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest block mb-1">Salesperson</span>
                    <div className="text-sm font-bold text-[#faf9f5] flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#aeee2a]" translate="no">person</span>
                      {editJob.salesperson || "Not assigned"}
                    </div>
                  </div>

                  <div className="p-4 border-b border-white/5">
                    <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest block mb-1">Contract Value</span>
                    <div className="text-sm font-bold text-[#faf9f5] flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#aeee2a]" translate="no">payments</span>
                      {editJob.contract_amount ? `$${editJob.contract_amount.toLocaleString()}` : "Not set"}
                    </div>
                  </div>

                  <div className="p-4 border-r border-white/5">
                    <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest block mb-1">Contact</span>
                    <div className="text-xs font-semibold text-[#faf9f5] flex flex-col gap-1">
                      <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px] opacity-70" translate="no">call</span> {editJob.phone || "---"}</span>
                      <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[12px] opacity-70" translate="no">mail</span> {editJob.email || "---"}</span>
                    </div>
                  </div>

                  <div className="p-4 border-white/5 flex flex-col justify-start">
                    <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest block mb-1">Project Address</span>
                    <div className="text-[11px] font-semibold text-[#faf9f5] flex flex-col gap-0.5 mt-1">
                      <span className="text-xs">{editJob.street || "---"}</span>
                      <span className="text-[#ababa8]">{editJob.city || "---"}, {editJob.state || "---"} {editJob.zip || "---"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-8 pt-4 pb-6 shrink-0 border-t border-white/5">
              <div className="flex justify-between items-center">
                {/* Delete button — left side */}
                <button
                  type="button"
                  disabled={deleteStep === "deleting"}
                  onClick={async () => {
                    if (deleteStep === "idle") {
                      setDeleteStep("confirming");
                      return;
                    }
                    if (deleteStep === "confirming") {
                      setDeleteStep("deleting");
                      try {
                        if (editJob!.source === "service_assignments") {
                          const { error } = await supabase.from("service_assignments").delete().eq("id", editJob!.id);
                          if (error) { console.error("Delete error:", error); setDeleteStep("idle"); return; }
                        } else {
                          const { error } = await supabase.from("jobs").delete().eq("id", editJob!.id);
                          if (error) { console.error("Delete error:", error); setDeleteStep("idle"); return; }
                        }
                        setJobs(prev => prev.filter(j => j.id !== editJob!.id));
                        setEditJob(null);
                        setDeleteStep("idle");
                        fetchSchedule();
                      } catch (err) {
                        console.error("Delete failed:", err);
                        setDeleteStep("idle");
                      }
                    }
                  }}
                  onBlur={() => { if (deleteStep === "confirming") setDeleteStep("idle"); }}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer border ${
                    deleteStep === "confirming"
                      ? "bg-[#ef4444] text-white border-[#ef4444] shadow-[0_0_16px_rgba(239,68,68,0.3)]"
                      : deleteStep === "deleting"
                      ? "bg-[#ef4444]/50 text-white/60 border-[#ef4444]/30"
                      : "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20 hover:bg-[#ef4444]/20 hover:border-[#ef4444]/40"
                  }`}
                >
                  {deleteStep === "deleting" ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-sm" translate="no">delete</span>
                  )}
                  {deleteStep === "confirming" ? "Confirm Delete?" : deleteStep === "deleting" ? "Deleting..." : "Delete"}
                </button>

                {/* Cancel + Save — right side */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setEditJob(null); setDeleteStep("idle"); }}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#ababa8] hover:text-[#faf9f5] transition-colors bg-[#121412] border border-[#474846]/20 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!editDate || isSundayIso(editDate) || confirmingSchedule}
                    onClick={confirmReschedule}
                    className="px-6 py-2.5 rounded-xl text-sm font-black bg-[#aeee2a] text-[#3a5400] flex items-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(174,238,42,0.2)] disabled:opacity-50 cursor-pointer"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    {confirmingSchedule ? (
                      <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm" translate="no">check_circle</span>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
