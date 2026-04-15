"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "../../../components/TopBar";
import { supabase } from "../../../lib/supabase";

// =============================================
// Sales Dashboard — Tarefa 2.2
// Conectado ao Supabase: sales_snapshots + sales_goals + salespersons + jobs
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

interface DashboardData {
  totalGoal: number;
  totalSold: number;
  totalJobs: number;
  averageTicket: number;
  salespeople: SalespersonStats[];
  period: { start: string; end: string; label: string };
}

// ── Color Map (Obsidian spec) ──────────────────────────────────────────────
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
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

// ── Period helpers ─────────────────────────────────────────────────────────
type PeriodKey = "Week" | "Month" | "Quarter" | "Semester" | "Year";

/** Retorna { start, end, label } para cada período */
function getPeriodDates(p: PeriodKey): { start: string; end: string; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  if (p === "Week") {
    const d = now.getDay(); // 0=Sunday
    const diff = (d === 0 ? -6 : 1) - d; // Monday
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      start: mon.toISOString().slice(0, 10),
      end:   sun.toISOString().slice(0, 10),
      label: `Week of ${mon.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    };
  }
  if (p === "Month") {
    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end:   end.toISOString().slice(0, 10),
      label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }
  if (p === "Quarter") {
    const qStart = Math.floor(m / 3) * 3;
    const start  = new Date(y, qStart, 1);
    const end    = new Date(y, qStart + 3, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end:   end.toISOString().slice(0, 10),
      label: `Q${Math.floor(qStart / 3) + 1} ${y}`,
    };
  }
  if (p === "Semester") {
    const half  = m < 6 ? 0 : 1;
    const start = new Date(y, half * 6, 1);
    const end   = new Date(y, half * 6 + 6, 0);
    return {
      start: start.toISOString().slice(0, 10),
      end:   end.toISOString().slice(0, 10),
      label: `H${half + 1} ${y}`,
    };
  }
  // Year
  return {
    start: `${y}-01-01`,
    end:   `${y}-12-31`,
    label: `Full Year ${y}`,
  };
}

/** Dado um período de meta e o período do dashboard, retorna a meta proporcional.
 *  Ex: meta mensal = 100k com período = Week → 100k / 4.33 ≈ 23k
 *  Isso permite que a meta seja definida em qualquer granularidade e comparada a qualquer período.
 */
function prorateMeta(goalPeriod: GoalPeriodKey, goalValue: number, dashPeriod: PeriodKey): number {
  // Converte tudo para "meses" como unidade base
  const toMonths: Record<string, number> = {
    week: 12 / 52,     // ≈ 0.231
    month: 1,
    quarter: 3,
    semester: 6,
    year: 12,
  };
  const goalMonths = toMonths[goalPeriod];
  const dashMonths = toMonths[dashPeriod.toLowerCase()];
  if (!goalMonths || !dashMonths) return goalValue;
  return (goalValue / goalMonths) * dashMonths;
}

type GoalPeriodKey = "week" | "month" | "quarter" | "semester" | "year";

/** Dado um period_start e period_end em YYYY-MM-DD, identifica automaticamente o tipo de período */
function classifyGoalPeriod(start: string, end: string): GoalPeriodKey {
  const s = new Date(start);
  const e = new Date(end);
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  if (days <=  8) return "week";
  if (days <=  35) return "month";
  if (days <= 100) return "quarter";
  if (days <= 190) return "semester";
  return "year";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

// ── Main Component ─────────────────────────────────────────────────────────

// Todos os 5 períodos de meta
type GoalState = { week: string; month: string; quarter: string; semester: string; year: string };
const EMPTY_GOAL: GoalState = { week: "", month: "", quarter: "", semester: "", year: "" };

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodKey>("Month");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hoveredSp, setHoveredSp] = useState<string | null>(null);

  // ── Goals Modal ──────────────────────────────────────────────────────────
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalsSaving,   setGoalsSaving]     = useState(false);
  const [companyGoal,   setCompanyGoal]     = useState<GoalState>({ ...EMPTY_GOAL });
  const [goalInputs,    setGoalInputs]      = useState<Record<string, GoalState>>({});

  // ─────────────────────────────────────────────────────────
  // Abre o modal e carrega as metas salvas (5 períodos)
  // ─────────────────────────────────────────────────────────
  const openGoalsModal = async () => {
    if (!data) return;

    // Inicializa inputs individuais
    const inputs: Record<string, GoalState> = {};
    data.salespeople.forEach((sp) => {
      inputs[sp.id] = { ...EMPTY_GOAL };
    });

    // Busca TODAS as metas salvas (empresa + individuais)
    const { data: allGoals } = await supabase
      .from("sales_goals")
      .select("salesperson_id, is_company_goal, target_value, period_start, period_end")
      .eq("goal_type", "revenue");

    const newCompany: GoalState = { ...EMPTY_GOAL };

    (allGoals || []).forEach((g: any) => {
      const periodType = classifyGoalPeriod(g.period_start, g.period_end);
      const val = String(g.target_value);

      if (g.is_company_goal) {
        newCompany[periodType] = val;
      } else if (g.salesperson_id && inputs[g.salesperson_id]) {
        inputs[g.salesperson_id][periodType] = val;
      }
    });

    setCompanyGoal(newCompany);
    setGoalInputs(inputs);
    setShowGoalsModal(true);
  };

  // ─────────────────────────────────────────────────────────
  // Salva metas (empresa e individuais) para todos os períodos
  // ─────────────────────────────────────────────────────────
  const saveGoals = async () => {
    if (!data) return;
    setGoalsSaving(true);
    try {
      const now = new Date();
      const y   = now.getFullYear();
      const m   = now.getMonth();

      // Calcula as datas dos 5 períodos uma única vez
      const periodRanges: Record<GoalPeriodKey, { start: string; end: string }> = {
        week: (() => {
          const d    = now.getDay();
          const diff = (d === 0 ? -6 : 1) - d;
          const mon  = new Date(now); mon.setDate(now.getDate() + diff);
          const sun  = new Date(mon); sun.setDate(mon.getDate() + 6);
          return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
        })(),
        month: {
          start: `${y}-${String(m + 1).padStart(2, "0")}-01`,
          end:   new Date(y, m + 1, 0).toISOString().slice(0, 10),
        },
        quarter: (() => {
          const qs = Math.floor(m / 3) * 3;
          return {
            start: `${y}-${String(qs + 1).padStart(2, "0")}-01`,
            end:   new Date(y, qs + 3, 0).toISOString().slice(0, 10),
          };
        })(),
        semester: (() => {
          const half = m < 6 ? 0 : 1;
          return {
            start: new Date(y, half * 6, 1).toISOString().slice(0, 10),
            end:   new Date(y, half * 6 + 6, 0).toISOString().slice(0, 10),
          };
        })(),
        year: { start: `${y}-01-01`, end: `${y}-12-31` },
      };

      /** Upsert genérico de uma meta */
      const upsertGoal = async (opts: {
        salesperson_id?: string;
        is_company_goal?: boolean;
        period_start: string;
        period_end: string;
        target_value: number;
        notes: string;
      }) => {
        const q = supabase
          .from("sales_goals")
          .select("id")
          .eq("goal_type", "revenue")
          .eq("period_start", opts.period_start)
          .eq("period_end", opts.period_end)
          .eq("is_company_goal", !!opts.is_company_goal);

        if (opts.salesperson_id) q.eq("salesperson_id", opts.salesperson_id);
        else q.is("salesperson_id", null);

        const { data: existing } = await q.maybeSingle();
        if (existing) {
          await supabase.from("sales_goals").update({ target_value: opts.target_value }).eq("id", existing.id);
        } else {
          await supabase.from("sales_goals").insert({
            salesperson_id:  opts.salesperson_id || null,
            is_company_goal: !!opts.is_company_goal,
            goal_type:       "revenue",
            period_start:    opts.period_start,
            period_end:      opts.period_end,
            target_value:    opts.target_value,
            notes:           opts.notes,
          });
        }
      };

      // Salva metas da empresa
      const PERIOD_LABELS: Record<GoalPeriodKey, string> = {
        week: "Weekly", month: "Monthly", quarter: "Quarterly",
        semester: "Semiannual", year: "Yearly",
      };

      for (const [pk, range] of Object.entries(periodRanges) as [GoalPeriodKey, { start: string; end: string }][]) {
        const val = parseFloat(companyGoal[pk]) || 0;
        if (val > 0) {
          await upsertGoal({
            is_company_goal: true,
            period_start: range.start,
            period_end:   range.end,
            target_value: val,
            notes: `Company ${PERIOD_LABELS[pk]} goal`,
          });
        }
      }

      // Salva metas individuais
      for (const sp of data.salespeople) {
        const input = goalInputs[sp.id];
        if (!input) continue;
        for (const [pk, range] of Object.entries(periodRanges) as [GoalPeriodKey, { start: string; end: string }][]) {
          const val = parseFloat(input[pk]) || 0;
          if (val > 0) {
            await upsertGoal({
              salesperson_id: sp.id,
              is_company_goal: false,
              period_start: range.start,
              period_end:   range.end,
              target_value: val,
              notes: `${PERIOD_LABELS[pk]} goal — ${sp.full_name}`,
            });
          }
        }
      }

      setShowGoalsModal(false);
      fetchData(period);
    } catch (e) {
      console.error("Error saving goals:", e);
    } finally {
      setGoalsSaving(false);
    }
  };

  // ── Data Fetcher ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (p: PeriodKey) => {
    setLoading(true);
    setError(null);
    try {
      const periodDates = getPeriodDates(p);

      // Get salespersons
      const { data: spData, error: spErr } = await supabase
        .from("salespersons")
        .select("id, full_name")
        .eq("active", true);
      if (spErr) throw spErr;

      if (!spData || spData.length === 0) {
        setData(null);
        setLoading(false);
        return;
      }

      // For month period: use snapshots (pre-aggregated, most accurate)
      // For quarter/year: aggregate from jobs directly
      let statsMap: Record<string, { jobs: number; revenue: number }> = {};

      // Aggregate from jobs for ALL periods (real-time, webhook-synced)
      const { data: jobsData, error: jobsErr } = await supabase
        .from("jobs")
        .select("salesperson_id, contract_amount, contract_signed_at, created_at")
        .in("status", ["active", "on_hold", "completed", "pending_scheduling", "draft"])
        .gt("contract_amount", 0);
      if (jobsErr) throw jobsErr;

      // Filter by period dates — use contract_signed_at or fallback to created_at
      (jobsData || []).forEach((j) => {
        if (!j.salesperson_id) return;
        const jobDate = j.contract_signed_at || j.created_at;
        if (!jobDate) return;
        const d = jobDate.slice(0, 10); // YYYY-MM-DD
        if (d < periodDates.start || d > periodDates.end) return;

        if (!statsMap[j.salesperson_id]) statsMap[j.salesperson_id] = { jobs: 0, revenue: 0 };
        statsMap[j.salesperson_id].jobs += 1;
        statsMap[j.salesperson_id].revenue += Number(j.contract_amount);
      });

      // ── Busca TODAS as metas salvas ──────────────────────────────────────
      const { data: allGoals } = await supabase
        .from("sales_goals")
        .select("salesperson_id, is_company_goal, target_value, period_start, period_end")
        .eq("goal_type", "revenue");

      /**
       * Prioridade para seleção de meta:
       * 1. Meta do MESMO período que o dashboard (exact match) → usa diretamente
       * 2. Qualquer outra meta → proratea para o período do dashboard
       * Se existir company goal, ela é o totalGoal. Senão, soma das individuais.
       */
      const dashPeriodKey = p.toLowerCase() as GoalPeriodKey;

      // Mapas: exact = meta do mesmo tipo | prorated = melhor prorata disponível
      const indivExact:    Record<string, number> = {};
      const indivProrated: Record<string, number> = {};
      let   companyExact    = 0;
      let   companyProrated = 0;

      (allGoals || []).forEach((g: any) => {
        const goalPeriod = classifyGoalPeriod(g.period_start, g.period_end);
        const isExact    = goalPeriod === dashPeriodKey;
        const prorated   = isExact
          ? Number(g.target_value)  // sem prorata: já é o período certo
          : prorateMeta(goalPeriod, Number(g.target_value), p);

        if (g.is_company_goal) {
          if (isExact) {
            companyExact = Number(g.target_value);
          } else {
            // Mantém o maior prorata entre as metas disponíveis
            companyProrated = Math.max(companyProrated, prorated);
          }
        } else if (g.salesperson_id) {
          if (isExact) {
            indivExact[g.salesperson_id] = Number(g.target_value);
          } else {
            indivProrated[g.salesperson_id] = Math.max(
              indivProrated[g.salesperson_id] || 0,
              prorated
            );
          }
        }
      });

      // Resolve: exact tem prioridade sobre prorated
      const companyGoalValue = companyExact > 0 ? companyExact : companyProrated;
      const indivGoalMap: Record<string, number> = {};
      [...Object.keys(indivExact), ...Object.keys(indivProrated)].forEach((id) => {
        indivGoalMap[id] = indivExact[id] ?? indivProrated[id] ?? 0;
      });

      // Build salesperson stats
      const salespeople: SalespersonStats[] = spData.map((sp, idx) => {
        const stats    = statsMap[sp.id] || { jobs: 0, revenue: 0 };
        const spGoal   = indivGoalMap[sp.id] || 0;
        const goalPct  = spGoal > 0 ? Math.min((stats.revenue / spGoal) * 100, 999) : 0;
        return {
          id:             sp.id,
          full_name:      sp.full_name,
          initials:       getInitials(sp.full_name),
          color:          getSpColor(sp.full_name, idx),
          jobs_sold_count: stats.jobs,
          total_revenue:  stats.revenue,
          monthly_goal:   spGoal,
          goal_pct:       goalPct,
        };
      });

      // Sort by revenue desc
      salespeople.sort((a, b) => b.total_revenue - a.total_revenue);

      const totalSold   = salespeople.reduce((s, sp) => s + sp.total_revenue, 0);
      const totalJobs   = salespeople.reduce((s, sp) => s + sp.jobs_sold_count, 0);
      const averageTicket = totalJobs > 0 ? totalSold / totalJobs : 0;

      // Se há company goal definida, usa ela. Senão, soma das individuais.
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
    fetchData(period);
  }, [period, fetchData]);

  // ── Weekly Summary Copy ─────────────────────────────────────────────────
  const weeklySummaryText = data
    ? `📊 *Weekly Sales Update – Siding Depot*

Week of ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${new Date().getFullYear()}

✅ *Total Sold:* ${fmt(data.totalSold)}
✅ *Jobs Closed:* ${data.totalJobs}
✅ *Avg Ticket:* ${fmt(data.averageTicket)}
${data.totalGoal > 0 ? `🎯 *Monthly Goal:* ${fmt(data.totalGoal)}\n📈 *Progress:* ${((data.totalSold / data.totalGoal) * 100).toFixed(1)}%` : ""}
${data.totalGoal > 0 && data.totalSold < data.totalGoal ? `💰 *Remaining:* ${fmt(data.totalGoal - data.totalSold)}` : ""}
${data.salespeople.length > 0 ? `\n🏆 *Top Performer:* ${data.salespeople[0].full_name} (${fmt(data.salespeople[0].total_revenue)})` : ""}
${data.totalGoal > 0 && data.totalSold >= data.totalGoal ? "\n🎉 Goal achieved! Amazing work team!" : `\n💪 Let's finish strong!`}

– Siding Depot HQ`
    : "";

  const handleCopy = () => {
    if (!weeklySummaryText) return;
    navigator.clipboard.writeText(weeklySummaryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Computed KPIs ───────────────────────────────────────────────────────
  const overallPct = data && data.totalGoal > 0 ? Math.min((data.totalSold / data.totalGoal) * 100, 100) : 0;
  const remaining = data ? Math.max(data.totalGoal - data.totalSold, 0) : 0;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - new Date().getDate();

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar title="Reports" />

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

          {/* Period Filter + Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={openGoalsModal}
              className="px-4 py-2 bg-[#1e201e] hover:bg-[#242624] text-[#faf9f5] font-semibold rounded-xl flex items-center gap-2 transition-all text-xs border border-white/5 hover:border-[#aeee2a]/20"
            >
              <span className="material-symbols-outlined text-sm text-[#aeee2a]" translate="no">flag</span>
              Set Goals
            </button>
            <div className="flex bg-[#0d0f0d] p-1 rounded-xl border border-white/5">
              {(["Week", "Month", "Quarter", "Semester", "Year"] as PeriodKey[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === p
                      ? "bg-[#242624] text-[#aeee2a] shadow-inner"
                      : "text-[#ababa8] hover:text-[#faf9f5]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchData(period)}
              title="Refresh"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1e201e] border border-white/5 text-[#ababa8] hover:text-[#aeee2a] transition-all hover:border-[#aeee2a]/20"
            >
              <span className="material-symbols-outlined text-base" translate="no">refresh</span>
            </button>
          </div>
        </div>

        {/* ── Error / Loading States ────────────────────────────────────── */}
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
              {/* Total Goal — label dinâmico conforme o período selecionado */}
              <KpiCard
                icon="flag"
                label={`${period} Goal`}
                value={fmt(data.totalGoal)}
                sub={data.period.label}
                color="#aeee2a"
              />
              {/* Sold So Far */}
              <KpiCard
                icon="attach_money"
                label="Sold So Far"
                value={fmt(data.totalSold)}
                sub={`${overallPct.toFixed(1)}% of goal`}
                color="#aeee2a"
                trend={overallPct >= 75 ? { dir: "up", val: "On track" } : overallPct >= 50 ? { dir: "up", val: "Making progress" } : { dir: "down", val: "Needs attention" }}
              />
              {/* Remaining */}
              <KpiCard
                icon="trending_up"
                label="Remaining"
                value={fmt(remaining)}
                sub={`${daysLeft} days left`}
                color={remaining === 0 ? "#aeee2a" : "#ff7351"}
              />
              {/* Total Jobs */}
              <KpiCard
                icon="work"
                label="Total Jobs"
                value={String(data.totalJobs)}
                sub="Closed this period"
                color="#aeee2a"
              />
            </div>

            {/* Average Ticket full-width */}
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: "rgba(36,38,36,0.4)",
                border: "1px solid rgba(174,238,42,0.08)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#e3eb5d]/10">
                  <span className="material-symbols-outlined text-[#e3eb5d] text-lg" translate="no">receipt_long</span>
                </div>
                <div>
                  <p className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">Average Ticket</p>
                  <p className="text-[#ababa8] text-xs mt-0.5">Per job sold this period</p>
                </div>
              </div>
              <p
                className="text-3xl font-black text-[#e3eb5d]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {fmt(data.averageTicket)}
              </p>
            </div>

            {/* ── Chart + Goal Progress ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Salesperson Bar Chart */}
              <div
                className="lg:col-span-2 rounded-2xl p-6"
                style={{
                  background: "rgba(36,38,36,0.4)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
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
                  {data.salespeople.map((sp, i) => {
                    // Bar shows progress vs individual goal (not vs max revenue)
                    const goalRef = sp.monthly_goal > 0 ? sp.monthly_goal : (data.salespeople[0]?.total_revenue || 1);
                    const barWidth = Math.min((sp.total_revenue / goalRef) * 100, 100);
                    const isHovered = hoveredSp === sp.id;

                    return (
                      <div
                        key={sp.id}
                        className="group cursor-pointer"
                        onMouseEnter={() => setHoveredSp(sp.id)}
                        onMouseLeave={() => setHoveredSp(null)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {/* Avatar */}
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-110"
                              style={{
                                background: `${sp.color}20`,
                                border: `1.5px solid ${sp.color}60`,
                                color: sp.color,
                              }}
                            >
                              {sp.initials}
                            </div>
                            <span className={`text-sm font-semibold transition-colors ${isHovered ? "text-[#faf9f5]" : "text-[#ababa8]"}`}>
                              {sp.full_name}
                            </span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{
                                background: `${sp.color}15`,
                                color: sp.color,
                              }}
                            >
                              {sp.jobs_sold_count} job{sp.jobs_sold_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-black"
                              style={{ color: sp.color, fontFamily: "Manrope, system-ui, sans-serif" }}
                            >
                              {fmt(sp.total_revenue)}
                            </span>
                            <span
                              className="text-[10px] text-[#ababa8] w-9 text-right"
                            >
                              {sp.goal_pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Bar track */}
                        <div className="relative w-full h-2 bg-[#242624] rounded-full overflow-hidden">
                          {/* Goal end marker (100% = goal achieved) */}
                          {sp.monthly_goal > 0 && (
                            <div
                              className="absolute top-0 bottom-0 w-px bg-white/20 z-10"
                              style={{ left: "100%" }}
                            />
                          )}
                          {/* Revenue bar */}
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${barWidth}%`,
                              background: `linear-gradient(90deg, ${sp.color}CC, ${sp.color})`,
                              boxShadow: isHovered ? `0 0 12px ${sp.color}60` : "none",
                            }}
                          />
                        </div>

                        {/* Tooltip on hover */}
                        {isHovered && sp.monthly_goal > 0 && (
                          <div className="mt-1.5 flex items-center gap-4 text-[10px] text-[#ababa8]">
                            <span>Goal: <span className="text-[#faf9f5] font-bold">{fmt(sp.monthly_goal)}</span></span>
                            <span>Remaining: <span style={{ color: sp.total_revenue >= sp.monthly_goal ? "#aeee2a" : "#ff7351" }} className="font-bold">{fmt(Math.max(sp.monthly_goal - sp.total_revenue, 0))}</span></span>
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
                style={{
                  background: "rgba(36,38,36,0.4)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
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
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke={overallPct >= 100 ? "#22c55e" : "#aeee2a"}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - overallPct / 100)}`}
                        style={{ transition: "stroke-dashoffset 1.2s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="text-3xl font-black"
                        style={{
                          color: overallPct >= 100 ? "#22c55e" : "#aeee2a",
                          fontFamily: "Manrope, system-ui, sans-serif",
                        }}
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
                      style={{
                        width: `${overallPct}%`,
                        background: "linear-gradient(90deg, #aeee2a, #22c55e)",
                      }}
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
                    <span className="text-[#ababa8] font-bold">{daysLeft}d</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Salesperson Table + Weekly Message ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Leaderboard Table */}
              <div
                className="lg:col-span-2 rounded-2xl overflow-hidden"
                style={{
                  background: "#121412",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                    Leaderboard
                  </h3>
                  <span className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">{data.period.label}</span>
                </div>

                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#1e201e]/50">
                      {["#", "Salesperson", "Jobs", "Revenue", "vs Goal"].map((col, i) => (
                        <th
                          key={col}
                          className={`px-5 py-3 text-[10px] font-bold text-[#ababa8] uppercase tracking-widest ${i === 2 ? "text-center" : i >= 3 ? "text-right" : ""}`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.salespeople.map((sp, i) => (
                      <tr
                        key={sp.id}
                        className="hover:bg-[#1e201e]/40 transition-colors cursor-pointer"
                        onMouseEnter={() => setHoveredSp(sp.id)}
                        onMouseLeave={() => setHoveredSp(null)}
                      >
                        {/* Rank */}
                        <td className="px-5 py-4 w-10">
                          {i === 0 ? (
                            <span className="text-base">🏆</span>
                          ) : (
                            <span className="text-sm font-bold text-[#474846]">#{i + 1}</span>
                          )}
                        </td>
                        {/* Name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black"
                              style={{
                                background: `${sp.color}15`,
                                border: `1.5px solid ${sp.color}40`,
                                color: sp.color,
                              }}
                            >
                              {sp.initials}
                            </div>
                            <span className="text-sm font-semibold text-[#faf9f5]">{sp.full_name}</span>
                          </div>
                        </td>
                        {/* Jobs */}
                        <td className="px-5 py-4 text-center text-sm text-[#faf9f5] font-bold">{sp.jobs_sold_count}</td>
                        {/* Revenue */}
                        <td className="px-5 py-4 text-right">
                          <span
                            className="text-sm font-black"
                            style={{ color: sp.color, fontFamily: "Manrope, system-ui, sans-serif" }}
                          >
                            {fmt(sp.total_revenue)}
                          </span>
                        </td>
                        {/* Goal % */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-[#242624] rounded-full h-1.5">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {data.salespeople.length === 0 && (
                  <div className="py-10 text-center text-[#ababa8] text-sm">
                    No sales data for this period.
                  </div>
                )}
              </div>

              {/* Weekly Summary Message */}
              <div
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  background: "rgba(36,38,36,0.4)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(174,238,42,0.08)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#aeee2a] text-lg" translate="no">
                      campaign
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                      Weekly Summary
                    </h3>
                    <p className="text-[10px] text-[#ababa8]">Ready-to-copy for WhatsApp / Email</p>
                  </div>
                </div>

                {/* Message box */}
                <div
                  className="flex-1 rounded-xl p-4 text-[11px] text-[#faf9f5]/80 leading-relaxed whitespace-pre-line font-mono"
                  style={{
                    background: "rgba(13,15,13,0.6)",
                    border: "1px solid rgba(71,72,70,0.3)",
                    minHeight: "220px",
                  }}
                >
                  {weeklySummaryText}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
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
                    onClick={() => fetchData(period)}
                    title="Refresh data"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#242624] text-[#ababa8] text-xs font-bold hover:text-[#faf9f5] transition-all hover:bg-[#2e302e]"
                  >
                    <span className="material-symbols-outlined text-sm" translate="no">refresh</span>
                  </button>
                </div>
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

      {/* ── Goals Modal ──────────────────────────────────────────────── */}
      {showGoalsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowGoalsModal(false)} />
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl space-y-0"
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
                  <h2 className="text-lg font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Set Sales Goals</h2>
                  <p className="text-[10px] text-[#ababa8] uppercase tracking-widest">Company & individual targets</p>
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
              {/* ── Company Goal (5 períodos) ─────────────────────────── */}
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{ background: "rgba(174,238,42,0.04)", border: "1px solid rgba(174,238,42,0.12)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#aeee2a] text-xl" translate="no">business</span>
                  <div>
                    <p className="text-sm font-black text-[#aeee2a] uppercase tracking-widest">Company Total Goal</p>
                    <p className="text-[10px] text-[#ababa8] mt-0.5">Define a meta por período — preencha apenas os que quiser usar</p>
                  </div>
                </div>

                {/* 5 inputs: Week / Month / Quarter / Semester / Year */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { key: "week",     label: "Weekly"     },
                    { key: "month",    label: "Monthly"    },
                    { key: "quarter",  label: "Quarterly"  },
                    { key: "semester", label: "Semiannual" },
                    { key: "year",     label: "Yearly"     },
                  ] as { key: GoalPeriodKey; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[9px] text-[#ababa8] uppercase tracking-widest font-bold">{label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aeee2a] text-xs font-bold">$</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={companyGoal[key]}
                          onChange={(e) => setCompanyGoal(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-full bg-[#0d0f0d] border border-[#aeee2a]/20 rounded-lg py-2.5 pl-7 pr-3 text-sm text-[#aeee2a] font-black placeholder-[#474846] focus:outline-none focus:border-[#aeee2a]/60 transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sugestão: soma dos individuais */}
                {(() => {
                  const autoMonth = data?.salespeople.reduce((sum, sp) => {
                    return sum + (parseFloat(goalInputs[sp.id]?.month || "0") || 0);
                  }, 0) || 0;
                  if (autoMonth > 0) return (
                    <p className="text-[10px] text-[#ababa8]">
                      📊 Soma das metas mensais individuais:{" "}
                      <span className="text-[#aeee2a] font-bold">${autoMonth.toLocaleString()}</span>
                      {" — "}
                      <button
                        type="button"
                        onClick={() => setCompanyGoal(prev => ({ ...prev, month: String(autoMonth) }))}
                        className="text-[#aeee2a] underline hover:opacity-70 transition-opacity"
                      >
                        Aplicar como Monthly
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

              {/* ── Individual Salesperson Rows ───────────────────────── */}
              <div className="space-y-3">
                {data?.salespeople.map((sp) => {
                  const input = goalInputs[sp.id];
                  if (!input) return null;

                  return (
                    <div
                      key={sp.id}
                      className="rounded-xl p-4 space-y-3"
                      style={{ background: "rgba(30,32,30,0.6)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black"
                          style={{ background: `${sp.color}20`, border: `1.5px solid ${sp.color}60`, color: sp.color }}
                        >
                          {sp.initials}
                        </div>
                        <span className="text-sm font-bold text-[#faf9f5]">{sp.full_name}</span>
                        {sp.monthly_goal > 0 && (
                          <span className="ml-auto text-[10px] text-[#ababa8]">Current: <span className="text-[#faf9f5] font-bold">${sp.monthly_goal.toLocaleString()}/mo</span></span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {([
                          { key: "week",     label: "Weekly"     },
                          { key: "month",    label: "Monthly"    },
                          { key: "quarter",  label: "Quarterly"  },
                          { key: "semester", label: "Semiannual" },
                          { key: "year",     label: "Yearly"     },
                        ] as { key: GoalPeriodKey; label: string }[]).map(({ key, label }) => (
                          <div key={key} className="space-y-1">
                            <label className="text-[9px] text-[#ababa8] uppercase tracking-widest font-bold">{label}</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ababa8] text-xs">$</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={input[key]}
                                onChange={(e) =>
                                  setGoalInputs((prev) => ({
                                    ...prev,
                                    [sp.id]: { ...prev[sp.id], [key]: e.target.value },
                                  }))
                                }
                                className="w-full bg-[#0d0f0d] border border-white/10 rounded-lg py-2 pl-7 pr-3 text-sm text-[#faf9f5] placeholder-[#474846] focus:outline-none focus:border-[#aeee2a]/40 transition-colors"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

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
                      Save All Goals
                    </>
                  )}
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
