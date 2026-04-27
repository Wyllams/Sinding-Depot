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

interface CustomerJob {
  id: string;
  job_number: string;
  title: string;
  status: string;
  contract_amount: number | null;
  contract_signed_at: string | null;
  customer: {
    full_name: string;
    email: string;
    phone: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    state: string;
    postal_code: string;
  } | null;
  services: Array<{
    service_type: { name: string } | null;
  }> | null;
}

function formatCurrency(v: number | null) {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}/${d.getFullYear()}`;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() || "??";
}

const STATUS_COLORS: Record<string, string> = {
  active:      "bg-primary/15 text-primary border-primary/20",
  in_progress: "bg-primary/15 text-primary border-primary/20",
  completed:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
  on_hold:     "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  draft:       "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
};
const STATUS_LABELS: Record<string, string> = {
  active:      "Active",
  in_progress: "In Progress",
  completed:   "Completed",
  on_hold:     "On Hold",
  draft:       "Draft",
};

export default function SalesCustomersPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen]     = useState(false);
  const [loading, setLoading]           = useState(true);
  const [jobs, setJobs]                 = useState<CustomerJob[]>([]);
  const [searchQuery, setSearchQuery]   = useState("");
  const [selectedJob, setSelectedJob]   = useState<CustomerJob | null>(null);
  const [salespersonId, setSalespersonId] = useState<string | null>(null);
  const [vendorName, setVendorName]     = useState("");
  const [vendorInitials, setVendorInitials] = useState("SD");
  const [vendorAvatar, setVendorAvatar] = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const loadSalesperson = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
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

  const fetchCustomers = useCallback(async (spId: string) => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id, job_number, title, status, contract_amount, contract_signed_at,
          customer:customers (
            full_name, email, phone,
            address_line_1, address_line_2, city, state, postal_code
          ),
          services:job_services (
            service_type:service_types (name)
          )
        `)
        .eq("salesperson_id", spId)
        .gte("contract_signed_at", monthStart)
        .lt("contract_signed_at", monthEnd)
        .order("contract_signed_at", { ascending: false });

      if (error) throw error;
      setJobs((data ?? []) as any[]);
    } catch (err) {
      console.error("[SalesCustomers] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSalesperson().then(spId => {
      if (spId) fetchCustomers(spId);
    });
  }, [loadSalesperson, fetchCustomers]);

  const filtered = jobs.filter(j => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (j.customer?.full_name || "").toLowerCase().includes(q) ||
      (j.job_number || "").toLowerCase().includes(q) ||
      (j.services?.map(s => s.service_type?.name).join(" ") || "").toLowerCase().includes(q)
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
          CUSTOMERS
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

      {/* ── Sub-header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1 -mt-2">
        <p className="text-[10px] font-bold text-[#7B7B78] uppercase tracking-widest">
          Closed This Month
        </p>
        <span className="text-xs font-bold text-primary">
          {filtered.length} {filtered.length === 1 ? "customer" : "customers"}
        </span>
      </div>

      {/* ── Search ───────────────────────────────────────────────────── */}
      <div className="relative -mt-2">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#7B7B78] pointer-events-none">search</span>
        <input
          type="text"
          placeholder="Search customer, job, service..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low text-on-surface border border-outline-variant/50 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-primary placeholder-[#7B7B78] transition-colors shadow-sm"
        />
      </div>

      {/* ── List ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
          <p className="text-on-surface-variant text-sm">Loading customers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-surface-container-low rounded-3xl border border-outline-variant/20">
          <div className="w-14 h-14 bg-surface-container-high rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">group</span>
          </div>
          <p className="text-on-surface font-bold">No customers this month</p>
          <p className="text-on-surface-variant text-xs text-center px-6">Customers who signed contracts this month will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(job => {
            const name     = job.customer?.full_name ?? "Unknown Customer";
            const inits    = getInitials(name);
            const services = job.services?.map(s => s.service_type?.name).filter(Boolean).join(", ") || "—";
            const statusCls = STATUS_COLORS[job.status] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";
            const statusLbl = STATUS_LABELS[job.status] ?? job.status;

            return (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="w-full text-left bg-surface-container-low rounded-3xl p-5 border border-outline-variant/15 hover:border-primary/40 active:scale-[0.98] transition-all duration-200 shadow-lg relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-full" />

                <div className="flex items-center gap-4 pl-2">
                  {/* Initials avatar */}
                  <div className="w-11 h-11 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center shrink-0">
                    <span className="font-black text-sm text-primary">{inits}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusCls}`}>
                        {statusLbl}
                      </span>
                      <span className="text-[10px] font-bold text-[#7B7B78] tracking-widest">
                        {job.job_number}
                      </span>
                    </div>
                    <p className="font-extrabold text-on-surface text-sm leading-tight truncate">{name}</p>
                    <p className="text-xs text-[#7B7B78] font-medium mt-0.5 truncate flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">build</span>
                      {services}
                    </p>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-base font-black text-white">{formatCurrency(job.contract_amount)}</span>
                    <span className="text-[10px] text-[#7B7B78] font-bold mt-0.5">
                      {formatDate(job.contract_signed_at)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Customer Detail Popup ─────────────────────────────────────── */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedJob(null)}
          />

          {/* Sheet */}
          <div className="relative w-full bg-[#111] rounded-t-3xl border-t border-outline-variant/30 shadow-2xl z-10 max-h-[90dvh] overflow-y-auto pb-10">

            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-outline-variant/50 rounded-full" />
            </div>

            {/* Close btn */}
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface">close</span>
            </button>

            <div className="px-6 pb-4 pt-2">
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-surface-container-high border-2 border-primary flex items-center justify-center shrink-0">
                  <span className="font-black text-lg text-primary">
                    {getInitials(selectedJob.customer?.full_name ?? "??")}
                  </span>
                </div>
                <div>
                  <h2 className="font-black text-on-surface text-lg leading-tight">
                    {selectedJob.customer?.full_name ?? "Unknown"}
                  </h2>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">
                    {selectedJob.job_number}
                  </p>
                </div>
              </div>

              {/* Info rows */}
              <div className="flex flex-col gap-3">

                {/* Contact */}
                <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-[#7B7B78] uppercase tracking-widest mb-3">Contact</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                      <span className="text-sm text-on-surface font-medium">{selectedJob.customer?.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-[18px]">phone</span>
                      <span className="text-sm text-on-surface font-medium">{selectedJob.customer?.phone || "—"}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-[18px]">location_on</span>
                      <span className="text-sm text-on-surface font-medium">
                        {selectedJob.customer?.address_line_1 || ""}
                        {selectedJob.customer?.address_line_2 ? `, ${selectedJob.customer.address_line_2}` : ""}
                        {selectedJob.customer?.city ? `, ${selectedJob.customer.city}` : ""}
                        {selectedJob.customer?.state ? `, ${selectedJob.customer.state}` : ""}
                        {selectedJob.customer?.postal_code ? ` ${selectedJob.customer.postal_code}` : ""}
                        {!selectedJob.customer?.address_line_1 ? "—" : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Job details */}
                <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/20">
                  <p className="text-[10px] font-bold text-[#7B7B78] uppercase tracking-widest mb-3">Job Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] font-bold text-[#7B7B78] uppercase tracking-widest mb-1">Services</p>
                      <p className="text-sm font-bold text-on-surface">
                        {selectedJob.services?.map(s => s.service_type?.name).filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-[#7B7B78] uppercase tracking-widest mb-1">Status</p>
                      <p className="text-sm font-bold text-on-surface capitalize">
                        {STATUS_LABELS[selectedJob.status] ?? selectedJob.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-[#7B7B78] uppercase tracking-widest mb-1">Contract Value</p>
                      <p className="text-sm font-black text-primary">{formatCurrency(selectedJob.contract_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-[#7B7B78] uppercase tracking-widest mb-1">Signed On</p>
                      <p className="text-sm font-bold text-on-surface">{formatDate(selectedJob.contract_signed_at)}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav items={SALES_NAV} />
    </div>
  );
}
