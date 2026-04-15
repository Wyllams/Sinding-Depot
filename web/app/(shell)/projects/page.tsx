"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { supabase } from "../../../lib/supabase";

// =============================================
// Construction Jobs | Command Center
// Rota: /projects
// Conectado ao Supabase — sem dados fake
// =============================================

const GATE_CONFIG: Record<string, { color: string; icon: string; title: string; desc: string }> = {
  NOT_CONTACTED: { color: "#ba1212", icon: "phone_disabled",  title: "Action Required",      desc: "Customer hasn't been contacted to schedule yet."            },
  READY:         { color: "#1f8742", icon: "check_circle",    title: "Cleared for Dispatch", desc: "Project is fully ready to start."                          },
  WINDOWS:       { color: "#165eb3", icon: "window",          title: "Waiting on Windows",   desc: "Production blocked pending window delivery."               },
  DOORS:         { color: "#f09a1a", icon: "door_front",      title: "Waiting on Doors",     desc: "Production blocked pending door delivery."                 },
  FINANCING:     { color: "#ebd27a", icon: "account_balance", title: "Pending Financing",    desc: "Waiting for funding approval before starting."             },
  MATERIALS:     { color: "#306870", icon: "inventory_2",     title: "Material Shortage",    desc: "Awaiting critical material delivery to site."              },
  HOA:           { color: "#9acbf0", icon: "gavel",           title: "HOA Approval",         desc: "Pending authorization from neighborhood committee."        },
  OTHER_REPAIRS: { color: "#d1a3f0", icon: "carpenter",       title: "Other Repairs First",  desc: "Blocked by preliminary structural repairs."               },
  NO_ANSWER:     { color: "#f2a074", icon: "voicemail",       title: "Customer Unreachable", desc: "Attempted contact, no reply yet."                         },
  PERMIT:        { color: "#747673", icon: "contract",        title: "Pending Permit",       desc: "Waiting on city or county permit clearance."              },
};

// Map job_status → display values
const STATUS_MAP: Record<string, { label: string; style: string }> = {
  active:             { label: "Ready to Start",    style: "bg-green-500/10 text-green-400 border border-green-500/20"          },
  draft:              { label: "Not Yet Contacted", style: "bg-[#ba1212]/10 text-[#ff4444] border border-[#ba1212]/40"          },
  pending_scheduling: { label: "Pending",           style: "bg-[#e3eb5d]/10 text-[#e3eb5d] border border-[#e3eb5d]/20"          },
  on_hold:            { label: "Pending",           style: "bg-[#e3eb5d]/10 text-[#e3eb5d] border border-[#e3eb5d]/20"          },
  completed:          { label: "Pending",           style: "bg-[#ababa8]/10 text-[#ababa8] border border-[#ababa8]/20"          },
  cancelled:          { label: "Pending",           style: "bg-[#ba1212]/10 text-[#ba1212] border border-[#ba1212]/20"          },
};

// SP color by salesperson name (first name prefix match)
function spColor(name: string): string {
  const lower = (name ?? "").toLowerCase();
  if (lower.startsWith("matt") || lower.startsWith("mat")) return "#22c55e";
  if (lower.startsWith("arm"))                              return "#ef4444";
  if (lower.startsWith("rub"))                              return "#a855f7";
  return "#60a5fa";
}

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  city: string;
  state: string;
  requested_start_date: string | null;
  customer: { full_name: string } | null;
  salesperson: { full_name: string } | null;
  services: { service_type: { name: string } | null }[];
  blocker_type: string | null; // derived from first open blocker
}

export default function ProjectsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("jobs")
        .select(`
          id,
          job_number,
          title,
          status,
          city,
          state,
          requested_start_date,
          customer:customers (full_name),
          salesperson:salespersons (full_name),
          services:job_services (
            service_type:service_types (name)
          ),
          blockers (
            type,
            status
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter)  query = query.eq("status", statusFilter);
      if (dateFrom)      query = query.gte("requested_start_date", dateFrom);
      if (dateTo)        query = query.lte("requested_start_date", dateTo);

      const { data, error } = await query;
      if (error) throw error;

      const mapped: Job[] = (data ?? []).map((j: any) => {
        // Derive gating status from first open blocker type
        const openBlocker = (j.blockers ?? []).find((b: any) => b.status === "open");
        let gate: string | null = null;
        if (openBlocker) {
          const t = (openBlocker.type ?? "").toUpperCase();
          if (t === "CUSTOMER") gate = "NOT_CONTACTED";
          else if (t === "PERMIT")   gate = "PERMIT";
          else if (t === "MATERIAL") gate = "MATERIALS";
          else if (t === "WEATHER")  gate = "OTHER_REPAIRS";
          else if (t === "CREW")     gate = "NO_ANSWER";
          else                       gate = "OTHER_REPAIRS";
        } else if (j.status === "active") {
          gate = "READY";
        } else {
          gate = "NOT_CONTACTED";
        }

        return {
          id: j.id,
          job_number: j.job_number,
          title: j.title,
          status: j.status,
          city: j.city,
          state: j.state,
          requested_start_date: j.requested_start_date,
          customer: j.customer,
          salesperson: j.salesperson,
          services: j.services ?? [],
          blocker_type: gate,
        };
      });

      setJobs(mapped);
    } catch (err) {
      console.error("[ProjectsPage] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Reset to page 1 whenever filters change
  const filtered = (() => {
    const base = jobs.filter((j) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        j.customer?.full_name?.toLowerCase().includes(q) ||
        j.job_number?.toLowerCase().includes(q) ||
        j.title?.toLowerCase().includes(q) ||
        j.city?.toLowerCase().includes(q)
      );
    }).filter((j) => {
      if (!serviceFilter) return true;
      return j.services.some((s) =>
        s.service_type?.name?.toLowerCase().includes(serviceFilter.toLowerCase())
      );
    });
    return base;
  })();

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      console.error("[ProjectsPage] delete error:", err);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  async function handleGateChange(jobId: string, gate: string) {
    // Map gate → job_status
    let newStatus = "active";
    if (gate === "READY") newStatus = "active";
    else if (gate === "NOT_CONTACTED") newStatus = "draft";
    else newStatus = "on_hold";

    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, blocker_type: gate, status: newStatus } : j))
    );

    await supabase.from("jobs").update({ status: newStatus as any }).eq("id", jobId);
  }

  return (
    <>
      <TopBar title="Command Center" />

      <main className="px-4 sm:px-6 lg:px-8 pb-12 pt-6 min-h-screen bg-[#0d0f0d]">

        {/* Page Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1
              className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#faf9f5] mb-2"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Projects
            </h1>
            {!loading && (
              <p className="text-[#ababa8] text-sm">
                <span className="text-[#aeee2a] font-bold">{jobs.length}</span> total projects
              </p>
            )}
          </div>
          <Link href="/new-project">
            <button
              className="bg-[#aeee2a] hover:bg-[#a0df14] text-[#3a5400] font-bold px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              <span className="material-symbols-outlined" translate="no">add_circle</span>
              New Project
            </button>
          </Link>
        </div>

        {/* ── Filters ── */}
        <div className="glass-card rounded-2xl px-6 py-5 mb-8 flex flex-wrap items-end gap-6">

          {/* Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Search</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#ababa8] text-[18px]" translate="no">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#242624] pl-9 pr-3 py-2 rounded-lg text-sm text-[#faf9f5] outline-none border-none w-48"
                placeholder="Client, job #..."
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#242624] px-3 py-2 rounded-lg text-sm text-[#faf9f5] cursor-pointer hover:bg-[#2a2d2a] transition-colors outline-none border-none appearance-none w-36"
            >
              <option value="">All Statuses</option>
              <option value="active">Confirmed (Ready to Start)</option>
              <option value="draft">Tentative (Not Yet Contacted)</option>
              <option value="pending_scheduling">Pending</option>
              <option value="on_hold">Pending (On Hold)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Services */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Services</label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="bg-[#242624] px-3 py-2 rounded-lg text-sm text-[#faf9f5] cursor-pointer hover:bg-[#2a2d2a] transition-colors outline-none border-none appearance-none w-36"
            >
              <option value="">All Services</option>
              <option value="siding">Siding</option>
              <option value="gutters">Gutters</option>
              <option value="painting">Painting</option>
              <option value="windows">Windows</option>
              <option value="decks">Decks</option>
              <option value="roofing">Roofing</option>
              <option value="dumpster">Dumpster</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-end gap-3 ml-auto">
            <CustomDatePicker value={dateFrom} onChange={setDateFrom} placeholder="Start" disableSundays={false} className="w-36" />
            <div className="flex flex-col items-center gap-1.5 pb-1">
              <span className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold whitespace-nowrap">Date Range</span>
              <span className="text-[#474846] text-sm font-black">→</span>
            </div>
            <CustomDatePicker value={dateTo} onChange={setDateTo} placeholder="End" disableSundays={false} className="w-36" alignRight />
          </div>
        </div>

        {/* ── Data Table ── */}
        <div className="bg-[#121412] rounded-3xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e201e]/50">
                {["SP", "Client", "Job #", "Services", "Gating / Operational Status", "Job Start Status", ""].map((col) => (
                  <th
                    key={col}
                    className={`px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#ababa8] ${col === "SP" ? "text-center" : ""}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#474846]/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-[#ababa8]">
                      <span className="material-symbols-outlined text-4xl animate-spin" translate="no">progress_activity</span>
                      <p className="text-sm font-bold">Loading projects...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-[#ababa8]">
                      <div className="w-14 h-14 rounded-full bg-[#1e201e] flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-[#aeee2a]" translate="no">engineering</span>
                      </div>
                      <p className="text-sm font-bold text-[#faf9f5]">No projects found</p>
                      <p className="text-xs">Try adjusting your filters or create a new project.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((job) => {
                  const gate = job.blocker_type ?? "READY";
                  const gateConf = GATE_CONFIG[gate] ?? GATE_CONFIG.READY;
                  const statusConf = STATUS_MAP[job.status] ?? STATUS_MAP.draft;
                  const spName = job.salesperson?.full_name ?? "?";
                  const spInitial = spName.charAt(0).toUpperCase();
                  const spCol = spColor(spName);


                  return (
                    <tr 
                      key={job.id} 
                      onClick={() => router.push(`/projects/${job.id}`)}
                      className="transition-colors group relative hover:bg-[#1e201e] cursor-pointer"
                    >

                      {/* SP */}
                      <td className="px-6 py-5">
                        <div
                          className="w-8 h-8 mx-auto rounded border flex items-center justify-center font-black text-xs shadow-inner uppercase"
                          style={{
                            backgroundColor: `${spCol}15`,
                            borderColor: `${spCol}40`,
                            color: spCol,
                          }}
                          title={spName}
                        >
                          {spInitial}
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-6 py-5">
                        <Link
                          href={`/projects/${job.id}`}
                          className="text-[#faf9f5] font-medium hover:text-[#aeee2a] hover:underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          {job.customer?.full_name ?? "—"}
                        </Link>
                        <p className="text-xs text-[#ababa8] mt-0.5">{job.city}, {job.state}</p>
                      </td>

                      {/* Job # */}
                      <td className="px-6 py-5 font-mono text-[#ababa8] text-sm">
                        #{job.job_number}
                      </td>

                      {/* Services */}
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                          {job.services.length === 0 ? (
                            <span className="text-xs text-[#474846]">—</span>
                          ) : (
                            job.services.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="bg-[#1a1c1a] border border-[#3e403e] rounded-md px-2.5 py-1 text-[10px] font-bold text-[#faf9f5] whitespace-nowrap shadow-sm"
                              >
                                {s.service_type?.name ?? "—"}
                              </span>
                            ))
                          )}
                          {job.services.length > 3 && (
                            <span className="text-[10px] text-[#ababa8] font-bold">
                              +{job.services.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Gating Status */}
                      <td className="px-6 py-4">
                        <div className="relative group/gate w-[210px]">
                          <select
                            onClick={(e) => e.stopPropagation()}
                            value={gate}
                            onChange={(e) => handleGateChange(job.id, e.target.value)}
                            className="w-full appearance-none bg-[#0a0a0a] border border-[#474846] rounded-xl pl-10 pr-8 py-2 text-[9px] font-black uppercase tracking-widest text-[#faf9f5] shadow-inner focus:outline-none focus:border-[#aeee2a] cursor-pointer transition-colors"
                          >
                            <option value="NOT_CONTACTED">🔴 NOT YET CONTACTED</option>
                            <option value="READY">🟢 READY TO START</option>
                            <option value="WINDOWS">🔵 WINDOWS</option>
                            <option value="DOORS">🟠 DOORS</option>
                            <option value="FINANCING">🟡 FINANCING</option>
                            <option value="MATERIALS">🪨 MATERIALS</option>
                            <option value="HOA">📄 HOA</option>
                            <option value="OTHER_REPAIRS">🛠️ OTHER REPAIRS</option>
                            <option value="NO_ANSWER">📴 NO ANSWER</option>
                            <option value="PERMIT">📋 PERMIT</option>
                          </select>
                          <div
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 pointer-events-none"
                            style={{
                              backgroundColor: `${gateConf.color}25`,
                              border: `1px solid ${gateConf.color}40`,
                            }}
                          >
                            <span
                              className="material-symbols-outlined text-[13px]"
                              style={{ color: gateConf.color }}
                              translate="no"
                            >
                              {gateConf.icon}
                            </span>
                          </div>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#ababa8]">
                            <span className="material-symbols-outlined text-[16px]" translate="no">expand_more</span>
                          </div>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full ${statusConf.style}`}>
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Delete action */}
                      <td className="px-6 py-5 text-right w-16">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({
                              id: job.id,
                              label: job.customer?.full_name ?? `#${job.job_number}`,
                            });
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 text-[#ababa8] hover:text-[#ff7351] hover:bg-[#ff7351]/10"
                          title="Delete project"
                        >
                          <span className="material-symbols-outlined text-lg" translate="no">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {!loading && filtered.length > 0 && (
          <div className="mt-6 flex items-center justify-between text-sm text-[#ababa8]">
            <span>
              Showing{" "}
              <span className="text-[#faf9f5] font-bold">
                {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="text-[#faf9f5] font-bold">{filtered.length}</span> projects
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#474846]/40 text-[#ababa8] hover:border-[#aeee2a] hover:text-[#aeee2a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-base" translate="no">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span key={`ellipsis-${p}`} className="text-[#474846] px-1">…</span>
                  )}
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      p === currentPage
                        ? "bg-[#aeee2a] text-[#121412]"
                        : "border border-[#474846]/40 text-[#ababa8] hover:border-[#aeee2a] hover:text-[#aeee2a]"
                    }`}
                  >
                    {p}
                  </button>
                </>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#474846]/40 text-[#ababa8] hover:border-[#aeee2a] hover:text-[#aeee2a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-base" translate="no">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#181a18] border border-[#474846]/30 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#ff7351]/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#ff7351] text-2xl" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Delete Project</h3>
                <p className="text-sm text-[#ababa8] mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-[#faf9f5] text-sm mb-8">
              Are you sure you want to delete the project for{" "}
              <span className="font-bold text-[#aeee2a]">{deleteTarget.label}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] font-bold hover:bg-[#242624] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={deletingId === deleteTarget.id}
                className="px-6 py-2.5 rounded-xl bg-[#ff7351] text-white font-bold hover:bg-[#e5623f] transition-all cursor-pointer active:scale-95 shadow-[0_0_20px_rgba(255,115,81,0.2)] disabled:opacity-50"
              >
                {deletingId === deleteTarget.id ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
