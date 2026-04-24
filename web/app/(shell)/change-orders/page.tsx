"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import DateRangePicker from "../../../components/DateRangePicker";
import { CustomDropdown } from "../../../components/CustomDropdown";
import { TopBar } from "../../../components/TopBar";
import { supabase } from "../../../lib/supabase";
import { compressImage } from "../../../lib/compressImage";

// =============================================
// Change Orders & Approvals
// Rota: /change-orders
// Fluxo dupla aprovação:
//   draft → pending_customer_approval → approved
// =============================================

// ─── Tipos ────────────────────────────────────────────────────────
interface ChangeOrder {
  id: string;
  title: string;
  description: string;
  status: "draft" | "pending_customer_approval" | "approved" | "rejected" | "cancelled";
  proposed_amount: number | null;
  approved_amount: number | null;
  requested_at: string;
  created_at: string;
  job: {
    id: string;
    job_number: string;
    customer: any;
  } | null;
  job_service: any;
  requested_by: { full_name: string; role: string } | null;
}

// Status display config
const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  draft:                      { label: "DRAFT",    badge: "bg-[#fff7cf]/10 text-[#fff7cf] border border-[#fff7cf]/20",   dot: "#fff7cf" },
  pending_customer_approval:  { label: "PENDING",  badge: "bg-[#e3eb5d]/10 text-[#e3eb5d] border border-[#e3eb5d]/20",   dot: "#e3eb5d" },
  approved:                   { label: "APPROVED", badge: "bg-primary/20 text-primary border border-primary/30",   dot: "#aeee2a" },
  rejected:                   { label: "REJECTED", badge: "bg-error/10 text-error border border-error/20",   dot: "#ff7351" },
  cancelled:                  { label: "CANCELLED",badge: "bg-outline-variant/20 text-on-surface-variant border border-outline-variant/30",   dot: "#747673" },
};

// Filter tabs
type TabFilter = "ALL" | "PENDING" | "APPROVED";

// ─── Helpers ───────────────────────────────────────────────────────
function fmt$(n: number | null): string {
  if (n == null) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "—";
  return `${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear()}`;
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function ChangeOrdersPage() {
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TabFilter>("ALL");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ChangeOrder | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  // Fetch logged-in user role from profiles
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (data?.role) setUserRole(data.role);
      } catch (err) {
        console.error("[ChangeOrders] fetch user role error:", err);
      }
    })();
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("change_orders")
        .select(`
          id, title, description, status,
          proposed_amount, approved_amount, rejection_reason,
          requested_at, created_at,
          job:jobs (
            id, job_number,
            customer:customers (full_name)
          ),
          job_service:job_services (
            service_type:service_types (name)
          ),
          requested_by:profiles!requested_by_profile_id (full_name, role)
        `)
        .order("created_at", { ascending: false });

      if (activeFilter === "APPROVED") query = query.eq("status", "approved");
      if (activeFilter === "PENDING")  query = query.in("status", ["draft", "pending_customer_approval"]);
      if (filterStart) query = query.gte("created_at", filterStart);
      if (filterEnd) {
        const nextDay = new Date(`${filterEnd}T12:00:00Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        query = query.lt("created_at", nextDay.toISOString().split("T")[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders((data ?? []) as unknown as ChangeOrder[]);
    } catch (err) {
      console.error("[ChangeOrdersPage] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, filterStart, filterEnd]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Local search
  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.title.toLowerCase().includes(q) ||
      o.job?.customer?.full_name?.toLowerCase().includes(q) ||
      o.job?.job_number?.toLowerCase().includes(q)
    );
  });

  // Summary stats for header
  const totalPending = orders.filter((o) => o.status === "pending_customer_approval").length;
  const totalPendingValue = orders
    .filter((o) => o.status === "pending_customer_approval")
    .reduce((s, o) => s + (o.proposed_amount ?? 0), 0);

  return (
    <>
      <TopBar
        leftSlot={
          <div className="relative group">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors"
              translate="no"
            >
              search
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-container-high border-none rounded-xl py-2.5 pl-10 pr-4 text-sm w-[280px] focus:ring-1 focus:ring-primary text-on-surface outline-none placeholder:text-on-surface-variant"
              placeholder="Search Change Orders"
              type="text"
            />
          </div>
        }
      />

      <div className="flex flex-col min-h-screen pb-20">

        {/* Page Header */}
        <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1
                className="text-xl sm:text-3xl font-extrabold text-on-surface tracking-tighter"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Change Orders & Approvals
              </h1>
              <p className="text-on-surface-variant text-sm mt-1">
                {totalPending > 0 ? (
                  <>
                    <span className="text-[#e3eb5d] font-bold">{totalPending} orders</span> awaiting client approval —{" "}
                    <span className="text-primary font-bold">${totalPendingValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span> total value
                  </>
                ) : (
                  "Track and manage financial structural adjustments."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <section className="px-4 sm:px-6 lg:px-8 mb-8 flex flex-wrap gap-4 items-center">
          {/* Status toggle */}
          <div className="flex bg-surface-container-low p-1 rounded-xl">
            {(["ALL", "PENDING", "APPROVED"] as TabFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeFilter === tab
                    ? tab === "PENDING"
                      ? "bg-surface-container-highest text-[#e3eb5d]"
                      : tab === "APPROVED"
                      ? "bg-surface-container-highest text-primary"
                      : "bg-surface-container-highest text-on-surface"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab === "ALL" ? "ALL ORDERS" : tab}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-outline-variant/30 hidden sm:block" />
          <div className="flex-1" />

          {/* Date range */}
          <DateRangePicker
            startDate={filterStart}
            endDate={filterEnd}
            onRangeChange={(start, end) => {
              setFilterStart(start);
              setFilterEnd(end);
            }}
            placeholder="Filter by Date"
            alignRight
          />

          {/* Create button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary rounded-xl text-sm font-bold text-[#3a5400] shadow-[0_0_15px_rgba(174,238,42,0.15)] hover:shadow-[0_0_25px_rgba(174,238,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]" translate="no">add</span>
            Create Change Order
          </button>
        </section>

        {/* Cards Grid */}
        <section className="px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant gap-3">
              <span className="material-symbols-outlined text-4xl animate-spin" translate="no">progress_activity</span>
              <p className="text-sm font-bold">Loading change orders...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant gap-4">
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-primary" translate="no">request_quote</span>
              </div>
              <p className="text-base font-bold text-on-surface">No change orders found</p>
              <p className="text-sm">
                {search ? "Try a different search term." : "Create your first change order to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
                const amount = order.status === "approved"
                  ? order.approved_amount
                  : order.proposed_amount;
                const isDraft = order.status === "draft";
                const isPending = order.status === "pending_customer_approval";

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="p-6 rounded-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
                    style={{
                      background: "rgba(36,38,36,0.4)",
                      backdropFilter: "blur(24px)",
                      border: "1px solid rgba(174,238,42,0.08)",
                    }}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">
                            {order.job?.job_number ? `${order.job.job_number}` : "—"} • {fmtDate(order.requested_at)}
                          </p>
                          <h3
                            className="text-base font-bold mt-1 group-hover:text-primary transition-colors leading-tight"
                            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                          >
                            {order.title}
                          </h3>
                          {order.job?.customer?.full_name && (
                            <p className="text-xs text-on-surface-variant mt-0.5">{order.job.customer.full_name}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ml-2 ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {order.description && (
                        <p className="text-on-surface-variant text-sm leading-relaxed mb-4 line-clamp-2">
                          {order.description}
                        </p>
                      )}
                      {order.status === "rejected" && (order as any).rejection_reason && (
                        <div className="bg-error/10 border border-error/20 rounded-xl px-3 py-2.5 mb-4">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-error/70 mb-1">Customer Rejection Reason</p>
                          <p className="text-xs text-on-surface/80 leading-relaxed line-clamp-2">{(order as any).rejection_reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-end justify-between mt-2">
                      <div>
                        <p className="text-xs text-on-surface-variant">
                          {order.status === "approved" ? "Approved Amount" : "Proposed Amount"}
                        </p>
                        <p
                          className="text-2xl font-black"
                          style={{
                            fontFamily: "Manrope, system-ui, sans-serif",
                            color: order.status === "approved" ? "#aeee2a" : order.status === "rejected" ? "#ff7351" : "#faf9f5",
                          }}
                        >
                          {fmt$(amount)}
                        </p>
                        {order.requested_by?.full_name && (
                          <p className="text-[10px] text-on-surface-variant mt-3 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]" translate="no">person</span>
                            {order.requested_by.full_name}
                            <span className="text-primary/60">•</span>
                            <span className="capitalize text-primary/80">{order.requested_by.role}</span>
                          </p>
                        )}
                      </div>

                      {/* Action button based on status */}
                      {isDraft && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmitToClient(order.id);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#e3eb5d]/10 text-[#e3eb5d] border border-[#e3eb5d]/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#e3eb5d]/20 transition-colors"
                          title="Send to client for approval"
                        >
                          <span className="material-symbols-outlined text-[14px]" translate="no">send</span>
                          Send to Client
                        </button>
                      )}

                      {isPending && (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-[#e3eb5d]/5 text-[#e3eb5d] rounded-xl text-[10px] font-bold uppercase tracking-widest border border-[#e3eb5d]/10">
                          <span className="material-symbols-outlined text-[14px] animate-pulse" translate="no">schedule</span>
                          Awaiting Client
                        </div>
                      )}

                      {order.status === "approved" && (
                        <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/20">
                          <span className="material-symbols-outlined text-primary text-[20px]" translate="no">check_circle</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL — Create Change Order
      ══════════════════════════════════════════════════ */}
      {isModalOpen && (
        <CreateChangeOrderModal
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            fetchOrders();
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════
          DRAWER — Change Order Detail
      ══════════════════════════════════════════════════ */}
      {selectedOrder && (
        <ChangeOrderDrawer
          order={selectedOrder}
          userRole={userRole}
          onClose={() => setSelectedOrder(null)}
          onUpdated={() => {
            setSelectedOrder(null);
            fetchOrders();
          }}
          onDeleted={() => {
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}
    </>
  );

  // ── Ação: Enviar para o Cliente (draft → pending_customer_approval)
  async function handleSubmitToClient(id: string) {
    try {
      const { error } = await supabase
        .from("change_orders")
        .update({
          status: "pending_customer_approval",
          decided_at: null,
        })
        .eq("id", id);
      if (error) throw error;
      fetchOrders();
    } catch (err) {
      console.error("[ChangeOrders] submit to client error:", err);
    }
  }
}

// ─── Modal: Create Change Order ────────────────────────────────────
function CreateChangeOrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [jobs, setJobs] = useState<{ id: string; job_number: string; customer_name: string }[]>([]);
  const [jobId, setJobId]           = useState("");
  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [files,  setFiles]          = useState<File[]>([]);
  const [jobServices, setJobServices]= useState<any[]>([]);
  const [serviceId, setServiceId]   = useState("");
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // Load real projects for the select
  useEffect(() => {
    supabase
      .from("jobs")
      .select("id, job_number, customer:customers (full_name)")
      .in("status", ["pending", "tentative", "scheduled", "in_progress", "done"])
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }: { data: any[] | null }) => {
        setJobs(
          (data ?? []).map((j: any) => ({
            id: j.id,
            job_number: j.job_number,
            customer_name: j.customer?.full_name ?? "—",
          }))
        );
      });
  }, []);

  // Watch selected project to load related services
  useEffect(() => {
    setServiceId("");
    if (!jobId) {
      setJobServices([]);
      return;
    }
    supabase
      .from("job_services")
      .select("id, service_type:service_types(name)")
      .eq("job_id", jobId)
      .then(({ data }) => {
        setJobServices(data || []);
      });
  }, [jobId]);

  async function uploadFiles(coId: string) {
    for (const rawFile of files) {
      const file = await compressImage(rawFile);
      const ext  = file.name.split(".").pop();
      const path = `change-orders/${coId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file);
      if (upErr) { console.error("CO upload error:", upErr); continue; }
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      await supabase.from("change_order_attachments").insert({
        change_order_id: coId,
        file_name:       file.name,
        url:             data.publicUrl,
        mime_type:       file.type,
        size_bytes:      file.size,
      });
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      // Get current user for requested_by_profile_id
      const { data: { user } } = await supabase.auth.getUser();

      const { data: co, error } = await supabase.from("change_orders").insert({
        job_id: jobId || null,
        job_service_id: serviceId || null,
        title: title.trim(),
        description: description.trim(),
        proposed_amount: amount ? parseFloat(amount) : null,
        status: "draft",
        requested_by_profile_id: user?.id ?? null,
      }).select("id").single();
      if (error) throw error;
      if (co && files.length > 0) await uploadFiles(co.id);

      // Push notification to admins
      try {
        const selectedJob = jobs.find(j => j.id === jobId);
        await fetch('/api/push/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '📝 New Change Order',
            body: `${title.trim()} — ${selectedJob?.customer_name || 'Project'} (${amount ? `$${parseFloat(amount).toLocaleString()}` : 'No amount'})`,
            url: '/change-orders',
            tag: 'change-order-created',
            notificationType: 'change_order_created',
            relatedEntityId: co?.id,
          }),
        });
      } catch { /* non-blocking */ }

      onSaved();
    } catch (err) {
      console.error("[CreateChangeOrderModal] save error:", err);
    } finally {
      setSaving(false);
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "videocam";
    if (file.type.includes("pdf"))      return "picture_as_pdf";
    return "attach_file";
  };
  const formatBytes = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-surface-container border border-outline-variant/40 rounded-3xl shadow-2xl w-full max-w-3xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-6 border-b border-outline-variant/20">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-primary rounded-full" />
            <h2 className="text-2xl font-extrabold text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
              Create New Change Order
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-[#ba1212] hover:text-white transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]" translate="no">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Workflow hint */}
          <div className="flex items-start gap-3 bg-surface-container-highest rounded-xl p-4 border border-outline-variant/20">
            <span className="material-symbols-outlined text-[#e3eb5d] shrink-0 mt-0.5" translate="no">info</span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <span className="text-[#e3eb5d] font-bold">Double Approval Flow:</span> After creating, you review pricing and send to the client. The client approves or rejects via their portal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Project */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Project</label>
              <div className="relative z-50">
                <CustomDropdown
                  value={jobId}
                  onChange={(val) => setJobId(val)}
                  options={jobs.map(j => ({ value: j.id, label: `${j.job_number} — ${j.customer_name}` }))}
                  placeholder="Select a Project..."
                  searchable
                  className="w-full bg-surface-container-highest border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3.5 text-[15px] font-bold flex justify-between items-center transition-colors hover:border-primary"
                />
              </div>
            </div>

            {/* Estimated Amount */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Estimated Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-[15px] pointer-events-none">$</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 hover:border-outline-variant focus:border-primary rounded-xl py-3.5 pl-8 pr-4 text-on-surface outline-none placeholder:text-outline-variant font-bold text-[15px] transition-colors tracking-wide"
                  placeholder="0.00"
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Change Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 hover:border-outline-variant focus:border-primary rounded-xl py-3.5 px-4 text-on-surface outline-none placeholder:text-on-surface-variant font-bold text-[15px] transition-colors"
                  placeholder="e.g. Front Door Replacement"
                />
            </div>

            {/* Service */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Service</label>
              <div className={`relative z-40 ${!jobId || jobServices.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                <CustomDropdown
                  value={serviceId}
                  onChange={(val) => setServiceId(val)}
                  options={jobServices.map(s => ({ value: s.id, label: s.service_type?.name ?? "Unknown" }))}
                  placeholder={!jobId ? "Select Project First..." : "Select Service..."}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3.5 text-[15px] font-bold flex justify-between items-center transition-colors hover:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Detailed Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container-highest border border-transparent hover:border-outline-variant rounded-xl py-4 px-4 text-on-surface focus:ring-1 focus:ring-primary outline-none resize-none placeholder:text-outline font-medium text-sm transition-colors"
              placeholder="Explain the change requirements, materials, and labor implications..."
              rows={4}
            />
          </div>

          {/* Upload area */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Attachments</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-outline-variant/40 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-surface-container hover:border-primary/70 hover:bg-primary/5 transition-colors cursor-pointer group/drop"
            >
              <span className="material-symbols-outlined text-4xl text-outline-variant group-hover/drop:text-primary mb-3 transition-colors" translate="no">cloud_upload</span>
              <p className="text-sm font-bold text-on-surface">Click to add files</p>
              <p className="text-[11px] font-medium text-on-surface-variant mt-1">PDF, JPG, PNG, DOC up to 20MB each</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
              className="hidden"
            />
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-surface-container-highest border border-white/5 rounded-xl px-4 py-2.5">
                    <span className="material-symbols-outlined text-primary text-lg" translate="no">{getFileIcon(file)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-on-surface font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-on-surface-variant">{formatBytes(file.size)}</p>
                    </div>
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} className="text-on-surface-variant hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-lg" translate="no">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-2 border-t border-outline-variant/30 flex justify-end gap-5">
          <button
            onClick={onClose}
            className="px-6 py-3.5 rounded-xl border border-outline-variant text-on-surface font-bold hover:bg-surface-container-highest transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
            className="px-10 py-3.5 rounded-xl bg-primary text-[#3a5400] font-black tracking-wide shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? "Saving..." : files.length > 0 ? `Save & Upload ${files.length} file${files.length > 1 ? "s" : ""}` : "Save as Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drawer: Change Order Detail ───────────────────────────────────
function ChangeOrderDrawer({
  order,
  userRole,
  onClose,
  onUpdated,
  onDeleted,
}: {
  order: ChangeOrder;
  userRole: string;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<{ id: string; url: string; file_name: string; mime_type: string | null }[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxType, setLightboxType] = useState<"image" | "video" | "other">("image");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("change_order_attachments")
        .select("id, url, file_name, mime_type")
        .eq("change_order_id", order.id);
      setAttachments((data || []) as { id: string; url: string; file_name: string; mime_type: string | null }[]);
    })();
  }, [order.id]);

  const isAdmin = userRole === "admin";
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;

  async function handleAction(action: "send" | "approve" | "reject") {
    setLoading(true);
    try {
      const updates: Record<string, string> = {
        send:    "pending_customer_approval",
        approve: "approved",
        reject:  "rejected",
      };
      const { error } = await supabase
        .from("change_orders")
        .update({
          status: updates[action],
          decided_at: action !== "send" ? new Date().toISOString() : null,
          ...(action === "approve"
            ? { approved_amount: order.proposed_amount }
            : {}),
        })
        .eq("id", order.id);
      if (error) throw error;
      onUpdated();
    } catch (err) {
      console.error("[ChangeOrderDrawer] action error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function executeDelete() {
    setDeleting(true);
    try {
      // Delete related attachments first (if any)
      const { error: attErr } = await supabase
        .from("change_order_attachments")
        .delete()
        .eq("change_order_id", order.id);

      if (attErr) {
        console.warn("[ChangeOrderDrawer] attachment delete warning:", attErr);
      }

      const { error } = await supabase
        .from("change_orders")
        .delete()
        .eq("id", order.id);

      if (error) throw error;

      setConfirmDelete(false);
      onDeleted();
    } catch (err: any) {
      console.error("[ChangeOrderDrawer] delete error:", err);
      alert(`Failed to delete change order: ${err?.message || "Unknown error"}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-surface-container border-l border-outline-variant/30 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-outline-variant/20 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${cfg.badge}`}>
                {cfg.label}
              </span>
              {order.job?.job_number && (
                <span className="text-[10px] text-on-surface-variant font-bold">{order.job.job_number}</span>
              )}
            </div>
            <h2 className="text-lg font-extrabold text-on-surface leading-tight" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
              {order.title}
            </h2>
            {order.job?.customer?.full_name && (
              <p className="text-xs text-on-surface-variant mt-0.5">{order.job.customer.full_name}</p>
            )}
            {order.requested_by?.full_name && (
              <p className="text-[10px] text-outline mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]" translate="no">person</span>
                Created by {order.requested_by.full_name}
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[8px] font-bold uppercase">
                  {order.requested_by.role}
                </span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface-container-highest hover:bg-outline-variant/60 flex items-center justify-center transition-colors text-on-surface-variant shrink-0">
            <span className="material-symbols-outlined text-[18px]" translate="no">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: "none" }}>

          {/* Amount */}
          <div className="bg-surface-container-highest rounded-2xl p-5 border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                  {order.status === "approved" ? "Approved Amount" : "Proposed Amount"}
                </p>
                <p
                  className="text-3xl font-black"
                  style={{
                    fontFamily: "Manrope, system-ui, sans-serif",
                    color: order.status === "approved" ? "#aeee2a" : "#faf9f5",
                  }}
                >
                  {fmt$(order.status === "approved" ? order.approved_amount : order.proposed_amount)}
                </p>
              </div>
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${cfg.dot}15`, border: `1px solid ${cfg.dot}30` }}
              >
                <span className="material-symbols-outlined text-2xl" style={{ color: cfg.dot }} translate="no">
                  {order.status === "approved" ? "check_circle" : order.status === "rejected" ? "cancel" : "request_quote"}
                </span>
              </div>
            </div>
          </div>

          {/* Workflow Status Timeline */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Approval Workflow</p>
            <div className="space-y-2">
              {[
                { label: "Created as Draft",           done: true,                                                      icon: "draft"        },
                { label: "Reviewed & Sent to Client",  done: order.status !== "draft",                                  icon: "send"         },
                { label: "Client Decision",            done: order.status === "approved" || order.status === "rejected", icon: "how_to_vote"  },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: step.done ? "#aeee2a15" : "#24262415",
                      border: `1px solid ${step.done ? "#aeee2a40" : "#47484640"}`,
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-[14px]"
                      style={{ color: step.done ? "#aeee2a" : "#747673" }}
                      translate="no"
                    >
                      {step.done ? "check" : step.icon}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${step.done ? "text-on-surface" : "text-outline"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {order.description && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Description</p>
              <p className="text-sm text-on-surface leading-relaxed bg-surface-container-highest rounded-xl p-4 border border-outline-variant/20">
                {order.description}
              </p>
            </div>
          )}

          {/* Customer rejection reason */}
          {order.status === "rejected" && (order as any).rejection_reason && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-error mb-2">Customer Rejection Reason</p>
              <p className="text-sm text-on-surface leading-relaxed bg-error/10 rounded-xl p-4 border border-error/20">
                {(order as any).rejection_reason}
              </p>
            </div>
          )}

          {/* Attachments — Photos & Videos */}
          {attachments.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Photos & Attachments</p>
              <div className="grid grid-cols-3 gap-2">
                {attachments.map((att) => {
                  const isImage = att.mime_type?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(att.url);
                  const isVideo = att.mime_type?.startsWith("video/") || /\.(mp4|mov|webm|avi|mkv|m4v)/i.test(att.url);
                  return (
                    <button
                      key={att.id}
                      type="button"
                      className="relative group rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-low aspect-square cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => {
                        if (isImage || isVideo) {
                          setLightboxUrl(att.url);
                          setLightboxType(isImage ? "image" : "video");
                        } else {
                          window.open(att.url, "_blank");
                        }
                      }}
                    >
                      {isImage ? (
                        <img src={att.url} alt={att.file_name || ""} className="w-full h-full object-cover" />
                      ) : isVideo ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-background">
                          <span className="material-symbols-outlined text-3xl text-[#60b8f5]" translate="no">play_circle</span>
                          <span className="text-[9px] text-on-surface-variant">Video</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-2xl text-on-surface-variant" translate="no">attach_file</span>
                          <span className="text-[9px] text-on-surface-variant truncate w-full text-center px-1">
                            {att.file_name || "File"}
                          </span>
                        </div>
                      )}
                      {/* Zoom overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity" translate="no">
                          {isVideo ? "play_arrow" : "zoom_in"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-container-highest rounded-xl p-3 border border-outline-variant/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Requested</p>
              <p className="text-sm text-on-surface font-bold">{fmtDate(order.requested_at)}</p>
            </div>
            <div className="bg-surface-container-highest rounded-xl p-3 border border-outline-variant/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Service</p>
              <p className="text-sm text-on-surface font-bold">
                {order.job_service?.service_type?.name ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-outline-variant/20 shrink-0 space-y-3">
          {order.status === "draft" && (
            <button
              onClick={() => handleAction("send")}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#e3eb5d] text-[#5f5600] font-black text-sm shadow-lg hover:bg-[#d4da52] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]" translate="no">send</span>
              {loading ? "Sending..." : "Send to Client for Approval"}
            </button>
          )}
          {order.status === "pending_customer_approval" && (userRole === "admin" || userRole === "customer" || userRole === "client") && (
            <div className="flex gap-3">
              <button
                onClick={() => handleAction("reject")}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-error/10 text-error border border-error/20 font-bold text-sm hover:bg-error/20 transition-all active:scale-95 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handleAction("approve")}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-primary text-[#3a5400] font-black text-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]" translate="no">check_circle</span>
                {loading ? "Saving..." : "Approve"}
              </button>
            </div>
          )}

          {/* Admin-only Delete */}
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              disabled={deleting}
              className="w-full py-3 rounded-xl bg-[#ba1212]/10 text-error border border-[#ba1212]/20 font-bold text-sm hover:bg-[#ba1212]/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]" translate="no">delete_forever</span>
              {deleting ? "Deleting..." : "Delete Change Order"}
            </button>
          )}

          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-bold text-sm hover:bg-surface-container-highest transition-colors">
            Close
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CONFIRM DELETE POPUP
      ══════════════════════════════════════════════════ */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-surface-container border border-[#ba1212]/30 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeInScale 0.2s ease-out" }}
          >
            {/* Icon + Title */}
            <div className="flex flex-col items-center pt-8 pb-4 px-6">
              <div className="w-16 h-16 rounded-full bg-[#ba1212]/10 border border-[#ba1212]/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-error" translate="no">
                  delete_forever
                </span>
              </div>
              <h3
                className="text-lg font-extrabold text-on-surface text-center"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Delete Change Order?
              </h3>
              <p className="text-sm text-on-surface-variant text-center mt-2 leading-relaxed">
                You are about to permanently delete
                <span className="text-error font-bold"> &ldquo;{order.title}&rdquo;</span>.
                <br />
                This action <span className="text-error font-bold">cannot be undone</span>.
              </p>
            </div>

            {/* Order summary */}
            <div className="mx-6 mb-5 bg-surface-container-highest rounded-xl p-4 border border-outline-variant/20">
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant">Amount</span>
                <span className="text-on-surface font-bold">{fmt$(order.proposed_amount)}</span>
              </div>
              {order.job?.job_number && (
                <div className="flex justify-between items-center text-xs mt-1.5">
                  <span className="text-on-surface-variant">Project</span>
                  <span className="text-on-surface font-bold">{order.job.job_number}</span>
                </div>
              )}
              {order.job?.customer?.full_name && (
                <div className="flex justify-between items-center text-xs mt-1.5">
                  <span className="text-on-surface-variant">Customer</span>
                  <span className="text-on-surface font-bold">{order.job.customer.full_name}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface font-bold text-sm hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-[#ba1212] text-white font-black text-sm hover:bg-[#a01010] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#ba1212]/30"
              >
                <span className="material-symbols-outlined text-[16px]" translate="no">delete_forever</span>
                {deleting ? "Deleting..." : "Yes, Delete"}
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

      {/* ══════════════════════════════════════════════════
          LIGHTBOX — Full-screen Image / Video Preview
      ══════════════════════════════════════════════════ */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
          onClick={() => { setLightboxUrl(null); setLightboxType("image"); }}
        >
          <button
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            onClick={() => { setLightboxUrl(null); setLightboxType("image"); }}
          >
            <span className="material-symbols-outlined text-xl text-white" translate="no">close</span>
          </button>
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
          </div>
        </div>
      )}
    </>
  );
}
