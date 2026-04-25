"use client";

import { TopBar } from "../../../components/TopBar";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { CustomDropdown } from "../../../components/CustomDropdown";
import { NewServiceCallModal } from "../../../components/NewServiceCallModal";
import { ServiceReportPanel } from "../../../components/ServiceReportPanel";
import { useUndo } from "../../../components/UndoContext";
import { compressImage } from "../../../lib/compressImage";
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
  const [search, setSearch] = useState("");

  // ── Service Reports Tab ──
  const [servicesTab, setServicesTab] = useState<"calls" | "reports">("calls");
  const [serviceReports, setServiceReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsFilter, setReportsFilter] = useState<"all" | "pending" | "reviewed">("all");

  // Edit modal
  const [editService, setEditService] = useState<ServiceCall | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string; description: string; status: string; type: string; crew_id: string;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editExistingPhotos, setEditExistingPhotos] = useState<{ id: string; url: string }[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [editPhotosToDelete, setEditPhotosToDelete] = useState<string[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Lightbox for full-screen image/video preview
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<"image" | "video" | "other">("image");

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
          jobs ( job_number, title, customer:customers ( full_name ) ),
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
  const openEdit = async (s: ServiceCall): Promise<void> => {
    setEditService(s);
    setEditForm({
      title: s.title,
      description: s.description,
      status: s.status,
      type: s.type,
      crew_id: s.crew_id || "",
    });
    setEditNewFiles([]);
    setEditPhotosToDelete([]);

    // Load existing attachments from DB
    const { data } = await supabase
      .from("blocker_attachments")
      .select("id, url")
      .eq("blocker_id", s.id);
    setEditExistingPhotos((data || []) as { id: string; url: string }[]);
  };

  const handleEditSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editService || !editForm) return;
    setEditSaving(true);

    try {
      // 1. Update the blocker fields
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

      if (error) throw error;

      // 2. Delete removed photos
      if (editPhotosToDelete.length > 0) {
        await supabase
          .from("blocker_attachments")
          .delete()
          .in("id", editPhotosToDelete);
      }

      // 3. Upload new files
      if (editNewFiles.length > 0) {
        const urls: string[] = [];
        for (const rawFile of editNewFiles) {
          const file = await compressImage(rawFile);
          const ext = file.name.split(".").pop();
          const path = `service-calls/${editService.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage.from("attachments").upload(path, file);
          if (upErr) { console.error("Upload error:", upErr); continue; }
          const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);
          urls.push(urlData.publicUrl);
        }
        if (urls.length > 0) {
          await supabase.from("blocker_attachments").insert(
            urls.map(url => ({ blocker_id: editService.id, url, uploaded_at: new Date().toISOString() }))
          );
        }
      }

      setEditService(null);
      setEditForm(null);
      setEditExistingPhotos([]);
      setEditNewFiles([]);
      setEditPhotosToDelete([]);
      await fetchData();
    } catch (err: any) {
      console.error("Error updating service:", err);
    } finally {
      setEditSaving(false);
    }
  };

  // ── Filtered list ──────────────────────────────
  const filtered = serviceCalls.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (filterType !== "all" && s.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      const jobMatch = s.jobs?.job_number?.toLowerCase().includes(q) || false;
      const titleMatch = s.title?.toLowerCase().includes(q) || false;
      const clientMatch = s.jobs?.customer?.full_name?.toLowerCase().includes(q) || false;
      if (!jobMatch && !titleMatch && !clientMatch) return false;
    }
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


  // ── Fetch service reports ──
  const fetchServiceReports = async () => {
    setReportsLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_reports")
        .select(`
          id, blocker_id, is_our_fault, notes, reported_at, reviewed_by, reviewed_at,
          reporter:profiles!service_reports_reporter_id_fkey ( full_name ),
          blocker:blockers!service_reports_blocker_id_fkey ( id, title, type, status, jobs ( job_number, title ) ),
          service_report_attachments ( url, file_name )
        `)
        .order("reported_at", { ascending: false });
      if (error) console.error("[ServiceReports] fetch error:", error);
      else setServiceReports(data || []);
    } catch (err) { console.error("[ServiceReports] error:", err); }
    finally { setReportsLoading(false); }
  };

  useEffect(() => { if (servicesTab === "reports") fetchServiceReports(); }, [servicesTab]);

  const filteredReports = serviceReports.filter((r: any) => {
    if (reportsFilter === "pending") return !r.reviewed_at;
    if (reportsFilter === "reviewed") return !!r.reviewed_at;
    return true;
  });

  const markReportReviewed = async (reportId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("service_reports").update({ reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", reportId);
    fetchServiceReports();
  };
  return (
    <>
      <TopBar />

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
              className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Services
            </h2>
            <p className="text-on-surface-variant mt-2 text-sm">
              Managing{" "}
              <span className="text-primary font-bold">
                {serviceCalls.filter((s) => s.status === "open").length} active service calls
              </span>{" "}
              across operations
              {signalCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error/15 text-error text-[10px] font-bold animate-pulse">
                  <span className="material-symbols-outlined text-[12px]" translate="no">notifications_active</span>
                  {signalCount} alert{signalCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg" translate="no">search</span>
              <input
                type="text"
                placeholder="Client, job #, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 bg-surface-container-low border border-outline-variant/20 text-on-surface rounded-xl pl-10 pr-4 py-2 sm:py-2.5 text-sm outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/50"
              />
            </div>

            <button className="px-4 sm:px-5 py-2 sm:py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold rounded-xl flex items-center gap-2 transition-all text-sm">
              <span className="material-symbols-outlined text-sm" translate="no">download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-primary text-[#3a5400] font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/10 active:scale-95 transition-all text-sm"
            >
              <span className="material-symbols-outlined text-sm" translate="no">add</span>
              <span className="hidden sm:inline">New Service Call</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-6 justify-between">
          
          <div className="flex flex-wrap gap-6 items-end">
            {/* Status pills */}
            <div className="space-y-2">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Status</label>
            <div className="flex bg-surface-container-low p-1 rounded-full w-fit max-w-full overflow-x-auto gap-0.5">
              {[{ key: "all", label: "All" }, ...STATUS_OPTIONS.map((s) => ({ key: s, label: STATUS_CONFIG[s].label }))].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilterStatus(opt.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    filterStatus === opt.key
                      ? "text-[#3a5400]"
                      : "text-on-surface-variant hover:text-on-surface"
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
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Discipline / Type</label>
            <div className="flex bg-surface-container-low p-1 rounded-full overflow-x-auto w-fit max-w-full gap-0.5">
              <button
                onClick={() => setFilterType("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  filterType === "all" ? "bg-primary text-[#3a5400]" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                All
              </button>
              {DISCIPLINES.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t.toLowerCase())}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    filterType === t.toLowerCase() ? "bg-surface-container-highest text-on-surface font-bold" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>


        {/* ── Tab Switcher ── */}
        <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl w-fit">
          {([{ key: "calls" as const, label: "Service Calls", icon: "construction" }, { key: "reports" as const, label: "Reports", icon: "summarize" }]).map(tab => (
            <button key={tab.key} onClick={() => setServicesTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${servicesTab === tab.key ? "bg-primary text-[#3a5400] shadow-md" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"}`}>
              <span className="material-symbols-outlined text-[18px]" translate="no">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {servicesTab === "calls" && (<>
        {/* Data Table */}
        <div className="bg-surface-container-low rounded-xl shadow-2xl border border-outline-variant/10">
          <div className="overflow-x-auto overflow-y-visible min-h-[220px]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-surface-container-high/50">
                  {["ID", "Title", "Project", "Status", "Assigned To", "Type", "Date", "Signal", ""].map((col, i) => {
                    const isCenter = ["Status", "Assigned To", "Type", "Signal", ""].includes(col);
                    const isRight = col === "Date";
                    
                    return (
                      <th
                        key={col}
                        className={`px-5 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest ${
                          isCenter ? "text-center" : isRight ? "text-right" : "text-left"
                        }`}
                      >
                        <div className={`flex items-center gap-2 ${isCenter ? "justify-center" : isRight ? "justify-end" : "justify-start"}`}>
                          {col}
                          {col === "Assigned To" && (
                            <button
                              onClick={() => setIsFilterModalOpen(true)}
                              title="Manage Assigned Crew Filter"
                              className="w-5 h-5 flex items-center justify-center rounded bg-surface-container-high text-on-surface-variant hover:text-primary hover:bg-surface-container-highest border border-outline-variant/30 transition-all ml-1"
                            >
                              <span className="material-symbols-outlined text-[13px]" translate="no">edit</span>
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-on-surface-variant text-sm">Loading service calls...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-on-surface-variant text-sm">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-4xl opacity-30" translate="no">construction</span>
                        <span>No service calls found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((issue) => {
                    const statusColor = getStatusColor(issue.status);

                    return (
                      <tr
                        key={issue.id}
                        className="group hover:bg-surface-container-highest/50 transition-colors"
                      >
                        {/* ID */}
                        <td className="px-5 py-4 text-sm font-mono text-on-surface-variant">{formatId(issue.id)}</td>

                        {/* Title + Description */}
                        <td className="px-5 py-4 cursor-pointer text-left" onClick={() => setSelectedService(issue)}>
                          <div className="flex flex-col">
                            <span className="text-on-surface font-semibold text-sm hover:text-primary transition-colors">{issue.title}</span>
                            <span className="text-xs text-on-surface-variant truncate max-w-[200px]">{issue.description}</span>
                          </div>
                        </td>

                        {/* Project */}
                        <td className="px-5 py-4 text-sm text-on-surface text-left">
                          <span className="font-bold">{issue.jobs?.job_number || "—"}</span>
                          {issue.jobs?.customer?.full_name && <span className="text-on-surface-variant"> — {issue.jobs.customer.full_name}</span>}
                        </td>

                        {/* Status — colored dropdown */}
                        <td className="px-5 py-4 text-center">
                          <CustomDropdown
                            value={issue.status}
                            onChange={(val) => updateField(issue.id, "status", val)}
                            options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_CONFIG[s].label }))}
                            inline={true}
                            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tight border outline-none cursor-pointer mx-auto block w-fit"
                            style={{
                              backgroundColor: `${statusColor}15`,
                              color: statusColor,
                              borderColor: `${statusColor}30`,
                              minWidth: "90px",
                              textAlign: "center"
                            }}
                          />
                        </td>

                        {/* Assigned To — crew dropdown */}
                        <td className="px-5 py-4 text-center">
                          <CustomDropdown
                            value={issue.crew_id || ""}
                            onChange={(val) => updateField(issue.id, "crew_id", val || null)}
                            options={displayCrews.map((c) => ({ value: c.id, label: c.name }))}
                            placeholder="Unassigned"
                            inline={true}
                            className="bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-lg px-2 py-1 text-xs font-bold outline-none hover:border-primary/40 transition-colors cursor-pointer mx-auto block w-fit"
                            style={{ minWidth: "110px", textAlign: "center" }}
                          />
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-on-surface-variant bg-surface-container-highest inline-block">
                            {issue.type}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-right text-xs font-bold text-on-surface">
                          {(() => { const _d = new Date(issue.reported_at); return `${(_d.getMonth() + 1).toString().padStart(2, '0')}/${_d.getDate().toString().padStart(2, '0')}/${_d.getFullYear()}`; })()}
                        </td>

                        {/* Signal indicator */}
                        <td className="px-5 py-4">
                          <div className="flex justify-center">
                            {issue.is_signal && !issue.signal_acknowledged && (
                              <button
                                onClick={() => acknowledgeSignal(issue.id)}
                                title="Inspection report received — click to acknowledge"
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-error/15 border border-error/30 animate-pulse hover:animate-none hover:bg-error/25 transition-all"
                              >
                                <span className="material-symbols-outlined text-error text-[16px]" translate="no">notifications_active</span>
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
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all ml-auto relative z-10"
                          >
                            <span className="material-symbols-outlined text-[16px]" translate="no">edit</span>
                          </button>
                          
                          {dropdownOpen === issue.id && (
                            <div className="absolute top-[calc(100%+4px)] right-0 w-32 bg-surface-container border border-error/0 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-[9999] text-left border-primary/20" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => { setDropdownOpen(null); openEdit(issue); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px] text-primary" translate="no">edit</span>
                                Edit
                              </button>
                              <button
                                onClick={() => { setDropdownOpen(null); setDeleteConfirm(issue.id); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-error hover:bg-error/10 transition-colors"
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
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-outline-variant/10 flex items-center justify-between text-[11px] font-bold tracking-widest uppercase text-on-surface-variant">
            <span className="text-on-surface">
              <span className="text-primary">{filtered.length}</span> of {serviceCalls.length} records
            </span>
          </div>
        </div>
        </>)}

        {/* ══════════════════════════════════════════════
            TAB: REPORTS
        ══════════════════════════════════════════════ */}
        {servicesTab === "reports" && (
          <div className="bg-surface-container-low rounded-xl shadow-2xl border border-outline-variant/10 p-6 space-y-6">
            {/* Reports filters */}
            <div className="flex items-center gap-3">
              {(["all", "pending", "reviewed"] as const).map(f => (
                <button key={f} onClick={() => setReportsFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${reportsFilter === f ? "bg-primary text-[#3a5400]" : "bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/20"}`}>
                  {f === "all" ? "All Reports" : f === "pending" ? "Pending Review" : "Reviewed"}
                  {f === "pending" && serviceReports.filter((r: any) => !r.reviewed_at).length > 0 && (
                    <span className="ml-1.5 bg-error/20 text-error px-1.5 py-0.5 rounded-full text-[10px] font-black">
                      {serviceReports.filter((r: any) => !r.reviewed_at).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {reportsLoading ? (
              <div className="flex justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl" translate="no">sync</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="p-8 rounded-xl bg-surface-container border border-outline-variant/15">
                <div className="flex flex-col items-center gap-3 py-12 text-on-surface-variant">
                  <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-primary" translate="no">summarize</span>
                  </div>
                  <p className="text-sm font-bold text-on-surface">No reports found</p>
                  <p className="text-xs">Partner inspection reports will appear here once submitted.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((report: any) => {
                  const reportDate = new Date(report.reported_at);
                  const dateStr = `${(reportDate.getMonth()+1).toString().padStart(2,"0")}/${reportDate.getDate().toString().padStart(2,"0")}/${reportDate.getFullYear()}`;
                  const reporterName = Array.isArray(report.reporter) ? report.reporter[0]?.full_name : report.reporter?.full_name;
                  const blockerData = Array.isArray(report.blocker) ? report.blocker[0] : report.blocker;
                  const jobData = blockerData?.jobs;
                  const isReviewed = !!report.reviewed_at;
                  return (
                    <div key={report.id} className={`rounded-xl border overflow-hidden transition-all ${isReviewed ? "bg-surface-container border-outline-variant/15" : "bg-surface-container border-primary/30 shadow-lg shadow-primary/5"}`}>
                      <div className="px-5 py-3.5 bg-surface-container-high/50 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${report.is_our_fault === true ? "bg-error/10" : report.is_our_fault === false ? "bg-[#22c55e]/10" : "bg-surface-container-highest"}`}>
                            <span className={`material-symbols-outlined text-lg ${report.is_our_fault === true ? "text-error" : report.is_our_fault === false ? "text-[#22c55e]" : "text-on-surface-variant"}`} translate="no">
                              {report.is_our_fault === true ? "error" : report.is_our_fault === false ? "check_circle" : "help"}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">{blockerData?.title || "Service Report"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">{dateStr}</span>
                              {reporterName && <span className="text-[10px] text-on-surface-variant">by {reporterName}</span>}
                              {jobData && <span className="text-[10px] text-primary font-bold">{Array.isArray(jobData) ? jobData[0]?.job_number : jobData?.job_number}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${report.is_our_fault === true ? "bg-error/15 text-error" : report.is_our_fault === false ? "bg-[#22c55e]/15 text-[#22c55e]" : "bg-surface-container-highest text-on-surface-variant"}`}>
                            {report.is_our_fault === true ? "Our Fault" : report.is_our_fault === false ? "Not Ours" : "TBD"}
                          </span>
                          {isReviewed ? (
                            <span className="px-2.5 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e] text-[10px] font-bold uppercase tracking-widest">Reviewed</span>
                          ) : (
                            <button onClick={() => markReportReviewed(report.id)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-[#3a5400] text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity">
                              Mark Reviewed
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        {report.notes && <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{report.notes}</p>}
                        {report.service_report_attachments?.length > 0 && (
                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {report.service_report_attachments.map((att: any, imgIdx: number) => (
                              <a key={imgIdx} href={att.url} target="_blank" rel="noopener noreferrer"
                                className="block aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition-colors group">
                                <img src={att.url} alt={att.file_name || `Photo ${imgIdx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
            className="w-full max-w-lg rounded-2xl relative flex flex-col max-h-[90vh]"
            style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.15)" }}
          >
            {/* Header — sticky */}
            <div className="flex items-center justify-between p-6 pb-0 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[18px]" translate="no">edit</span>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Edit Service Call</h2>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{formatId(editService.id)}</p>
                </div>
              </div>
              <button
                onClick={() => { setEditService(null); setEditForm(null); }}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4" style={{ scrollbarWidth: "none" }}>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Title</label>
                <input required type="text" value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="bg-surface-container-low border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Description</label>
                <textarea rows={3} value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="bg-surface-container-low border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 z-50 relative">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</label>
                  <CustomDropdown
                    value={editForm.status}
                    onChange={(val) => setEditForm({ ...editForm, status: val })}
                    options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_CONFIG[s].label }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5 z-50 relative">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Discipline</label>
                  <CustomDropdown
                    value={editForm.type}
                    onChange={(val) => setEditForm({ ...editForm, type: val })}
                    options={DISCIPLINES.map((d) => ({ value: d.toLowerCase(), label: d }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 z-40 relative">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Assigned Crew</label>
                <CustomDropdown
                  value={editForm.crew_id}
                  onChange={(val) => setEditForm({ ...editForm, crew_id: val })}
                  options={crews.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Unassigned"
                />
              </div>

              {/* ── Photos & Attachments ─────────────── */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Photos & Attachments
                </label>

                {/* Existing photos grid */}
                {editExistingPhotos.filter(p => !editPhotosToDelete.includes(p.id)).length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editExistingPhotos
                      .filter(p => !editPhotosToDelete.includes(p.id))
                      .map((photo) => {
                        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(photo.url);
                        const isVideo = /\.(mp4|mov|webm|avi|mkv|m4v)/i.test(photo.url);
                        return (
                          <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-low aspect-square">
                            {/* Clickable area to open lightbox */}
                            <button
                              type="button"
                              className="w-full h-full cursor-pointer"
                              onClick={() => {
                                setLightboxUrl(photo.url);
                                setLightboxType(isImage ? "image" : isVideo ? "video" : "other");
                              }}
                            >
                              {isImage ? (
                                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                              ) : isVideo ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-background">
                                  <span className="material-symbols-outlined text-3xl text-[#60b8f5]" translate="no">play_circle</span>
                                  <span className="text-[9px] text-on-surface-variant truncate w-full text-center px-1">Video</span>
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                  <span className="material-symbols-outlined text-2xl text-on-surface-variant" translate="no">attach_file</span>
                                  <span className="text-[9px] text-on-surface-variant truncate w-full text-center px-1">
                                    {photo.url.split("/").pop()?.split("?")[0] || "File"}
                                  </span>
                                </div>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditPhotosToDelete(prev => [...prev, photo.id])}
                              className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-error rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <span className="material-symbols-outlined text-[14px] text-white" translate="no">close</span>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* New files to upload */}
                {editNewFiles.length > 0 && (
                  <div className="space-y-2">
                    {editNewFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-surface-container border border-primary/20 rounded-xl px-4 py-2.5">
                        <span className="material-symbols-outlined text-primary text-lg" translate="no">
                          {file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "videocam" : "attach_file"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-on-surface font-medium truncate">{file.name}</p>
                          <p className="text-[10px] text-primary">New • {file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditNewFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-lg" translate="no">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-outline-variant bg-background hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-on-surface-variant hover:text-on-surface group"
                >
                  <span className="material-symbols-outlined text-xl group-hover:text-primary transition-colors" translate="no">add_photo_alternate</span>
                  <span className="text-sm font-semibold">Add Photos & Videos</span>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setEditService(null); setEditForm(null); }}
                  className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl border border-outline-variant/20 hover:bg-surface-container-highest transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-3 bg-primary text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  {editSaving ? <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" /> : editNewFiles.length > 0 ? `Save & Upload ${editNewFiles.length} file${editNewFiles.length > 1 ? "s" : ""}` : "Save Changes"}
                </button>
              </div>
            </form>
            {/* File input MUST be outside the form to avoid interference */}
            <input
              ref={editFileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files || []);
                if (selectedFiles.length > 0) {
                  setEditNewFiles(prev => [...prev, ...selectedFiles]);
                }
                e.target.value = "";
              }}
              className="hidden"
            />
            </div>{/* end scrollable body */}
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
          <div className="bg-surface-container-high border border-error/30 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-error text-2xl" translate="no">warning</span>
            </div>
            <h3 className="text-lg font-bold text-on-surface mb-2">Delete Service Call?</h3>
            <p className="text-sm text-on-surface-variant mb-6">Are you sure you want to delete this service call?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-surface-container-highest text-on-surface font-bold rounded-xl hover:bg-[#2a2c2a] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-error text-white font-bold rounded-xl hover:bg-error/90 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════
          LIGHTBOX — Full-screen Image / Video Preview
      ══════════════════════════════════════════════ */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
          onClick={() => { setLightboxUrl(null); setLightboxType("image"); }}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            onClick={() => { setLightboxUrl(null); setLightboxType("image"); }}
          >
            <span className="material-symbols-outlined text-xl text-white" translate="no">close</span>
          </button>

          {/* Content */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxType === "image" && (
              <img
                src={lightboxUrl}
                alt=""
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                style={{ width: "auto", height: "auto" }}
              />
            )}
            {lightboxType === "video" && (
              <video
                src={lightboxUrl}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
                style={{ width: "auto", height: "auto" }}
              />
            )}
            {lightboxType === "other" && (
              <div className="bg-surface-container rounded-2xl p-8 flex flex-col items-center gap-4 border border-outline-variant/30">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant" translate="no">attach_file</span>
                <p className="text-on-surface font-bold text-sm">File Preview</p>
                <a
                  href={lightboxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-primary text-[#3a5400] font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
                >
                  Open File
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
