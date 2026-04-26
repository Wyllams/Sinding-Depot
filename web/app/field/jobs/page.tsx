"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";

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

function statusBadge(status: string, t: any): { label: string; color: string; pulse: boolean } {
  switch (status) {
    case "pending":
      return { label: t("pending"), color: "#ef4444", pulse: false };
    case "in_progress":
      return { label: t("inProgress"), color: "#aeee2a", pulse: true };
    case "scheduled":
      return { label: t("scheduled"), color: "#60a5fa", pulse: false };
    case "completed":
      return { label: t("completed"), color: "#22c55e", pulse: false };
    case "assigned":
      return { label: t("assigned"), color: "#f59e0b", pulse: false };
    case "planned":
      return { label: t("planned"), color: "#a78bfa", pulse: false };
    default:
      return { label: status.replace(/_/g, " "), color: "#6b7280", pulse: false };
  }
}

/* ────────────────────────────────────────────────── */
/*  Component                                         */
/* ────────────────────────────────────────────────── */

export default function FieldJobsList() {
  const t = useTranslations("JobsList");
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
        if (!user) { setError(t("notAuthenticated")); setLoading(false); return; }

        // 2. Find the crew linked to this profile
        const { data: crew, error: crewErr } = await supabase
          .from("crews")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (crewErr) { setError(crewErr.message); setLoading(false); return; }
        if (!crew) { setError(t("noCrewProfileLinked")); setLoading(false); return; }

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
              status, 
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
              assignmentStatus: (job as any).status || sa.status,
              scheduledStart: sa.scheduled_start_at,
              jobId: job.id,
              customerName: customer?.full_name ?? t("unknownCustomer"),
              salespersonName: salesperson?.full_name ?? t("unknownRep"),
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
    { key: "today", label: t("today") },
    { key: "upcoming", label: t("upcoming") },
    { key: "completed", label: t("completed") },
  ];

  return (
    <div className="p-4 space-y-4 bg-mobile-frame min-h-full">
      {/* Tab Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((t_tab) => (
          <button
            key={t_tab.key}
            onClick={() => setTab(t_tab.key)}
            className={`font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full whitespace-nowrap transition-all ${
              tab === t_tab.key
                ? "bg-[var(--color-siding-green)] text-[#1a2e00]"
                : "bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t_tab.label}
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
        <div className="flex items-center gap-3 bg-error/10 border border-error/20 rounded-2xl p-4">
          <span className="material-symbols-outlined text-error" translate="no">error</span>
          <p className="text-xs text-error font-medium">{error}</p>
        </div>
      )}

      {/* Job Cards */}
      {!loading && !error && jobs.map((job) => {
        const badge = statusBadge(job.assignmentStatus, t);

        return (
          <Link
            key={job.assignmentId}
            href={`/field/jobs/${job.jobId}?service_id=${job.jobServiceId}`}
            className="block bg-surface-container-low border border-outline-variant/20 rounded-3xl p-5 active:scale-[0.98] transition-transform"
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
              <h3 className="text-on-surface font-headline text-xl font-bold tracking-tight leading-tight mb-1.5">
                {job.customerName}
              </h3>
              <div className="flex items-center gap-1.5 text-[var(--color-siding-green)] font-medium text-xs">
                <span className="material-symbols-outlined text-[14px]" translate="no">person</span>
                <span>{t("rep")}: {job.salespersonName}</span>
              </div>
            </div>

            {/* Address */}
            <p className="text-on-surface-variant text-sm">
              {job.address}
            </p>
            <p className="text-on-surface-variant/70 text-xs mb-3">
              {job.city}, {job.state}
            </p>

            {/* Start Date */}
            {job.scheduledStart && (
              <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center gap-2 text-on-surface-variant font-medium text-xs">
                <span className="material-symbols-outlined text-[14px]" translate="no">calendar_month</span>
                <span>{t("start")}: {formatDateShort(job.scheduledStart)}</span>
              </div>
            )}

            {/* View Details */}
            <div className="mt-4 pt-4 border-t border-dashed border-outline-variant/20 flex justify-between items-center">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">{t("viewDetails")}</span>
              <span className="material-symbols-outlined text-[var(--color-siding-green)]" translate="no">chevron_right</span>
            </div>
          </Link>
        );
      })}

      {/* Empty State */}
      {!loading && !error && jobs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="material-symbols-outlined text-[56px] text-on-surface-variant/50" translate="no">construction</span>
          <p className="text-on-surface-variant font-bold text-sm uppercase tracking-wider">{t("noJobsFound")}</p>
          <p className="text-on-surface-variant/70 text-xs">{t("noJobsFoundMessage")}</p>
        </div>
      )}
    </div>
  );
}
