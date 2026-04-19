"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FieldHome() {
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [jobCount, setJobCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);

      // Count pending jobs (simplified — a real query would filter by assigned crew)
      const { count } = await supabase
        .from("job_services")
        .select("id", { count: "exact", head: true })
        .in("status", ["scheduled", "in_progress"]);

      setJobCount(count ?? 0);
    };
    load();
  }, []);

  const crewName = profile?.full_name ?? "Crew Partner";

  return (
    <div className="p-5 space-y-8 bg-[#050505] min-h-[100dvh]">
      {/* Greeting */}
      <section className="pt-2">
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-1">
          Welcome Back
        </p>
        <h1 className="text-[32px] font-black font-headline text-white leading-none tracking-tight mb-2">
          {crewName}
        </h1>
        <p className="text-[14px] text-[var(--color-siding-green)] font-medium">
          You have {jobCount} active job{jobCount !== 1 ? "s" : ""} in the field.
        </p>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/field/jobs" className="bg-[#151515] rounded-3xl p-5 flex flex-col justify-between aspect-square active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-[var(--color-siding-green)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--color-siding-green)]" translate="no">handyman</span>
          </div>
          <div>
            <p className="text-3xl font-black font-headline text-white tracking-tighter">{jobCount}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">My Jobs</p>
          </div>
        </Link>

        <Link href="/field/alerts" className="bg-[#151515] rounded-3xl p-5 flex flex-col justify-between aspect-square active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-[#ff7351]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#ff7351]" translate="no">warning</span>
          </div>
          <div>
            <p className="text-3xl font-black font-headline text-white tracking-tighter">0</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Issues</p>
          </div>
        </Link>
      </div>

      {/* Weather Widget */}
      <div className="bg-[#151515] border border-[var(--color-siding-green)]/20 rounded-3xl p-5 relative overflow-hidden">
        <div className="absolute top-5 right-5 opacity-10">
          <span className="material-symbols-outlined text-6xl text-[var(--color-siding-green)]" translate="no">wb_sunny</span>
        </div>
        <h2 className="text-[11px] font-bold text-[var(--color-siding-green)] uppercase tracking-widest mb-1">Weather Check</h2>
        <p className="text-xl font-bold font-headline text-white mb-2">Clear Sky, 72°F</p>
        <p className="text-xs text-zinc-400 font-medium leading-relaxed pr-8">
          Perfect conditions for exterior siding installation today.
        </p>
      </div>
    </div>
  );
}
