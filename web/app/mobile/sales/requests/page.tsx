"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { useRouter } from "next/navigation";

const SALES_NAV = [
  { icon: "dashboard",  label: "Dashboard", href: "/mobile/sales" },
  { icon: "group",      label: "Customers", href: "/mobile/sales/customers" },
  { icon: "assignment", label: "Requests",  href: "/mobile/sales/requests" },
];

type ChangeOrderStatus = "draft" | "pending_customer_approval" | "approved" | "rejected" | "cancelled";

interface COAttachment {
  id: string;
  file_name: string;
  url: string;
  mime_type: string | null;
  change_order_item_id: string | null;
}

interface COItem {
  id: string;
  description: string;
  amount: number | null;
  sort_order: number;
  change_order_attachments: COAttachment[];
}

interface ChangeOrder {
  id: string;
  title: string;
  description: string;
  status: ChangeOrderStatus;
  proposed_amount: number | null;
  approved_amount: number | null;
  rejection_reason: string | null;
  requested_at: string;
  decided_at: string | null;
  job: {
    id: string;
    job_number: string;
    customer: { full_name: string } | null;
  } | null;
  job_service: {
    service_type: { name: string } | null;
  } | null;
  requested_by_profile: { full_name: string } | null;
  items: COItem[];
  attachments: COAttachment[];
}

const STATUS_CONFIG: Record<ChangeOrderStatus, { label: string; bg: string; text: string }> = {
  draft:                     { label: "Draft",    bg: "bg-zinc-500/15",    text: "text-zinc-400" },
  pending_customer_approval: { label: "Pending",  bg: "bg-yellow-400/15",  text: "text-yellow-400" },
  approved:                  { label: "Approved", bg: "bg-primary/20",     text: "text-primary" },
  rejected:                  { label: "Rejected", bg: "bg-error/15",       text: "text-error" },
  cancelled:                 { label: "Cancelled",bg: "bg-zinc-700/20",    text: "text-zinc-500" },
};

const ALL_STATUSES: ChangeOrderStatus[] = [
  "draft", "pending_customer_approval", "approved", "rejected", "cancelled",
];

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`;
}

export default function SalesRequestsPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen]   = useState(false);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [orders, setOrders]           = useState<ChangeOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ChangeOrder | null>(null);

  // Edit state
  const [editTitle, setEditTitle]               = useState("");
  const [editDescription, setEditDescription]   = useState("");
  const [editStatus, setEditStatus]             = useState<ChangeOrderStatus>("draft");
  const [editProposed, setEditProposed]         = useState("");
  const [editApproved, setEditApproved]         = useState("");
  const [editRejection, setEditRejection]       = useState("");

  // Vendor identity
  const [userId, setUserId]             = useState<string | null>(null);
  const [salespersonId, setSalespersonId] = useState<string | null>(null);
  const [vendorInitials, setVendorInitials] = useState("SD");
  const [vendorName, setVendorName]     = useState("");
  const [vendorAvatar, setVendorAvatar] = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ── Load identity ──────────────────────────────────────────────────────
  const loadIdentity = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    setUserId(user.id);

    const [profileRes, spRes] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
      supabase.from("salespersons").select("id").eq("profile_id", user.id).single(),
    ]);

    if (profileRes.data) {
      const name = profileRes.data.full_name || "";
      setVendorName(name);
      setVendorAvatar(profileRes.data.avatar_url ?? null);
      setVendorInitials(name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase() || "SD");
    }
    if (spRes.data) {
      setSalespersonId(spRes.data.id);
      return spRes.data.id;
    }
    return null;
  }, []);

  // ── Fetch change orders only for this salesperson's jobs ───────────────
  const fetchOrders = useCallback(async (spId: string) => {
    setLoading(true);
    try {
      // Step 1: get job IDs belonging to this salesperson
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id")
        .eq("salesperson_id", spId);

      if (jobsError) {
        console.error("[Requests] jobs fetch error:", jobsError);
        setOrders([]);
        return;
      }

      const jobIds = (jobsData ?? []).map(j => j.id);

      if (jobIds.length === 0) {
        setOrders([]);
        return;
      }

      // Step 2: fetch change orders for those jobs
      // Note: change_orders has job_service_id FK to job_services
      const { data, error } = await supabase
        .from("change_orders")
        .select(`
          id, title, description, status,
          proposed_amount, approved_amount,
          rejection_reason, requested_at, decided_at,
          job_service_id,
          job:jobs (
            id, job_number,
            customer:customers (full_name)
          ),
          job_service:job_services!change_orders_job_service_id_fkey (
            service_type:service_types (name)
          ),
          requested_by_profile:profiles!change_orders_requested_by_profile_id_fkey (
            full_name
          ),
          items:change_order_items (
            id, description, amount, sort_order,
            change_order_attachments (id, file_name, url, mime_type, change_order_item_id)
          ),
          attachments:change_order_attachments (id, file_name, url, mime_type, change_order_item_id)
        `)
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Requests] change_orders fetch error:", error);
        // Fallback: simpler query without nested service_type
        const { data: fallback, error: fallbackErr } = await supabase
          .from("change_orders")
          .select(`
            id, title, description, status,
            proposed_amount, approved_amount,
            rejection_reason, requested_at, decided_at,
            job:jobs (id, job_number, customer:customers (full_name)),
            items:change_order_items (
              id, description, amount, sort_order,
              change_order_attachments (id, file_name, url, mime_type, change_order_item_id)
            ),
            attachments:change_order_attachments (id, file_name, url, mime_type, change_order_item_id)
          `)
          .in("job_id", jobIds)
          .order("created_at", { ascending: false });

        if (fallbackErr) {
          console.error("[Requests] fallback error:", fallbackErr);
          return;
        }
        const normalized = (fallback ?? []).map((o: any) => ({
          ...o,
          job_service: null,
          requested_by_profile: null,
          items: (o.items ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order),
        }));
        setOrders(normalized as any[]);
        return;
      }

      const normalized = (data ?? []).map((o: any) => ({
        ...o,
        items: (o.items ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
      setOrders(normalized as any[]);
    } catch (err) {
      console.error("[SalesRequests] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIdentity().then(spId => {
      if (spId) fetchOrders(spId);
    });
  }, [loadIdentity, fetchOrders]);

  // ── Open popup and populate edit fields ───────────────────────────────
  const openOrder = (order: ChangeOrder) => {
    setSelectedOrder(order);
    setEditTitle(order.title);
    setEditDescription(order.description);
    setEditStatus(order.status);
    setEditProposed(order.proposed_amount != null ? String(order.proposed_amount) : "");
    setEditApproved(order.approved_amount != null ? String(order.approved_amount) : "");
    setEditRejection(order.rejection_reason ?? "");
  };

  const closeOrder = () => setSelectedOrder(null);

  // ── Save changes ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedOrder || !userId) return;
    setSaving(true);
    try {
      const isDecided = editStatus === "approved" || editStatus === "rejected";

      const { error } = await supabase
        .from("change_orders")
        .update({
          title:            editTitle.trim(),
          description:      editDescription.trim(),
          status:           editStatus,
          proposed_amount:  editProposed !== "" ? Number(editProposed) : null,
          approved_amount:  editStatus === "approved" && editApproved !== "" ? Number(editApproved) : null,
          rejection_reason: editStatus === "rejected" ? editRejection.trim() : null,
          decided_at:       isDecided ? new Date().toISOString() : null,
          reviewed_by:      userId,
          updated_at:       new Date().toISOString(),
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Optimistic update in list
      setOrders(prev =>
        prev.map(o =>
          o.id === selectedOrder.id
            ? {
                ...o,
                title:            editTitle.trim(),
                description:      editDescription.trim(),
                status:           editStatus,
                proposed_amount:  editProposed !== "" ? Number(editProposed) : null,
                approved_amount:  editStatus === "approved" && editApproved !== "" ? Number(editApproved) : null,
                rejection_reason: editStatus === "rejected" ? editRejection.trim() : null,
              }
            : o
        )
      );

      closeOrder();
    } catch (err: any) {
      console.error("[SalesRequests] save error:", err);
      alert(`Failed to save: ${err?.message ?? "Please try again."}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.title || "").toLowerCase().includes(q) ||
      (o.status || "").toLowerCase().includes(q) ||
      (o.job?.job_number || "").toLowerCase().includes(q) ||
      (o.job?.customer?.full_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 p-4 pt-12 pb-32">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-2 relative">
        <div className="relative z-50">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-on-surface">menu</span>
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute top-12 left-0 w-52 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <Link href="/mobile/sales/profile" className="flex items-center gap-3 px-4 py-4 hover:bg-primary/10 text-on-surface transition-colors" onClick={() => setIsMenuOpen(false)}>
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  <span className="font-semibold text-sm">My Profile</span>
                </Link>
                <Link href="/mobile/sales/calendar" className="flex items-center gap-3 px-4 py-4 hover:bg-primary/10 text-on-surface transition-colors" onClick={() => setIsMenuOpen(false)}>
                  <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                  <span className="font-semibold text-sm">Calendar</span>
                </Link>
                <div className="h-[1px] bg-outline-variant/30 w-full" />
                <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-4 hover:bg-red-500/10 text-red-400 transition-colors text-left">
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  <span className="font-semibold text-sm">Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>

        <h1 className="text-lg font-black tracking-widest uppercase text-on-surface absolute left-1/2 -translate-x-1/2 min-w-max">
          REQUESTS
        </h1>

        <Link href="/mobile/sales/profile" className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 shadow-lg flex items-center justify-center overflow-hidden active:scale-95 transition-transform shrink-0 z-10">
          {vendorAvatar ? (
            <img src={vendorAvatar} alt={vendorName} className="w-full h-full object-cover" />
          ) : (
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(vendorInitials)}&background=aeee2a&color=080808&bold=true`}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          )}
        </Link>
      </div>

      {/* ── Search ───────────────────────────────────────────────────── */}
      <div className="relative -mt-2">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#7B7B78] pointer-events-none">search</span>
        <input
          type="text"
          placeholder="Search title, client, job..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low text-on-surface border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-primary placeholder-[#7B7B78] transition-colors shadow-sm"
        />
      </div>

      {/* ── List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
          <p className="text-on-surface-variant text-sm">Loading change orders...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-surface-container-low rounded-3xl border border-outline-variant/20">
          <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">assignment</span>
          </div>
          <p className="text-on-surface font-bold">No change orders found</p>
          <p className="text-on-surface-variant text-xs text-center px-6">Change orders from your customers will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(order => {
            const cfg    = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
            const amount = order.status === "approved" ? order.approved_amount : order.proposed_amount;

            return (
              <button
                key={order.id}
                onClick={() => openOrder(order)}
                className="w-full text-left bg-surface-container-low rounded-2xl p-4 border border-outline-variant/15 hover:border-primary/40 active:scale-[0.98] transition-all duration-200 shadow-lg"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] font-bold text-[#7B7B78] tracking-widest uppercase">
                        {order.job?.job_number ?? "—"}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-on-surface leading-tight truncate">
                      {order.title}
                    </h3>

                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-[#7B7B78] font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">person</span>
                        {order.job?.customer?.full_name ?? "—"}
                      </span>
                      <span className="text-xs text-[#7B7B78] font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">construction</span>
                        {order.job_service?.service_type?.name ?? "General"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] text-[#7B7B78] font-bold mb-1.5">
                      {formatDate(order.requested_at)}
                    </span>
                    <span className={`text-base font-black ${order.status === "approved" ? "text-primary" : "text-on-surface"}`}>
                      {formatCurrency(amount)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Edit Popup ────────────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeOrder} />

          {/* Sheet */}
          <div className="relative w-full bg-[#111] rounded-t-3xl border-t border-outline-variant/30 shadow-2xl z-10 max-h-[92dvh] overflow-y-auto pb-10">

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-outline-variant/50 rounded-full" />
            </div>

            {/* Close */}
            <button
              onClick={closeOrder}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface">close</span>
            </button>

            <div className="px-5 pt-2 pb-4">
              {/* Read-only meta */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_CONFIG[selectedOrder.status].bg} ${STATUS_CONFIG[selectedOrder.status].text}`}>
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </span>
                  <span className="text-[10px] font-bold text-[#7B7B78] uppercase tracking-widest">
                    {selectedOrder.job?.job_number ?? "—"}
                  </span>
                </div>
                <p className="text-xs text-[#7B7B78] font-medium flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[13px]">person</span>
                  {selectedOrder.job?.customer?.full_name ?? "—"}
                  <span className="mx-1 opacity-30">·</span>
                  <span className="material-symbols-outlined text-[13px]">group</span>
                  {selectedOrder.requested_by_profile?.full_name ?? "Internal"}
                  <span className="mx-1 opacity-30">·</span>
                  {formatDate(selectedOrder.requested_at)}
                </p>
              </div>

              {/* ── Editable fields ─────────────────────────────────── */}
              <div className="flex flex-col gap-4">

                {/* Title */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-1.5 block">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-1.5 block">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-1.5 block">Status</label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as ChangeOrderStatus)}
                    className="w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>

                {/* Proposed Amount */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-1.5 block">
                    Proposed Value ($)
                  </label>
                  <div className="flex items-center bg-surface-container-high border border-outline-variant/30 rounded-2xl px-4 py-3 focus-within:border-primary/50 transition-colors">
                    <span className="text-[#7B7B78] font-bold mr-2 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editProposed}
                      onChange={e => setEditProposed(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent text-on-surface text-sm outline-none font-medium"
                    />
                  </div>
                </div>

                {/* Approved Amount — only when status = approved */}
                {editStatus === "approved" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5 block">
                      Approved Value ($)
                    </label>
                    <div className="flex items-center bg-primary/5 border border-primary/30 rounded-2xl px-4 py-3 focus-within:border-primary/60 transition-colors">
                      <span className="text-primary font-bold mr-2 text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editApproved}
                        onChange={e => setEditApproved(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-transparent text-on-surface text-sm outline-none font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Rejection Reason — only when status = rejected */}
                {editStatus === "rejected" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-error mb-1.5 block">
                      Rejection Reason
                    </label>
                    <textarea
                      value={editRejection}
                      onChange={e => setEditRejection(e.target.value)}
                      rows={3}
                      placeholder="Explain why this was rejected..."
                      className="w-full bg-error/5 border border-error/30 rounded-2xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-error/60 transition-colors resize-none"
                    />
                  </div>
                )}

                {/* Items — numbered list with per-item photos */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-3 block">
                      ITEMS ({selectedOrder.items.length})
                    </label>
                    <div className="flex flex-col gap-3">
                      {selectedOrder.items.map((item, idx) => {
                        // Photos that belong specifically to this item
                        const itemPhotos = item.change_order_attachments?.filter(
                          a => a.change_order_item_id === item.id
                        ) ?? [];
                        const isImage = (url: string) =>
                          /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(url);

                        return (
                          <div
                            key={item.id}
                            className="bg-surface-container-high rounded-2xl p-4 border border-outline-variant/20"
                          >
                            {/* Item header */}
                            <div className="flex items-start gap-3 mb-3">
                              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-on-surface leading-snug">
                                  {item.description || "No description"}
                                </p>
                                {item.amount != null && (
                                  <p className="text-xs text-primary font-black mt-1">
                                    {formatCurrency(item.amount)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Per-item photos */}
                            {itemPhotos.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 mt-1">
                                {itemPhotos.map(photo => (
                                  <a
                                    key={photo.id}
                                    href={photo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="aspect-square rounded-xl overflow-hidden border border-outline-variant/30 block"
                                  >
                                    {isImage(photo.url) ? (
                                      <img
                                        src={photo.url}
                                        alt={photo.file_name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-surface-container flex flex-col items-center justify-center gap-1">
                                        <span className="material-symbols-outlined text-primary text-[20px]">attach_file</span>
                                        <span className="text-[8px] text-on-surface-variant font-bold truncate px-1 w-full text-center">
                                          {photo.file_name}
                                        </span>
                                      </div>
                                    )}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Orphan attachments (not linked to any item) */}
                {(() => {
                  const orphans = selectedOrder.attachments?.filter(
                    a => !a.change_order_item_id
                  ) ?? [];
                  if (orphans.length === 0) return null;
                  return (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-2 block">
                        Other Files ({orphans.length})
                      </label>
                      <div className="flex flex-col gap-2">
                        {orphans.map(att => (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-surface-container-high rounded-2xl px-4 py-3 border border-outline-variant/20"
                          >
                            <span className="material-symbols-outlined text-primary text-[18px]">attach_file</span>
                            <span className="text-sm text-on-surface font-medium truncate flex-1">{att.file_name}</span>
                            <span className="material-symbols-outlined text-[#7B7B78] text-[16px]">open_in_new</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-primary text-[#1a2e00] font-black text-sm active:scale-[0.98] transition-transform disabled:opacity-50 shadow-[0_0_20px_rgba(174,238,42,0.15)]"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav items={SALES_NAV} />
    </div>
  );
}
