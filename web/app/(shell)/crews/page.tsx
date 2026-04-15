"use client";

import { useState, useEffect } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { supabase } from "../../../lib/supabase";

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
}

interface ServiceCategory {
  id: string;
  label: string;
  icon: string;
  accentColor: string;
  crews: CrewUI[];
}

// ─── Discipline Config ───────────────────────────────────────────
const DISCIPLINE_CONFIG: Record<string, { label: string; icon: string; accentColor: string }> = {
  siding:          { label: "Siding",            icon: "home_work",     accentColor: "#aeee2a" },
  doors_windows:   { label: "Doors / Windows",   icon: "sensor_door",   accentColor: "#60b8f5" },
  painting:        { label: "Paint",             icon: "format_paint",  accentColor: "#f5a623" },
  gutters:         { label: "Gutters",           icon: "water_drop",    accentColor: "#c084fc" },
  roofing:         { label: "Roofing",           icon: "roofing",       accentColor: "#fb923c" },
  other:           { label: "Other",             icon: "construction",  accentColor: "#ababa8" },
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
              <span className="text-[10px] font-black text-[#aeee2a]">#{j.job_number}</span>
              <span className="text-[10px] text-[#faf9f5] font-medium truncate flex-1">{j.client}</span>
              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${j.status === "Active" ? "bg-[#aeee2a]/15 text-[#aeee2a]" : "bg-[#e3eb5d]/15 text-[#e3eb5d]"}`}>
                {j.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Capacity */}
      <div className="mt-auto">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black text-[#ababa8] tracking-widest uppercase">Weekly Capacity</span>
          <span className={`text-xs font-black uppercase ${getLoadLabel(crew.overallLoad)}`}>{crew.overallLoad}% Busy</span>
        </div>
        <div className="flex items-end gap-1.5 h-14 mb-1">
          {crew.weekCapacity.map((day, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="w-full bg-[#1e201e] rounded-sm flex items-end h-full">
                <div
                  className={`w-full rounded-sm transition-all duration-700 ${getBarColor(day.state)}`}
                  style={{ height: `${Math.max((day.percentage / 100) * 100, 12)}%` }}
                />
              </div>
              <span className="text-[9px] text-[#3a3c3a] font-bold mt-1">{day.dayLabel}</span>
            </div>
          ))}
        </div>

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
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

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
      setDetailCrew(null);
      setInactiveMode(false);
      setInactivationReason("");
    } catch (err) {
      console.error("[CrewsPage] inactivate error:", err);
    } finally {
      setInactivating(false);
    }
  }

  async function fetchCrews() {
    setLoading(true);
    try {
      // Fetch crews with their specialties (actual schema)
      const { data, error } = await supabase
        .from("crews")
        .select(`
          id, name, code, phone, active,
          crew_specialties (
            specialty:specialties (name, code)
          )
        `)
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

      // Group by discipline (first specialty code, or "other")
      const grouped: Record<string, CrewUI[]> = {};
      for (const c of (data ?? []) as any[]) {
        const specs = (c.crew_specialties ?? []).map((cs: any) => cs.specialty).filter(Boolean);
        let disc = specs.length > 0 ? specs[0].code?.replace(/_.*$/, "") ?? "other" : "other";
        if (disc === "doors" || disc === "windows") disc = "doors_windows";
        if (!grouped[disc]) grouped[disc] = [];

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
        };
        grouped[disc].push(crewUI);
      }

      // Build categories in canonical order — ALWAYS show all service categories
      const orderedKeys = ["siding", "doors_windows", "painting", "gutters", "roofing"];
      const cats: ServiceCategory[] = orderedKeys
        .map((k) => ({
          id: k,
          ...(DISCIPLINE_CONFIG[k] ?? DISCIPLINE_CONFIG.other),
          crews: grouped[k] ?? [],
        }));

      // Add any unexpected disciplines at the end
      for (const k of Object.keys(grouped)) {
        if (!orderedKeys.includes(k) && grouped[k].length > 0) {
          cats.push({
            id: k,
            label: k.charAt(0).toUpperCase() + k.slice(1),
            icon: "construction",
            accentColor: "#ababa8",
            crews: grouped[k],
          });
        }
      }

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
        const { data: specMatch } = await supabase
          .from("specialties")
          .select("id")
          .ilike("code", `${addModalCat}%`)
          .limit(1)
          .single();

        if (specMatch) {
          await supabase.from("crew_specialties").insert({
            crew_id: newCrew.id,
            specialty_id: specMatch.id,
            proficiency: "journeyman",
          });
        }
      }

      setAddModalCat(null);
      setNewCrewName("");
      setNewCrewSize("3");
      setNewCrewPhone("");
      setNewCrewSpecialty("");
      fetchCrews();
    } catch (err) {
      console.error("[CrewsPage] add crew error:", err);
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
            Crews & Partners <span className="text-[#aeee2a]">Directory</span>
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

                  <button
                    onClick={() => setAddModalCat(cat.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors group"
                    style={{ backgroundColor: `${cat.accentColor}12`, border: `1px solid ${cat.accentColor}25`, color: cat.accentColor }}
                  >
                    <span className="material-symbols-outlined text-[16px] group-hover:rotate-90 transition-transform duration-300" translate="no">add</span>
                    Add Partner
                  </button>
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
                      <CrewCard
                        key={crew.id}
                        crew={crew}
                        accentColor={cat.accentColor}
                        onViewDetails={setDetailCrew}
                        onAssignJob={openAssignModal}
                      />
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
                            <span className="text-[10px] font-black text-[#aeee2a]">#{job.job_number}</span>
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
                    <div className="relative">
                      <select
                        value={assignJobId}
                        onChange={(e) => setAssignJobId(e.target.value)}
                        className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a]/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">— Choose a project —</option>
                        {openJobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            #{j.job_number} · {j.customer_name} {j.city ? `— ${j.city}` : ""}
                          </option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#ababa8] text-[18px]" translate="no">expand_more</span>
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
                <select
                  value={addModalCat ?? "siding"}
                  onChange={(e) => setAddModalCat(e.target.value)}
                  className="w-full bg-[#181a18] border border-[#474846]/30 rounded-xl px-4 py-3 text-[#faf9f5] focus:outline-none focus:border-[#aeee2a]/50 text-sm cursor-pointer"
                >
                  {Object.entries(DISCIPLINE_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
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
    </div>
  );
}
