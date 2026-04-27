"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useRealtimeSubscription } from "../../../lib/hooks/useRealtimeSubscription";

interface COItemDetail {
  id: string;
  description: string;
  amount: number | null;
  sort_order: number;
  attachments: { id: string; url: string; mime_type: string | null; file_name: string }[];
}

interface ChangeOrderEntry {
  id: string;
  title: string;
  description: string | null;
  status: string;
  proposed_amount: number | null;
  approved_amount: number | null;
  rejection_reason: string | null;
  requested_at: string;
  requested_by: { full_name: string; role: string } | null;
  items: COItemDetail[];
  // Legacy attachments (COs without items)
  attachments: { id: string; url: string; mime_type: string | null; file_name: string }[];
}

const STATUS_CFG: Record<string, { label: string; badge: string }> = {
  draft:                       { label: "Draft",    badge: "bg-outline-variant/15 text-outline-variant" },
  pending_customer_approval:   { label: "Pending",  badge: "bg-[#f59e0b]/15 text-[#b8860b]" },
  approved:                    { label: "Approved", badge: "bg-[#5c8a00]/15 text-primary" },
  rejected:                    { label: "Rejected", badge: "bg-error/15 text-[#dc2626]" },
  cancelled:                   { label: "Cancelled",badge: "bg-outline-variant/10 text-outline-variant" },
};

export default function CustomerChangeOrders() {
  const [orders, setOrders] = useState<ChangeOrderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ orderId: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function fetchOrders(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("profile_id", user.id)
        .single();
      if (!customer) return;

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id")
        .eq("customer_id", customer.id);
      if (!jobs || jobs.length === 0) { setOrders([]); return; }

      const jobIds = jobs.map((j) => j.id);

      const { data: cos } = await supabase
        .from("change_orders")
        .select(`
          id, title, description, status,
          proposed_amount, approved_amount, rejection_reason, requested_at,
          requested_by:profiles!requested_by_profile_id (full_name, role)
        `)
        .in("job_id", jobIds)
        .in("status", ["pending_customer_approval", "approved", "rejected"])
        .order("requested_at", { ascending: false });

      if (!cos) { setOrders([]); return; }

      const coIds = cos.map((c) => c.id);

      // Fetch items for all COs
      const { data: allItems } = await supabase
        .from("change_order_items")
        .select("id, change_order_id, description, amount, sort_order")
        .in("change_order_id", coIds)
        .order("sort_order", { ascending: true });

      // Fetch all attachments
      const { data: allAtts } = await supabase
        .from("change_order_attachments")
        .select("id, change_order_id, change_order_item_id, url, mime_type, file_name")
        .in("change_order_id", coIds);

      // Map items by CO id
      const itemsByCO = new Map<string, COItemDetail[]>();
      (allItems || []).forEach((item: any) => {
        const arr = itemsByCO.get(item.change_order_id) || [];
        arr.push({ ...item, attachments: [] });
        itemsByCO.set(item.change_order_id, arr);
      });

      // Map attachments to items or to global
      const globalAttsByCO = new Map<string, ChangeOrderEntry["attachments"]>();
      (allAtts || []).forEach((att: any) => {
        if (att.change_order_item_id) {
          // Find the item and attach
          const coItems = itemsByCO.get(att.change_order_id);
          if (coItems) {
            const item = coItems.find((i) => i.id === att.change_order_item_id);
            if (item) {
              item.attachments.push(att);
              return;
            }
          }
        }
        // Global attachment (legacy)
        const arr = globalAttsByCO.get(att.change_order_id) || [];
        arr.push(att);
        globalAttsByCO.set(att.change_order_id, arr);
      });

      setOrders(
        cos.map((c: any) => ({
          ...c,
          requested_by: c.requested_by ?? null,
          items: itemsByCO.get(c.id) || [],
          attachments: globalAttsByCO.get(c.id) || [],
        }))
      );
    } catch (err) {
      console.error("[CustomerChangeOrders]", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, []);

  useRealtimeSubscription({
    table: "change_orders",
    event: "*",
    onPayload: () => { fetchOrders(); },
  });

  async function handleApprove(orderId: string): Promise<void> {
    setActing(orderId);
    try {
      const order = orders.find((o) => o.id === orderId);
      const { error } = await supabase
        .from("change_orders")
        .update({
          status: "approved",
          decided_at: new Date().toISOString(),
          approved_amount: order?.proposed_amount ?? null,
        })
        .eq("id", orderId);
      if (error) throw error;
      await fetchOrders();
    } catch (err) {
      console.error("[CustomerChangeOrders] approve error:", err);
    } finally {
      setActing(null);
    }
  }

  async function handleRejectSubmit(): Promise<void> {
    if (!rejectModal) return;
    setActing(rejectModal.orderId);
    try {
      const { error } = await supabase
        .from("change_orders")
        .update({
          status: "rejected",
          decided_at: new Date().toISOString(),
          rejection_reason: rejectReason.trim() || null,
        })
        .eq("id", rejectModal.orderId);
      if (error) throw error;
      setRejectModal(null);
      setRejectReason("");
      await fetchOrders();
    } catch (err) {
      console.error("[CustomerChangeOrders] reject error:", err);
    } finally {
      setActing(null);
    }
  }

  const fmt$ = (v: number | null): string =>
    v != null ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";

  const isImage = (url: string, mime: string | null): boolean =>
    (mime?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) ?? false;
  const isVideo = (url: string, mime: string | null): boolean =>
    (mime?.startsWith("video/") || /\.(mp4|mov|webm|avi)/i.test(url)) ?? false;

  function renderAttachmentGrid(atts: ChangeOrderEntry["attachments"]): React.ReactNode {
    if (atts.length === 0) return null;
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {atts.map((att) => {
          const img = isImage(att.url, att.mime_type);
          const vid = isVideo(att.url, att.mime_type);
          return (
            <button
              key={att.id}
              type="button"
              className="relative group rounded-xl overflow-hidden border border-[var(--color-outline-variant)] bg-surface-container-high aspect-square cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                if (img || vid) setLightbox({ url: att.url, type: img ? "image" : "video" });
                else window.open(att.url, "_blank");
              }}
            >
              {img ? (
                <img src={att.url} alt={att.file_name || ""} className="w-full h-full object-cover" />
              ) : vid ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-3xl text-on-surface" translate="no">play_circle</span>
                  <span className="text-[9px] text-on-surface-variant">Video</span>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant" translate="no">attach_file</span>
                  <span className="text-[9px] text-on-surface-variant truncate w-full text-center px-1">{att.file_name || "File"}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl opacity-0 group-hover:opacity-100 transition-opacity" translate="no">
                  {vid ? "play_arrow" : "zoom_in"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/customer" className="inline-flex items-center text-on-surface-variant hover:text-on-surface text-sm font-bold transition-colors mb-4">
          <span className="material-symbols-outlined text-[18px] mr-1" translate="no">arrow_back</span>
          Back to Dashboard
        </Link>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Change Orders</h1>
        <p className="text-outline-variant mt-2">Review and approve scope changes for your project.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-[var(--color-outline-variant)] border-t-surface-container-low rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-surface-container border border-[var(--color-outline-variant)] rounded-3xl shadow-sm">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[40px]" translate="no">thumb_up</span>
          </div>
          <h3 className="font-headline font-bold text-xl text-on-surface">You&apos;re all caught up!</h3>
          <p className="text-outline-variant mt-2 max-w-sm mx-auto">
            There are no change orders for your project at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.draft;
            const isPending = order.status === "pending_customer_approval";
            const hasItems = order.items.length > 0;
            const displayAmount = order.status === "approved" ? order.approved_amount : order.proposed_amount;

            return (
              <div key={order.id} className="bg-surface-container border border-[var(--color-outline-variant)] rounded-3xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 pb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-headline font-bold text-lg text-on-surface">{order.title}</h3>
                      {order.requested_by?.full_name && (
                        <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]" translate="no">person</span>
                          {order.requested_by.full_name}
                          <span className="text-on-surface-variant">•</span>
                          <span className="capitalize">{order.requested_by.role}</span>
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {order.description && (
                    <p className="text-outline-variant text-sm leading-relaxed mb-4">{order.description}</p>
                  )}
                </div>

                {/* Items list (new format) */}
                {hasItems ? (
                  <div className="px-6 pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]" translate="no">list_alt</span>
                      Items ({order.items.length})
                    </p>
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={item.id} className="bg-surface-container-high border border-[var(--color-outline-variant)] rounded-2xl p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-primary font-black text-xs">{idx + 1}</span>
                              </div>
                              <p className="text-sm font-medium text-on-surface leading-snug whitespace-pre-wrap">{item.description}</p>
                            </div>
                            {item.amount != null && (
                              <span className="text-on-surface font-bold text-sm whitespace-nowrap shrink-0">
                                {fmt$(item.amount)}
                              </span>
                            )}
                          </div>

                          {/* Item photos */}
                          {item.attachments.length > 0 && (
                            <div className="pl-10">
                              {renderAttachmentGrid(item.attachments)}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Total */}
                      <div className="bg-surface-container-high border-2 border-[var(--color-outline-variant)] rounded-2xl p-4 flex items-center justify-between">
                        <span className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">Total</span>
                        <span className="font-headline text-2xl font-bold text-on-surface">
                          {fmt$(displayAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Legacy format — single amount + global attachments */
                  <div className="px-6 pb-4">
                    <div className="bg-surface-container-high border border-[var(--color-outline-variant)] rounded-2xl p-4 mb-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                        {order.status === "approved" ? "Approved Amount" : "Proposed Amount"}
                      </p>
                      <p className="font-headline text-2xl font-bold text-on-surface">{fmt$(displayAmount)}</p>
                    </div>

                    {order.attachments.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Photos & Attachments</p>
                        {renderAttachmentGrid(order.attachments)}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {isPending && (
                  <div className="px-6 pb-6 flex gap-3">
                    <button
                      onClick={() => { setRejectModal({ orderId: order.id, title: order.title }); setRejectReason(""); }}
                      disabled={acting === order.id}
                      className="flex-1 h-12 rounded-2xl border-2 border-error/30 text-[#dc2626] font-bold text-sm hover:bg-error/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]" translate="no">close</span>
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(order.id)}
                      disabled={acting === order.id}
                      className="flex-1 h-12 rounded-2xl bg-surface-container-low text-on-surface font-bold text-sm hover:bg-surface-container-highest transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                    >
                      <span className="material-symbols-outlined text-[18px]" translate="no">check</span>
                      {acting === order.id ? "Processing..." : "Approve"}
                    </button>
                  </div>
                )}

                {/* Decided Status Footer */}
                {(order.status === "approved" || order.status === "rejected") && (
                  <div className={`px-6 py-4 border-t ${order.status === "approved" ? "bg-primary/10/50 border-primary/20" : "bg-error/10/50 border-error/20"}`}>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]" translate="no">
                        {order.status === "approved" ? "check_circle" : "cancel"}
                      </span>
                      <span className={order.status === "approved" ? "text-primary" : "text-[#dc2626]"}>
                        {order.status === "approved" ? "You approved this change order" : "You rejected this change order"}
                      </span>
                    </p>
                    {order.status === "rejected" && order.rejection_reason && (
                      <div className="mt-2 bg-surface-container/60 rounded-xl px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Reason</p>
                        <p className="text-sm text-outline-variant leading-relaxed">{order.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-surface-container/10 hover:bg-surface-container/20 rounded-full flex items-center justify-center transition-colors"
            onClick={() => setLightbox(null)}
          >
            <span className="material-symbols-outlined text-xl text-white" translate="no">close</span>
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {lightbox.type === "image" && (
              <img src={lightbox.url} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" />
            )}
            {lightbox.type === "video" && (
              <video src={lightbox.url} controls autoPlay className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl" />
            )}
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
          onClick={() => setRejectModal(null)}
        >
          <div
            className="bg-surface-container rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-error/10 text-error rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl" translate="no">feedback</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg text-on-surface">Decline Change Order</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">{rejectModal.title}</p>
                </div>
              </div>
              <p className="text-sm text-outline-variant leading-relaxed">
                We understand this may not be the right fit. Could you share a brief reason so our team can better address your needs?
              </p>
            </div>

            <div className="px-6 pb-4">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. The cost is too high, I'd like an alternative option..."
                className="w-full bg-surface-container-high border border-[var(--color-outline-variant)] rounded-2xl px-4 py-3 text-sm text-on-surface resize-none focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-[#d1d0c9]"
              />
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 h-12 rounded-2xl border border-[var(--color-outline-variant)] text-outline-variant font-bold text-sm hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={acting === rejectModal.orderId}
                className="flex-1 h-12 rounded-2xl bg-error text-white font-bold text-sm hover:bg-error/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                {acting === rejectModal.orderId ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]" translate="no">send</span>
                    Submit Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
