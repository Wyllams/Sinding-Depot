"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { useRouter } from "next/navigation";

interface ChangeOrder {
  id: string;
  title: string;
  status: "draft" | "pending_customer_approval" | "approved" | "rejected" | "cancelled";
  proposed_amount: number | null;
  approved_amount: number | null;
  requested_at: string;
  job: {
    id: string;
    job_number: string;
    customer: {
      full_name: string;
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:                      { label: "Draft",    bg: "bg-[#fff7cf]/10", text: "text-[#fff7cf]", dot: "bg-[#fff7cf]" },
  pending_customer_approval:  { label: "Pending",  bg: "bg-[#e3eb5d]/10", text: "text-[#e3eb5d]", dot: "bg-[#e3eb5d]" },
  approved:                   { label: "Approved", bg: "bg-[#aeee2a]/20", text: "text-[#aeee2a]", dot: "bg-[#aeee2a]" },
  rejected:                   { label: "Rejected", bg: "bg-[#ff7351]/10", text: "text-[#ff7351]", dot: "bg-[#ff7351]" },
  cancelled:                  { label: "Cancelled",bg: "bg-[#474846]/20", text: "text-[#ababa8]", dot: "bg-[#747673]" },
};

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "—";
  return `${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear()}`;
}

export default function SalesMobileOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // In a real scenario with RLS, the user only sees orders for their jobs.
      const { data, error } = await supabase
        .from("change_orders")
        .select(`
          id, title, status, proposed_amount, approved_amount, requested_at,
          job:jobs(id, job_number, customer:customers(full_name)),
          job_service:job_services(service_type:service_types(name)),
          requested_by_profile:profiles!change_orders_requested_by_profile_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false });
        
      if (error) {
        // Retry logic for relations if profile fk name doesn't match
        console.error("Fetch orders error, retrying without specific fkey...", error.message);
        const { data: retryData, error: retryError } = await supabase
          .from("change_orders")
          .select(`
            id, title, status, proposed_amount, approved_amount, requested_at,
            job:jobs(id, job_number, customer:customers(full_name)),
            job_service:job_services(service_type:service_types(name)),
            requested_by_profile:profiles(full_name)
          `)
          .order("created_at", { ascending: false });
          
        if (retryError) throw retryError;
        setOrders((retryData ?? []) as any[]);
      } else {
        setOrders((data ?? []) as any[]);
      }
    } catch (err) {
      console.error("[SalesMobileOrders] error fetching:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="flex flex-col gap-6 p-4 pt-12 pb-32">
      {/* Standard Header */}
      <div className="flex justify-between items-center mb-2 relative">
        {/* Left side: Hamburger Menu */}
        <div className="relative z-50">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 rounded-full bg-[#1e201e] border border-[#474846]/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[#faf9f5]">menu</span>
          </button>
          
          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute top-12 left-0 w-48 bg-[#1e201e] border border-[#474846]/30 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <Link 
                  href="/mobile/sales/profile"
                  className="flex items-center gap-3 px-4 py-4 hover:bg-[#aeee2a]/10 text-[#faf9f5] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  <span className="font-semibold text-sm">My Profile</span>
                </Link>
                <div className="h-[1px] bg-[#474846]/30 w-full" />
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-red-500/10 text-red-400 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  <span className="font-semibold text-sm">Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Center: Title */}
        <h1 className="text-lg font-black tracking-widest uppercase text-[#faf9f5] absolute left-1/2 -translate-x-1/2 min-w-max text-center">
          CHANGE ORDERS
        </h1>

        {/* Right side: Avatar */}
        <Link href="/mobile/sales/profile" className="w-10 h-10 rounded-full bg-[#1e201e] border border-[#474846]/30 shadow-lg flex items-center justify-center overflow-hidden active:scale-95 transition-transform shrink-0 z-10">
          <img src="https://ui-avatars.com/api/?name=SD&background=aeee2a&color=080808&bold=true" alt="Profile" className="w-full h-full object-cover" />
        </Link>
      </div>

      {/* Global Search Bar */}
      <div className="relative mb-2 mt-2">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#7B7B78] pointer-events-none">search</span>
        <input 
          type="text"
          placeholder="Search status, project, client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#121412] text-[#faf9f5] border border-[#474846]/50 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-[#aeee2a] placeholder-[#7B7B78] transition-colors shadow-sm"
        />
      </div>
        
      {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
             <span className="material-symbols-outlined text-[#aeee2a] text-3xl animate-spin">progress_activity</span>
             <p className="text-[#ababa8] text-sm">Loading change orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-[#121412] rounded-2xl border border-[#474846]/20">
             <div className="w-14 h-14 bg-[#1e201e] rounded-full flex items-center justify-center">
               <span className="material-symbols-outlined text-[#aeee2a]">request_quote</span>
             </div>
             <p className="text-[#faf9f5] font-bold">No change orders found</p>
          </div>
      ) : (
        <div className="flex flex-col gap-3">
           {orders.filter((order) => {
             if (!searchQuery) return true;
             const query = searchQuery.toLowerCase();
             const statusStr = (order.status || "").toLowerCase();
             const titleStr = (order.title || "").toLowerCase();
             const jobNum = (order.job?.job_number || "").toLowerCase();
             return statusStr.includes(query) || titleStr.includes(query) || jobNum.includes(query);
           }).map((order) => {
             const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
               const amount = order.status === "approved" ? order.approved_amount : order.proposed_amount;
               
               return (
                 <Link href={`/mobile/sales/orders/${order.id}`} key={order.id}>
                   <div 
                     className="bg-[#121412] rounded-2xl p-4 border border-[#474846]/15 hover:border-[#aeee2a]/40 transition-colors shadow-lg active:scale-[0.98] duration-200"
                   >
                     <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-1.5">
                             <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text}`}>
                                {cfg.label}
                             </span>
                             <span className="text-[10px] font-bold text-[#ababa8] tracking-widest uppercase">
                               {order.job?.job_number ? order.job.job_number : "—"}
                             </span>
                           </div>
                           <h3 className="text-sm font-extrabold text-[#faf9f5] leading-tight truncate">{order.title}</h3>
                           
                           <div className="flex items-center gap-3 mt-2">
                             <span className="text-xs text-[#ababa8] font-medium flex items-center gap-1">
                               <span className="material-symbols-outlined text-[14px]">construction</span>
                               {order.job_service?.service_type?.name || "General"}
                             </span>
                             <span className="text-xs text-[#ababa8] font-medium flex items-center gap-1">
                               <span className="material-symbols-outlined text-[14px]">group</span>
                               <span className="truncate max-w-[80px] block">{order.requested_by_profile?.full_name || "Internal"}</span>
                             </span>
                           </div>
                        </div>
                        
                        <div className="flex flex-col items-end shrink-0">
                           <span className="text-[10px] text-[#7B7B78] font-bold mb-2">
                             {formatDate(order.requested_at).split(',')[0]}
                           </span>
                           <span className={`text-base font-black ${order.status === 'approved' ? 'text-[#aeee2a]' : 'text-[#faf9f5]'}`}>
                              {formatCurrency(amount)}
                           </span>
                        </div>
                     </div>
                   </div>
                 </Link>
               );
             })}
          </div>
        )}

      <MobileBottomNav items={[
        { icon: "dashboard", label: "Dashboard", href: "/mobile/sales" },
        { icon: "home_work", label: "Projects", href: "/mobile/sales/projects" },
        { icon: "request_quote", label: "Orders", href: "/mobile/sales/orders" },
        { icon: "calendar_today", label: "Calendar", href: "/mobile/sales/calendar" },
      ]} />
    </div>
  );
}
