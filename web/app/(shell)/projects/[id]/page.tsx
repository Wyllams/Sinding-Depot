"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "../../../../components/TopBar";
import { supabase } from "../../../../lib/supabase";

// ─── Discipline visuals (reused from /crews) ──────────────────────
const DISCIPLINE_VIS: Record<string, { icon: string; color: string }> = {
  siding:   { icon: "home_work",    color: "#aeee2a" },
  windows:  { icon: "sensor_door",  color: "#60b8f5" },
  painting: { icon: "format_paint", color: "#f5a623" },
  gutters:  { icon: "water_drop",   color: "#c084fc" },
  roofing:  { icon: "roofing",      color: "#fb923c" },
  decks:    { icon: "deck",         color: "#22d3ee" },
};

interface AvailableCrew {
  id: string;
  name: string;
  phone: string | null;
  matchedSpecialties: string[];
};

// =============================================
// Project Details — /projects/[id]
// Conectado ao Supabase
// Layout: 3 blocos (Info + Crews + Documents/Media)
// Timeline infinita → REMOVIDA (solicitação Nick)
// =============================================

// ─── Tipos ────────────────────────────────────────────────────────
interface JobDetail {
  id: string;
  job_number: string;
  title: string;
  status: string;
  city: string;
  state: string;
  address: string | null;
  zip_code: string | null;
  requested_start_date: string | null;
  estimated_end_date: string | null;
  notes: string | null;
  customer: { id: string; full_name: string; email: string; phone: string | null } | null;
  salesperson: { full_name: string } | null;
  services: { id: string; service_type: { name: string } | null }[];
  blockers: { id: string; title: string; type: string; status: string }[];
  crews: {
    crew: { id: string; name: string; discipline: string; phone: string | null } | null;
    start_date: string | null;
    end_date: string | null;
  }[];
  change_orders: { id: string; title: string; status: string; proposed_amount: number | null }[];
}

// ─── Status Map ───────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; style: string }> = {
  active:             { label: "Confirmed", style: "bg-[#aeee2a] text-[#3a5400]"           },
  draft:              { label: "Tentative", style: "bg-[#e3eb5d]/20 text-[#e3eb5d]"        },
  pending_scheduling: { label: "Awaiting",  style: "bg-[#a855f7]/20 text-[#a855f7]"        },
  on_hold:            { label: "Pending",   style: "bg-[#ff7351]/20 text-[#ff7351]"        },
  completed:          { label: "Completed", style: "bg-[#242624] text-[#ababa8]"           },
  cancelled:          { label: "Cancelled", style: "bg-[#ba1212]/20 text-[#ba1212]"        },
};

const BLOCKER_ICON: Record<string, string> = {
  weather:  "cloud",
  material: "inventory_2",
  permit:   "contract",
  customer: "phone_disabled",
  crew:     "groups",
  other:    "warning",
};

// ─── Gate Config ─────────────────────────────────────────────────
const GATE_CONFIG: Record<string, { color: string; icon: string; title: string }> = {
  NOT_CONTACTED: { color: "#ba1212", icon: "phone_disabled",  title: "Not Yet Contacted" },
  READY:         { color: "#1f8742", icon: "check_circle",    title: "Ready to Start"    },
  WINDOWS:       { color: "#165eb3", icon: "window",          title: "Waiting on Windows"},
  DOORS:         { color: "#f09a1a", icon: "door_front",      title: "Waiting on Doors"  },
  FINANCING:     { color: "#ebd27a", icon: "account_balance", title: "Pending Financing" },
  MATERIALS:     { color: "#306870", icon: "inventory_2",     title: "Material Shortage" },
  HOA:           { color: "#9acbf0", icon: "gavel",           title: "HOA Approval"      },
  OTHER_REPAIRS: { color: "#d1a3f0", icon: "carpenter",       title: "Other Repairs First"},
  NO_ANSWER:     { color: "#f2a074", icon: "voicemail",       title: "No Answer"         },
  PERMIT:        { color: "#747673", icon: "contract",         title: "Pending Permit"    },
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Main Component ───────────────────────────────────────────────
export default function ProjectDetailPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "crews" | "documents">("overview");
  const [copied, setCopied] = useState(false);
  const [gateStatus, setGateStatus] = useState<string>("READY");
  const [crewPopupOpen, setCrewPopupOpen] = useState(false);
  const [availableCrews, setAvailableCrews] = useState<AvailableCrew[]>([]);
  const [loadingCrews, setLoadingCrews] = useState(false);

  // Fetch crews whose specialties match this project's services
  const fetchMatchingCrews = useCallback(async () => {
    if (!job) return;
    setLoadingCrews(true);
    try {
      // Get the service type codes for this job
      const svcCodes = job.services
        .map((s) => s.service_type?.name?.toLowerCase())
        .filter(Boolean) as string[];

      if (svcCodes.length === 0) {
        setAvailableCrews([]);
        return;
      }

      // Get specialty IDs that match our service types (by code or partial name match)
      const { data: matchedSpecs } = await supabase
        .from("specialties")
        .select("id, code, name")
        .in("code", [
          ...svcCodes,
          ...svcCodes.map(c => `${c}_installation`),
          ...svcCodes.map(c => `${c}_building`),
        ]);

      if (!matchedSpecs || matchedSpecs.length === 0) {
        setAvailableCrews([]);
        return;
      }

      const specIds = matchedSpecs.map(s => s.id);

      // Get crew_specialties rows for those specialty IDs
      const { data: csRows } = await supabase
        .from("crew_specialties")
        .select("crew_id, specialty:specialties (name)")
        .in("specialty_id", specIds);

      if (!csRows || csRows.length === 0) {
        setAvailableCrews([]);
        return;
      }

      // Group by crew_id
      const crewMap = new Map<string, string[]>();
      for (const row of csRows as any[]) {
        const cid = row.crew_id;
        const specName = row.specialty?.name ?? "";
        if (!crewMap.has(cid)) crewMap.set(cid, []);
        crewMap.get(cid)!.push(specName);
      }

      // Fetch crew details
      const crewIds = Array.from(crewMap.keys());
      const { data: crewRows } = await supabase
        .from("crews")
        .select("id, name, phone, active")
        .in("id", crewIds);

      const mapped: AvailableCrew[] = (crewRows ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        matchedSpecialties: crewMap.get(c.id) ?? [],
      }));

      setAvailableCrews(mapped);
    } catch (err) {
      console.error("[CrewPopup] fetch error:", err);
    } finally {
      setLoadingCrews(false);
    }
  }, [job]);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      // Main query — without change_orders (has RLS that blocks anon reads)
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id, job_number, title, status, city, state, service_address_line_1, postal_code,
          requested_start_date, target_completion_date, description,
          customer:customers (id, full_name, email, phone),
          salesperson:salespersons (full_name),
          services:job_services (
            id,
            service_type:service_types (name),
            assignments:service_assignments (
              crew:crews (id, name, phone),
              scheduled_start_at,
              scheduled_end_at
            )
          ),
          blockers (id, title, type, status)
        `)
        .eq("id", jobId)
        .single();

      if (error || !data) {
        console.error("[ProjectDetail] main query error:", error);
        setNotFound(true);
        return;
      }

      // Separate query for change_orders (RLS-protected, may fail for non-auth sessions)
      const { data: coData } = await supabase
        .from("change_orders")
        .select("id, title, status, proposed_amount")
        .eq("job_id", jobId);

      const j = data as any;
      const mapped: JobDetail = {
        id: j.id,
        job_number: j.job_number,
        title: j.title,
        status: j.status,
        city: j.city ?? "",
        state: j.state ?? "",
        address: j.service_address_line_1,
        zip_code: j.postal_code,
        requested_start_date: j.requested_start_date,
        estimated_end_date: j.target_completion_date,
        notes: j.description,
        customer: j.customer,
        salesperson: j.salesperson,
        services: j.services ?? [],
        blockers: j.blockers ?? [],
        crews: (j.services ?? []).flatMap((s: any) => 
          (s.assignments ?? []).map((a: any) => ({
             crew: { ...a.crew, discipline: s.service_type?.name ?? "General" },
             start_date: a.scheduled_start_at,
             end_date: a.scheduled_end_at
          }))
        ).filter((c: any) => c.crew && c.crew.id),
        change_orders: coData ?? [],
      };

      setJob(mapped);

      // Derive gate from open blockers
      const openBlocker = mapped.blockers.find((b) => b.status === "open");
      if (openBlocker) {
        const t = openBlocker.type?.toUpperCase();
        if (t === "WEATHER") setGateStatus("OTHER_REPAIRS");
        else if (t === "MATERIAL") setGateStatus("MATERIALS");
        else if (t === "PERMIT") setGateStatus("PERMIT");
        else if (t === "CUSTOMER") setGateStatus("NOT_CONTACTED");
        else setGateStatus("OTHER_REPAIRS");
      } else {
        setGateStatus(mapped.status === "active" ? "READY" : "NOT_CONTACTED");
      }
    } catch (err) {
      console.error("[ProjectDetail] fetch error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  async function handleGateChange(gate: string) {
    setGateStatus(gate);
    const newStatus = gate === "READY" ? "active" : gate === "NOT_CONTACTED" ? "draft" : "on_hold";
    await supabase.from("jobs").update({ status: newStatus }).eq("id", jobId);
    setJob((prev) => prev ? { ...prev, status: newStatus } : prev);
  }

  async function handleResolveBlocker(blockerId: string) {
    await supabase.from("blockers").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", blockerId);
    setJob((prev) => prev
      ? { ...prev, blockers: prev.blockers.map((b) => b.id === blockerId ? { ...b, status: "resolved" } : b) }
      : prev
    );
  }

  function handleCopyAddress() {
    const addr = `${job?.address ?? ""}, ${job?.city ?? ""}, ${job?.state ?? ""}`.trim().replace(/^,\s*/, "");
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Loading / Not Found ─────────────────────────────────────────
  if (loading) {
    return (
      <>
        <TopBar title="Loading..." />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4 text-[#ababa8]">
            <span className="material-symbols-outlined text-5xl animate-spin" translate="no">progress_activity</span>
            <p className="text-base font-bold">Loading project...</p>
          </div>
        </main>
      </>
    );
  }

  if (notFound || !job) {
    return (
      <>
        <TopBar title="Not Found" />
        <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1e201e] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-[#ff7351]" translate="no">error</span>
          </div>
          <p className="text-lg font-bold text-[#faf9f5]">Project not found</p>
          <Link href="/projects">
            <button className="px-6 py-2.5 bg-[#aeee2a] text-[#3a5400] font-bold rounded-xl hover:bg-[#a0df14] transition-colors">
              Back to Projects
            </button>
          </Link>
        </main>
      </>
    );
  }

  const statusConf = STATUS_MAP[job.status] ?? STATUS_MAP.draft;
  const fullAddress = job.address && job.address !== "Pendente" 
    ? job.address 
    : [job.city, job.state, job.zip_code].filter(Boolean).join(", ");
  const gateConf = GATE_CONFIG[gateStatus] ?? GATE_CONFIG.READY;
  const openBlockers = job.blockers.filter((b) => b.status === "open");
  const pendingCOs = job.change_orders.filter((co) => co.status === "pending_customer_approval");
  const pendingValue = pendingCOs.reduce((s, co) => s + (co.proposed_amount ?? 0), 0);

  return (
    <>
      <TopBar
        title={job.customer?.full_name ?? job.title}
        subtitle={`#${job.job_number}`}
      />

      <main className="px-4 sm:px-6 lg:px-8 pb-16 pt-6 min-h-screen">

        {/* ── Back + Hero ── */}
        <div className="mb-8">
          <Link href="/projects" className="inline-flex items-center gap-2 text-[#ababa8] hover:text-[#aeee2a] transition-colors mb-5 font-bold text-xs tracking-widest uppercase">
            <span className="material-symbols-outlined text-[16px]" translate="no">arrow_back</span>
            All Projects
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#faf9f5] tracking-tighter leading-none mb-3" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                {job.customer?.full_name ?? job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-4 py-1.5 text-xs font-bold rounded-full tracking-wider ${statusConf.style}`}>
                  {statusConf.label}
                </span>
                <span className="text-[#ababa8] text-sm font-mono">#{job.job_number}</span>
                {fullAddress && (
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1.5 text-[#ababa8] hover:text-[#aeee2a] transition-colors text-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]" translate="no">location_on</span>
                    {fullAddress}
                    <span className="material-symbols-outlined text-[12px]" translate="no">
                      {copied ? "check" : "content_copy"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Gate Status Inline */}
            <div className="relative">
              <select
                value={gateStatus}
                onChange={(e) => handleGateChange(e.target.value)}
                className="appearance-none bg-[#121412] border border-[#474846] rounded-xl pl-10 pr-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#faf9f5] focus:outline-none focus:border-[#aeee2a] cursor-pointer"
              >
                {Object.entries(GATE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.title}</option>
                ))}
              </select>
              <div
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center pointer-events-none"
                style={{ backgroundColor: `${gateConf.color}20` }}
              >
                <span className="material-symbols-outlined text-[13px] pointer-events-none" style={{ color: gateConf.color }} translate="no">
                  {gateConf.icon}
                </span>
              </div>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#ababa8] text-[16px]" translate="no">expand_more</span>
            </div>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Start Date",     value: fmt(job.requested_start_date),          icon: "event" },
            { label: "End Date",       value: fmt(job.estimated_end_date),             icon: "event_busy" },
            { label: "Open Blockers",  value: String(openBlockers.length),             icon: "warning", danger: openBlockers.length > 0 },
            { label: "Pending COs",    value: pendingCOs.length > 0 ? `${pendingCOs.length} · $${pendingValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "None", icon: "request_quote" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#121412] rounded-2xl p-4 border border-[#474846]/15">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ color: kpi.danger ? "#ff7351" : "#aeee2a" }}
                  translate="no"
                >
                  {kpi.icon}
                </span>
                <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest">{kpi.label}</p>
              </div>
              <p className={`text-sm font-black ${kpi.danger ? "text-[#ff7351]" : "text-[#faf9f5]"}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex bg-[#121412] p-1 rounded-xl w-fit mb-8">
          {[
            { key: "overview",   label: "Overview",    icon: "dashboard" },
            { key: "crews",      label: "Crews",       icon: "groups" },
            { key: "documents",  label: "Documents",   icon: "folder" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                activeTab === tab.key
                  ? "bg-[#242624] text-[#aeee2a]"
                  : "text-[#ababa8] hover:text-[#faf9f5]"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]" translate="no">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            TAB 1: OVERVIEW
        ══════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Client + Services + Notes */}
            <div className="lg:col-span-5 space-y-6">

              {/* Client Card */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8] mb-5">Client Info</h3>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-[#aeee2a]/15 border border-[#aeee2a]/20 flex items-center justify-center shrink-0">
                    <span className="text-lg font-black text-[#aeee2a]">
                      {job.customer?.full_name?.charAt(0).toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div>
                    <p className="font-black text-[#faf9f5] text-sm">{job.customer?.full_name ?? "—"}</p>
                    <p className="text-xs text-[#ababa8]">{job.customer?.email ?? "—"}</p>
                    {job.customer?.phone && <p className="text-xs text-[#ababa8] font-mono">{job.customer.phone}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#1e201e] rounded-xl p-3">
                    <p className="text-[#ababa8] font-bold mb-1 tracking-widest uppercase text-[9px]">Salesperson</p>
                    <p className="text-[#faf9f5] font-bold">{job.salesperson?.full_name ?? "—"}</p>
                  </div>
                  <div className="bg-[#1e201e] rounded-xl p-3">
                    <p className="text-[#ababa8] font-bold mb-1 tracking-widest uppercase text-[9px]">Location</p>
                    <p className="text-[#faf9f5] font-bold">{job.city}, {job.state}</p>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8] mb-4">Services</h3>
                {job.services.length === 0 ? (
                  <p className="text-xs text-[#474846]">No services assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {job.services.map((s) => (
                      <span key={s.id} className="px-3 py-1.5 bg-[#242624] border border-[#474846]/30 rounded-xl text-xs font-bold text-[#faf9f5]">
                        {s.service_type?.name ?? "—"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {job.notes && (
                <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8] mb-3">Internal Notes</h3>
                  <p className="text-sm text-[#faf9f5] leading-relaxed">{job.notes}</p>
                </div>
              )}
            </div>

            {/* Right: Blockers + Change Orders */}
            <div className="lg:col-span-7 space-y-6">

              {/* Blockers */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">
                    {openBlockers.length > 0 ? (
                      <span className="text-[#ff7351]">⚠ Open Blockers ({openBlockers.length})</span>
                    ) : (
                      "Blockers"
                    )}
                  </h3>
                </div>

                {job.blockers.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-[#ababa8]">
                    <span className="material-symbols-outlined text-2xl text-[#aeee2a]" translate="no">check_circle</span>
                    <p className="text-sm font-bold text-[#faf9f5]">No blockers — all clear</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {job.blockers.map((b) => (
                      <div
                        key={b.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border ${
                          b.status === "open"
                            ? "bg-[#ff7351]/8 border-[#ff7351]/20"
                            : "bg-[#1e201e] border-[#474846]/10 opacity-50"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined"
                          translate="no"
                          style={{ color: b.status === "open" ? "#ff7351" : "#ababa8" }}
                        >
                          {BLOCKER_ICON[b.type] ?? "warning"}
                        </span>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-[#faf9f5]">{b.title}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">{b.type}</p>
                        </div>
                        {b.status === "open" && (
                          <button
                            onClick={() => handleResolveBlocker(b.id)}
                            className="px-3 py-1.5 bg-[#aeee2a]/10 text-[#aeee2a] text-[10px] font-bold uppercase rounded-lg hover:bg-[#aeee2a]/20 transition-colors border border-[#aeee2a]/20"
                          >
                            Resolve
                          </button>
                        )}
                        {b.status !== "open" && (
                          <span className="text-[10px] font-bold text-[#aeee2a] uppercase">Resolved ✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Orders */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Change Orders</h3>
                  <Link href="/change-orders">
                    <button className="text-[#aeee2a] text-xs font-bold hover:underline">View All →</button>
                  </Link>
                </div>

                {job.change_orders.length === 0 ? (
                  <p className="text-xs text-[#474846] py-4 text-center">No change orders for this project</p>
                ) : (
                  <div className="space-y-3">
                    {job.change_orders.map((co) => {
                      const coColors: Record<string, string> = {
                        draft: "#fff7cf",
                        pending_customer_approval: "#e3eb5d",
                        approved: "#aeee2a",
                        rejected: "#ff7351",
                        cancelled: "#747673",
                      };
                      const c = coColors[co.status] ?? "#ababa8";
                      return (
                        <div key={co.id} className="flex items-center justify-between p-4 bg-[#1e201e] rounded-xl border border-[#474846]/15">
                          <div>
                            <p className="text-sm font-bold text-[#faf9f5]">{co.title}</p>
                            <span
                              className="text-[10px] font-black uppercase"
                              style={{ color: c }}
                            >
                              {co.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm font-black text-[#faf9f5]">
                            {co.proposed_amount != null ? `$${co.proposed_amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 2: CREWS
        ══════════════════════════════════════════════════ */}
        {activeTab === "crews" && (
          <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Assigned Crews & Partners</h3>
              <Link href="/crews">
                <button className="text-[#aeee2a] text-xs font-bold hover:underline">Manage Crews →</button>
              </Link>
            </div>

            {job.crews.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-[#ababa8]">
                <div className="w-14 h-14 rounded-full bg-[#1e201e] flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-[#aeee2a]" translate="no">groups</span>
                </div>
                <p className="text-sm font-bold text-[#faf9f5]">No crews assigned yet</p>
                <p className="text-xs">Browse available crews that match this project's services.</p>
                <button
                  onClick={() => { setCrewPopupOpen(true); fetchMatchingCrews(); }}
                  className="mt-2 px-5 py-2 bg-[#aeee2a] text-[#3a5400] font-bold text-xs rounded-xl hover:bg-[#a0df14] transition-colors cursor-pointer"
                >
                  Browse Crews
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {job.crews.map((jc, idx) => (
                  <div key={idx} className="bg-[#1e201e] rounded-xl p-5 border border-[#474846]/20">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#aeee2a]/10 border border-[#aeee2a]/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#aeee2a]" translate="no">groups</span>
                      </div>
                      <div>
                        <p className="font-black text-[#faf9f5] text-sm uppercase tracking-wide">{jc.crew?.name ?? "—"}</p>
                        <p className="text-[10px] text-[#ababa8] uppercase font-bold">{jc.crew?.discipline ?? "—"}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-[#ababa8]">
                      {jc.start_date && <p>Start: <span className="text-[#faf9f5] font-bold">{fmt(jc.start_date)}</span></p>}
                      {jc.end_date && <p>End: <span className="text-[#faf9f5] font-bold">{fmt(jc.end_date)}</span></p>}
                      {jc.crew?.phone && <p className="font-mono">{jc.crew.phone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 3: DOCUMENTS & MEDIA VAULT
        ══════════════════════════════════════════════════ */}
        {activeTab === "documents" && (
          <div className="space-y-6">

            {/* Vault Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#faf9f5]">Project Vault</h3>
              <p className="text-xs text-[#ababa8]">Documents, photos, and media files for #{job.job_number}</p>
            </div>

            {/* 3 Upload Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Block 1: Contracts & Documents */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#aeee2a]/10 border border-[#aeee2a]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#aeee2a]" translate="no">description</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#faf9f5]">Contracts & Docs</h4>
                    <p className="text-[10px] text-[#ababa8]">Permits, contracts, quotes</p>
                  </div>
                </div>
                <div className="flex-1 border-2 border-dashed border-[#474846]/40 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#0d0f0d] hover:border-[#aeee2a]/40 hover:bg-[#aeee2a]/5 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-3xl text-[#474846] group-hover:text-[#aeee2a] mb-2 transition-colors" translate="no">upload_file</span>
                  <p className="text-xs font-bold text-[#faf9f5]">Drop files here</p>
                  <p className="text-[10px] text-[#ababa8] mt-1">PDF, DOCX up to 20MB</p>
                </div>
                <p className="text-[10px] text-[#474846] text-center mt-3">No documents yet</p>
              </div>

              {/* Block 2: Photos */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#60b8f5]/10 border border-[#60b8f5]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#60b8f5]" translate="no">photo_library</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#faf9f5]">Site Photos</h4>
                    <p className="text-[10px] text-[#ababa8]">Before, during, after</p>
                  </div>
                </div>
                <div className="flex-1 border-2 border-dashed border-[#474846]/40 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#0d0f0d] hover:border-[#60b8f5]/40 hover:bg-[#60b8f5]/5 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-3xl text-[#474846] group-hover:text-[#60b8f5] mb-2 transition-colors" translate="no">add_photo_alternate</span>
                  <p className="text-xs font-bold text-[#faf9f5]">Upload photos</p>
                  <p className="text-[10px] text-[#ababa8] mt-1">JPG, PNG, HEIC up to 20MB</p>
                </div>
                <p className="text-[10px] text-[#474846] text-center mt-3">No photos yet</p>
              </div>

              {/* Block 3: Videos */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#f5a623]" translate="no">videocam</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#faf9f5]">Video Reports</h4>
                    <p className="text-[10px] text-[#ababa8]">Walkthroughs, inspections</p>
                  </div>
                </div>
                <div className="flex-1 border-2 border-dashed border-[#474846]/40 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#0d0f0d] hover:border-[#f5a623]/40 hover:bg-[#f5a623]/5 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-3xl text-[#474846] group-hover:text-[#f5a623] mb-2 transition-colors" translate="no">video_library</span>
                  <p className="text-xs font-bold text-[#faf9f5]">Drop videos here</p>
                  <p className="text-[10px] text-[#ababa8] mt-1">MP4, MOV up to 200MB</p>
                </div>
                <p className="text-[10px] text-[#474846] text-center mt-3">No videos yet</p>
              </div>
            </div>

            {/* Vault note */}
            <div className="flex items-start gap-3 bg-[#121412] rounded-xl p-4 border border-[#474846]/15">
              <span className="material-symbols-outlined text-[#aeee2a] shrink-0 text-[18px]" translate="no">info</span>
              <p className="text-xs text-[#ababa8] leading-relaxed">
                File storage integration with Supabase Storage is in the next sprint. Documents uploaded here will be securely stored and accessible to your team and client portal.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════
          CREW SELECTION POPUP
      ══════════════════════════════════════════════════ */}
      {crewPopupOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setCrewPopupOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-[#121412] border border-[#474846]/30 rounded-2xl shadow-2xl overflow-hidden"
            style={{ animation: "fadeInScale 0.2s ease-out" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#474846]/20">
              <div>
                <h2 className="text-lg font-black text-[#faf9f5] tracking-tight" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  Available Crews
                </h2>
                <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest mt-1">
                  Matching: {job.services.map(s => s.service_type?.name).filter(Boolean).join(", ") || "All Services"}
                </p>
              </div>
              <button
                onClick={() => setCrewPopupOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#1e201e] flex items-center justify-center text-[#ababa8] hover:text-[#faf9f5] hover:bg-[#242624] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]" translate="no">close</span>
              </button>
            </div>

            {/* Service Tags */}
            <div className="px-6 py-3 border-b border-[#474846]/10 flex flex-wrap gap-2">
              {job.services.map((s, i) => {
                const svcKey = s.service_type?.name?.toLowerCase() ?? "";
                const vis = DISCIPLINE_VIS[svcKey] ?? { icon: "construction", color: "#ababa8" };
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: `${vis.color}15`, color: vis.color, border: `1px solid ${vis.color}30` }}
                  >
                    <span className="material-symbols-outlined text-[13px]" translate="no">{vis.icon}</span>
                    {s.service_type?.name ?? "Service"}
                  </span>
                );
              })}
            </div>

            {/* Body */}
            <div className="px-6 py-5 max-h-[400px] overflow-y-auto space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#474846 transparent" }}>
              {loadingCrews ? (
                <div className="flex flex-col items-center gap-3 py-12 text-[#ababa8]">
                  <span className="material-symbols-outlined text-3xl animate-spin" translate="no">progress_activity</span>
                  <p className="text-sm font-bold">Finding matching crews...</p>
                </div>
              ) : availableCrews.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-[#ababa8]">
                  <div className="w-14 h-14 rounded-full bg-[#1e201e] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-[#ff7351]" translate="no">group_off</span>
                  </div>
                  <p className="text-sm font-bold text-[#faf9f5]">No crews found</p>
                  <p className="text-xs text-center">
                    No registered crews match the services for this project.<br />
                    Register crews in the <Link href="/crews" className="text-[#aeee2a] hover:underline font-bold">Crews & Partners</Link> module first.
                  </p>
                </div>
              ) : (() => {
                // Group crews by specialty for organized display
                const grouped = new Map<string, AvailableCrew[]>();
                for (const crew of availableCrews) {
                  for (const spec of crew.matchedSpecialties) {
                    if (!grouped.has(spec)) grouped.set(spec, []);
                    // Avoid duplicate entries if multiple specialties match same crew
                    if (!grouped.get(spec)!.find(c => c.id === crew.id)) {
                      grouped.get(spec)!.push(crew);
                    }
                  }
                }

                return Array.from(grouped.entries()).map(([specName, crews]) => {
                  const specKey = specName.toLowerCase().replace(/ (installation|building)$/, "");
                  const vis = DISCIPLINE_VIS[specKey] ?? { icon: "construction", color: "#ababa8" };

                  return (
                    <div key={specName} className="mb-4 last:mb-0">
                      {/* Section Header */}
                      <div
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2.5"
                        style={{ backgroundColor: `${vis.color}08`, borderLeft: `3px solid ${vis.color}` }}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ color: vis.color }}
                          translate="no"
                        >
                          {vis.icon}
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: vis.color }}>
                          {specName}
                        </span>
                        <span className="ml-auto text-[10px] text-[#474846] font-bold">
                          {crews.length} crew{crews.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Crew cards inside this group */}
                      <div className="space-y-2 pl-2">
                        {crews.map((crew) => (
                          <div
                            key={crew.id}
                            className="flex items-center gap-4 p-4 bg-[#1a1c1a] rounded-xl border border-[#474846]/20 hover:border-opacity-50 transition-all duration-200 group"
                            style={{ ["--accent" as string]: vis.color }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${vis.color}40`)}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                          >
                            {/* Avatar */}
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${vis.color}12`, border: `1px solid ${vis.color}25` }}
                            >
                              <span className="text-lg font-black" style={{ color: vis.color }}>
                                {crew.name.charAt(0).toUpperCase()}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-[#faf9f5] text-sm uppercase tracking-wide truncate">{crew.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {crew.matchedSpecialties.map((s, i) => {
                                  const sKey = s.toLowerCase().replace(/ (installation|building)$/, "");
                                  const sVis = DISCIPLINE_VIS[sKey] ?? { icon: "build", color: "#ababa8" };
                                  return (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase"
                                      style={{ backgroundColor: `${sVis.color}15`, color: sVis.color }}
                                    >
                                      {s}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Phone */}
                            {crew.phone && (
                              <span className="text-xs text-[#ababa8] font-mono shrink-0">{crew.phone}</span>
                            )}

                            {/* Action */}
                            <button
                              className="px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                              style={{
                                backgroundColor: `${vis.color}12`,
                                color: vis.color,
                                border: `1px solid ${vis.color}25`,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${vis.color}25`)}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `${vis.color}12`)}
                            >
                              Assign
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#474846]/20 flex items-center justify-between">
              <Link href="/crews" className="text-[#aeee2a] text-xs font-bold hover:underline">
                Manage All Crews →
              </Link>
              <button
                onClick={() => setCrewPopupOpen(false)}
                className="px-4 py-2 bg-[#242624] text-[#faf9f5] text-xs font-bold rounded-xl hover:bg-[#2e302e] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <style jsx>{`
            @keyframes fadeInScale {
              from { opacity: 0; transform: scale(0.95); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
