"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, Fragment } from "react";
import { TopBar } from "../../../components/TopBar";
import DateRangePicker from "../../../components/DateRangePicker";
import { CustomDropdown } from "../../../components/CustomDropdown";
import { supabase } from "../../../lib/supabase";
import { useUndo } from "../../../components/UndoContext";

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

const STATUS_MAP: Record<string, { label: string; style: string }> = {
  pending:     { label: "Pending",     style: "bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20" },
  tentative:   { label: "Tentative",   style: "bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20" },
  scheduled:   { label: "Confirmed",   style: "bg-[#60b8f5]/10 text-[#60b8f5] border border-[#60b8f5]/20" },
  in_progress: { label: "In Progress", style: "bg-primary/10 text-primary border border-primary/20" },
  done:        { label: "Done",        style: "bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20" },
};

// SP color by salesperson name (first name prefix match)
function spColor(name: string): string {
  const lower = (name ?? "").toLowerCase();
  if (lower.startsWith("matheus") || lower.startsWith("mat")) return "#22c55e";
  if (lower.startsWith("arm"))                              return "#ef4444";
  if (lower.startsWith("rub"))                              return "#a855f7";
  return "#60a5fa";
}

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  gate_status: string | null; // saved in DB
  city: string;
  state: string;
  requested_start_date: string | null;
  customer: { full_name: string; clickone_contact_id?: string | null } | null;
  salesperson: { full_name: string } | null;
  services: { service_type: { name: string } | null }[];
  blocker_type: string | null; // gate exibido (prioridade: gate_status > derivado)
}

export default function ProjectsPage() {
  const { setUndo } = useUndo();
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
          gate_status,
          city,
          state,
          requested_start_date,
          contract_signed_at,
          customer:customers (full_name, clickone_contact_id),
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

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }
      if (dateFrom)      query = query.gte("contract_signed_at", dateFrom);
      if (dateTo)        query = query.lte("contract_signed_at", dateTo);

      const { data, error } = await query;
      if (error) throw error;

      const mapped: Job[] = (data ?? []).map((j: any) => {
        // Prioridade: gate_status salvo no DB → fallback: deriva dos blockers
        let gate: string;
        if (j.gate_status && GATE_CONFIG[j.gate_status]) {
          gate = j.gate_status;
        } else {
          const openBlocker = (j.blockers ?? []).find((b: any) => b.status === "open");
          if (openBlocker) {
            const t = (openBlocker.type ?? "").toUpperCase();
            if (t === "CUSTOMER") gate = "NOT_CONTACTED";
            else if (t === "PERMIT")   gate = "PERMIT";
            else if (t === "MATERIAL") gate = "MATERIALS";
            else if (t === "WEATHER")  gate = "OTHER_REPAIRS";
            else if (t === "CREW")     gate = "NO_ANSWER";
            else                       gate = "OTHER_REPAIRS";
          } else if (j.status === "scheduled" || j.status === "in_progress" || j.status === "done") {
            gate = "READY";
          } else {
            gate = "NOT_CONTACTED";
          }
        }

        return {
          id: j.id,
          job_number: j.job_number,
          title: j.title,
          status: j.status,
          gate_status: j.gate_status ?? null,
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

    // Realtime Listener
    const channel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJobs]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, serviceFilter, dateFrom, dateTo, search]);

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
      const { data: originalData } = await supabase.from("jobs").select("*").eq("id", id).single();

      // ── Storage cleanup: delete all files associated with this project ──
      try {
        // 1. Delete service call (blocker) attachments from storage
        const { data: blockers } = await supabase.from("blockers").select("id").eq("job_id", id);
        if (blockers && blockers.length > 0) {
          for (const blocker of blockers) {
            const folder = `service-calls/${blocker.id}`;
            const { data: files } = await supabase.storage.from("attachments").list(folder);
            if (files && files.length > 0) {
              const paths = files.map((f) => `${folder}/${f.name}`);
              await supabase.storage.from("attachments").remove(paths);
            }
          }
        }

        // 2. Delete change order attachments from storage
        const { data: changeOrders } = await supabase.from("change_orders").select("id").eq("job_id", id);
        if (changeOrders && changeOrders.length > 0) {
          for (const co of changeOrders) {
            const folder = `change-orders/${co.id}`;
            const { data: files } = await supabase.storage.from("attachments").list(folder);
            if (files && files.length > 0) {
              const paths = files.map((f) => `${folder}/${f.name}`);
              await supabase.storage.from("attachments").remove(paths);
            }
          }
        }

        // 3. Delete document files from storage
        const { data: documents } = await supabase.from("documents").select("url").eq("job_id", id);
        if (documents && documents.length > 0) {
          const storagePaths = documents
            .map((d) => {
              try {
                const url = new URL(d.url);
                const match = url.pathname.match(/\/object\/public\/(.+)/);
                return match ? match[1].replace(/^attachments\//, "") : null;
              } catch { return null; }
            })
            .filter(Boolean) as string[];
          if (storagePaths.length > 0) {
            await supabase.storage.from("attachments").remove(storagePaths);
          }
        }
      } catch (storageErr) {
        console.warn("[ProjectsPage] Storage cleanup warning (non-blocking):", storageErr);
      }

      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
      setJobs((prev) => prev.filter((j) => j.id !== id));

      if (originalData) {
        setUndo(`Projeto ${originalData.job_number || "removido"}`, async () => {
          const { error: undoErr } = await supabase.from("jobs").insert(originalData);
          if (!undoErr) {
            fetchJobs();
          } else {
            console.error("[ProjectsPage] Undo falhou ao restaurar o projeto:", undoErr);
          }
        });
      }
    } catch (err) {
      console.error("[ProjectsPage] delete error:", err);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  async function handleGateChange(jobId: string, gate: string) {
    // Only update gate_status (Gating / Operational Status).
    // Job Start Status (status) is controlled exclusively by the Schedule/Calendar page.
    // These two fields are INDEPENDENT.

    // Optimistic update (gate fields only — status untouched)
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, blocker_type: gate, gate_status: gate }
          : j
      )
    );

    // Persist only gate_status in DB — do NOT touch the status field
    await supabase
      .from("jobs")
      .update({ gate_status: gate })
      .eq("id", jobId);
  }

  return (
    <>
      <TopBar />

      <main className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-background">

        {/* ── STICKY HEADER + FILTERS ── */}
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 pt-6">

        {/* Page Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1
              className="text-2xl sm:text-4xl font-extrabold tracking-tight text-on-surface mb-2"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Projects
            </h1>
            {!loading && (
              <p className="text-on-surface-variant text-sm">
                <span className="text-primary font-bold">{jobs.length}</span> total projects
              </p>
            )}
          </div>
          <Link href="/new-project">
            <button
              className="bg-primary hover:bg-[#a0df14] text-[#3a5400] font-bold px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
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
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Search</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" translate="no">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-surface-container-highest pl-9 pr-3 py-2 rounded-lg text-sm text-on-surface outline-none border-none w-full sm:w-48"
                placeholder="Client, job #..."
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Status</label>
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: "pending", label: "Pending" },
                { value: "tentative", label: "Tentative" },
                { value: "scheduled", label: "Confirmed" },
                { value: "in_progress", label: "In Progress" },
                { value: "done", label: "Done" },
              ]}
              placeholder="All Statuses"
              className="w-full sm:w-36 bg-surface-container-highest px-3 py-2 rounded-lg text-sm text-on-surface cursor-pointer hover:bg-surface-container transition-colors flex justify-between items-center"
            />
          </div>

          {/* Services */}
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Services</label>
            <CustomDropdown
              value={serviceFilter}
              onChange={(val) => setServiceFilter(val)}
              options={[
                { value: "siding", label: "Siding" },
                { value: "gutters", label: "Gutters" },
                { value: "painting", label: "Painting" },
                { value: "windows", label: "Windows" },
                { value: "decks", label: "Decks" },
                { value: "roofing", label: "Roofing" },
                { value: "dumpster", label: "Dumpster" }
              ]}
              placeholder="All Services"
              className="w-full sm:w-36 bg-surface-container-highest px-3 py-2 rounded-lg text-sm text-on-surface cursor-pointer hover:bg-surface-container transition-colors flex justify-between items-center"
            />
          </div>

          {/* Date Range */}
          <div className="flex flex-1 sm:flex-none items-end justify-end sm:ml-auto w-full sm:w-auto">
            <DateRangePicker
              startDate={dateFrom}
              endDate={dateTo}
              onRangeChange={(start, end) => {
                setDateFrom(start);
                setDateTo(end);
              }}
              placeholder="Filter by Sold Date"
              className="w-full sm:w-auto"
              alignRight
            />
          </div>
        </div>

        </div>{/* end sticky header */}

        {/* ── Data Table ── */}
        <div className="flex-1 overflow-hidden flex flex-col px-4 sm:px-6 lg:px-8 pb-4 min-h-0">
        <div className="bg-surface-container-low rounded-3xl overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-auto flex-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#474846 transparent" }}>
          <table className="w-full min-w-[1100px] text-left border-collapse">
            <thead className="sticky top-0 z-20">
              <tr style={{ boxShadow: "0 1px 0 rgba(71,72,70,0.2)" }}>
                {["SP", "ID", "Client", "Job", "Services", "Gating / Operational Status", "Job Start Status", ""].map((col) => (
                  <th
                    key={col}
                    className={`px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-on-surface-variant bg-surface-container-low ${col === "SP" ? "text-center" : ""}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-4xl animate-spin" translate="no">progress_activity</span>
                      <p className="text-sm font-bold">Loading projects...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                      <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl text-primary" translate="no">engineering</span>
                      </div>
                      <p className="text-sm font-bold text-on-surface">No projects found</p>
                      <p className="text-xs">Try adjusting your filters or create a new project.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((job) => {
                  const gate = job.blocker_type ?? "READY";
                  const gateConf = GATE_CONFIG[gate] ?? GATE_CONFIG.READY;
                  const statusConf = STATUS_MAP[job.status] ?? STATUS_MAP.tentative;
                  const spName = job.salesperson?.full_name ?? "?";
                  const spInitial = spName.charAt(0).toUpperCase();
                  const spCol = spColor(spName);


                  return (
                    <tr 
                      key={job.id} 
                      onClick={() => router.push(`/projects/${job.id}`)}
                      className="transition-colors group relative hover:bg-surface-container-high cursor-pointer"
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

                      {/* ID */}
                      <td className="px-6 py-5">
                        <span 
                          className="text-[10px] font-mono text-on-surface-variant bg-surface-container py-1 px-2 rounded border border-outline-variant/30 cursor-help"
                          title={job.customer?.clickone_contact_id || ""}
                        >
                          {job.customer?.clickone_contact_id 
                            ? job.customer.clickone_contact_id.substring(0, 6) + "..." 
                            : "—"}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="px-6 py-5">
                        <Link
                          href={`/projects/${job.id}`}
                          className="text-on-surface font-medium hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
                        >
                          {job.customer?.full_name ?? "—"}
                        </Link>
                        <p className="text-xs text-on-surface-variant mt-0.5">{job.city}, {job.state}</p>
                      </td>

                      {/* Job # */}
                      <td className="px-6 py-5 font-mono text-on-surface-variant text-sm">
                        {job.job_number}
                      </td>

                      {/* Services */}
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                          {job.services.length === 0 ? (
                            <span className="text-xs text-outline-variant">—</span>
                          ) : (
                            job.services.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="bg-surface-container-high border border-[#3e403e] rounded-md px-2.5 py-1 text-[10px] font-bold text-on-surface whitespace-nowrap shadow-sm"
                              >
                                {s.service_type?.name ?? "—"}
                              </span>
                            ))
                          )}
                          {job.services.length > 3 && (
                            <span className="text-[10px] text-on-surface-variant font-bold">
                              +{job.services.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Gating Status */}
                      <td className="px-6 py-4">
                        <div className="relative group/gate w-[210px]">
                          <div onClick={(e) => e.stopPropagation()}>
                            <CustomDropdown
                              value={gate}
                              onChange={(val) => handleGateChange(job.id, val)}
                              options={[
                                { value: "NOT_CONTACTED", label: "NOT YET CONTACTED" },
                                { value: "READY", label: "READY TO START" },
                                { value: "WINDOWS", label: "WINDOWS" },
                                { value: "DOORS", label: "DOORS" },
                                { value: "FINANCING", label: "FINANCING" },
                                { value: "MATERIALS", label: "MATERIALS" },
                                { value: "HOA", label: "HOA" },
                                { value: "OTHER_REPAIRS", label: "OTHER REPAIRS" },
                                { value: "NO_ANSWER", label: "NO ANSWER" },
                                { value: "PERMIT", label: "PERMIT" }
                              ]}
                              className="w-full bg-surface-container border border-outline-variant rounded-xl pl-9 pr-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-on-surface hover:border-primary transition-colors flex justify-between items-center"
                            />
                          </div>
                          <div
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 pointer-events-none z-10"
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
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full whitespace-nowrap ${statusConf.style}`}>
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
                              label: job.customer?.full_name ?? job.job_number,
                            });
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error hover:bg-error/10"
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
          <div className="shrink-0 flex items-center justify-between px-6 py-3 border-t" style={{ borderColor: "rgba(71,72,70,0.2)" }}>
            <span className="text-sm text-on-surface-variant">
              Showing{" "}
              <span className="text-on-surface font-bold">
                {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="text-on-surface font-bold">{filtered.length}</span> projects
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/40 text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-base" translate="no">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, idx, arr) => (
                <Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="text-outline-variant px-1">…</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      p === currentPage
                        ? "bg-primary text-surface-container-low"
                        : "border border-outline-variant/40 text-on-surface-variant hover:border-primary hover:text-primary"
                    }`}
                  >
                    {p}
                  </button>
                </Fragment>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-outline-variant/40 text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <span className="material-symbols-outlined text-base" translate="no">chevron_right</span>
              </button>
            </div>
          </div>
        )}
        </div>
        </div>
      </main>

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-error text-2xl" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Delete Project</h3>
                <p className="text-sm text-on-surface-variant mt-0.5">Are you absolutely sure?</p>
              </div>
            </div>
            <p className="text-on-surface text-sm mb-8">
              Are you sure you want to delete the project for{" "}
              <span className="font-bold text-primary">{deleteTarget.label}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-bold hover:bg-surface-container-highest transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={deletingId === deleteTarget.id}
                className="px-6 py-2.5 rounded-xl bg-error text-white font-bold hover:bg-[#e5623f] transition-all cursor-pointer active:scale-95 shadow-[0_0_20px_rgba(255,115,81,0.2)] disabled:opacity-50"
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
