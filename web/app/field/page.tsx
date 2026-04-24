"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MobileWeatherWidget } from "@/components/field/MobileWeatherWidget";

export default function FieldHome() {
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [jobCount, setJobCount] = useState(0);
  const [issueCount, setIssueCount] = useState(0);

  useEffect(() => {
    const load = async (): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile name
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (prof) setProfile(prof);

      // Find the crew linked to this user
      const { data: crew } = await supabase
        .from("crews")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!crew) return;

      // Count active assignments for this crew
      const { count: activeCount } = await supabase
        .from("service_assignments")
        .select("id", { count: "exact", head: true })
        .eq("crew_id", crew.id)
        .in("status", ["scheduled", "in_progress", "assigned"]);

      setJobCount(activeCount ?? 0);

      // Count open blockers for this crew
      const { count: blockerCount } = await supabase
        .from("blockers")
        .select("id", { count: "exact", head: true })
        .eq("crew_id", crew.id)
        .in("status", ["open"]);

      setIssueCount(blockerCount ?? 0);
    };
    load();
  }, []);

  const crewName = profile?.full_name ?? "Crew Partner";

  return (
    <div className="p-5 space-y-8 bg-mobile-frame min-h-[100dvh]">
      {/* Greeting */}
      <section className="pt-2">
        <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.15em] mb-1">
          Welcome Back
        </p>
        <h1 className="text-[32px] font-black font-headline text-on-surface leading-none tracking-tight mb-2">
          {crewName}
        </h1>
        <p className="text-[14px] text-primary font-medium">
          You have {jobCount} active job{jobCount !== 1 ? "s" : ""} in the field.
        </p>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/field/jobs" className="bg-surface-container-low border border-outline-variant/20 shadow-sm rounded-3xl p-5 flex flex-col justify-between aspect-square active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" translate="no">handyman</span>
          </div>
          <div>
            <p className="text-3xl font-black font-headline text-on-surface tracking-tighter">{jobCount}</p>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">My Jobs</p>
          </div>
        </Link>

        <Link href="/field/services" className="bg-surface-container-low border border-outline-variant/20 shadow-sm rounded-3xl p-5 flex flex-col justify-between aspect-square active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" translate="no">warning</span>
          </div>
          <div>
            <p className="text-3xl font-black font-headline text-on-surface tracking-tighter">{issueCount}</p>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Services</p>
          </div>
        </Link>
      </div>

      {/* Weather Widget */}
      <MobileWeatherWidget />
    </div>
  );
}
