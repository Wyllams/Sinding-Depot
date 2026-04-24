"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface CustomerData {
  customerId: string;
  customerName: string;
  jobId: string;
  jobNumber: string;
  jobStatus: string;
  address: string;
  city: string;
  state: string;
  contractAmount: number | null;
  contractSignedAt: string | null;
  targetCompletion: string | null;
  pendingCOs: number;
  documentCount: number;
  colorsDone: boolean;
  serviceNames: string[];
}

const STATUS_DISPLAY: Record<string, { label: string; icon: string; bgClass: string; textClass: string }> = {
  draft:              { label: "Preparing",        icon: "assignment",     bgClass: "bg-[#f5f5f5]",          textClass: "text-outline-variant" },
  pending_scheduling: { label: "Preparing",        icon: "assignment",     bgClass: "bg-[#f5f5f5]",          textClass: "text-outline-variant" },
  active:             { label: "In Progress",      icon: "engineering",    bgClass: "bg-[#f0fae1]",          textClass: "text-[#5c8a00]" },
  on_hold:            { label: "On Hold",          icon: "pause_circle",   bgClass: "bg-[#fff1ec]",          textClass: "text-error" },
  completed:          { label: "Completed",        icon: "check_circle",   bgClass: "bg-[#f0fae1]",          textClass: "text-[#5c8a00]" },
  cancelled:          { label: "Cancelled",        icon: "cancel",         bgClass: "bg-[#fce4ec]",          textClass: "text-[#c62828]" },
};

export default function CustomerDashboard() {
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Not authenticated"); setLoading(false); return; }

        // 2. Get customer by profile_id
        const { data: customer, error: custErr } = await supabase
          .from("customers")
          .select("id, full_name")
          .eq("profile_id", user.id)
          .single();
        if (custErr || !customer) { setError("Customer not found"); setLoading(false); return; }

        // 3. Get the job for this customer
        const { data: job, error: jobErr } = await supabase
          .from("jobs")
          .select("id, job_number, status, service_address_line_1, city, state, contract_amount, contract_signed_at, target_completion_date")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (jobErr || !job) { setError("No project found"); setLoading(false); return; }

        // 4. Get services for this job
        const { data: services } = await supabase
          .from("job_services")
          .select("service_type:service_types (name)")
          .eq("job_id", job.id);

        // 5. Count pending change orders
        const { count: pendingCOs } = await supabase
          .from("change_orders")
          .select("id", { count: "exact", head: true })
          .eq("job_id", job.id)
          .eq("status", "pending_customer_approval");

        // 6. Count visible documents
        const { count: docCount } = await supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("job_id", job.id)
          .eq("visible_to_customer", true);

        // 7. Check if colors have been submitted
        const { count: colorCount } = await supabase
          .from("job_color_selections")
          .select("id", { count: "exact", head: true })
          .eq("job_id", job.id);

        const serviceNames = (services || [])
          .map((s: any) => s.service_type?.name)
          .filter(Boolean) as string[];

        setData({
          customerId: customer.id,
          customerName: customer.full_name,
          jobId: job.id,
          jobNumber: job.job_number,
          jobStatus: job.status,
          address: job.service_address_line_1,
          city: job.city,
          state: job.state,
          contractAmount: job.contract_amount,
          contractSignedAt: job.contract_signed_at,
          targetCompletion: job.target_completion_date,
          pendingCOs: pendingCOs ?? 0,
          documentCount: docCount ?? 0,
          colorsDone: (colorCount ?? 0) > 0,
          serviceNames,
        });
      } catch (err) {
        console.error("[CustomerDashboard]", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-3 border-[#e5e5e3] border-t-surface-container-low rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-[#fff1ec] text-error rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl" translate="no">error</span>
        </div>
        <h2 className="font-headline text-xl font-bold text-surface-container-low">{error || "Something went wrong"}</h2>
        <p className="text-outline-variant mt-2">Please contact the office for assistance.</p>
      </div>
    );
  }

  const status = STATUS_DISPLAY[data.jobStatus] ?? STATUS_DISPLAY.draft;
  const fmt$ = (v: number | null): string => v != null ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—";

  return (
    <div className="space-y-8">
      
      {/* Welcome Section */}
      <section className="bg-white p-8 rounded-3xl border border-[#e5e5e3] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-[#a1a19d] text-xs font-bold uppercase tracking-widest mb-1">Project Status</h2>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-surface-container-low">
              Welcome, {data.customerName.split(" ")[0]}!
            </h1>
            <p className="text-outline-variant mt-2 max-w-lg">
              Your project at <strong>{data.address}</strong>, {data.city}, {data.state} is currently being managed.
              {data.pendingCOs > 0 && " You have items waiting for your approval."}
            </p>
          </div>
          
          <div className={`${status.bgClass} border border-black/5 p-4 rounded-2xl flex items-center gap-4 shrink-0`}>
            <div className={`w-12 h-12 ${data.jobStatus === "active" ? "bg-primary text-surface-container-low" : "bg-surface-container-low/10 text-surface-container-low"} rounded-full flex items-center justify-center`}>
              <span className="material-symbols-outlined" translate="no">{status.icon}</span>
            </div>
            <div>
              <span className={`block font-headline font-bold ${status.textClass}`}>{status.label}</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#a1a19d] mt-0.5">
                {data.jobNumber}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Project Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#e5e5e3] shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#a1a19d] mb-1">Contract Amount</p>
          <p className="font-headline text-2xl font-bold text-surface-container-low">{fmt$(data.contractAmount)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#e5e5e3] shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#a1a19d] mb-1">Services</p>
          <p className="text-sm font-bold text-surface-container-low leading-relaxed">
            {data.serviceNames.length > 0 ? data.serviceNames.join(", ") : "—"}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#e5e5e3] shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#a1a19d] mb-1">Target Completion</p>
          <p className="font-headline text-lg font-bold text-surface-container-low">
            {data.targetCompletion ? (() => { const _d = new Date(data.targetCompletion); return `${(_d.getMonth() + 1).toString().padStart(2, '0')}/${_d.getDate().toString().padStart(2, '0')}/${_d.getFullYear()}`; })() : "To be scheduled"}
          </p>
        </div>
      </div>

      {/* Actionable Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Change Orders */}
        <Link href="/customer/change-orders" className="group bg-white p-6 rounded-3xl border border-[#e5e5e3] shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-56 relative overflow-hidden">
          {data.pendingCOs > 0 && (
            <div className="absolute top-4 right-4 w-3 h-3 bg-error rounded-full animate-pulse shadow-[0_0_8px_rgba(255,115,81,0.6)]" />
          )}
          <div>
            <div className="w-10 h-10 bg-[#f5f5f5] text-surface-container-low rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined" translate="no">request_quote</span>
            </div>
            <h3 className="font-headline font-bold text-xl text-surface-container-low">Change Orders</h3>
            <p className="text-outline-variant text-sm mt-2 line-clamp-2">
              {data.pendingCOs > 0
                ? `You have ${data.pendingCOs} change order${data.pendingCOs > 1 ? "s" : ""} waiting for your approval.`
                : "Review and approve any material additions or scope changes."}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-widest ${data.pendingCOs > 0 ? "text-error" : "text-[#a1a19d]"}`}>
              {data.pendingCOs} Pending
            </span>
            <span className="material-symbols-outlined text-surface-container-low group-hover:translate-x-1 transition-transform" translate="no">arrow_forward</span>
          </div>
        </Link>
        
        {/* Documents */}
        <Link href="/customer/documents" className="group bg-white p-6 rounded-3xl border border-[#e5e5e3] shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-56">
          <div>
            <div className="w-10 h-10 bg-[#f5f5f5] text-surface-container-low rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined" translate="no">folder_open</span>
            </div>
            <h3 className="font-headline font-bold text-xl text-surface-container-low">My Documents</h3>
            <p className="text-outline-variant text-sm mt-2 line-clamp-2">
              Access your contracts, completion certificates, and project files.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#a1a19d] uppercase tracking-widest">{data.documentCount} Document{data.documentCount !== 1 ? "s" : ""}</span>
            <span className="material-symbols-outlined text-surface-container-low group-hover:translate-x-1 transition-transform" translate="no">arrow_forward</span>
          </div>
        </Link>

        {/* Colors Card */}
        <Link href="/customer/colors" className={`group bg-white p-6 rounded-3xl border border-[#e5e5e3] shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-56 relative overflow-hidden ${!data.colorsDone ? "hover:border-surface-container-low" : ""}`}>
          {!data.colorsDone && (
            <div className="absolute top-4 right-4 w-3 h-3 bg-error rounded-full animate-pulse shadow-[0_0_8px_rgba(255,115,81,0.6)]" />
          )}
          <div>
            <div className={`w-10 h-10 ${data.colorsDone ? "bg-[#f0fae1] text-[#5c8a00]" : "bg-[#fff1ec] text-error"} rounded-full flex items-center justify-center mb-4`}>
              <span className="material-symbols-outlined" translate="no">format_paint</span>
            </div>
            <h3 className="font-headline font-bold text-xl text-surface-container-low">Color Selection</h3>
            <p className="text-outline-variant text-sm mt-2 line-clamp-2">
              {data.colorsDone
                ? "Your color selections have been submitted. Our team is preparing your materials."
                : "Action required! Please submit your paint choices so our teams can prepare."}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-widest ${data.colorsDone ? "text-[#5c8a00]" : "text-error"}`}>
              {data.colorsDone ? "✓ Submitted" : "Action Needed"}
            </span>
            <span className="material-symbols-outlined text-surface-container-low group-hover:translate-x-1 transition-transform" translate="no">arrow_forward</span>
          </div>
        </Link>
      </div>
      
    </div>
  );
}
