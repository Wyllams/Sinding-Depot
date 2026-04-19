"use client";

import { useEffect, useState, useCallback, use } from "react";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

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
    customer: {
      full_name: string;
      phone: string;
      email: string;
    } | null;
  } | null;
  job_service: {
    service_type: {
      name: string;
    } | null;
  } | null;
  requested_by_profile: {
    full_name: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  draft:                      { label: "Draft",    bg: "bg-[#fff7cf]/10", text: "text-[#fff7cf]", dot: "bg-[#fff7cf]", border: "border-[#fff7cf]/20" },
  pending_customer_approval:  { label: "Pending",  bg: "bg-[#e3eb5d]/10", text: "text-[#e3eb5d]", dot: "bg-[#e3eb5d]", border: "border-[#e3eb5d]/20" },
  approved:                   { label: "Approved", bg: "bg-[#aeee2a]/20", text: "text-[#aeee2a]", dot: "bg-[#aeee2a]", border: "border-[#aeee2a]/30" },
  rejected:                   { label: "Rejected", bg: "bg-[#ff7351]/10", text: "text-[#ff7351]", dot: "bg-[#ff7351]", border: "border-[#ff7351]/20" },
  cancelled:                  { label: "Cancelled",bg: "bg-[#474846]/20", text: "text-[#ababa8]", dot: "bg-[#747673]", border: "border-[#474846]/30" },
};

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

export default function SalesOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<ChangeOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("change_orders")
        .select(`
          id, title, description, status, proposed_amount, approved_amount, requested_at, created_at,
          job:jobs(id, job_number, address, city, customer:customers(full_name, phone, email)),
          job_service:job_services(service_type:service_types(name)),
          requested_by_profile:profiles!change_orders_requested_by_profile_id_fkey(full_name)
        `)
        .eq("id", unwrappedParams.id)
        .single();
        
      if (error) {
        console.error("Fetch order error, retrying without specific fkey...", error.message);
        const { data: retryData, error: retryError } = await supabase
          .from("change_orders")
          .select(`
            id, title, description, status, proposed_amount, approved_amount, requested_at, created_at,
            job:jobs(id, job_number, address, city, customer:customers(full_name, phone, email)),
            job_service:job_services(service_type:service_types(name)),
            requested_by_profile:profiles(full_name)
          `)
          .eq("id", unwrappedParams.id)
          .single();
          
        if (retryError) throw retryError;
        setOrder(retryData as any);
      } else {
        setOrder(data as any);
      }
    } catch (err) {
      console.error("[SalesOrderDetail] error fetching:", err);
    } finally {
      setLoading(false);
    }
  }, [unwrappedParams.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#0d0f0d] p-4 pt-12">
        <div className="flex items-center gap-3">
           <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-[#1e201e] border border-[#474846]/30 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-lg">
              <span className="material-symbols-outlined text-[#faf9f5]">arrow_back</span>
           </button>
           <span className="text-xl font-black text-[#faf9f5]">Loading...</span>
        </div>
        <div className="flex flex-col mt-32 items-center justify-center gap-4">
           <span className="material-symbols-outlined text-[#aeee2a] text-4xl animate-spin">progress_activity</span>
           <p className="text-[#ababa8] font-bold text-sm tracking-widest uppercase">Loading details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-[#0d0f0d] p-4 pt-12">
        <div className="flex items-center gap-3">
           <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-[#1e201e] border border-[#474846]/30 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-lg">
              <span className="material-symbols-outlined text-[#faf9f5]">arrow_back</span>
           </button>
           <span className="text-xl font-black text-[#faf9f5]">Not Found</span>
        </div>
        <div className="flex flex-col mt-32 items-center justify-center gap-4 text-center px-6">
           <span className="material-symbols-outlined text-[#ff7351] text-5xl">warning</span>
           <h2 className="text-[#faf9f5] font-black text-2xl">Order not found</h2>
           <p className="text-[#ababa8] text-sm">We couldn't find the change order you are looking for.</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
  const isApproved = order.status === "approved";
  const amount = isApproved ? order.approved_amount : order.proposed_amount;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0d0f0d]">
      <div className="px-4 pt-12 pb-2">
        <div className="flex items-center gap-3">
           <button onClick={() => router.push("/mobile/sales/orders")} className="w-10 h-10 rounded-full bg-[#1e201e] border border-[#474846]/30 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-lg">
              <span className="material-symbols-outlined text-[#faf9f5]">arrow_back</span>
           </button>
           <div className="flex flex-col ml-1">
              <span className="text-[#aeee2a] text-[10px] uppercase font-bold tracking-widest pl-1">Change Order</span>
              <h1 className="text-2xl font-black tracking-tight text-[#faf9f5]">CO #{order.job?.job_number || "—"}</h1>
           </div>
        </div>
      </div>
      
      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col gap-2">
           <div className={`self-start flex items-center gap-1.5 px-3 py-1 ${cfg.bg} ${cfg.text} ${cfg.border} border rounded-full mb-1`}>
               <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
               <span className="text-[10px] font-black uppercase tracking-widest">{cfg.label}</span>
           </div>
           <h1 className="text-2xl font-black text-[#faf9f5] leading-tight">{order.title}</h1>
           <p className="text-sm text-[#ababa8] font-medium flex items-center gap-1.5 mt-1">
             <span className="material-symbols-outlined text-[16px]">schedule</span>
             Requested on {formatDate(order.requested_at)}
           </p>
        </div>

        {/* Amount Card */}
        <div className="bg-[#121412] rounded-2xl p-5 border border-[#474846]/20 shadow-lg flex items-center justify-between">
            <div className="flex flex-col gap-1">
               <span className={`text-[10px] font-bold uppercase tracking-widest ${isApproved ? 'text-[#aeee2a]' : 'text-[#ababa8]'}`}>
                 {isApproved ? "Approved Total" : "Proposed Total"}
               </span>
               <span className={`text-4xl font-black ${isApproved ? 'text-[#aeee2a]' : 'text-[#faf9f5]'}`}>
                  {formatCurrency(amount)}
               </span>
            </div>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${cfg.bg} ${cfg.border}`}>
               <span className={`material-symbols-outlined text-3xl ${cfg.text}`}>
                  {isApproved ? "check_circle" : order.status === "rejected" ? "cancel" : "request_quote"}
               </span>
            </div>
        </div>

        {/* Project & Client Card */}
        <div className="bg-[#121412] rounded-2xl p-5 border border-[#474846]/30 shadow-lg flex flex-col gap-4">
           <div className="flex items-center gap-2 mb-1">
               <span className="material-symbols-outlined text-[18px] text-[#aeee2a]">business_center</span>
               <h2 className="text-[#ababa8] font-bold text-[11px] tracking-widest uppercase">Project & Client</h2>
           </div>
           
           <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-[#7B7B78] font-bold tracking-wider">Project No.</span>
              <span className="text-sm font-bold text-[#faf9f5]">#{order.job?.job_number || "—"}</span>
           </div>
           
           <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-[#7B7B78] font-bold tracking-wider">Client Info</span>
              <span className="text-sm font-bold text-[#faf9f5]">{order.job?.customer?.full_name || "—"}</span>
              {order.job?.customer?.phone && (
                 <a href={`tel:${order.job.customer.phone}`} className="text-sm font-medium text-[#60b8f5] mt-0.5">{order.job.customer.phone}</a>
              )}
           </div>

           <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-[#7B7B78] font-bold tracking-wider">Location</span>
              <span className="text-sm font-medium text-[#ababa8]">{order.job?.address}, {order.job?.city}</span>
           </div>
        </div>

        {/* Service & Requestor */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-[#121412] rounded-2xl p-4 border border-[#474846]/30 shadow-lg flex flex-col gap-2">
               <span className="material-symbols-outlined text-[18px] text-[#ff7351]">construction</span>
               <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78]">Service</h3>
                  <p className="text-sm font-bold text-[#faf9f5] mt-1">{order.job_service?.service_type?.name || "General"}</p>
               </div>
           </div>
           <div className="bg-[#121412] rounded-2xl p-4 border border-[#474846]/30 shadow-lg flex flex-col gap-2">
               <span className="material-symbols-outlined text-[18px] text-[#f5a623]">group</span>
               <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78]">Requested By</h3>
                  <p className="text-sm font-bold text-[#faf9f5] mt-1 truncate">{order.requested_by_profile?.full_name || "Internal"}</p>
               </div>
           </div>
        </div>

        {/* Description */}
        {order.description && (
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2 px-1">
                 <span className="material-symbols-outlined text-[18px] text-[#aeee2a]">description</span>
                 <h2 className="text-[#ababa8] font-bold text-[11px] tracking-widest uppercase">Description</h2>
             </div>
             <div className="bg-[#121412] rounded-2xl p-5 border border-[#474846]/20">
                 <p className="text-sm font-medium text-[#faf9f5] leading-relaxed whitespace-pre-wrap">{order.description}</p>
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
