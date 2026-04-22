"use client";

import { useState, useEffect } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { CustomDropdown } from "../../../components/CustomDropdown";
import { supabase } from "../../../lib/supabase";
import { useUndo } from "../../../components/UndoContext";
import { SCHEDULING_PAUSED } from "../../../lib/scheduling-flag";

// =============================================
// Crews & Partners Directory
// Rota: /crews
// Conectado ao Supabase — sem dados fake
// =============================================

// ─── Tipos DB ─────────────────────────────────────────────────────
interface DBCrew {
  id: string;
  name: string;
  discipline: string;
  size: number;
  status: string;           // "active" | "inactive" | "booked"
  specialty: string | null;
  contact_phone: string | null;
  jobs: { id: string; job_number: string; status: string; customer: { full_name: string } | null; city: string | null }[];
}

// ─── Tipos UI ──────────────────────────────────────────────────────
type CrewStatus = "Available" | "Opening Soon" | "Booked Out";

interface AssignedJob {
  id: string;
  job_number: string;
  client: string;
  city: string;
  status: "Active" | "Scheduled";
}

interface CrewUI {
  id: string;
  name: string;
  size: number;
  status: CrewStatus;
  discipline: string;
  skills: string[];
  overallLoad: number;
  weekCapacity: { dayLabel: string; percentage: number; state: "free" | "partial" | "booked" }[];
  assignedJobs: AssignedJob[];
  contact_phone: string | null;
  inactivationReason?: string;
  inactivatedAt?: string;
}

interface ServiceCategory {
  id: string;
  label: string;
  icon: string;
  accentColor: string;
  crews: CrewUI[];
  inactiveCrews: CrewUI[];
}

// ─── Discipline Config ───────────────────────────────────────────
const DISCIPLINE_CONFIG: Record<string, { label: string; icon: string; accentColor: string }> = {
  siding:              { label: "Siding",                  icon: "home_work",     accentColor: "#aeee2a" },
  doors_windows_decks: { label: "Doors / Windows / Decks", icon: "sensor_door",   accentColor: "#f5a623" },
  painting:            { label: "Paint",                   icon: "format_paint",  accentColor: "#60b8f5" },
  gutters:             { label: "Gutters",                 icon: "water_drop",    accentColor: "#c084fc" },
  roofing:             { label: "Roofing",                 icon: "roofing",       accentColor: "#ef4444" },
};

// ─── Map DB status → UI status ────────────────────────────────────
function mapStatus(dbStatus: string, jobCount: number): CrewStatus {
  if (dbStatus === "booked" || jobCount > 0) return "Booked Out";
  if (dbStatus === "inactive") return "Opening Soon";
  return "Available";
}

// ─── Fake weekly capacity (derived from job count) ─────────────────
const mkWeek = (loads: number[]) => {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return loads.map((p, i) => ({
    dayLabel: days[i],
    percentage: p,
    state: (p >= 90 ? "booked" : p >= 50 ? "partial" : "free") as "free" | "partial" | "booked",
  }));
};

function derivedWeek(jobs: number): ReturnType<typeof mkWeek> {
  if (jobs === 0) return mkWeek([10, 10, 10, 10, 10, 0, 0]);
  if (jobs === 1) return mkWeek([100, 80, 100, 60, 80, 0, 0]);
  return mkWeek([100, 100, 100, 100, 100, 80, 0]);
}

// ─── Visual helpers ───────────────────────────────────────────────
const getStatusDot = (s: CrewStatus) =>
  s === "Available" ? "bg-[#aeee2a]" : s === "Booked Out" ? "bg-[#ff7351]" : "bg-[#eedc47]";
const getLoadLabel = (l: number) =>
  l >= 90 ? "text-[#ff7351]" : l >= 60 ? "text-[#aeee2a]" : "text-[#eedc47]";
const getBarColor = (s: "free" | "partial" | "booked") =>
  s === "booked" ? "bg-[#ff7351]" : s === "partial" ? "bg-[#eedc47]" : "bg-[#aeee2a]";

// ─── Crew Card ───────────────────────────────────────────────────
function CrewCard({
  crew,
  accentColor,
  onViewDetails,
  onAssignJob,
}: {
  crew: CrewUI;
  accentColor: string;
  onViewDetails: (c: CrewUI) => void;
  onAssignJob: (c: CrewUI) => void;
}) {
  return (
    <div className="bg-[#121412] rounded-2xl p-6 border border-[#242624] flex flex-col hover:border-[#474846]/60 transition-colors duration-300 min-h-[400px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <h3 className="text-2xl font-black text-[#faf9f5] tracking-wide leading-tight" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
            {crew.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(crew.status)}`} />
            <span className="text-[10px] font-black text-[#ababa8] uppercase tracking-widest">{crew.status}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {crew.contact_phone && (
            <span className="text-[10px] text-[#ababa8] font-mono">{crew.contact_phone}</span>
          )}
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {crew.skills.map((s, i) => (
          <span key={i} className="px-2.5 py-1 bg-[#242624] text-[#ababa8] text-[9px] font-black uppercase tracking-wide rounded-full">
            {s}
          </span>
        ))}
        {crew.skills.length === 0 && (
          <span className="px-2.5 py-1 bg-[#1e201e] text-[#474846] text-[9px] font-black uppercase tracking-wide rounded-full">
            No skills listed
          </span>
        )}
      </div>

      {/* Current Jobs */}
      {crew.assignedJobs.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {crew.assignedJobs.slice(0, 2).map((j) => (
            <div key={j.id} className="flex items-center gap-2 bg-[#1a1c1a] rounded-lg px-3 py-2 border border-[#242624]">
              <span className="text-[10px] font-black text-[#aeee2a]">{j.job_number}</span>
              <span className="text-[10px] text-[#faf9f5] font-medium truncate flex-1">{j.client}</span>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${j.status === "Active" ? "bg-[#aeee2a]/15 text-[#aeee2a]" : "bg-[#e3eb5d]/15 text-[#e3eb5d]"}`}>
                {j.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="mt-auto">
        {/* CTAs */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => onViewDetails(crew)}
            className="flex-1 py-2.5 border border-[#474846]/40 rounded-xl text-[10px] font-black text-[#faf9f5] hover:bg-[#181a18] transition-colors uppercase tracking-widest"
          >
            View Details
          </button>
          <button
            onClick={() => onAssignJob(crew)}
            className="flex-1 py-2.5 rounded-xl text-[10px] font-black text-[#121412] uppercase tracking-widest hover:brightness-110 transition-all active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            Assign Job
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-[#242624] flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-[#ababa8]" translate="no">group</span>
          <span className="text-[10px] font-bold text-[#ababa8]">{crew.size} Members</span>
        </div>
        <span className="text-[10px] font-bold text-[#ababa8] uppercase">{crew.discipline}</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function CrewsPage() {
  const { setUndo } = useUndo();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [inactiveModalCat, setInactiveModalCat] = useState<ServiceCategory | null>(null);
  const [detailInactiveCrew, setDetailInactiveCrew] = useState<CrewUI | null>(null);
  const [actionCrew, setActionCrew] = useState<{ crew: CrewUI; act: 'activate' | 'delete' } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Available jobs for "Assign Job" modal
  const [openJobs, setOpenJobs] = useState<{ id: string; job_number: string; customer_name: string; city: string }[]>([]);

  // Modals
  const [detailCrew, setDetailCrew] = useState<CrewUI | null>(null);
  const [assignCrew, setAssignCrew] = useState<CrewUI | null>(null);
  const [assignJobId, setAssignJobId] = useState("");
  const [assignStart, setAssignStart] = useState("");
  const [assignEnd, setAssignEnd] = useState("");
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [addModalCat, setAddModalCat] = useState<string | null>(null);

  // Inactivate crew
  const [inactiveMode,      setInactiveMode]      = useState(false);
  const [inactivationReason, setInactivationReason] = useState("");
  const [inactivating,      setInactivating]      = useState(false);

  // New crew form
  const [newCrewName, setNewCrewName] = useState("");
  const [newCrewSize, setNewCrewSize] = useState("3");
  const [newCrewPhone, setNewCrewPhone] = useState("");
  const [newCrewSpecialty, setNewCrewSpecialty] = useState("");
  const [savingCrew, setSavingCrew] = useState(false);

  // Drag and Drop
  const [draggedCrew, setDraggedCrew] = useState<CrewUI | null>(null);
  const [dragOverCrew, setDragOverCrew] = useState<CrewUI | null>(null);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  function handleDragStart(e: React.DragEvent, crew: CrewUI) {
    setDraggedCrew(crew);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, crew: CrewUI) {
    e.preventDefault(); // Necessário para permitir o drop
    if (!draggedCrew || draggedCrew.id === crew.id) return;
    if (draggedCrew.discipline !== crew.discipline) return; 
    setDragOverCrew(crew);
  }

  function handleDragLeave(e: React.DragEvent, crew: CrewUI) {
    if (dragOverCrew?.id === crew.id) {
      setDragOverCrew(null);
    }
  }

  function handleDragEnd() {
    setDraggedCrew(null);
    setDragOverCrew(null);
  }

  async function handleDrop(e: React.DragEvent, categoryId: string) {
    e.preventDefault();
    if (!draggedCrew || !dragOverCrew || draggedCrew.id === dragOverCrew.id) {
      handleDragEnd();
      return;
    }
    if (draggedCrew.discipline !== categoryId || dragOverCrew.discipline !== categoryId) {
      handleDragEnd();
      return;
    }

    setIsUpdatingOrder(true);
    
    // Calculates new order
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) {
      handleDragEnd();
      setIsUpdatingOrder(false);
      return;
    }

    const oldCrews = [...cat.crews];
    const draggedIdx = oldCrews.findIndex(c => c.id === draggedCrew.id);
    const dropIdx = oldCrews.findIndex(c => c.id === dragOverCrew.id);

    if (draggedIdx === -1 || dropIdx === -1) {
      handleDragEnd();
      setIsUpdatingOrder(false);
      return;
    }

    // Optimistic UI Update
    const [removed] = oldCrews.splice(draggedIdx, 1);
    oldCrews.splice(dropIdx, 0, removed);

    setCategories(prev => prev.map(c => 
      c.id === categoryId ? { ...c, crews: oldCrews } : c
    ));

    handleDragEnd();

    // Persist to DB
    try {
      const updates = oldCrews.map((c, idx) => 
        supabase.from("crews").update({ sort_order: idx + 1 }).eq("id", c.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error("[CrewsPage] Sort order update error:", err);
      fetchCrews(); // Revert on failure
    } finally {
      setIsUpdatingOrder(false);
    }
  }

  useEffect(() => {
    fetchCrews();
    fetchOpenJobs();
  }, []);

  async function handleInactivateCrew() {
    if (!detailCrew || !inactivationReason.trim()) return;
    setInactivating(true);
    try {
      const { error } = await supabase
        .from("crews")
        .update({
          active:              false,
          inactivation_reason: inactivationReason.trim(),
          inactivated_at:      new Date().toISOString(),
        })
        .eq("id", detailCrew.id);
      if (error) throw error;

      // Remove from UI
      setCategories(prev =>
        prev.map(cat => ({
          ...cat,
          crews: cat.crews.filter(c => c.id !== detailCrew.id),
        }))
      );
      
      const capturedCrew = detailCrew;

      setUndo(`Parceiro ${capturedCrew.name} removido`, async () => {
        const { error: undoErr } = await supabase
          .from("crews")
          .update({
            active: true,
            inactivation_reason: null,
            inactivated_at: null,
          })
          .eq("id", capturedCrew.id);

        if (!undoErr) {
          fetchCrews();
        }
      });

      setDetailCrew(null);
      setInactiveMode(false);
      setInactivationReason("");
    } catch (err) {
      console.error("[CrewsPage] inactivate error:", err);
    } finally {
      setInactivating(false);
    }
  }

  async function handleCrewActionConfirm() {
    if (!actionCrew) return;
    setIsProcessingAction(true);
    try {
      if (actionCrew.act === 'activate') {
        const { error } = await supabase.from('crews').update({ active: true, inactivation_reason: null, inactivated_at: null }).eq('id', actionCrew.crew.id);
        if (error) throw error;
        setUndo(`Parceiro ${actionCrew.crew.name} ativado`, async () => {
          await supabase.from('crews').update({ active: false, inactivation_reason: 'Undo re-activation' }).eq('id', actionCrew.crew.id);
          fetchCrews();
        });
      } else {
        const { data: originalData } = await supabase.from("crews").select("*").eq("id", actionCrew.crew.id).single();
        const { error } = await supabase.from('crews').delete().eq('id', actionCrew.crew.id);
        if (error) throw error;
        if (originalData) {
           setUndo(`Parceiro ${originalData.name} removido`, async () => {
              await supabase.from("crews").insert(originalData);
              fetchCrews();
           });
        }
      }
      fetchCrews();
      fetchCrews();
      setActionCrew(null);
      setDetailInactiveCrew(null);
      // setInactiveModalCat(null); // Keep the main modal open unless it was deleting the last one? No, closing is fine or we keep it. We'll close just the detail modal if it's reactivate, actually it's easier to close both context
      setInactiveModalCat(null);
    } catch (err) {
      console.error("[CrewsPage] action error:", err);
    } finally {
      setIsProcessingAction(false);
    }
  }

  async function fetchCrews() {
    setLoading(true);
    try {
      // Fetch crews with their specialties (actual schema)
      const { data, error } = await supabase
        .from("crews")
        .select(`
          id, name, code, phone, active, inactivation_reason, inactivated_at,
          crew_specialties (
            specialty:specialties (name, code)
          )
        `)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");

      if (error) throw error;

      // Fetch service_assignments to find active jobs for each crew
      const { data: assignData } = await supabase
        .from("service_assignments")
        .select(`
          crew_id,
          status,
          job_service:job_services (
            job:jobs (
              id, job_number, status, city,
              customer:customers (full_name)
            )
          )
        `);

      // Build a map of crew_id → jobs
      const crewJobMap = new Map<string, any[]>();
      for (const a of (assignData ?? []) as any[]) {
        const cid = a.crew_id;
        const job = a.job_service?.job;
        if (!cid || !job) continue;
        if (!crewJobMap.has(cid)) crewJobMap.set(cid, []);
        // Avoid duplicate jobs
        if (!crewJobMap.get(cid)!.find((j: any) => j.id === job.id)) {
          crewJobMap.get(cid)!.push(job);
        }
      }

      // Group by discipline
      const grouped: Record<string, CrewUI[]> = {};
      const groupedInactive: Record<string, CrewUI[]> = {};
      
      for (const c of (data ?? []) as any[]) {
        const specs = (c.crew_specialties ?? []).map((cs: any) => cs.specialty).filter(Boolean);
        let rawCode = "other";
        
        if (specs.length > 0 && specs[0].code) {
          rawCode = specs[0].code.toLowerCase();
        } else if (c.code) {
          // If the specialty tie failed, check the generated crew code prefix (e.g. "SID-...", "PAI-...")
          rawCode = c.code.toLowerCase();
        }
        
        // Normalize DB specialty code to UI category IDs
        let disc = "other";
        if (rawCode.includes("door") || rawCode.includes("window") || rawCode.includes("doo-") || rawCode.includes("deck")) disc = "doors_windows_decks";
        else if (rawCode.includes("paint") || rawCode.includes("pai-")) disc = "painting";
        else if (rawCode.includes("gutter") || rawCode.includes("gut-")) disc = "gutters";
        else if (rawCode.includes("roof") || rawCode.includes("roo-")) disc = "roofing";
        else if (rawCode.includes("sid")) disc = "siding";
        else disc = rawCode;

        const crewJobs = crewJobMap.get(c.id) ?? [];
        const activeJobs = crewJobs.filter((j: any) => j.status === "active" || j.status === "draft");
        const load = Math.min(100, activeJobs.length * 50);

        const crewUI: CrewUI = {
          id: c.id,
          name: (c.name ?? "").toUpperCase(),
          size: 3, // Default crew size (not stored in DB)
          status: mapStatus(c.active ? "active" : "inactive", activeJobs.length),
          discipline: disc,
          skills: specs.map((s: any) => (s.name ?? "").toUpperCase()),
          overallLoad: load,
          weekCapacity: derivedWeek(activeJobs.length),
          assignedJobs: activeJobs.map((j: any) => ({
            id: j.id,
            job_number: j.job_number,
            client: j.customer?.full_name ?? "—",
            city: j.city ?? "",
            status: j.status === "active" ? "Active" as const : "Scheduled" as const,
          })),
          contact_phone: c.phone,
          inactivationReason: c.inactivation_reason,
          inactivatedAt: c.inactivated_at,
        };

        if (c.active === false) {
          if (!groupedInactive[disc]) groupedInactive[disc] = [];
          groupedInactive[disc].push(crewUI);
        } else {
          if (!grouped[disc]) grouped[disc] = [];
          grouped[disc].push(crewUI);
        }
      }

      // Build categories in canonical order
      const orderedKeys = ["siding", "doors_windows_decks", "painting", "gutters", "roofing"];
      const cats: ServiceCategory[] = orderedKeys
        .map((k) => ({
          id: k,
          ...(DISCIPLINE_CONFIG[k] ?? DISCIPLINE_CONFIG.other),
          crews: grouped[k] ?? [],
          inactiveCrews: groupedInactive[k] ?? [],
        }));


      setCategories(cats);
    } catch (err) {
      console.error("[CrewsPage] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOpenJobs() {
    const { data } = await supabase
      .from("jobs")
      .select("id, job_number, city, customer:customers (full_name)")
      .in("status", ["active", "draft", "on_hold"])
      .order("created_at", { ascending: false })
      .limit(50);

    setOpenJobs(
      (data ?? []).map((j: any) => ({
        id: j.id,
        job_number: j.job_number,
        customer_name: j.customer?.full_name ?? "—",
        city: j.city ?? "",
      }))
    );
  }

  const totalCrews = categories.reduce((acc, c) => acc + c.crews.length, 0);

  // Assign Job
  const openAssignModal = (crew: CrewUI) => {
    setAssignCrew(crew);
    setAssignJobId("");
    setAssignStart("");
    setAssignEnd("");
    setAssignSuccess(false);
  };

  async function handleConfirmAssign() {
    if (!assignJobId || !assignStart || !assignCrew) return;
    setAssigning(true);
    try {
      // 1. Find the job_service row for this job
      const { data: jsData, error: jsErr } = await supabase
        .from("job_services")
        .select("id")
        .eq("job_id", assignJobId)
        .limit(1)
        .single();

      if (jsErr || !jsData) {
        console.error("[CrewsPage] job_service not found:", jsErr);
        return;
      }

      // 2. Look up the crew's primary specialty (required by service_assignments constraint)
      const { data: specData } = await supabase
        .from("crew_specialties")
        .select("specialty_id")
        .eq("crew_id", assignCrew.id)
        .limit(1)
        .single();

      if (!specData?.specialty_id) {
        console.error("[CrewsPage] crew has no specialty registered:", assignCrew.name);
        // Still try without specialty if null (fallback)
      }

      // 3. Insert the assignment with specialty_id
      if (SCHEDULING_PAUSED) {
        alert("Scheduling is currently paused. Assignment was not created.");
        return;
      }
      const { error } = await supabase.from("service_assignments").insert({
        job_service_id:    jsData.id,
        crew_id:           assignCrew.id,
        specialty_id:      specData?.specialty_id ?? null,
        scheduled_start_at: new Date(assignStart + "T08:00:00").toISOString(),
        scheduled_end_at:   assignEnd ? new Date(assignEnd + "T17:00:00").toISOString() : null,
        status:            "scheduled",
      });

      if (error) throw error;
      setAssignSuccess(true);
      fetchCrews();
    } catch (err: any) {
      console.error("[CrewsPage] assign error:", err?.message ?? err);
    } finally {
      setAssigning(false);
    }
  }

  // Add new crew/partner
  async function handleAddCrew() {
    if (!newCrewName.trim() || !addModalCat) return;
    setSavingCrew(true);
    try {
      // Insert into crews with actual columns
      const { data: newCrew, error } = await supabase.from("crews").insert({
        name: newCrewName.trim(),
        code: addModalCat.toUpperCase().slice(0, 3) + "-" + Date.now().toString(36).toUpperCase(),
        phone: newCrewPhone.trim() || null,
        active: true,
      }).select("id").single();
      if (error) throw error;

      // Link specialty if we can find one matching the category
      if (newCrew) {
        // Find all specialties instead of messing with OR combinations to avoid syntax issues.
        const { data: allSpecs } = await supabase.from("specialties").select("id, code, name");
        let specMatch = null;
        
        if (allSpecs && allSpecs.length > 0) {
            let terms = [addModalCat];
            if (addModalCat === "painting") terms = ["paint" , "painting"];
            if (addModalCat === "doors_windows_decks") terms = ["door", "window", "deck", "doors_windows", "doors_windows_decks"];
            if (addModalCat === "gutters") terms = ["gutter", "gutters"];
            if (addModalCat === "roofing") terms = ["roof", "roofing"];
            if (addModalCat === "siding") terms = ["siding", "sid"];

            specMatch = allSpecs.find(s => {
               if (!s.code) return false;
               const cDe = s.code.toLowerCase();
               return terms.some(t => cDe.includes(t));
            });
        }

        // Se conseguiu achar uma especialidade mestre, linka. 
        if (specMatch) {
          const { error: specLinkErr } = await supabase.from("crew_specialties").insert({
            crew_id: newCrew.id,
            specialty_id: specMatch.id,
            proficiency: "journeyman",
          });
          if (specLinkErr) console.warn("Failed linking crew specialty: ", specLinkErr);
        }
      }

      setAddModalCat(null);
      setNewCrewName("");
      setNewCrewSize("3");
      setNewCrewPhone("");
      setNewCrewSpecialty("");
      fetchCrews();
    } catch (err: any) {
      console.error("[CrewsPage] add crew error:", err);
      alert(`Erro crítico ao tentar gravar partner no servidor:\n\n${JSON.stringify(err?.message || err)}`);
    } finally {
      setSavingCrew(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <TopBar />

      <div className="flex-1 overflow-auto p-6 md:p-10 lg:p-14">

        {/* Page Header */}
        <div className="max-w-[1600px] mx-auto w-full mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
            Crews
          </h1>
          <p className="text-[#ababa8] text-sm font-medium">
            {loading ? "Loading..." : `${totalCrews} active partners across ${categories.length} service disciplines`}
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-[#ababa8] gap-4">
            <span className="material-symbols-outlined text-5xl animate-spin" translate="no">progress_activity</span>
            <p className="text-base font-bold">Loading crews from the field...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-[#ababa8] gap-4">
            <div className="w-16 h-16 rounded-full bg-[#1e201e] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-[#aeee2a]" translate="no">groups</span>
            </div>
            <p className="text-lg font-bold text-[#faf9f5]">No crews found in the database</p>
            <p className="text-sm">Add your first partner using the button below.</p>
            <button
              onClick={() => setAddModalCat("siding")}
              className="mt-3 px-6 py-2.5 bg-[#aeee2a] text-[#3a5400] font-bold text-sm rounded-xl hover:bg-[#a0df14] transition-colors cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]" translate="no">group_add</span>
              Add First Crew
            </button>
          </div>
        ) : (
          /* Category Sections */
          <div className="max-w-[1600px] mx-auto w-full space-y-14 pb-24">
            {categories.map((cat) => (
              <section key={cat.id}>
                {/* Category Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1e201e]">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${cat.accentColor}18`, border: `1px solid ${cat.accentColor}30` }}
                    >
                      <span className="material-symbols-outlined text-xl" style={{ color: cat.accentColor }} translate="no">
                        {cat.icon}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-[#faf9f5] uppercase tracking-widest" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                        {cat.label}
                      </h2>
                      <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest mt-0.5">
                        {cat.crews.length} {cat.crews.length === 1 ? "Partner" : "Partners"} Active
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setInactiveModalCat(cat)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors hover:bg-white/5"
                      style={{ color: cat.inactiveCrews.length > 0 ? `#faf9f5` : `#474846`, border: `1px solid ${cat.inactiveCrews.length > 0 ? '#474846' : '#242624'}` }}
                      disabled={cat.inactiveCrews.length === 0}
                    >
                      <span className="material-symbols-outlined text-[16px]">archive</span>
                      Inativos ({cat.inactiveCrews.length})
                    </button>
                    <button
                      onClick={() => setAddModalCat(cat.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors group"
                      style={{ backgroundColor: `${cat.accentColor}12`, border: `1px solid ${cat.accentColor}25`, color: cat.accentColor }}
                    >
                      <span className="material-symbols-outlined text-[16px] group-hover:rotate-90 transition-transform duration-300" translate="no">add</span>
                      Add Partner
                    </button>
                  </div>
                </div>

                {/* Crew Grid */}
                {cat.crews.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center gap-3 py-10 text-[#ababa8]">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${cat.accentColor}10` }}
                    >
                      <span className="material-symbols-outlined text-xl" style={{ color: cat.accentColor }} translate="no">
                        {cat.icon}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#faf9f5]">No crews registered</p>
                    <p className="text-xs text-center">Add your first {cat.label.toLowerCase()} partner.</p>
                    <button
                      onClick={() => setAddModalCat(cat.id)}
                      className="mt-1 px-4 py-2 text-[10px] font-black uppercase rounded-lg cursor-pointer transition-colors"
                      style={{ backgroundColor: `${cat.accentColor}15`, color: cat.accentColor, border: `1px solid ${cat.accentColor}30` }}
                    >
                      + Add {cat.label.split(" ")[0]}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {cat.crews.map((crew) => (
                      <div
                        key={crew.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, crew)}
                        onDragOver={(e) => handleDragOver(e, crew)}
                        onDragLeave={(e) => handleDragLeave(e, crew)}
                        onDrop={(e) => handleDrop(e, cat.id)}
                        onDragEnd={handleDragEnd}
                        className={`transition-all duration-200 cursor-grab active:cursor-grabbing 
                          ${draggedCrew?.id === crew.id ? "opacity-50 scale-95 z-10" : ""}
                          ${dragOverCrew?.id === crew.id ? "ring-2 ring-[#aeee2a] ring-offset-2 ring-offset-[#0a0a0a] rounded-2xl transform scale-[1.02]" : ""}
                        `}
                      >
                        <CrewCard
                          crew={crew}
                          accentColor={cat.accentColor}
                          onViewDetails={setDetailCrew}
                          onAssignJob={openAssignModal}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          VIEW DETAILS MODAL
      ══════════════════════════════════════════════════ */}
      {detailCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setDetailCrew(null)}>
          <div
            className="bg-[#121412] w-full max-w-lg rounded-2xl border border-[#242624] shadow-2xl flex flex-col overflow-hidden"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#242624] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-[#faf9f5]">{detailCrew.name}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(detailCrew.status)}`} />
                  <span className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">{detailCrew.status}</span>
                  {detailCrew.contact_phone && (
                    <span className="text-[10px] text-[#ababa8] ml-2 font-mono">{detailCrew.contact_phone}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setDetailCrew(null)} className="text-[#ababa8] hover:text-[#faf9f5] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {/* Weekly Availability */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-3">Weekly Availability</p>
                <div className="flex items-end gap-1.5 h-12">
                  {detailCrew.weekCapacity.map((day, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1">
                      <div className="w-full bg-[#1e201e] rounded-sm flex items-end h-full">
                        <div
                          className={`w-full rounded-sm ${getBarColor(day.state)}`}
                          style={{ height: `${Math.max((day.percentage / 100) * 100, 8)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-[#474846] font-bold mt-1">{day.dayLabel}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Jobs */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-3">
                  Active Assignments ({detailCrew.assignedJobs.length})
                </p>
                {detailCrew.assignedJobs.length === 0 ? (
                  <div className="rounded-xl bg-[#1e201e] px-4 py-4 text-center text-[11px] text-[#474846] font-bold">
                    No active assignments
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailCrew.assignedJobs.map((job) => (
                      <div key={job.id} className="rounded-xl bg-[#1a1c1a] border border-[#242624] px-4 py-3 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-black text-[#aeee2a]">{job.job_number}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${job.status === "Active" ? "bg-[#aeee2a]/15 text-[#aeee2a]" : "bg-[#e3eb5d]/15 text-[#e3eb5d]"}`}>
                              {job.status}
                            </span>
                          </div>
                          <p className="text-[11px] font-bold text-[#faf9f5]">{job.client}</p>
                          <p className="text-[10px] text-[#474846]">{job.city}</p>
                        </div>
                        <span className="material-symbols-outlined text-[#474846] text-[16px]" translate="no">arrow_forward</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skills / Specialty */}
              {detailCrew.skills.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-3">Specialties</p>
                  <div className="flex flex-wrap gap-2">
                    {detailCrew.skills.map((s, i) => (
                      <span key={i} className="px-3 py-1 bg-[#242624] text-[#ababa8] text-[10px] font-black uppercase tracking-wide rounded-full border border-[#474846]/30">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inactivate Zone */}
              {inactiveMode && (
                <div className="p-4 rounded-xl bg-[#ff7351]/5 border border-[#ff7351]/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#ff7351] text-base" translate="no">warning</span>
                    <span className="text-xs font-black text-[#ff7351] uppercase tracking-widest">Inactivate Partner</span>
                  </div>
                  <p className="text-[11px] text-[#ababa8]">Describe why this partner is being inactivated. This record will be kept for audit purposes.</p>
                  <textarea
                    rows={4}
                    value={inactivationReason}
                    onChange={(e) => setInactivationReason(e.target.value)}
                    placeholder="e.g. Low quality work on Project #0042, client complaints..."
                    className="w-full bg-[#0a0a0a] border border-[#ff7351]/30 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#ff7351] transition-colors resize-none placeholder:text-[#474846]"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setInactiveMode(false); setInactivationReason(""); }}
                      className="px-4 py-2 text-xs font-black uppercase tracking-widest text-[#ababa8] hover:text-[#faf9f5] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleInactivateCrew}
                      disabled={!inactivationReason.trim() || inactivating}
                      className="px-5 py-2 bg-[#ff7351] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#e5623f] transition-all disabled:opacity-40 flex items-center gap-2"
                    >
                      {inactivating && <span className="material-symbols-outlined animate-spin text-sm" translate="no">sync</span>}
                      Confirm Inactivation
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[#242624] bg-[#0a0a0a] flex justify-between items-center">
              {!inactiveMode ? (
                <button
                  onClick={() => setInactiveMode(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#ff7351] hover:bg-[#ff7351]/10 rounded-xl transition-colors"
                >
                  <span className="material-symbols-outlined text-sm" translate="no">person_off</span>
                  Inactivate Partner
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={() => { setDetailCrew(null); setInactiveMode(false); setInactivationReason(""); }}
                className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-[#faf9f5] bg-[#242624] hover:bg-[#2a2c2a] rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ASSIGN JOB MODAL
      ══════════════════════════════════════════════════ */}
      {assignCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setAssignCrew(null)}>
          <div
            className="bg-[#121412] w-full max-w-md rounded-2xl border border-[#242624] shadow-2xl flex flex-col overflow-hidden"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#242624] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-[#faf9f5]">Assign Job</h2>
                <p className="text-[10px] text-[#ababa8] mt-0.5 uppercase tracking-widest">
                  Partner: <span className="text-[#aeee2a] font-black">{assignCrew.name}</span>
                </p>
              </div>
              <button onClick={() => setAssignCrew(null)} className="text-[#ababa8] hover:text-[#faf9f5] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            {assignSuccess ? (
              <div className="p-10 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#aeee2a]/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#aeee2a] text-4xl" translate="no">check_circle</span>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-[#faf9f5]">Job Assigned!</p>
                  <p className="text-sm text-[#ababa8] mt-1">
                    <span className="text-[#aeee2a] font-bold">{assignCrew.name}</span> was added to the project.
                  </p>
                </div>
                <button onClick={() => setAssignCrew(null)} className="mt-2 px-8 py-2.5 bg-[#aeee2a] text-[#121412] text-xs font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all active:scale-95">
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-5">
                  {/* Job Select */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2">Select Project</label>
                    <div className="relative z-50">
                      <CustomDropdown
                        value={assignJobId}
                        onChange={(val) => setAssignJobId(val)}
                        options={openJobs.map((j) => ({ value: j.id, label: `${j.job_number} · ${j.customer_name} ${j.city ? `— ${j.city}` : ""}` }))}
                        placeholder="— Choose a project —"
                        className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-sm text-[#faf9f5] font-bold flex justify-between items-center transition-all hover:border-[#aeee2a]/50"
                      />
                    </div>
                  </div>

                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-4">
                    <CustomDatePicker
                      label="Start Date"
                      value={assignStart}
                      onChange={setAssignStart}
                      placeholder="Select Date"
                      disableSundays={true}
                    />
                    <CustomDatePicker
                      label="End Date"
                      value={assignEnd}
                      onChange={setAssignEnd}
                      placeholder="Select Date"
                      disableSundays={false}
                      alignRight
                    />
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                  <button onClick={() => setAssignCrew(null)} className="flex-1 py-3 rounded-xl border border-[#474846]/40 text-[#ababa8] text-xs font-black uppercase tracking-widest hover:bg-[#1a1c1a] transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAssign}
                    disabled={!assignJobId || !assignStart || assigning}
                    className="flex-1 py-3 rounded-xl bg-[#aeee2a] text-[#121412] text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {assigning ? "Saving..." : "Confirm"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ADD PARTNER MODAL
      ══════════════════════════════════════════════════ */}
      {addModalCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setAddModalCat(null)}>
          <div
            className="bg-[#121412] w-full max-w-md rounded-2xl border border-[#242624] shadow-2xl"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#242624] flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black text-[#faf9f5]">Add Partner</h2>
                <p className="text-[10px] text-[#ababa8] mt-0.5 uppercase tracking-widest">
                  Discipline: <span className="text-[#aeee2a] font-black">{DISCIPLINE_CONFIG[addModalCat]?.label ?? addModalCat}</span>
                </p>
              </div>
              <button onClick={() => setAddModalCat(null)} className="text-[#ababa8] hover:text-[#faf9f5]">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2 block">Service Discipline *</label>
                <div className="w-full relative z-40">
                  <CustomDropdown
                    value={addModalCat ?? "siding"}
                    onChange={(val) => setAddModalCat(val)}
                    options={Object.entries(DISCIPLINE_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))}
                    placeholder="Select Discipline"
                    className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-[#faf9f5] font-bold text-sm flex justify-between items-center hover:border-[#aeee2a]/50 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2 block">Crew Name *</label>
                <input
                  value={newCrewName}
                  onChange={(e) => setNewCrewName(e.target.value)}
                  className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-[#faf9f5] focus:outline-none focus:border-[#aeee2a]/50 text-sm"
                  placeholder="e.g. WILMAR 3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2 block">Team Size</label>
                  <input
                    value={newCrewSize}
                    onChange={(e) => setNewCrewSize(e.target.value)}
                    type="number"
                    min="1"
                    className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-[#faf9f5] focus:outline-none focus:border-[#aeee2a]/50 text-sm"
                    placeholder="3"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2 block">Phone</label>
                  <input
                    value={newCrewPhone}
                    onChange={(e) => setNewCrewPhone(e.target.value)}
                    className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-[#faf9f5] focus:outline-none focus:border-[#aeee2a]/50 text-sm"
                    placeholder="(555) 000-0000"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setAddModalCat(null)} className="flex-1 py-3 rounded-xl border border-[#474846]/40 text-[#ababa8] text-xs font-black uppercase tracking-widest hover:bg-[#1a1c1a] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAddCrew}
                disabled={!newCrewName.trim() || savingCrew}
                className="flex-1 py-3 rounded-xl bg-[#aeee2a] text-[#121412] text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-40"
              >
                {savingCrew ? "Saving..." : "Add Partner"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════
          INACTIVE CREWS POPUP
      ══════════════════════════════════════════════════ */}
      {inactiveModalCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setInactiveModalCat(null)}>
          <div
            className="bg-[#121412] w-full max-w-2xl rounded-2xl border border-[#242624] shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#242624] flex justify-between items-center bg-[#181a18]">
              <div>
                <h2 className="text-xl font-black text-[#faf9f5]">Inactive {inactiveModalCat.label} Partners</h2>
                <p className="text-xs text-[#ababa8] mt-1 font-bold uppercase tracking-widest">{inactiveModalCat.inactiveCrews.length} partners currently disabled</p>
              </div>
              <button onClick={() => setInactiveModalCat(null)} className="text-[#ababa8] hover:text-[#faf9f5] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {inactiveModalCat.inactiveCrews.length === 0 ? (
                <div className="text-center py-10 text-[#ababa8]">
                  <span className="material-symbols-outlined text-4xl mb-3" translate="no">archive</span>
                  <p className="text-sm font-bold">No inactive partners directly registered.</p>
                </div>
              ) : (
                inactiveModalCat.inactiveCrews.map(c => (
                  <div 
                     key={c.id} 
                     onClick={() => setDetailInactiveCrew(c)}
                     className="flex justify-between items-center bg-[#181a18] p-4 rounded-xl border border-[#242624] hover:bg-[#1f221f] transition-colors cursor-pointer group"
                  >
                     <div>
                        <h3 className="text-base font-black text-[#faf9f5] group-hover:text-[#aeee2a] transition-colors">{c.name}</h3>
                        {c.contact_phone && <p className="text-xs text-[#ababa8] font-mono mt-0.5">{c.contact_phone}</p>}
                     </div>
                     <span className="material-symbols-outlined text-[#474846] group-hover:text-[#faf9f5] transition-colors" translate="no">arrow_forward_ios</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          INACTIVE CREW DETAIL (SECONDARY) POPUP
      ══════════════════════════════════════════════════ */}
      {detailInactiveCrew && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setDetailInactiveCrew(null)}>
          <div
            className="bg-[#121412] w-full max-w-lg rounded-2xl border border-[#242624] shadow-2xl flex flex-col overflow-hidden relative"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
             <div className="p-6 border-b border-[#242624] flex justify-between items-center bg-[#181a18]">
               <div>
                  <h2 className="text-xl font-black text-[#faf9f5]">Partner Details</h2>
                  <p className="text-[10px] text-[#ff7351] font-bold uppercase tracking-widest mt-1">Currently Inactive</p>
               </div>
               <button onClick={() => setDetailInactiveCrew(null)} className="text-[#ababa8] hover:text-[#faf9f5] transition-colors">
                  <span className="material-symbols-outlined" translate="no">close</span>
               </button>
             </div>

             <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-[#faf9f5]">{detailInactiveCrew.name}</h3>
                  {detailInactiveCrew.contact_phone && <p className="text-sm text-[#ababa8] font-mono mt-1 px-3 py-1 bg-[#242624] inline-block rounded-lg">{detailInactiveCrew.contact_phone}</p>}
                </div>

                <div className="p-5 rounded-xl bg-[#242624]/50 border border-[#474846]/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#ababa8] block mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">history_edu</span>
                    Reason for inactivation
                  </span>
                  <p className="text-sm font-medium text-[#faf9f5] whitespace-pre-wrap leading-relaxed">
                    {detailInactiveCrew.inactivationReason || "No specific reason was provided when this partner was deactivated."}
                  </p>
                  {detailInactiveCrew.inactivatedAt && (
                    <div className="mt-4 pt-3 border-t border-[#474846]/30">
                      <p className="text-[10px] text-[#474846] font-mono uppercase tracking-widest">Date: {(() => { const _d = new Date(detailInactiveCrew.inactivatedAt); return `${(_d.getMonth() + 1).toString().padStart(2, '0')}/${_d.getDate().toString().padStart(2, '0')}/${_d.getFullYear()}`; })()}</p>
                    </div>
                  )}
                </div>
             </div>

             <div className="p-5 border-t border-[#242624] bg-[#0a0a0a] flex gap-3">
                <button 
                   onClick={() => setActionCrew({ crew: detailInactiveCrew, act: 'activate' })}
                   className="flex-1 py-3 bg-[#aeee2a]/10 hover:bg-[#aeee2a]/20 text-[#aeee2a] border border-[#aeee2a]/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                   <span className="material-symbols-outlined text-[16px]" translate="no">power_settings_new</span>
                   Re-Activate
                </button>
                <button 
                   onClick={() => setActionCrew({ crew: detailInactiveCrew, act: 'delete' })}
                   className="flex-1 py-3 bg-[#ff7351]/10 hover:bg-[#ff7351]/20 text-[#ff7351] border border-[#ff7351]/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                   <span className="material-symbols-outlined text-[16px]" translate="no">delete_forever</span>
                   Permanent Delete
                </button>
             </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION FOR ACTIVATE/DELETE */}
      {actionCrew && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setActionCrew(null)}>
           <div 
             className="bg-[#121412] max-w-md w-full rounded-2xl border border-[#242624] shadow-2xl p-8 flex flex-col text-center items-center relative" 
             onClick={(e) => e.stopPropagation()}
           >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${actionCrew.act === 'activate' ? 'bg-[#aeee2a]/10 text-[#aeee2a]' : 'bg-[#ff7351]/10 text-[#ff7351]'}`}>
                 <span className="material-symbols-outlined text-3xl" translate="no">
                   {actionCrew.act === 'activate' ? 'settings_backup_restore' : 'warning'}
                 </span>
              </div>
              <h3 className="text-xl font-black text-[#faf9f5] mb-2">{actionCrew.act === 'activate' ? 'Restore Partner?' : 'Permanent Delete?'}</h3>
              <p className="text-[#ababa8] text-sm mb-8">
                 {actionCrew.act === 'activate' 
                   ? `Are you sure you want to re-activate "${actionCrew.crew.name}"? They will reappear on the active crew board.` 
                   : `Are you sure you want to permanently delete "${actionCrew.crew.name}"? This action removes all their database connections.` }
              </p>
              
              <div className="flex gap-3 w-full">
                 <button onClick={() => setActionCrew(null)} className="flex-1 py-3 text-xs font-bold text-[#ababa8] hover:bg-[#242624] rounded-xl border border-[#474846] transition-colors">
                    CANCEL
                 </button>
                 <button 
                   onClick={handleCrewActionConfirm} 
                   disabled={isProcessingAction}
                   className={`flex-1 flex justify-center items-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 ${actionCrew.act === 'activate' ? 'bg-[#aeee2a] text-[#121412] hover:brightness-110' : 'bg-[#ff7351] text-[#121412] hover:brightness-110'}`}
                 >
                    {isProcessingAction ? <span className="material-symbols-outlined animate-spin text-[16px]">sync</span> : 'CONFIRM'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
