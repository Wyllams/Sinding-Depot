"use client";

import { useEffect, useState, useCallback, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface COItem {
  id: string;
  description: string;
  amount: number | null;
  sort_order: number;
  attachments: { id: string; url: string; file_name: string; mime_type: string | null }[];
}

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
    address: string;
    city: string;
    customer: { full_name: string; phone: string; email: string } | null;
  } | null;
  job_service: { service_type: { name: string } | null } | null;
  requested_by_profile: { full_name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  draft:                      { label: "Draft",    bg: "bg-[#fff7cf]/10", text: "text-[#fff7cf]", dot: "bg-[#fff7cf]", border: "border-[#fff7cf]/20" },
  pending_customer_approval:  { label: "Pending",  bg: "bg-[#e3eb5d]/10", text: "text-[#e3eb5d]", dot: "bg-[#e3eb5d]", border: "border-[#e3eb5d]/20" },
  approved:                   { label: "Approved", bg: "bg-primary/20", text: "text-primary", dot: "bg-primary", border: "border-primary/30" },
  rejected:                   { label: "Rejected", bg: "bg-error/10", text: "text-error", dot: "bg-error", border: "border-error/20" },
  cancelled:                  { label: "Cancelled",bg: "bg-outline-variant/20", text: "text-on-surface-variant", dot: "bg-outline", border: "border-outline-variant/30" },
};

function formatCurrency(v: number | null): string {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "—";
  return `${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getDate().toString().padStart(2, "0")}/${dt.getFullYear()}`;
}

export default function SalesOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<ChangeOrder | null>(null);
  const [items, setItems] = useState<COItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Price inputs (local state keyed by item id)
  const [prices, setPrices] = useState<Record<string, string>>({});

  const fetchOrder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("change_orders")
        .select(`
          id, title, description, status, proposed_amount, approved_amount, requested_at, created_at,
          job:jobs(id, job_number, address:service_address_line_1, city, customer:customers(full_name, phone, email)),
          job_service:job_services(service_type:service_types(name)),
          requested_by_profile:profiles!change_orders_requested_by_profile_id_fkey(full_name)
        `)
        .eq("id", unwrappedParams.id)
        .single();

      if (error) {
        const { data: retry } = await supabase
          .from("change_orders")
          .select(`
            id, title, description, status, proposed_amount, approved_amount, requested_at, created_at,
            job:jobs(id, job_number, address:service_address_line_1, city, customer:customers(full_name, phone, email)),
            job_service:job_services(service_type:service_types(name)),
            requested_by_profile:profiles(full_name)
          `)
          .eq("id", unwrappedParams.id)
          .single();
        setOrder(retry as any);
      } else {
        setOrder(data as any);
      }

      // Fetch items
      const { data: itemsData } = await supabase
        .from("change_order_items")
        .select("id, description, amount, sort_order")
        .eq("change_order_id", unwrappedParams.id)
        .order("sort_order", { ascending: true });

      const coItems: COItem[] = (itemsData || []).map((item: any) => ({
        ...item,
        attachments: [],
      }));

      // Fetch attachments for all items
      if (coItems.length > 0) {
        const itemIds = coItems.map((i) => i.id);
        const { data: atts } = await supabase
          .from("change_order_attachments")
          .select("id, change_order_item_id, url, file_name, mime_type")
          .eq("change_order_id", unwrappedParams.id);

        if (atts) {
          const attMap = new Map<string, typeof atts>();
          atts.forEach((a: any) => {
            const key = a.change_order_item_id || "__global__";
            const arr = attMap.get(key) || [];
            arr.push(a);
            attMap.set(key, arr);
          });

          coItems.forEach((item) => {
            item.attachments = (attMap.get(item.id) || []) as COItem["attachments"];
          });
        }
      }

      setItems(coItems);

      // Initialize prices from existing amounts
      const priceMap: Record<string, string> = {};
      coItems.forEach((item) => {
        if (item.amount != null) {
          priceMap[item.id] = item.amount.toString();
        }
      });
      setPrices(priceMap);
    } catch (err) {
      console.error("[SalesOrderDetail] error:", err);
    } finally {
      setLoading(false);
    }
  }, [unwrappedParams.id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  /* ─── Send to Customer ───────────────────────── */
  const handleSendToCustomer = async (): Promise<void> => {
    if (!order) return;

    // Validate all items have a price
    const allPriced = items.every((item) => {
      const val = parseFloat(prices[item.id] || "");
      return !isNaN(val) && val >= 0;
    });

    if (!allPriced) {
      alert("Please enter a price for every item before sending.");
      return;
    }

    if (!confirm("Send this change order to the customer for approval?")) return;

    setSending(true);
    try {
      // Update each item with its price
      for (const item of items) {
        const amount = parseFloat(prices[item.id] || "0");
        await supabase
          .from("change_order_items")
          .update({ amount })
          .eq("id", item.id);
      }

      // Calculate total
      const total = items.reduce((sum, item) => {
        return sum + parseFloat(prices[item.id] || "0");
      }, 0);

      // Update change order status + proposed_amount
      const { error } = await supabase
        .from("change_orders")
        .update({
          status: "pending_customer_approval",
          proposed_amount: total,
        })
        .eq("id", order.id);

      if (error) throw error;

      // Push notification to customer
      try {
        await fetch("/api/push/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "📋 Change Order for Your Approval",
            body: `A change order (${formatCurrency(total)}) has been submitted for your review.`,
            url: "/customer/change-orders",
            tag: "change-order-customer",
            notificationType: "change_order_customer_approval",
            relatedEntityId: order.job?.id || order.id,
          }),
        });
      } catch { /* non-blocking */ }

      alert("Change order sent to customer!");
      router.push("/mobile/sales/orders");
    } catch (err) {
      console.error("[SalesOrderDetail] send error:", err);
      alert("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Computed total
  const computedTotal = items.reduce((sum, item) => {
    const val = parseFloat(prices[item.id] || "0");
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background p-4 pt-12">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-lg">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <span className="text-xl font-black text-on-surface">Loading...</span>
        </div>
        <div className="flex flex-col mt-32 items-center justify-center gap-4">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background p-4 pt-12">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-lg">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <span className="text-xl font-black text-on-surface">Not Found</span>
        </div>
        <div className="flex flex-col mt-32 items-center justify-center gap-4 text-center px-6">
          <span className="material-symbols-outlined text-error text-5xl">warning</span>
          <h2 className="text-on-surface font-black text-2xl">Order not found</h2>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
  const isDraft = order.status === "draft";
  const isApproved = order.status === "approved";
  const displayAmount = isApproved ? order.approved_amount : order.proposed_amount;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <div className="px-4 pt-12 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/mobile/sales/orders")} className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-lg">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <div className="flex flex-col ml-1">
            <span className="text-primary text-[10px] uppercase font-bold tracking-widest pl-1">Change Order</span>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">CO {order.job?.job_number || "—"}</h1>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-6">
        {/* Status + Title */}
        <div className="flex flex-col gap-2">
          <div className={`self-start flex items-center gap-1.5 px-3 py-1 ${cfg.bg} ${cfg.text} ${cfg.border} border rounded-full mb-1`}>
            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{cfg.label}</span>
          </div>
          <h1 className="text-2xl font-black text-on-surface leading-tight">{order.title}</h1>
          <p className="text-sm text-on-surface-variant font-medium flex items-center gap-1.5 mt-1">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            {formatDate(order.requested_at)}
          </p>
        </div>

        {/* Project & Client */}
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 shadow-lg flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-primary">business_center</span>
            <h2 className="text-on-surface-variant font-bold text-[11px] tracking-widest uppercase">Project & Client</h2>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-[#7B7B78] font-bold tracking-wider">Client</span>
            <span className="text-sm font-bold text-on-surface">{order.job?.customer?.full_name || "—"}</span>
            {order.job?.customer?.phone && (
              <a href={`tel:${order.job.customer.phone}`} className="text-sm font-medium text-[#60b8f5] mt-0.5">{order.job.customer.phone}</a>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase text-[#7B7B78] font-bold tracking-wider">Location</span>
            <span className="text-sm font-medium text-on-surface-variant">{order.job?.address}, {order.job?.city}</span>
          </div>
        </div>

        {/* Service & Requestor */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-lg flex flex-col gap-2">
            <span className="material-symbols-outlined text-[18px] text-error">construction</span>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78]">Service</h3>
              <p className="text-sm font-bold text-on-surface mt-1">{order.job_service?.service_type?.name || "General"}</p>
            </div>
          </div>
          <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-lg flex flex-col gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#f5a623]">group</span>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78]">Requested By</h3>
              <p className="text-sm font-bold text-on-surface mt-1 truncate">{order.requested_by_profile?.full_name || "Internal"}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {order.description && (
          <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[18px] text-primary">location_on</span>
              <h2 className="text-on-surface-variant font-bold text-[11px] tracking-widest uppercase">Location</h2>
            </div>
            <p className="text-sm font-medium text-on-surface leading-relaxed whitespace-pre-wrap">{order.description}</p>
          </div>
        )}

        {/* Items Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-[18px] text-primary">list_alt</span>
            <h2 className="text-on-surface-variant font-bold text-[11px] tracking-widest uppercase">
              Items ({items.length})
            </h2>
          </div>

          {items.length === 0 ? (
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20 text-center">
              <p className="text-on-surface-variant text-sm">No items in this change order.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/20 shadow-lg space-y-4">
                  {/* Item header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                        <span className="text-error font-black text-xs">{idx + 1}</span>
                      </div>
                      <p className="text-on-surface font-bold text-sm leading-snug whitespace-pre-wrap">{item.description}</p>
                    </div>
                  </div>

                  {/* Photos */}
                  {item.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.attachments.map((att) => (
                        <button
                          key={att.id}
                          onClick={() => setLightbox(att.url)}
                          className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant/30 hover:border-primary/50 transition-colors"
                        >
                          <img src={att.url} alt={att.file_name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Price input (only for draft) */}
                  {isDraft ? (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-2">
                        Price *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface font-bold text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={prices[item.id] || ""}
                          onChange={(e) => setPrices({ ...prices, [item.id]: e.target.value })}
                          placeholder="0.00"
                          className="w-full bg-surface-container-high border border-outline-variant/30 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <span className="text-on-surface font-black text-lg">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  )}
                </div>
              ))}

              {/* Total */}
              <div className="bg-surface-container-high rounded-2xl p-5 border border-primary/20 flex items-center justify-between">
                <span className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">Total</span>
                <span className="text-primary font-black text-2xl">
                  {isDraft ? formatCurrency(computedTotal) : formatCurrency(displayAmount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Send to Customer Button (only for draft) */}
        {isDraft && items.length > 0 && (
          <div className="pt-4 pb-8">
            <button
              onClick={handleSendToCustomer}
              disabled={sending}
              className="w-full h-14 bg-primary text-[#1a2e00] font-bold text-base rounded-full shadow-[0_10px_40px_rgba(174,238,42,0.25)] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-[#1a2e00]/20 border-t-[#1a2e00] rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl" translate="no">send</span>
                  Send to Customer ({formatCurrency(computedTotal)})
                </>
              )}
            </button>
            <p className="text-center text-outline-variant text-[10px] uppercase tracking-widest font-bold mt-4">
              Customer will be notified for approval
            </p>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            onClick={() => setLightbox(null)}
          >
            <span className="material-symbols-outlined text-xl text-white" translate="no">close</span>
          </button>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
