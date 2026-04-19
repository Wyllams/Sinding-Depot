"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

// Force dynamic rendering — this page fetches live DB data.
// export const dynamic = "force-dynamic"; // Not needed in client components

interface JobService {
  id: string;
  status: string;
  jobs: {
    id: string;
    title: string;
    service_address_line_1: string;
    city: string;
    state: string;
  } | null;
}

type TabFilter = "today" | "upcoming" | "completed";

export default function FieldJobsList() {
  const [services, setServices] = useState<JobService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>("today");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      // Filter by tab using correct enum values
      const statusFilters: Record<TabFilter, string[]> = {
        today: ["scheduled", "in_progress"],
        upcoming: ["contracted", "pending_scheduling"],
        completed: ["completed"],
      };

      const { data, error: err } = await supabase
        .from("job_services")
        .select(`
          id,
          status,
          jobs (
            id,
            title,
            service_address_line_1,
            city,
            state
          )
        `)
        .in("status", statusFilters[tab])
        .limit(20);

      if (err) {
        setError(err.message);
      } else {
        setServices((data as unknown as JobService[]) ?? []);
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
      {!loading && !error && services.map((service) => {
        const job = service.jobs;
        if (!job) return null;

        return (
          <Link
            key={service.id}
            href={`/field/jobs/${job.id}?service_id=${service.id}`}
            className="block bg-[#151515] border border-zinc-800/50 rounded-3xl p-5 active:scale-[0.98] transition-transform"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="bg-[var(--color-siding-green)]/10 border border-[var(--color-siding-green)]/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-[var(--color-siding-green)] rounded-full animate-pulse" />
                <span className="text-[var(--color-siding-green)] text-[10px] font-bold uppercase tracking-widest">
                  {service.status === "completed" ? "Done" : service.status === "in_progress" ? "In Progress" : "Scheduled"}
                </span>
              </div>
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider border border-zinc-800 px-2 py-1 rounded">
                Siding
              </span>
            </div>

            <h3 className="text-white font-headline text-xl font-bold tracking-tight leading-tight mb-1">
              {job.service_address_line_1}
            </h3>
            <p className="text-zinc-500 text-sm">
              {job.city}, {job.state}
            </p>

            <div className="mt-4 pt-4 border-t border-dashed border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">View Details</span>
              <span className="material-symbols-outlined text-[var(--color-siding-green)]" translate="no">chevron_right</span>
            </div>
          </Link>
        );
      })}

      {/* Empty State */}
      {!loading && !error && services.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <span className="material-symbols-outlined text-[56px] text-zinc-800" translate="no">construction</span>
          <p className="text-zinc-500 font-bold text-sm uppercase tracking-wider">No jobs found</p>
          <p className="text-zinc-600 text-xs">Check back later for new assignments.</p>
        </div>
      )}
    </div>
  );
}
