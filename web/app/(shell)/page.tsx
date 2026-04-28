"use client";

import { useEffect, useState } from "react";
import { TopBar } from "../../components/TopBar";
import { WeeklyWeather } from "../../components/WeeklyWeather";
import { supabase } from "@/lib/supabase";

// =============================================
// Dashboard - Real-time metrics from Supabase
// =============================================

interface DashboardMetrics {
  activeProjects: number;
  totalProjects: number;
  pendingChangeOrders: number;
  changeOrderValue: number;
  openBlockers: number;
  completedThisMonth: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchMetrics = async () => {
      try {
        // ── 1. Active projects (status NOT completed/cancelled) ──
        const { count: activeCount } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .not("status", "in", '("completed","cancelled")');

        // ── 2. Total projects ──
        const { count: totalCount } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true });

        // ── 3. Pending change orders ──
        const { data: pendingCOs } = await supabase
          .from("change_orders")
          .select("id, total")
          .eq("status", "pending");

        const pendingCount = pendingCOs?.length ?? 0;
        const coValue = pendingCOs?.reduce((sum, co) => sum + (Number(co.total) || 0), 0) ?? 0;

        // ── 4. Open blockers ──
        const { count: blockerCount } = await supabase
          .from("blockers")
          .select("id", { count: "exact", head: true })
          .neq("status", "resolved");

        // ── 5. Completed this month ──
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: completedCount } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("updated_at", startOfMonth.toISOString());

        if (mounted) {
          setMetrics({
            activeProjects: activeCount ?? 0,
            totalProjects: totalCount ?? 0,
            pendingChangeOrders: pendingCount,
            changeOrderValue: coValue,
            openBlockers: blockerCount ?? 0,
            completedThisMonth: completedCount ?? 0,
          });
        }
      } catch (err) {
        console.error("[Dashboard] Failed to load metrics:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMetrics();
    return () => { mounted = false; };
  }, []);

  const fmt = (n: number): string =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  const fmtCurrency = (n: number): string =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const utilization = metrics && metrics.totalProjects > 0
    ? Math.round((metrics.activeProjects / metrics.totalProjects) * 100)
    : 0;

  return (
    <>
      <TopBar />

      {/* Main Canvas */}
      <main className="px-4 sm:px-6 lg:px-8 pb-12 pt-6 sm:pt-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2
            className="text-2xl sm:text-4xl font-extrabold tracking-tighter text-on-surface"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Dashboard
          </h2>
          <p className="text-on-surface-variant">Global project metrics and operational health.</p>
        </div>

        {/* ── Bento Grid Metrics ── */}
        <div className="grid grid-cols-12 gap-4 sm:gap-6 mb-8 sm:mb-10">

          {/* Card 1: Active Projects */}
          <div className="col-span-12 lg:col-span-4 glass-card rounded-2xl p-6 border-t border-white/5">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-bold tracking-[0.2em] text-on-surface-variant uppercase">
                Active Projects
              </span>
              <span className="material-symbols-outlined text-primary" translate="no">analytics</span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span
                className={`text-4xl font-extrabold transition-opacity duration-300 ${loading ? "opacity-30 animate-pulse" : ""}`}
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {loading ? "—" : fmt(metrics?.activeProjects ?? 0)}
              </span>
              <span className="text-on-surface-variant font-medium">projects</span>
            </div>

            {/* Progress bar — Fleet Utilization */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-on-surface-variant">Fleet Utilization</span>
                <span className="text-primary font-bold">{loading ? "—" : `${utilization}%`}</span>
              </div>
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-700"
                  style={{
                    width: loading ? "0%" : `${utilization}%`,
                    boxShadow: "0 0 8px rgba(174,238,42,0.6)",
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
                <span>{loading ? "—" : `${metrics?.completedThisMonth ?? 0} completed this month`}</span>
                <span>{loading ? "" : `${metrics?.totalProjects ?? 0} total`}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Pending Change Orders */}
          <div className="col-span-12 lg:col-span-5 glass-card rounded-2xl p-6 border-t border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-bold tracking-[0.2em] text-on-surface-variant uppercase">
                Pending Change Orders
              </span>
              {(metrics?.pendingChangeOrders ?? 0) > 0 && (
                <span className="px-3 py-1 bg-[#5e6300] text-[#f9ff8b] text-[10px] font-bold rounded-full">
                  Needs Review
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 mb-8">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-extrabold transition-opacity duration-300 ${loading ? "opacity-30 animate-pulse" : ""}`}
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  {loading ? "—" : fmt(metrics?.pendingChangeOrders ?? 0)}
                </span>
                <span className="text-on-surface-variant font-medium">orders</span>
              </div>
              <span
                className="text-primary text-2xl font-bold"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {loading ? "—" : fmtCurrency(metrics?.changeOrderValue ?? 0)}
              </span>
              <span className="text-xs text-on-surface-variant">Total Value Pending Approval</span>
            </div>
          </div>

          {/* Card 3: Open Blockers */}
          <div className="col-span-12 lg:col-span-3 glass-card rounded-2xl p-6 border-t border-white/5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[11px] font-bold tracking-[0.2em] text-on-surface-variant uppercase">
                Open Blockers
              </span>
              <span
                className="material-symbols-outlined text-error"
                translate="no"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span
                className={`text-4xl font-extrabold transition-opacity duration-300 ${
                  loading ? "opacity-30 animate-pulse" : (metrics?.openBlockers ?? 0) > 0 ? "text-error" : "text-primary"
                }`}
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {loading ? "—" : fmt(metrics?.openBlockers ?? 0)}
              </span>
              <span className="text-on-surface-variant font-medium">
                {(metrics?.openBlockers ?? 0) === 0 ? "all clear" : "open issues"}
              </span>
            </div>
            {(metrics?.openBlockers ?? 0) === 0 && !loading && (
              <div className="flex items-center gap-2 text-primary text-sm font-bold">
                <span className="material-symbols-outlined text-base" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                No blockers — great!
              </div>
            )}
          </div>
        </div>

        {/* ── Weekly Weather Forecast ── */}
        <WeeklyWeather />
      </main>
    </>
  );
}
