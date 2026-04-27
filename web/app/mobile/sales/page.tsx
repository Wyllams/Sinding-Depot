"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const MONTHLY_GOAL = 150_000;

const SALES_NAV = [
  { icon: "dashboard",  label: "Dashboard", href: "/mobile/sales" },
  { icon: "group",      label: "Customers", href: "/mobile/sales/customers" },
  { icon: "assignment", label: "Requests",  href: "/mobile/sales/requests" },
];

function formatCurrency(v: number) {
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
  return `$${v.toLocaleString("en-US")}`;
}

function formatCurrencyFull(v: number) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function SalesMobileDashboard() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Vendor identity
  const [fullName, setFullName]         = useState<string>("");
  const [initials, setInitials]         = useState<string>("SD");
  const [avatarUrl, setAvatarUrl]       = useState<string | null>(null);
  const [salespersonId, setSalespersonId] = useState<string | null>(null);

  // Monthly quota
  const [soldThisMonth, setSoldThisMonth]   = useState<number>(0);
  const [loadingQuota, setLoadingQuota]     = useState(true);
  const [customersCount, setCustomersCount] = useState<number | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ── 1. Load vendor identity ──────────────────────────────────────────────
  const loadIdentity = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, spRes] = await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
      supabase.from("salespersons").select("id").eq("profile_id", user.id).single(),
    ]);

    if (profileRes.data) {
      const name = profileRes.data.full_name || "";
      setFullName(name);
      setAvatarUrl(profileRes.data.avatar_url ?? null);
      setInitials(
        name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase() || "SD"
      );
    }

    if (spRes.data) {
      setSalespersonId(spRes.data.id);
    }
  }, []);

  // ── 2. Load monthly quota ────────────────────────────────────────────────
  const loadMonthlyQuota = useCallback(async (spId: string) => {
    setLoadingQuota(true);
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];

      // Jobs closed this month by this salesperson
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, contract_amount")
        .eq("salesperson_id", spId)
        .gte("contract_signed_at", monthStart)
        .lt("contract_signed_at", monthEnd);

      if (jobsError) throw jobsError;

      const jobsRevenue = (jobsData ?? []).reduce(
        (sum, j) => sum + (Number(j.contract_amount) || 0), 0
      );

      // Count customers (distinct jobs) closed this month
      setCustomersCount((jobsData ?? []).length);

      const jobIds = (jobsData ?? []).map(j => j.id);

      // Approved change orders this month on those jobs
      let coRevenue = 0;
      if (jobIds.length > 0) {
        const { data: coData, error: coError } = await supabase
          .from("change_orders")
          .select("approved_amount")
          .in("job_id", jobIds)
          .eq("status", "approved")
          .gte("decided_at", monthStart)
          .lt("decided_at", monthEnd);

        if (coError) throw coError;
        coRevenue = (coData ?? []).reduce(
          (sum, co) => sum + (Number(co.approved_amount) || 0), 0
        );
      }

      setSoldThisMonth(jobsRevenue + coRevenue);
    } catch (err) {
      console.error("[SalesDashboard] quota error:", err);
    } finally {
      setLoadingQuota(false);
    }
  }, []);

  useEffect(() => { loadIdentity(); }, [loadIdentity]);

  useEffect(() => {
    if (salespersonId) loadMonthlyQuota(salespersonId);
  }, [salespersonId, loadMonthlyQuota]);

  // Quota math
  const quotaPct     = Math.min((soldThisMonth / MONTHLY_GOAL) * 100, 100);
  const remaining    = Math.max(MONTHLY_GOAL - soldThisMonth, 0);
  const barWidth     = `${quotaPct.toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-6 p-4 pt-12">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-6 relative">
        {/* Hamburger */}
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
                <Link
                  href="/mobile/sales/profile"
                  className="flex items-center gap-3 px-4 py-4 hover:bg-primary/10 text-on-surface transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  <span className="font-semibold text-sm">My Profile</span>
                </Link>
                <Link
                  href="/mobile/sales/calendar"
                  className="flex items-center gap-3 px-4 py-4 hover:bg-primary/10 text-on-surface transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                  <span className="font-semibold text-sm">Calendar</span>
                </Link>
                <div className="h-[1px] bg-outline-variant/30 w-full" />
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

        {/* Title */}
        <h1 className="text-lg font-black tracking-widest uppercase text-on-surface absolute left-1/2 -translate-x-1/2">
          DASHBOARD
        </h1>

        {/* Avatar */}
        <Link
          href="/mobile/sales/profile"
          className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 shadow-lg flex items-center justify-center overflow-hidden active:scale-95 transition-transform z-10"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=aeee2a&color=080808&bold=true`}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          )}
        </Link>
      </div>

      {/* ── Greeting ───────────────────────────────────────────────────── */}
      <section className="pt-2">
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-1">
          Welcome Back
        </p>
        <h2 className="text-[32px] font-black font-headline text-white leading-none tracking-tight mb-2">
          {fullName || <span className="opacity-30">Loading...</span>}
        </h2>
        <p className="text-[14px] text-[var(--color-siding-green)] font-medium">
          Your performance dashboard for this month.
        </p>
      </section>



      {/* ── Monthly Quota Card ─────────────────────────────────────────── */}
      <div className="bg-[#151515] border border-[var(--color-siding-green)]/20 rounded-3xl p-5 relative overflow-hidden">
        <div className="absolute top-5 right-5 text-[var(--color-siding-green)]/40">
          <span className="material-symbols-outlined">track_changes</span>
        </div>

        <h3 className="text-[11px] font-bold text-[var(--color-siding-green)] uppercase tracking-widest mb-1">
          Monthly Quota
        </h3>

        {loadingQuota ? (
          <div className="flex items-center gap-2 py-3">
            <span className="material-symbols-outlined text-primary text-[18px] animate-spin">progress_activity</span>
            <span className="text-xs text-on-surface-variant font-medium">Loading quota...</span>
          </div>
        ) : (
          <>
            <p className="text-xl font-bold font-headline text-white mb-1">
              {formatCurrencyFull(soldThisMonth)}{" "}
              <span className="text-sm text-zinc-500 font-normal">
                / {formatCurrency(MONTHLY_GOAL)}
              </span>
            </p>

            {/* Progress bar */}
            <div className="w-full bg-[#1e1e1e] h-2.5 rounded-full overflow-hidden mb-3 border border-zinc-800">
              <div
                className="h-full bg-[var(--color-siding-green)] rounded-full transition-all duration-700"
                style={{ width: barWidth }}
              />
            </div>

            {/* Status text */}
            {soldThisMonth >= MONTHLY_GOAL ? (
              <p className="text-xs text-primary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">emoji_events</span>
                Goal reached! You hit {formatCurrencyFull(MONTHLY_GOAL)} this month.
              </p>
            ) : (
              <p className="text-xs text-zinc-400 font-medium leading-relaxed pr-8">
                You are{" "}
                <span className="text-white font-bold">{quotaPct.toFixed(0)}%</span>{" "}
                to your monthly goal.{" "}
                <span className="text-[var(--color-siding-green)] font-semibold">
                  {formatCurrencyFull(remaining)} to go.
                </span>
              </p>
            )}
          </>
        )}
      </div>

      {/* ── Quick Stats ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mt-2">
        <Link href="/mobile/sales/customers">
          <div className="bg-surface-container-low active:scale-[0.98] transition-transform duration-200 rounded-3xl p-6 flex justify-between items-center border border-outline-variant/20 shadow-lg relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            <div className="flex flex-col">
              <span className="text-3xl font-black text-on-surface">
                {customersCount === null ? "—" : customersCount}
              </span>
              <span className="text-xs font-bold text-[#7B7B78] uppercase tracking-wider mt-1">Customers<br />This Month</span>
            </div>
            <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-primary border border-primary/20">
              <span className="material-symbols-outlined text-[28px]">group</span>
            </div>
          </div>
        </Link>

        <Link href="/mobile/sales/calendar">
          <div className="bg-surface-container-low active:scale-[0.98] transition-transform duration-200 rounded-3xl p-6 flex justify-between items-center border border-outline-variant/20 shadow-lg relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#60b8f5]" />
            <div className="flex flex-col">
              <span className="text-sm font-black text-on-surface uppercase tracking-wide">My Schedule</span>
              <span className="text-xs font-bold text-[#7B7B78] uppercase tracking-wider mt-1">View Calendar</span>
            </div>
            <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-[#60b8f5] border border-[#60b8f5]/20">
              <span className="material-symbols-outlined text-[28px]">calendar_today</span>
            </div>
          </div>
        </Link>
      </div>

      <MobileBottomNav items={SALES_NAV} />
    </div>
  );
}
