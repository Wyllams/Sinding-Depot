"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "../../../components/TopBar";
import { supabase } from "../../../lib/supabase";

// =============================================
// Sales Dashboard — v2 (Monthly-centric)
// Supabase: sales_goals + salespersons + jobs + sales_summaries
// =============================================

// ── Types ──────────────────────────────────────────────────────────────────

interface SalespersonStats {
  id: string;
  full_name: string;
  initials: string;
  color: string;
  jobs_sold_count: number;
  total_revenue: number;
  monthly_goal: number;
  goal_pct: number;
}

interface JobDetail {
  id: string;
  title: string;
  contract_amount: number;
  contract_signed_at: string | null;
  created_at: string;
  city: string;
  job_number: string;
  status: string;
}

interface DashboardData {
  totalGoal: number;
  totalSold: number;
  totalJobs: number;
  averageTicket: number;
  salespeople: SalespersonStats[];
  period: { start: string; end: string; label: string };
}

// ── Color Map ──────────────────────────────────────────────────────────────
const SP_COLORS: Record<string, string> = {
  Matt:    "#22c55e",
  Armando: "#ef4444",
  Ruby:    "#a855f7",
};
const DEFAULT_COLORS = ["#aeee2a", "#e3eb5d", "#faf9f5", "#ababa8", "#ff7351", "#38bdf8"];

function getSpColor(name: string, idx: number): string {
  for (const [key, color] of Object.entries(SP_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
}

// ── Month helpers ──────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthDates(year: number, month: number): { start: string; end: string; label: string } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `${MONTH_NAMES[month]} ${year}`,
  };
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

// ── Default monthly goal for salespersons ──────────────────────────────────
const DEFAULT_SP_MONTHLY_GOAL = 150_000;

// ── Main Component ─────────────────────────────────────────────────────────

export default function ReportsPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hoveredSp, setHoveredSp] = useState<string | null>(null);

  // ── Goals Modal (simplified: monthly only) ──────────────────────────────
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalsSaving, setGoalsSaving] = useState(false);
  const [companyMonthlyGoal, setCompanyMonthlyGoal] = useState("");
  const [spGoalInputs, setSpGoalInputs] = useState<Record<string, string>>({});

  // ── Salesperson Jobs Detail (accordion) ─────────────────────────────────
  const [expandedSp, setExpandedSp] = useState<string | null>(null);
  const [spJobs, setSpJobs] = useState<Record<string, JobDetail[]>>({});
  const [loadingJobs, setLoadingJobs] = useState<string | null>(null);
  const [jobToAbandon, setJobToAbandon] = useState<{jobId: string, spId: string, title: string} | null>(null);

  // ── Summary editing ─────────────────────────────────────────────────────
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [savedSummary, setSavedSummary] = useState<string | null>(null);
  const [savingSummary, setSavingSummary] = useState(false);

  // ── Annual Report Data (Ruby & Matt) ────────────────────────────────────
  const [annualData, setAnnualData] = useState<Record<string, number[]>>({});
  const [annualSalespeople, setAnnualSalespeople] = useState<{ id: string; name: string; color: string }[]>([]);

  // ─────────────────────────────────────────────────────────────────────────
  // Open Goals Modal — loads current monthly goals only
  // ─────────────────────────────────────────────────────────────────────────
  const openGoalsModal = async (): Promise<void> => {
    if (!data) return;

    const inputs: Record<string, string> = {};
    data.salespeople.forEach((sp) => {
      inputs[sp.id] = sp.monthly_goal > 0 ? String(sp.monthly_goal) : String(DEFAULT_SP_MONTHLY_GOAL);
    });

    // Fetch current month company goal
    const monthDates = getMonthDates(selectedYear, selectedMonth);
    const { data: companyGoals } = await supabase
      .from("sales_goals")
      .select("target_value")
      .eq("goal_type", "revenue")
      .eq("is_company_goal", true)
      .eq("period_start", monthDates.start)
      .eq("period_end", monthDates.end)
      .maybeSingle();

    setCompanyMonthlyGoal(companyGoals?.target_value ? String(companyGoals.target_value) : "");
    setSpGoalInputs(inputs);
    setShowGoalsModal(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Save Goals (monthly only)
  // ─────────────────────────────────────────────────────────────────────────
  const saveGoals = async (): Promise<void> => {
    if (!data) return;
    setGoalsSaving(true);
    try {
      const monthDates = getMonthDates(selectedYear, selectedMonth);

      const upsertGoal = async (opts: {
        salesperson_id?: string;
        is_company_goal?: boolean;
        target_value: number;
        notes: string;
      }): Promise<void> => {
        let q = supabase
          .from("sales_goals")
          .select("id")
          .eq("goal_type", "revenue")
          .eq("period_start", monthDates.start)
          .eq("period_end", monthDates.end)
          .eq("is_company_goal", !!opts.is_company_goal);

        if (opts.salesperson_id) {
          q = q.eq("salesperson_id", opts.salesperson_id) as typeof q;
        } else {
          q = q.is("salesperson_id", null) as typeof q;
        }

        const { data: existing, error: selectErr } = await q.maybeSingle();
        if (selectErr) throw new Error(`SELECT failed: ${selectErr.message}`);

        if (existing) {
          const { error: updateErr } = await supabase
            .from("sales_goals")
            .update({ target_value: opts.target_value })
            .eq("id", existing.id);
          if (updateErr) throw new Error(`UPDATE failed: ${updateErr.message}`);
        } else {
          const { error: insertErr } = await supabase.from("sales_goals").insert({
            salesperson_id:  opts.salesperson_id ?? null,
            is_company_goal: !!opts.is_company_goal,
            goal_type:       "revenue",
            period_start:    monthDates.start,
            period_end:      monthDates.end,
            target_value:    opts.target_value,
            notes:           opts.notes,
          });
          if (insertErr) throw new Error(`INSERT failed: ${insertErr.message}`);
        }
      };

      // Save company goal
      const compVal = parseFloat(companyMonthlyGoal) || 0;
      if (compVal > 0) {
        await upsertGoal({
          is_company_goal: true,
          target_value: compVal,
          notes: `Company Monthly goal — ${monthDates.label}`,
        });
      }

      // Save individual goals
      const activeSalespeople = data.salespeople.filter(sp => !sp.full_name.toLowerCase().includes("armando"));
      for (const sp of activeSalespeople) {
        const val = parseFloat(spGoalInputs[sp.id]) || 0;
        if (val > 0) {
          await upsertGoal({
            salesperson_id: sp.id,
            is_company_goal: false,
            target_value: val,
            notes: `Monthly goal — ${sp.full_name} — ${monthDates.label}`,
          });
        }
      }

      setShowGoalsModal(false);
      await fetchData(selectedYear, selectedMonth);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Error saving goals:", msg);
      setError(`Failed to save goals: ${msg}`);
    } finally {
      setGoalsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Load salesperson jobs (accordion expand)
  // ─────────────────────────────────────────────────────────────────────────
  const loadSpJobs = async (spId: string): Promise<void> => {
    if (spJobs[spId]) {
      setExpandedSp(expandedSp === spId ? null : spId);
      return;
    }

    setLoadingJobs(spId);
    setExpandedSp(spId);

    const monthDates = getMonthDates(selectedYear, selectedMonth);
    const { data: jobs, error: err } = await supabase
      .from("jobs")
      .select("id, title, contract_amount, contract_signed_at, city, job_number, created_at, status")
      .eq("salesperson_id", spId)
      .in("status", ["active", "on_hold", "completed", "pending_scheduling", "draft", "cancelled"]);

    if (err) {
      console.error("Error loading jobs:", err);
      setLoadingJobs(null);
      return;
    }

    const filtered = (jobs || []).filter((j) => {
      const d = (j.contract_signed_at || j.created_at || "").slice(0, 10);
      return d >= monthDates.start && d <= monthDates.end;
    });

    setSpJobs((prev) => ({ ...prev, [spId]: filtered as JobDetail[] }));
    setLoadingJobs(null);
  };

  const handleAbandonJob = async () => {
    if (!jobToAbandon) return;
    const { jobId, spId } = jobToAbandon;
    
    try {
      const { error } = await supabase.from("jobs").update({ status: "cancelled" }).eq("id", jobId);
      if (error) throw error;
      setSpJobs((prev) => ({
         ...prev,
         [spId]: (prev[spId] || []).map(j => j.id === jobId ? { ...j, status: "cancelled" } : j)
      }));
      fetchData(selectedYear, selectedMonth);
    } catch (e) {
      console.error(e);
      alert("Failed to abandon job.");
    } finally {
      setJobToAbandon(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Load/Save Summary
  // ─────────────────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async (year: number, month: number): Promise<void> => {
    const { data: row } = await supabase
      .from("sales_summaries")
      .select("summary_text")
      .eq("period_year", year)
      .eq("period_month", month + 1)
      .maybeSingle();

    setSavedSummary(row?.summary_text || null);
  }, []);

  const saveSummary = async (): Promise<void> => {
    setSavingSummary(true);
    try {
      const { error: err } = await supabase
        .from("sales_summaries")
        .upsert(
          {
            period_year: selectedYear,
            period_month: selectedMonth + 1,
            summary_text: summaryDraft,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "period_year,period_month" }
        );
      if (err) throw err;
      setSavedSummary(summaryDraft);
      setEditingSummary(false);
    } catch (e) {
      console.error("Error saving summary:", e);
    } finally {
      setSavingSummary(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Load Annual Report (all salespersons, 12 months)
  // ─────────────────────────────────────────────────────────────────────────
  const loadAnnualReport = useCallback(async (year: number): Promise<void> => {
    const { data: spData } = await supabase
      .from("salespersons")
      .select("id, full_name")
      .eq("active", true);

    if (!spData) return;

    const { data: jobsData } = await supabase
      .from("jobs")
      .select("salesperson_id, contract_amount, contract_signed_at, created_at, status")
      .in("status", ["active", "on_hold", "completed", "pending_scheduling", "draft", "cancelled"]);

    const report: Record<string, number[]> = {};
    const spList = spData
      .filter((sp) => !sp.full_name.toLowerCase().includes("armando"))
      .map((sp, idx) => ({
        id: sp.id,
        name: sp.full_name,
        color: getSpColor(sp.full_name, idx),
      }));

    spList.forEach((sp) => {
      report[sp.id] = Array(12).fill(0);
    });

    (jobsData || []).forEach((j) => {
      if (!j.salesperson_id || !report[j.salesperson_id]) return;
      if (j.status === "cancelled") return;
      const dateStr = j.contract_signed_at || j.created_at;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (d.getFullYear() !== year) return;
      report[j.salesperson_id][d.getMonth()] += Number(j.contract_amount);
    });

    setAnnualData(report);
    setAnnualSalespeople(spList);
  }, []);

  // ── Data Fetcher (monthly-centric) ─────────────────────────────────────
  const fetchData = useCallback(async (year: number, month: number): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const periodDates = getMonthDates(year, month);

      const { data: spData, error: spErr } = await supabase
        .from("salespersons")
        .select("id, full_name")
        .eq("active", true);
      if (spErr) throw spErr;
      if (!spData || spData.length === 0) { setData(null); setLoading(false); return; }

      // Aggregate from jobs
      const statsMap: Record<string, { jobs: number; revenue: number }> = {};
      const { data: jobsData, error: jobsErr } = await supabase
        .from("jobs")
        .select("salesperson_id, contract_amount, contract_signed_at, created_at, status")
        .in("status", ["active", "on_hold", "completed", "pending_scheduling", "draft", "cancelled"]);
      if (jobsErr) throw jobsErr;

      (jobsData || []).forEach((j) => {
        if (!j.salesperson_id) return;
        if (j.status === "cancelled") return; // Ignore from totals
        const jobDate = j.contract_signed_at || j.created_at;
        if (!jobDate) return;
        const d = jobDate.slice(0, 10);
        if (d < periodDates.start || d > periodDates.end) return;
        if (!statsMap[j.salesperson_id]) statsMap[j.salesperson_id] = { jobs: 0, revenue: 0 };
        statsMap[j.salesperson_id].jobs += 1;
        statsMap[j.salesperson_id].revenue += Number(j.contract_amount);
      });

      // Fetch goals for this month
      const { data: allGoals } = await supabase
        .from("sales_goals")
        .select("salesperson_id, is_company_goal, target_value, period_start, period_end")
        .eq("goal_type", "revenue")
        .eq("period_start", periodDates.start)
        .eq("period_end", periodDates.end);

      let companyGoalValue = 0;
      const indivGoalMap: Record<string, number> = {};

      (allGoals || []).forEach((g: { salesperson_id: string | null; is_company_goal: boolean; target_value: number }) => {
        if (g.is_company_goal) {
          companyGoalValue = Number(g.target_value);
        } else if (g.salesperson_id) {
          indivGoalMap[g.salesperson_id] = Number(g.target_value);
        }
      });

      // Build salesperson stats
      const salespeople: SalespersonStats[] = spData.map((sp, idx) => {
        const stats = statsMap[sp.id] || { jobs: 0, revenue: 0 };
        const spGoal = indivGoalMap[sp.id] || DEFAULT_SP_MONTHLY_GOAL;
        const goalPct = spGoal > 0 ? Math.min((stats.revenue / spGoal) * 100, 999) : 0;
        return {
          id: sp.id,
          full_name: sp.full_name,
          initials: getInitials(sp.full_name),
          color: getSpColor(sp.full_name, idx),
          jobs_sold_count: stats.jobs,
          total_revenue: stats.revenue,
          monthly_goal: spGoal,
          goal_pct: goalPct,
        };
      });

      salespeople.sort((a, b) => {
        if (b.total_revenue !== a.total_revenue) {
          return b.total_revenue - a.total_revenue;
        }
        // In case of equal revenue (e.g., both $0), prioritize the one with more jobs
        return b.jobs_sold_count - a.jobs_sold_count;
      });

      const totalSold = salespeople.reduce((s, sp) => s + sp.total_revenue, 0);
      const totalJobs = salespeople.reduce((s, sp) => s + sp.jobs_sold_count, 0);
      const averageTicket = totalJobs > 0 ? totalSold / totalJobs : 0;
      const totalGoal = companyGoalValue > 0
        ? companyGoalValue
        : salespeople.reduce((s, sp) => s + sp.monthly_goal, 0);

      setData({
        totalGoal,
        totalSold,
        totalJobs,
        averageTicket,
        salespeople,
        period: periodDates,
      });
    } catch (e: unknown) {
      console.error("Sales Dashboard error:", e);
      setError("Failed to load sales data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedYear, selectedMonth);
    loadSummary(selectedYear, selectedMonth);
    loadAnnualReport(selectedYear);
    // Reset expanded jobs when month changes
    setSpJobs({});
    setExpandedSp(null);
  }, [selectedYear, selectedMonth, fetchData, loadSummary, loadAnnualReport]);

  // ── Computed ─────────────────────────────────────────────────────────────
  const overallPct = data && data.totalGoal > 0 ? Math.min((data.totalSold / data.totalGoal) * 100, 100) : 0;
  const remaining = data ? Math.max(data.totalGoal - data.totalSold, 0) : 0;

  const periodDaysLeft = (() => {
    const now = new Date();
    if (now.getFullYear() !== selectedYear || now.getMonth() !== selectedMonth) return 0;
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return lastDay - now.getDate();
  })();

  // ── Summary Text (auto-generated, or use saved) ─────────────────────────
  const DEFAULT_SUMMARY_TEMPLATE = `📆 *Monthly Sales Update – Siding Depot*

{{periodLabel}}

✅ *Total Sold:* {{totalSold}}
✅ *Jobs Closed:* {{totalJobs}}
✅ *Avg Ticket:* {{avgTicket}}
🎯 *Monthly Goal:* {{monthlyGoal}}
📈 *Progress:* {{progressPct}}
💰 *Remaining:* {{remaining}}

🏆 *Top Performer:* {{topPerformer}}

💪 Let's finish strong! {{daysLeft}} days left.

– Siding Depot HQ`;

  const templateVars: Record<string, string> = {
    "{{periodLabel}}": data?.period.label || "",
    "{{totalSold}}": fmt(data?.totalSold || 0),
    "{{totalJobs}}": String(data?.totalJobs || 0),
    "{{avgTicket}}": fmt(data?.averageTicket || 0),
    "{{monthlyGoal}}": fmt(data?.totalGoal || 0),
    "{{progressPct}}": data && data.totalGoal > 0 ? ((data.totalSold / data.totalGoal) * 100).toFixed(1) + "%" : "0.0%",
    "{{remaining}}": remaining === 0 ? "Achieved!" : fmt(remaining),
    "{{topPerformer}}": data?.salespeople.length && data.salespeople[0].total_revenue > 0 ? `${data.salespeople[0].full_name} (${fmt(data.salespeople[0].total_revenue)})` : "N/A",
    "{{daysLeft}}": String(periodDaysLeft),
  };

  const rawTemplate = savedSummary || DEFAULT_SUMMARY_TEMPLATE;
  const displaySummary = rawTemplate.replace(/\{\{(.*?)\}\}/g, (match) => {
    return templateVars[match] !== undefined ? templateVars[match] : match;
  });

  const handleCopy = async (): Promise<void> => {
    if (!displaySummary) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(displaySummary);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        // Fallback for non-secure contexts (e.g., HTTP over local network IP)
        const textArea = document.createElement("textarea");
        textArea.value = displaySummary;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        } catch (err) {
          console.error('Fallback copy failed', err);
        }
        textArea.remove();
      }
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // ── Month navigation helpers ────────────────────────────────────────────
  const goToPrevMonth = (): void => {
    if (selectedMonth === 0) {
      setSelectedYear(selectedYear - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = (): void => {
    if (selectedMonth === 11) {
      setSelectedYear(selectedYear + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // -- Render
  return (
    <>
      <TopBar title="Sales" />

      <div className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen pb-16">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1
              className="text-xl sm:text-3xl font-extrabold text-[#faf9f5] tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Sales Dashboard
            </h1>
            <p className="text-[#ababa8] text-sm mt-1">
              Commercial performance overview — {data?.period.label ?? "Loading..."}
            </p>
          </div>

          {/* Month Selector + Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={openGoalsModal}
              className="px-4 py-2 bg-[#1e201e] hover:bg-[#242624] text-[#faf9f5] font-semibold rounded-xl flex items-center gap-2 transition-all text-xs border border-white/5 hover:border-[#aeee2a]/20"
            >
              <span className="material-symbols-outlined text-sm text-[#aeee2a]" translate="no">flag</span>
              Set Goals
            </button>

            {/* Month Picker / Navigator */}
            <input
              type="month"
              value={`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`}
              onClick={(e) => {
                try {
                  if ("showPicker" in HTMLInputElement.prototype) {
                    e.currentTarget.showPicker();
                  }
                } catch (err) {}
              }}
              onChange={(e) => {
                if (!e.target.value) return;
                const [y, m] = e.target.value.split("-").map(Number);
                setSelectedYear(y);
                setSelectedMonth(m - 1);
              }}
              className="bg-[#121412] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors cursor-pointer [color-scheme:dark] relative"
              style={{ height: "42px" }}
            />

            <button
              onClick={() => fetchData(selectedYear, selectedMonth)}
              title="Refresh"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1e201e] border border-white/5 text-[#ababa8] hover:text-[#aeee2a] transition-all hover:border-[#aeee2a]/20"
            >
              <span className="material-symbols-outlined text-base" translate="no">refresh</span>
            </button>
          </div>
        </div>

        {/* ── Error / Loading ──────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl p-4 bg-[#ff7351]/10 border border-[#ff7351]/20 text-[#ff7351] text-sm flex items-center gap-3">
            <span className="material-symbols-outlined" translate="no">error</span>
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[#aeee2a]/30 border-t-[#aeee2a] rounded-full animate-spin" />
              <p className="text-[#ababa8] text-sm">Loading sales data...</p>
            </div>
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon="flag" label="Monthly Goal" value={fmt(data.totalGoal)} sub={data.period.label} color="#aeee2a" />
              <KpiCard
                icon="attach_money" label="Sold So Far" value={fmt(data.totalSold)}
                sub={`${overallPct.toFixed(1)}% of goal`} color="#aeee2a"
                trend={overallPct >= 75 ? { dir: "up", val: "On track" } : overallPct >= 50 ? { dir: "up", val: "Making progress" } : { dir: "down", val: "Needs attention" }}
              />
              <KpiCard
                icon="trending_up" label="Remaining" value={fmt(remaining)}
                sub={`${periodDaysLeft} days left`}
                color={remaining === 0 ? "#aeee2a" : "#ff7351"}
              />
              <KpiCard icon="work" label="Total Jobs" value={String(data.totalJobs)} sub="Closed this month" color="#aeee2a" />
            </div>

            {/* Average Ticket */}
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: "rgba(36,38,36,0.4)", border: "1px solid rgba(174,238,42,0.08)", backdropFilter: "blur(20px)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#e3eb5d]/10">
                  <span className="material-symbols-outlined text-[#e3eb5d] text-lg" translate="no">receipt_long</span>
                </div>
                <div>
                  <p className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">Average Ticket</p>
                  <p className="text-[#ababa8] text-xs mt-0.5">Per job sold this month</p>
                </div>
              </div>
              <p className="text-3xl font-black text-[#e3eb5d]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                {fmt(data.averageTicket)}
              </p>
            </div>

            {/* ── Chart + Goal Progress ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Salesperson Bar Chart — with revenue shown */}
              <div
                className="lg:col-span-2 rounded-2xl p-6"
                style={{ background: "rgba(36,38,36,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                    Performance by Salesperson
                  </h3>
                  <span className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">
                    Revenue · {data.period.label}
                  </span>
                </div>

                {/* Horizontal Bars */}
                <div className="space-y-4">
                  {data.salespeople.map((sp) => {
                    const goalRef = sp.monthly_goal > 0 ? sp.monthly_goal : (data.salespeople[0]?.total_revenue || 1);
                    const barWidth = Math.min((sp.total_revenue / goalRef) * 100, 100);
                    const isHovered = hoveredSp === sp.id;

                    return (
                      <div
                        key={sp.id}
                        className="group flex flex-col"
                      >
                        <div
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredSp(sp.id)}
                          onMouseLeave={() => setHoveredSp(null)}
                          onClick={() => loadSpJobs(sp.id)}
                        >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-110"
                              style={{ background: `${sp.color}20`, border: `1.5px solid ${sp.color}60`, color: sp.color }}
                            >
                              {sp.initials}
                            </div>
                            <span className={`text-sm font-semibold transition-colors ${isHovered ? "text-[#faf9f5]" : "text-[#ababa8]"}`}>
                              {sp.full_name}
                            </span>
                            <span className="material-symbols-outlined text-[14px] text-[#474846] transition-transform" translate="no">
                              {expandedSp === sp.id ? "expand_less" : "expand_more"}
                            </span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${sp.color}15`, color: sp.color }}
                            >
                              {sp.jobs_sold_count} job{sp.jobs_sold_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Revenue value — always visible */}
                            <span
                              className="text-sm font-black"
                              style={{ color: sp.color, fontFamily: "Manrope, system-ui, sans-serif" }}
                            >
                              {fmt(sp.total_revenue)}
                            </span>
                            <span className="text-[10px] text-[#ababa8] w-9 text-right">
                              {sp.goal_pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Bar track */}
                        <div className="relative w-full h-2 bg-[#242624] rounded-full overflow-hidden">
                          {sp.monthly_goal > 0 && (
                            <div className="absolute top-0 bottom-0 w-px bg-white/20 z-10" style={{ left: "100%" }} />
                          )}
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${barWidth}%`,
                              background: `linear-gradient(90deg, ${sp.color}CC, ${sp.color})`,
                              boxShadow: isHovered ? `0 0 12px ${sp.color}60` : "none",
                            }}
                          />
                        </div>
                        </div>

                        {/* Tooltip on hover */}
                        {isHovered && sp.monthly_goal > 0 && (
                          <div className="mt-1.5 flex items-center gap-4 text-[10px] text-[#ababa8]">
                            <span>Goal: <span className="text-[#faf9f5] font-bold">{fmt(sp.monthly_goal)}</span></span>
                            <span>Remaining: <span style={{ color: sp.total_revenue >= sp.monthly_goal ? "#aeee2a" : "#ff7351" }} className="font-bold">{fmt(Math.max(sp.monthly_goal - sp.total_revenue, 0))}</span></span>
                          </div>
                        )}
                        
                        {/* Expanded jobs detail */}
                        {expandedSp === sp.id && (
                          <div className="mt-3 px-4 py-3 rounded-xl bg-[#0d0f0d]/50 border border-white/5 overflow-x-auto">
                            <div className="min-w-[450px]">
                            {loadingJobs === sp.id ? (
                              <div className="flex items-center gap-2 py-2">
                                <div className="w-3 h-3 border-2 border-[#aeee2a]/30 border-t-[#aeee2a] rounded-full animate-spin" />
                                <span className="text-[11px] text-[#474846]">Loading jobs...</span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="grid grid-cols-[100px_1fr_100px_60px] gap-2 px-2 pb-1 text-[9px] text-[#ababa8] uppercase tracking-widest font-bold border-b border-white/5 mb-2">
                                  <span>Data</span>
                                  <span className="text-center">Job Title</span>
                                  <span className="text-center">VALOR</span>
                                  <span className="text-right">STATUS</span>
                                </div>
                                {(spJobs[sp.id]?.length || 0) === 0 ? (
                                  <div className="grid grid-cols-[100px_1fr_100px_60px] gap-2 px-2 py-2 rounded-lg text-xs items-center">
                                    <span className="text-[#474846] font-mono">--</span>
                                    <span className="text-[#474846] font-semibold text-center">--</span>
                                    <span className="text-[#474846] font-semibold text-center">--</span>
                                    <span className="text-right text-[#474846] font-bold text-sm">--</span>
                                  </div>
                                ) : (
                                  spJobs[sp.id].map((job) => {
                                    const isCancelled = job.status === "cancelled";
                                    return (
                                      <div
                                        key={job.id}
                                        className={`grid grid-cols-[100px_1fr_100px_60px] gap-2 px-2 py-2 rounded-lg hover:bg-[#1e201e]/40 transition-colors text-xs items-center ${isCancelled ? "opacity-50" : ""}`}
                                      >
                                        <span className={`text-[#ababa8] font-mono ${isCancelled ? "line-through" : ""}`}>
                                          {(() => {
                                            const dStr = job.contract_signed_at || job.created_at;
                                            if (!dStr) return "—";
                                            const normalized = dStr.length === 10 ? `${dStr}T12:00:00` : dStr;
                                            return new Date(normalized).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
                                          })()}
                                        </span>
                                        <span className={`text-[#faf9f5] font-semibold truncate text-center ${isCancelled ? "line-through" : ""}`}>
                                          {job.title}
                                        </span>
                                        
                                        <span className={`text-center font-bold text-sm ${isCancelled ? "line-through text-[#808080]" : ""}`} style={!isCancelled ? { color: sp.color } : {}}>
                                          {fmtFull(Number(job.contract_amount))}
                                        </span>

                                        <div className="flex justify-end pr-2">
                                          {isCancelled ? (
                                             <span className="text-[9px] font-black text-[#ff7351] bg-[#ff7351]/10 px-1.5 py-0.5 rounded uppercase tracking-widest" title="Abandoned">
                                                ABD
                                             </span>
                                          ) : (
                                             <button 
                                                title="Marcar como Abandonado"
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   setJobToAbandon({ jobId: job.id, spId: sp.id, title: job.title });
                                                }}
                                                className="w-6 h-6 rounded-md bg-[#242624] text-[#808080] hover:text-[#ff7351] hover:bg-[#ff7351]/10 flex items-center justify-center transition-all border border-[#474846]/20 hover:border-[#ff7351]/40 cursor-pointer"
                                             >
                                                <span className="material-symbols-outlined text-[13px]" translate="no">edit</span>
                                             </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1 flex-wrap">
                  <div className="flex items-center gap-1 mr-2">
                    <div className="w-5 h-px bg-white/20" />
                    <span className="text-[9px] text-[#ababa8] uppercase tracking-widest">Monthly goal marker</span>
                  </div>
                </div>
              </div>

              {/* Goal Progress Circle */}
              <div
                className="rounded-2xl p-6 flex flex-col gap-6"
                style={{ background: "rgba(36,38,36,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <h3 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  {data.period.label}
                </h3>

                {/* Circular Progress SVG */}
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="relative w-40 h-40">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#242624" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={overallPct >= 100 ? "#22c55e" : "#aeee2a"}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - overallPct / 100)}`}
                        style={{ transition: "stroke-dashoffset 1.2s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="text-3xl font-black"
                        style={{ color: overallPct >= 100 ? "#22c55e" : "#aeee2a", fontFamily: "Manrope, system-ui, sans-serif" }}
                      >
                        {overallPct.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">of goal</span>
                    </div>
                  </div>
                </div>

                {/* Mini stats */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#ababa8]">Sold</span>
                    <span className="text-[#aeee2a] font-bold">{fmt(data.totalSold)}</span>
                  </div>
                  <div className="w-full bg-[#242624] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${overallPct}%`, background: "linear-gradient(90deg, #aeee2a, #22c55e)" }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#ababa8]">Goal</span>
                    <span className="text-[#faf9f5] font-bold">{fmt(data.totalGoal)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-white/5 pt-3">
                    <span className="text-[#ababa8]">Remaining</span>
                    <span className="font-bold" style={{ color: remaining === 0 ? "#aeee2a" : "#ff7351" }}>
                      {remaining === 0 ? "✓ Achieved!" : fmt(remaining)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#ababa8]">Days left</span>
                    <span className="text-[#ababa8] font-bold">{periodDaysLeft}d</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Leaderboard Table + Jobs Accordion ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Leaderboard Table */}
              <div
                className="lg:col-span-2 rounded-2xl overflow-hidden"
                style={{ background: "#121412", border: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                    Leaderboard
                  </h3>
                  <span className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">{data.period.label}</span>
                </div>

                <div className="w-full text-left">
                  <div className="flex bg-[#1e201e]/50 border-b border-white/5">
                    {["#", "Salesperson", "Jobs", "Revenue", "vs Goal"].map((col, i) => (
                      <div
                        key={col}
                        className={`px-5 py-3 text-[10px] font-bold text-[#ababa8] uppercase tracking-widest flex items-center ${
                          i === 0 ? "w-10" : 
                          i === 2 ? "justify-center w-[120px]" : 
                          i === 3 ? "justify-center w-[150px]" : 
                          i === 4 ? "w-[200px] justify-center" : 
                          "flex-1"
                        }`}
                      >
                        {col}
                      </div>
                    ))}
                  </div>
                  <div className="divide-y divide-white/5">
                    {data.salespeople
                      .filter(sp => !sp.full_name.toLowerCase().includes("armando"))
                      .map((sp, i) => (
                      <div key={sp.id} className="w-full flex items-center hover:bg-[#1e201e]/40 transition-colors">
                        <div className="px-5 py-4 w-10 shrink-0">
                          {i === 0 ? (
                            <span className="text-base">🏆</span>
                          ) : (
                            <span className="text-sm font-bold text-[#474846]">#{i + 1}</span>
                          )}
                        </div>
                        <div className="px-5 py-4 flex-1">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black"
                              style={{ background: `${sp.color}15`, border: `1.5px solid ${sp.color}40`, color: sp.color }}
                            >
                              {sp.initials}
                            </div>
                            <span className="text-sm font-semibold text-[#faf9f5]">{sp.full_name}</span>
                          </div>
                        </div>
                        <div className="px-5 py-4 flex justify-center text-sm text-[#faf9f5] font-bold w-[120px] shrink-0">{sp.jobs_sold_count}</div>
                        <div className="px-5 py-4 flex justify-center w-[150px] shrink-0">
                          <span className="text-sm font-black" style={{ color: sp.color, fontFamily: "Manrope, system-ui, sans-serif" }}>
                            {fmt(sp.total_revenue)}
                          </span>
                        </div>
                        <div className="px-5 py-4 w-[200px] shrink-0 flex justify-center">
                          <div className="flex items-center gap-2 w-full max-w-[120px]">
                            <div className="flex-1 bg-[#242624] rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all duration-700"
                                style={{
                                  width: `${Math.min(sp.goal_pct, 100)}%`,
                                  backgroundColor: sp.goal_pct >= 70 ? "#aeee2a" : sp.goal_pct >= 40 ? "#e3eb5d" : "#ff7351",
                                }}
                              />
                            </div>
                            <span className="text-[10px] text-[#ababa8] w-8 text-right">{sp.goal_pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {data.salespeople.filter(sp => !sp.full_name.toLowerCase().includes("armando")).length === 0 && (
                  <div className="py-10 text-center text-[#ababa8] text-sm">No sales data for this period.</div>
                )}
              </div>

              {/* Monthly Summary Message — editable */}
              <div
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{ background: "rgba(36,38,36,0.4)", backdropFilter: "blur(20px)", border: "1px solid rgba(174,238,42,0.08)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#aeee2a] text-lg" translate="no">campaign</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                      Monthly Summary
                    </h3>
                    <p className="text-[10px] text-[#ababa8]">Ready-to-copy for WhatsApp / Email</p>
                  </div>
                </div>

                {/* Message box — editable or read-only */}
                {editingSummary ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={summaryDraft}
                      onChange={(e) => setSummaryDraft(e.target.value)}
                      className="w-full rounded-xl p-4 text-[11px] text-[#faf9f5]/80 leading-relaxed font-mono resize-none outline-none focus:border-[#aeee2a]/40 transition-colors"
                      style={{
                        background: "rgba(13,15,13,0.6)",
                        border: "1px solid rgba(174,238,42,0.2)",
                        minHeight: "220px",
                      }}
                    />
                    <div className="flex flex-col gap-2">
                       <p className="text-[10px] text-[#ababa8] ml-1 font-semibold">
                         <span className="text-[#aeee2a]">💡 How it works:</span> Modify the text, but keep the <span className="font-mono text-[#aeee2a] font-bold">{"{{brackets}}"}</span> intact if you want data (like Total Sold) to update automatically based on your real numbers.
                       </p>
                       <div className="flex flex-wrap gap-1.5 p-2 bg-[#121412] rounded-lg border border-[#474846]/20 shadow-inner">
                          {Object.keys(templateVars).map(key => (
                             <button
                               title={`Insert ${key}`}
                               key={key}
                               onClick={() => setSummaryDraft(prev => prev + " " + key)}
                               className="text-[9px] bg-[#242624] text-[#aeee2a] font-mono px-2 py-1 rounded-md hover:bg-[#aeee2a]/20 hover:text-white transition-colors"
                             >
                                {key}
                             </button>
                          ))}
                       </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex-1 rounded-xl p-4 text-[11px] text-[#faf9f5]/80 leading-relaxed whitespace-pre-line font-mono"
                    style={{ background: "rgba(13,15,13,0.6)", border: "1px solid rgba(71,72,70,0.3)", minHeight: "220px" }}
                  >
                    {displaySummary}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {editingSummary ? (
                    <>
                      <button
                        onClick={() => setEditingSummary(false)}
                        className="flex-1 py-2.5 rounded-xl bg-[#1e201e] text-[#ababa8] text-xs font-bold hover:bg-[#242624] transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveSummary}
                        disabled={savingSummary}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#aeee2a] text-[#3a5400] text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                      >
                        {savingSummary ? (
                          <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" />
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm" translate="no">save</span>
                            Save
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleCopy}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                        style={{
                          background: copied ? "#1a2e00" : "#aeee2a",
                          color: copied ? "#aeee2a" : "#3a5400",
                          border: copied ? "1px solid #aeee2a40" : "none",
                        }}
                      >
                        <span className="material-symbols-outlined text-sm" translate="no">
                          {copied ? "check" : "content_copy"}
                        </span>
                        {copied ? "Copied!" : "Copy Message"}
                      </button>
                      <button
                        onClick={() => { setSummaryDraft(rawTemplate); setEditingSummary(true); }}
                        title="Edit summary template"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#242624] text-[#ababa8] text-xs font-bold hover:text-[#faf9f5] transition-all hover:bg-[#2e302e]"
                      >
                        <span className="material-symbols-outlined text-sm" translate="no">edit_document</span>
                      </button>
                      <button
                        onClick={() => fetchData(selectedYear, selectedMonth)}
                        title="Refresh data"
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#242624] text-[#ababa8] text-xs font-bold hover:text-[#faf9f5] transition-all hover:bg-[#2e302e]"
                      >
                        <span className="material-symbols-outlined text-sm" translate="no">refresh</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Annual Comparison Table ──────────────────────────────── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#121412", border: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#a855f7]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#a855f7] text-lg" translate="no">analytics</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                      Annual Performance Report
                    </h3>
                    <p className="text-[10px] text-[#ababa8]">Month-by-month comparison — {selectedYear}</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr className="bg-[#1e201e]/50">
                      <th className="px-4 py-3 text-[10px] font-bold text-[#ababa8] uppercase tracking-widest sticky left-0 bg-[#1e201e]/80 backdrop-blur-sm z-10">
                        Salesperson
                      </th>
                      {MONTH_NAMES.map((m, idx) => (
                        <th
                          key={m}
                          className={`px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-center ${
                            idx === selectedMonth ? "text-[#aeee2a]" : "text-[#ababa8]"
                          }`}
                        >
                          {m.slice(0, 3)}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-[10px] font-bold text-[#aeee2a] uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {annualSalespeople.map((sp) => {
                      const months = annualData[sp.id] || Array(12).fill(0);
                      const total = months.reduce((a, b) => a + b, 0);
                      return (
                        <tr key={sp.id} className="hover:bg-[#1e201e]/30 transition-colors">
                          <td className="px-4 py-3 sticky left-0 bg-[#121412] z-10">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black"
                                style={{ background: `${sp.color}20`, border: `1px solid ${sp.color}40`, color: sp.color }}
                              >
                                {getInitials(sp.name)}
                              </div>
                              <span className="text-xs font-semibold text-[#faf9f5]">{sp.name}</span>
                            </div>
                          </td>
                          {months.map((val, idx) => (
                            <td
                              key={idx}
                              className={`px-3 py-3 text-center text-[11px] font-bold ${
                                idx === selectedMonth ? "bg-[#aeee2a]/5" : ""
                              }`}
                              style={{ color: val > 0 ? sp.color : "#474846" }}
                            >
                              {val > 0 ? fmt(val) : "—"}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right text-xs font-black" style={{ color: sp.color }}>
                            {total > 0 ? fmt(total) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── Empty State ─────────────────────────────────────────────── */}
        {!loading && !error && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1e201e] flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-[#474846]" translate="no">bar_chart</span>
            </div>
            <p className="text-[#ababa8] text-sm">No sales data found for this period.</p>
            <p className="text-[#474846] text-xs">Sales data will appear here once jobs are created with contract amounts.</p>
          </div>
        )}

      </div>

      {/* ── Goals Modal (simplified: monthly only) ───────────────────── */}
      {showGoalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowGoalsModal(false)} />
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl space-y-0"
            style={{
              background: "#121412",
              border: "1px solid rgba(174,238,42,0.15)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(174,238,42,0.05)",
              scrollbarWidth: "none",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#aeee2a] text-xl" translate="no">flag</span>
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Set Monthly Goals</h2>
                  <p className="text-[10px] text-[#ababa8] uppercase tracking-widest">{MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                </div>
              </div>
              <button
                onClick={() => setShowGoalsModal(false)}
                className="w-8 h-8 rounded-lg bg-[#1e201e] flex items-center justify-center text-[#ababa8] hover:text-[#faf9f5] transition-all"
              >
                <span className="material-symbols-outlined text-base" translate="no">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Company Goal — single monthly input */}
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{ background: "rgba(174,238,42,0.04)", border: "1px solid rgba(174,238,42,0.12)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#aeee2a] text-xl" translate="no">business</span>
                  <div>
                    <p className="text-sm font-black text-[#aeee2a] uppercase tracking-widest">Company Monthly Goal</p>
                    <p className="text-[10px] text-[#ababa8] mt-0.5">Total revenue target for the month</p>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aeee2a] text-xs font-bold">$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={companyMonthlyGoal}
                    onChange={(e) => setCompanyMonthlyGoal(e.target.value)}
                    className="w-full bg-[#0d0f0d] border border-[#aeee2a]/20 rounded-lg py-2.5 pl-7 pr-3 text-sm text-[#aeee2a] font-black placeholder-[#474846] focus:outline-none focus:border-[#aeee2a]/60 transition-colors"
                  />
                </div>

                {/* Sum suggestion */}
                {(() => {
                  const autoMonth = (data?.salespeople || [])
                    .filter(sp => !sp.full_name.toLowerCase().includes("armando"))
                    .reduce((sum, sp) => {
                      return sum + (parseFloat(spGoalInputs[sp.id] || "0") || 0);
                    }, 0);
                  if (autoMonth > 0) return (
                    <p className="text-[10px] text-[#ababa8]">
                      📊 Sum of individual goals:{" "}
                      <span className="text-[#aeee2a] font-bold">${autoMonth.toLocaleString()}</span>
                      {" — "}
                      <button
                        type="button"
                        onClick={() => setCompanyMonthlyGoal(String(autoMonth))}
                        className="text-[#aeee2a] underline hover:opacity-70 transition-opacity"
                      >
                        Apply
                      </button>
                    </p>
                  );
                  return null;
                })()}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] text-[#474846] uppercase tracking-widest font-bold">Individual Targets</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {/* Individual Salesperson Rows */}
              <div className="space-y-3">
                {(data?.salespeople || [])
                  .filter((sp) => !sp.full_name.toLowerCase().includes("armando"))
                  .map((sp) => (
                  <div
                    key={sp.id}
                    className="rounded-xl p-4 flex items-center gap-3"
                    style={{ background: "rgba(30,32,30,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                      style={{ background: `${sp.color}20`, border: `1.5px solid ${sp.color}60`, color: sp.color }}
                    >
                      {sp.initials}
                    </div>
                    <span className="text-sm font-bold text-[#faf9f5] flex-1">{sp.full_name}</span>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ababa8] text-xs">$</span>
                      <input
                        type="number"
                        placeholder={String(DEFAULT_SP_MONTHLY_GOAL)}
                        value={spGoalInputs[sp.id] || ""}
                        onChange={(e) =>
                          setSpGoalInputs((prev) => ({ ...prev, [sp.id]: e.target.value }))
                        }
                        className="w-full bg-[#0d0f0d] border border-white/10 rounded-lg py-2 pl-7 pr-3 text-sm text-[#faf9f5] placeholder-[#474846] focus:outline-none focus:border-[#aeee2a]/40 transition-colors"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-[#474846] text-center">
                Default individual goal: <span className="text-[#ababa8] font-bold">${DEFAULT_SP_MONTHLY_GOAL.toLocaleString()}/mo</span> — editable above
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGoalsModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1e201e] text-[#ababa8] text-xs font-bold hover:bg-[#242624] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveGoals}
                  disabled={goalsSaving}
                  className="flex-1 py-2.5 rounded-xl bg-[#aeee2a] text-[#3a5400] text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                >
                  {goalsSaving ? (
                    <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm" translate="no">save</span>
                      Save Goals
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Abandon Job Confirmation Modal ────────────────────────────────────── */}
      {jobToAbandon && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setJobToAbandon(null)}>
          <div
            className="w-full max-w-sm rounded-3xl bg-[#121412] border border-[#ff7351]/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 bg-[#ff7351]/10 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#ff7351] text-xl" translate="no">warning</span>
              <h3 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                Abandon Job
              </h3>
            </div>
            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-[#ababa8] mb-4 text-center">
                Are you sure you want to mark <br/>
                <strong className="text-[#faf9f5] mt-2 block">{jobToAbandon.title}</strong><br/>
                as Abandoned?
              </p>
              <p className="text-[11px] text-[#ff7351] font-semibold bg-[#ff7351]/10 p-3 rounded-lg border border-[#ff7351]/20 text-center leading-relaxed">
                This action will cross out the line and subtract its value from the total sold this month.
              </p>

              {/* Actions */}
              <div className="flex gap-3 pt-6">
                <button
                  onClick={() => setJobToAbandon(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1e201e] text-[#ababa8] text-xs font-bold hover:bg-[#242624] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAbandonJob}
                  className="flex-1 py-2.5 rounded-xl bg-[#ff7351] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-[#e05b3d]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── KPI Card Sub-Component ─────────────────────────────────────────────────
function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
  trend,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
  trend?: { dir: "up" | "down"; val: string };
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: "rgba(36,38,36,0.4)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}15` }}
      >
        <span className="material-symbols-outlined text-[22px]" translate="no" style={{ color }}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-black leading-tight" style={{ color, fontFamily: "Manrope, system-ui, sans-serif" }}>
          {value}
        </p>
        <p className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold mt-0.5">{label}</p>
        <p className="text-[10px] text-[#ababa8] mt-0.5">{sub}</p>
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          <span
            className="material-symbols-outlined text-xs"
            translate="no"
            style={{ color: trend.dir === "up" ? "#aeee2a" : "#ff7351" }}
          >
            {trend.dir === "up" ? "trending_up" : "trending_down"}
          </span>
          <span className="text-[10px] font-bold" style={{ color: trend.dir === "up" ? "#aeee2a" : "#ff7351" }}>
            {trend.val}
          </span>
        </div>
      )}
    </div>
  );
}
