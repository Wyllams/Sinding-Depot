"use client";

import { TopBar } from "../../../components/TopBar";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";
import { NewServiceCallModal } from "../../../components/NewServiceCallModal";
import { ServiceReportPanel } from "../../../components/ServiceReportPanel";
import { useUndo } from "../../../components/UndoContext";
import { ManageListModal } from "../../../components/ManageListModal";

// =============================================
// Services — v2 (Updated disciplines, colored status, crew dropdown)
// =============================================

interface JobRef {
  job_number: string;
  title: string;
}

interface ProfileRef {
  full_name: string;
}

interface CrewRef {
  id: string;
  name: string;
}

interface ServiceCall {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  reported_at: string;
  is_signal: boolean;
  signal_acknowledged: boolean;
  inspection_result: string | null;
  crew_id: string | null;
  jobs?: any;
  profiles?: any;
  blocker_attachments?: { url: string }[] | null;
}

// ── Updated disciplines ────────────────────────────
const DISCIPLINES = ["Siding", "Doors", "Windows", "Paint", "Gutters", "Roofing"];

// ── Status colors ──────────────────────────────────
const STATUS_OPTIONS = ["open", "inspected", "repairing", "resolved"] as const;
type StatusType = typeof STATUS_OPTIONS[number];

const STATUS_CONFIG: Record<StatusType, { color: string; label: string }> = {
  open:      { color: "#ff7351", label: "Open" },
  inspected: { color: "#e3eb5d", label: "Inspected" },
  repairing: { color: "#60b8f5", label: "Repairing" },
  resolved:  { color: "#22c55e", label: "Resolved" },
};

export default function ServicesPage() {
  const { setUndo } = useUndo();
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [crews, setCrews] = useState<CrewRef[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceCall | null>(null);

  // Manage Crews Filter Modal
  const DEFAULT_CREW_FILTER = ["XICARA", "WILMAR", "SULA", "LUIS", "OSVIN", "VICTOR", "LEANDRO", "JOSUE"];
  const [serviceCrewFilter, setServiceCrewFilter] = useState<string[]>(DEFAULT_CREW_FILTER);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("serviceCrewFilter");
    if (stored) {
      try {
        let parsed = JSON.parse(stored) as string[];
        parsed = parsed.filter(n => n !== "CHICARA" && n !== "VITOR");
        setServiceCrewFilter(parsed);
        localStorage.setItem("serviceCrewFilter", JSON.stringify(parsed));
      } catch(e) {}
    }
  }, []);

  const handleAddFilterName = () => {
    const term = newFilterName.trim().toUpperCase();
    if (!term) return;
    if (serviceCrewFilter.includes(term)) {
      setNewFilterName("");
      return;
    }
    const next = [...serviceCrewFilter, term];
    setServiceCrewFilter(next);
    localStorage.setItem("serviceCrewFilter", JSON.stringify(next));
    setNewFilterName("");
  };

  const handleRemoveFilterName = (nameToRemove: string) => {
    const next = serviceCrewFilter.filter(n => n !== nameToRemove);
    setServiceCrewFilter(next);
    localStorage.setItem("serviceCrewFilter", JSON.stringify(next));
  };

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Edit modal
  const [editService, setEditService] = useState<ServiceCall | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string; description: string; status: string; type: string; crew_id: string;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Delete modal ──────────────────────────────
  const handleDelete = async (id: string) => {
    setIsLoading(true);

    const { data: originalData } = await supabase.from("blockers").select("*").eq("id", id).single();

    const { error } = await supabase.from("blockers").delete().eq("id", id);
    if (!error) {
      setServiceCalls((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);

      if (originalData) {
        setUndo(`Serviço excluído`, async () => {
          const { error: undoErr } = await supabase.from("blockers").insert(originalData);
          if (!undoErr) {
            fetchData();
          } else {
            console.error("Undo falhou ao restaurar o serviço:", undoErr);
          }
        });
      }
    }
    setIsLoading(false);
  };

  // ── Fetch ──────────────────────────────────────
  const fetchData = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    const [{ data: svcData, error: svcErr }, { data: crewData }] = await Promise.all([
      supabase
        .from("blockers")
        .select(`
          id, title, description, status, type, reported_at,
          is_signal, signal_acknowledged, inspection_result, crew_id,
          jobs ( job_number, title ),
          profiles!blockers_resolved_by_profile_id_fkey ( full_name ),
          blocker_attachments ( url )
        `)
        .order("reported_at", { ascending: false }),
      supabase.from("crews").select("id, name").eq("active", true).order("name"),
    ]);

    if (svcErr) console.error("Error fetching service calls:", svcErr);
    else setServiceCalls((svcData || []) as ServiceCall[]);

    setCrews((crewData || []) as CrewRef[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Inline update ──────────────────────────────
  const updateField = async (id: string, field: string, value: string | null): Promise<void> => {
    const { error } = await supabase
      .from("blockers")
      .update({ [field]: value })
      .eq("id", id);

    if (error) {
      console.error(`Error updating ${field}:`, error);
      return;
    }

    setServiceCalls((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  // ── Acknowledge signal ─────────────────────────
  const acknowledgeSignal = async (id: string): Promise<void> => {
    await updateField(id, "signal_acknowledged", "true");
  };

  // ── Edit modal ─────────────────────────────────
  const openEdit = (s: ServiceCall): void => {
    setEditService(s);
    setEditForm({
      title: s.title,
      description: s.description,
      status: s.status,
      type: s.type,
      crew_id: s.crew_id || "",
    });
  };

  const handleEditSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editService || !editForm) return;
    setEditSaving(true);

    const { error } = await supabase
      .from("blockers")
      .update({
        title: editForm.title,
        description: editForm.description,
        status: editForm.status,
        type: editForm.type,
        crew_id: editForm.crew_id || null,
      })
      .eq("id", editService.id);

    if (error) {
      console.error("Error updating service:", error);
    } else {
      setEditService(null);
      setEditForm(null);
      await fetchData();
    }
    setEditSaving(false);
  };

  // ── Filtered list ──────────────────────────────
  const filtered = serviceCalls.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterType !== "all" && s.type !== filterType) return false;
    return true;
  });

  // ── Signal count (unacknowledged) ──────────────
  const signalCount = serviceCalls.filter((s) => s.is_signal && !s.signal_acknowledged).length;

  const getStatusColor = (status: string): string =>
    STATUS_CONFIG[status as StatusType]?.color || "#ababa8";

  const formatId = (id: string): string => "#" + id.substring(0, 4).toUpperCase();

  const handleSuccess = (): void => {
    setIsModalOpen(false);
    setSelectedService(null);
    fetchData();
  };

  const getCrewName = (crewId: string | null): string => {
    if (!crewId) return "Unassigned";
    return crews.find((c) => c.id === crewId)?.name || "Unknown";
  };

  const matchedCrews = crews.filter(crew => {
    const upperName = crew.name.toUpperCase();
    return serviceCrewFilter.some(prefix => upperName.includes(prefix)) && !upperName.includes("02");
  });

  // Include filtered names that do not exist in the database yet (visual only)
  const displayCrews = [...matchedCrews];
  serviceCrewFilter.forEach(filterName => {
    if (!displayCrews.some(c => c.name.toUpperCase().includes(filterName))) {
      displayCrews.push({ id: filterName, name: filterName });
    }
  });

  return (
    <>
      <TopBar title="Services" />

      <NewServiceCallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />

      <ServiceReportPanel
        isOpen={!!selectedService}
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onSuccess={handleSuccess}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 min-h-screen">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-[#faf9f5] tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Services
            </h2>
            <p className="text-[#ababa8] mt-2 text-sm">
              Managing{" "}
              <span className="text-[#aeee2a] font-bold">
                {serviceCalls.filter((s) => s.status === "open").length} active service calls
              </span>{" "}
              across operations
              {signalCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff7351]/15 text-[#ff7351] text-[10px] font-bold animate-pulse">
                  <span className="material-symbols-outlined text-[12px]" translate="no">notifications_active</span>
                  {signalCount} alert{signalCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#1e201e] hover:bg-[#242624] text-[#faf9f5] font-semibold rounded-xl flex items-center gap-2 transition-all text-sm">
              <span className="material-symbols-outlined text-sm" translate="no">download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#aeee2a] text-[#3a5400] font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-[#aeee2a]/10 active:scale-95 transition-all text-sm"
            >
              <span className="material-symbols-outlined text-sm" translate="no">add</span>
              <span className="hidden sm:inline">New Service Call</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-6 justify-between">
          {/* Status pills */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest px-1">Status</label>
            <div className="flex bg-[#121412] p-1 rounded-full w-fit max-w-full overflow-x-auto gap-0.5">
              {[{ key: "all", label: "All" }, ...STATUS_OPTIONS.map((s) => ({ key: s, label: STATUS_CONFIG[s].label }))].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilterStatus(opt.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    filterStatus === opt.key
                      ? "text-[#3a5400]"
                      : "text-[#ababa8] hover:text-[#faf9f5]"
                  }`}
                  style={filterStatus === opt.key ? {
                    backgroundColor: opt.key === "all" ? "#aeee2a" : STATUS_CONFIG[opt.key as StatusType]?.color || "#aeee2a",
                    color: opt.key === "all" ? "#3a5400" : "#121412",
                  } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discipline pills */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest px-1">Discipline / Type</label>
            <div className="flex bg-[#121412] p-1 rounded-full overflow-x-auto w-fit max-w-full gap-0.5">
              <button
                onClick={() => setFilterType("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  filterType === "all" ? "bg-[#aeee2a] text-[#3a5400]" : "text-[#ababa8] hover:text-[#faf9f5]"
                }`}
              >
                All
              </button>
              {DISCIPLINES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t.toLowerCase())}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    filterType === t.toLowerCase() ? "bg-[#242624] text-[#faf9f5] font-bold" : "text-[#ababa8] hover:text-[#faf9f5]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#121412] rounded-xl shadow-2xl border border-[#474846]/10">
          <div className="overflow-x-auto overflow-y-visible min-h-[220px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#1e201e]/50">
                  {["ID", "Title", "Project", "Status", "Assigned To", "Type", "Date", "Signal", ""].map((col, i) => (
                    <th
                      key={col}
                      className={`px-5 py-4 text-[10px] font-extrabold text-[#ababa8] uppercase tracking-widest ${
                        ["Status", "Assigned To", "Type", "Signal", ""].includes(col) ? "text-center" : col === "Date" ? "text-right" : "text-left"
                      }`}
                    >
                      <div className={`flex items-center gap-2 ${col === "Assigned To" ? "justify-center" : ""}`}>
                        {col}
                        {col === "Assigned To" && (
                          <button
                            onClick={() => setIsFilterModalOpen(true)}
                            title="Manage Assigned Crew Filter"
                            className="w-5 h-5 flex items-center justify-center rounded bg-[#1e201e] text-[#ababa8] hover:text-[#aeee2a] hover:bg-[#242624] border border-[#474846]/30 transition-all ml-1"
                          >
                            <span className="material-symbols-outlined text-[13px]" translate="no">edit</span>
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#474846]/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-[#aeee2a]/30 border-t-[#aeee2a] rounded-full animate-spin" />
                        <span className="text-[#ababa8] text-sm">Loading service calls...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-[#ababa8] text-sm">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-30" translate="no">construction</span>
                      No service calls found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((issue) => {
                    const statusColor = getStatusColor(issue.status);

                    return (
                      <tr
                        key={issue.id}
                        className="group hover:bg-[#242624]/50 transition-colors"
                      >
                        {/* ID */}
                        <td className="px-5 py-4 text-sm font-mono text-[#ababa8]">{formatId(issue.id)}</td>

                        {/* Title + Description */}
                        <td className="px-5 py-4 cursor-pointer text-left" onClick={() => setSelectedService(issue)}>
                          <div className="flex flex-col">
                            <span className="text-[#faf9f5] font-semibold text-sm hover:text-[#aeee2a] transition-colors">{issue.title}</span>
                            <span className="text-xs text-[#ababa8] truncate max-w-[200px]">{issue.description}</span>
                          </div>
                        </td>

                        {/* Project */}
                        <td className="px-5 py-4 text-sm text-[#faf9f5] text-left">
                          <span className="font-bold">{issue.jobs?.job_number || "—"}</span>
                          {issue.jobs?.title && <span className="text-[#ababa8]"> — {issue.jobs.title}</span>}
                        </td>

                        {/* Status — colored dropdown */}
                        <td className="px-5 py-4 text-center">
                          <select
                            value={issue.status}
                            onChange={(e) => updateField(issue.id, "status", e.target.value)}
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tight border outline-none cursor-pointer appearance-none mx-auto block"
                            style={{
                              backgroundColor: `${statusColor}15`,
                              color: statusColor,
                              borderColor: `${statusColor}30`,
                              minWidth: "90px",
                              textAlign: "center"
                            }}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s} className="bg-[#121412] text-[#faf9f5]">
                                {STATUS_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Assigned To — crew dropdown */}
                        <td className="px-5 py-4 text-center">
                          <select
                            value={issue.crew_id || ""}
                            onChange={(e) => updateField(issue.id, "crew_id", e.target.value || null)}
                            className="bg-[#1e201e] border border-[#474846]/20 text-[#faf9f5] rounded-lg px-2 py-1 text-xs font-bold outline-none focus:border-[#aeee2a]/40 transition-colors appearance-none cursor-pointer mx-auto block"
                            style={{ minWidth: "110px", textAlign: "center" }}
                          >
                            <option value="" className="bg-[#121412]">Unassigned</option>
                            {displayCrews.map((c) => (
                              <option key={c.id} value={c.id} className="bg-[#121412]">{c.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-[#ababa8] bg-[#242624] inline-block">
                            {issue.type}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-right text-xs font-bold text-[#faf9f5]">
                          {new Date(issue.reported_at).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                        </td>

                        {/* Signal indicator */}
                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            {issue.is_signal && !issue.signal_acknowledged && (
                              <button
                                onClick={() => acknowledgeSignal(issue.id)}
                                title="Inspection report received — click to acknowledge"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#ff7351]/15 border border-[#ff7351]/30 animate-pulse hover:animate-none hover:bg-[#ff7351]/25 transition-all"
                              >
                                <span className="material-symbols-outlined text-[#ff7351] text-[16px]" translate="no">notifications_active</span>
                              </button>
                            )}
                            {issue.is_signal && issue.signal_acknowledged && (
                              <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#22c55e]/10">
                                <span className="material-symbols-outlined text-[#22c55e] text-[14px]" translate="no">check</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Edit Dropdown Trigger */}
                        <td className="px-5 py-4 relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDropdownOpen(dropdownOpen === issue.id ? null : issue.id); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#ababa8] hover:text-[#faf9f5] hover:bg-[#242624] transition-all ml-auto relative z-10"
                          >
                            <span className="material-symbols-outlined text-[16px]" translate="no">edit</span>
                          </button>
                          
                          {dropdownOpen === issue.id && (
                            <div className="absolute top-[calc(100%+4px)] right-0 w-32 bg-[#181a18] border border-[#ff7351]/0 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-[9999] text-left border-[#aeee2a]/20" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => { setDropdownOpen(null); openEdit(issue); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#faf9f5] hover:bg-[#242624] transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px] text-[#aeee2a]" translate="no">edit</span>
                                Edit
                              </button>
                              <button
                                onClick={() => { setDropdownOpen(null); setDeleteConfirm(issue.id); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-[#ff7351] hover:bg-[#ff7351]/10 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]" translate="no">delete</span>
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-[#474846]/10 flex items-center justify-between text-[11px] font-bold tracking-widest uppercase text-[#ababa8]">
            <span className="text-[#faf9f5]">
              <span className="text-[#aeee2a]">{filtered.length}</span> of {serviceCalls.length} records
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          EDIT SERVICE CALL MODAL
      ══════════════════════════════════════════════ */}
      {editService && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setEditService(null); setEditForm(null); } }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-8 relative"
            style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.15)" }}
          >
            <button
              onClick={() => { setEditService(null); setEditForm(null); }}
              className="absolute top-5 right-5 text-[#ababa8] hover:text-[#faf9f5] transition-colors"
            >
              <span className="material-symbols-outlined" translate="no">close</span>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#aeee2a] text-[18px]" translate="no">edit</span>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Edit Service Call</h2>
                <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest">{formatId(editService.id)}</p>
              </div>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Title</label>
                <input required type="text" value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Description</label>
                <textarea rows={3} value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer">
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Discipline</label>
                  <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer">
                    {DISCIPLINES.map((d) => <option key={d} value={d.toLowerCase()}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Assigned Crew</label>
                <select value={editForm.crew_id} onChange={(e) => setEditForm({ ...editForm, crew_id: e.target.value })}
                  className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer">
                  <option value="">Unassigned</option>
                  {crews.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setEditService(null); setEditForm(null); }}
                  className="flex-1 py-3 bg-[#1e201e] text-[#faf9f5] font-bold rounded-xl border border-[#474846]/20 hover:bg-[#242624] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-3 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  {editSaving ? <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MANAGE CREWS FILTER MODAL
      ══════════════════════════════════════════════ */}
      <ManageListModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title="Manage Employees"
        subtitle="Add or Remove from Crew Filter"
        items={serviceCrewFilter}
        onAdd={(item) => {
          if (!serviceCrewFilter.includes(item)) {
            const newList = [...serviceCrewFilter, item].sort();
            setServiceCrewFilter(newList);
            localStorage.setItem("siding_service_crew_filter", JSON.stringify(newList));
          }
        }}
        onRemove={(item) => {
          const newList = serviceCrewFilter.filter(c => c !== item);
          setServiceCrewFilter(newList);
          localStorage.setItem("siding_service_crew_filter", JSON.stringify(newList));
        }}
        inputPlaceholder="Employee name (e.g. WILL)"
        addLabel="Add Custom Employee"
        listTitle="Filter Employees"
        icon="badge"
      />

      {/* ══════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
      ══════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        >
          <div className="bg-[#1a1c1a] border border-[#ff7351]/30 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 bg-[#ff7351]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#ff7351] text-2xl" translate="no">warning</span>
            </div>
            <h3 className="text-lg font-bold text-[#faf9f5] mb-2">Delete Service Call?</h3>
            <p className="text-sm text-[#ababa8] mb-6">Are you sure you want to delete this service call?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-[#242624] text-[#faf9f5] font-bold rounded-xl hover:bg-[#2a2c2a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-[#ff7351] text-white font-bold rounded-xl hover:bg-[#ff7351]/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
