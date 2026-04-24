"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ────────────────────────────────────────────────── */
/*  Types                                             */
/* ────────────────────────────────────────────────── */

interface MyJob {
  assignmentId: string;
  assignmentStatus: string;
  scheduledStart: string | null;
  jobId: string;
  customerName: string;
  salespersonName: string;
  address: string;
  city: string;
  state: string;
  jobServiceId: string;
}

type TabFilter = "today" | "upcoming" | "completed";

/* ────────────────────────────────────────────────── */
/*  Helpers                                           */
/* ────────────────────────────────────────────────── */

function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusBadge(status: string): { label: string; color: string; pulse: boolean } {
  switch (status) {
    case "in_progress":
      return { label: "In Progress", color: "#aeee2a", pulse: true };
    case "scheduled":
      return { label: "Scheduled", color: "#60a5fa", pulse: false };
    case "completed":
      return { label: "Completed", color: "#6b7280", pulse: false };
    case "assigned":
      return { label: "Assigned", color: "#f59e0b", pulse: false };
    case "planned":
      return { label: "Planned", color: "#a78bfa", pulse: false };
    default:
      return { label: status.replace(/_/g, " "), color: "#6b7280", pulse: false };
  }
}

/* ────────────────────────────────────────────────── */
/*  Component                                         */
/* ────────────────────────────────────────────────── */

export default function FieldJobsList() {
  const [jobs, setJobs] = useState<MyJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>("today");

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        // 1. Get logged-in user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Not authenticated"); setLoading(false); return; }

        // 2. Find the crew linked to this profile
        const { data: crew, error: crewErr } = await supabase
          .from("crews")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (crewErr) { setError(crewErr.message); setLoading(false); return; }
        if (!crew) { setError("No crew profile linked"); setLoading(false); return; }

        // 3. Define status filters per tab
        const statusFilters: Record<TabFilter, string[]> = {
          today:     ["scheduled", "in_progress", "assigned"],
          upcoming:  ["planned", "assigned", "scheduled"],
          completed: ["completed"],
        };

        // 4. Fetch assignments with flat join via RPC-like approach
        const { data: rawAssignments, error: saErr } = await supabase
          .from("service_assignments")
          .select(`
            id,
            status,
            scheduled_start_at,
            job_service_id
          `)
          .eq("crew_id", crew.id)
          .in("status", statusFilters[tab])
          .order("scheduled_start_at", { ascending: true })
          .limit(50);

        if (saErr) { setError(saErr.message); setLoading(false); return; }
        if (!rawAssignments || rawAssignments.length === 0) {
          setJobs([]);
          setLoading(false);
          return;
        }

        // 5. Get the job_service IDs to fetch related data
        const jsIds = rawAssignments.map(a => a.job_service_id).filter(Boolean) as string[];

        const { data: jsData, error: jsErr } = await supabase
          .from("job_services")
          .select(`
            id,
            job_id,
            jobs ( 
              id, 
              service_address_line_1, 
              city, 
              state,
              customers ( full_name ),
              salespersons ( full_name )
            )
          `)
          .in("id", jsIds);

        if (jsErr) { setError(jsErr.message); setLoading(false); return; }

        // 6. Build a lookup map
        const jsMap = new Map<string, typeof jsData[0]>();
        (jsData ?? []).forEach(js => jsMap.set(js.id, js));

        // 7. Merge into final list
        const merged: MyJob[] = rawAssignments
          .map(sa => {
            const js = jsMap.get(sa.job_service_id);
            if (!js) return null;

            // Handle both single and array returns from Supabase
            const jobRaw = js.jobs;
            const job = Array.isArray(jobRaw) ? jobRaw[0] : jobRaw;

            if (!job) return null;

            const custRaw = job.customers;
            const customer = Array.isArray(custRaw) ? custRaw[0] : custRaw;
            
            const salesRaw = job.salespersons;
            const salesperson = Array.isArray(salesRaw) ? salesRaw[0] : salesRaw;

            return {
              assignmentId: sa.id,
              assignmentStatus: sa.status,
              scheduledStart: sa.scheduled_start_at,
              jobId: job.id,
              customerName: customer?.full_name ?? "Unknown Customer",
              salespersonName: salesperson?.full_name ?? "Unknown Rep",
              address: job.service_address_line_1,
              city: job.city,
              state: job.state,
              jobServiceId: js.id,
            } satisfies MyJob;
          })
          .filter((x): x is MyJob => x !== null);

        setJobs(merged);
      } catch (e: unknown) {
        setError((e as Error).message);
      }

      setLoading(false);
    };
    load();
  }, [tab]);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="p-4 space-y-4 bg-[#050505] min-h-full">
      {/* Tab Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              tab === t.key
                ? "bg-[var(--color-siding-green)] text-[#1a2e00]"
                : "bg-[#151515] border border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-[var(--color-siding-green)] rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-[#ff7351]/10 border border-[#ff7351]/20 rounded-2xl p-4">
          <span className="material-symbols-outlined text-[#ff7351]" translate="no">error</span>
          <p className="text-xs text-[#ff7351] font-medium">{error}</p>
        </div>
      )}

      {/* Job Cards */}
      {!loading && !error && jobs.map((job) => {
        const badge = statusBadge(job.assignmentStatus);

        return (
          <Link
            key={job.assignmentId}
            href={`/field/jobs/${job.jobId}?service_id=${job.jobServiceId}`}
            className="block bg-[#151515] border border-zinc-800/50 rounded-3xl p-5 active:scale-[0.98] transition-transform"
          >
            {/* Status */}
            <div className="flex justify-between items-start mb-4">
              <div
                className="px-3 py-1 rounded-full flex items-center gap-1.5"
                style={{
                  backgroundColor: `${badge.color}15`,
                  border: `1px solid ${badge.color}30`,
                }}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${badge.pulse ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: badge.color }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: badge.color }}
                >
                  {badge.label}
                </span>
              </div>
            </div>

            {/* Customer & Salesperson */}
            <div className="mb-4">
              <h3 className="text-white font-headline text-xl font-bold tracking-tight leading-tight mb-1.5">
                {job.customerName}
              </h3>
              <div className="flex items-center gap-1.5 text-[var(--color-siding-green)] font-medium text-xs">
                <span className="material-symbols-outlined text-[14px]" translate="no">person</span>
                <span>Rep: {job.salespersonName}</span>
              </div>
            </div>

            {/* Address */}
            <p className="text-zinc-500 text-sm">
              {job.address}
            </p>
            <p className="text-zinc-600 text-xs mb-3">
              {job.city}, {job.state}
            </p>

            {/* Start Date */}
            {job.scheduledStart && (
              <div className="mt-3 pt-3 border-t border-zinc-800/50 flex items-center gap-2 text-zinc-400 font-medium text-xs">
                <span className="material-symbols-outlined text-[14px]" translate="no">calendar_month</span>
                <span>Start: {formatDateShort(job.scheduledStart)}</span>
              </div>
            )}

            {/* View Details */}
            <div className="mt-4 pt-4 border-t border-dashed border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">View Details</span>
              <span className="material-symbols-outlined text-[var(--color-siding-green)]" translate="no">chevron_right</span>
            </div>
          </Link>
        );
      })}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="material-symbols-outlined text-[56px] text-zinc-800" translate="no">construction</span>
          <p className="text-zinc-500 font-bold text-sm uppercase tracking-wider">No jobs found</p>
          <p className="text-zinc-600 text-xs">Check back later for new assignments.</p>
        </div>
      )}
    </div>
  );
}
