"use client";

import { useState } from "react";

import { TopBar } from "../../../components/TopBar";

// =============================================
// Sales Dashboard / Reports
// Criado do zero seguindo o MVP spec:
// Módulo 10 — Sales Dashboard
// Rota: /reports
// =============================================

// ---- Data -----------------------------------------------------------
const kpis = [
  {
    label: "Sales Goal",
    value: "$280,000",
    sub: "Monthly target",
    icon: "flag",
    color: "#aeee2a",
    bg: "rgba(174,238,42,0.08)",
    trend: null,
  },
  {
    label: "Sold So Far",
    value: "$214,500",
    sub: "76.6% of goal",
    icon: "attach_money",
    color: "#aeee2a",
    bg: "rgba(174,238,42,0.08)",
    trend: { dir: "up", val: "+12% vs last month" },
  },
  {
    label: "Remaining to Goal",
    value: "$65,500",
    sub: "18 days left",
    icon: "trending_up",
    color: "#ff7351",
    bg: "rgba(255,115,81,0.08)",
    trend: null,
  },
  {
    label: "Total Jobs Sold",
    value: "38",
    sub: "This month",
    icon: "work",
    color: "#aeee2a",
    bg: "rgba(174,238,42,0.08)",
    trend: { dir: "up", val: "+4 vs last month" },
  },
  {
    label: "Average Ticket",
    value: "$5,645",
    sub: "Per job",
    icon: "receipt_long",
    color: "#e3eb5d",
    bg: "rgba(227,235,93,0.08)",
    trend: { dir: "up", val: "+8% vs last month" },
  },
];

const salespeople = [
  { name: "Jordan Miles",    initials: "JM", jobs: 12, total: "$67,200", pct: 90, trend: "up" },
  { name: "Sofia Reyes",     initials: "SR", jobs: 9,  total: "$54,300", pct: 72, trend: "up" },
  { name: "Derek Holt",      initials: "DH", jobs: 8,  total: "$46,800", pct: 63, trend: "down" },
  { name: "Amara Osei",      initials: "AO", jobs: 6,  total: "$31,200", pct: 42, trend: "up" },
  { name: "Chris Vega",      initials: "CV", jobs: 3,  total: "$15,000", pct: 20, trend: "down" },
];

// Chart Data — Multi-line by salesperson
const lineChartData = [
  { label: "W38", JM: { c: 15, n: 5, l: 2 }, SR: { c: 10, n: 3, l: 1 }, DH: { c: 5, n: 2, l: 0 }, AO: { c: 8, n: 1, l: 3 }, CV: { c: 3, n: 4, l: 1 } },
  { label: "W39", JM: { c: 18, n: 6, l: 1 }, SR: { c: 12, n: 4, l: 0 }, DH: { c: 8, n: 3, l: 1 }, AO: { c: 10, n: 2, l: 4 }, CV: { c: 5, n: 3, l: 2 } },
  { label: "W40", JM: { c: 14, n: 4, l: 3 }, SR: { c: 15, n: 5, l: 2 }, DH: { c: 10, n: 4, l: 1 }, AO: { c: 12, n: 3, l: 2 }, CV: { c: 6, n: 2, l: 1 } },
  { label: "W41", JM: { c: 22, n: 8, l: 2 }, SR: { c: 18, n: 6, l: 1 }, DH: { c: 12, n: 5, l: 2 }, AO: { c: 15, n: 4, l: 1 }, CV: { c: 8, n: 4, l: 3 } },
  { label: "W42", JM: { c: 20, n: 7, l: 1 }, SR: { c: 16, n: 5, l: 3 }, DH: { c: 15, n: 6, l: 1 }, AO: { c: 14, n: 3, l: 2 }, CV: { c: 10, n: 5, l: 2 } },
  { label: "W43", JM: { c: 25, n: 9, l: 0 }, SR: { c: 22, n: 7, l: 1 }, DH: { c: 18, n: 5, l: 2 }, AO: { c: 16, n: 4, l: 1 }, CV: { c: 12, n: 6, l: 1 } }, // Current
  { label: "W44", JM: { c: 12, n: 15, l: 0 }, SR: { c: 10, n: 12, l: 0 }, DH: { c: 8, n: 8, l: 0 }, AO: { c: 6, n: 10, l: 0 }, CV: { c: 5, n: 6, l: 0 } },
  { label: "W45", JM: { c: 5, n: 20, l: 0 }, SR: { c: 4, n: 15, l: 0 }, DH: { c: 3, n: 12, l: 0 }, AO: { c: 2, n: 8, l: 0 }, CV: { c: 2, n: 10, l: 0 } },
];

const spMeta = {
  JM: { name: "Jordan Miles", color: "#aeee2a" },
  SR: { name: "Sofia Reyes", color: "#e3eb5d" },
  DH: { name: "Derek Holt", color: "#faf9f5" },
  AO: { name: "Amara Osei", color: "#ababa8" },
  CV: { name: "Chris Vega", color: "#ff7351" },
};

type SpId = keyof typeof spMeta;
const spIds = Object.keys(spMeta) as SpId[];

// Weekly summary copy
const weeklySummary = `📊 Weekly Sales Update – Siding Depot

Week of Oct 23–29, 2023

✅ Total Sold: $53,100
✅ Jobs Closed: 9
✅ Avg Ticket: $5,900

🏆 Top Performer: Jordan Miles ($19,200)

📈 We're at 76.6% of our monthly goal.
💪 $65,500 remaining — let's finish strong!

– Siding Depot HQ`;

export default function ReportsPage() {
  const [hoveredPoint, setHoveredPoint] = useState<{ spId: SpId, weekIdx: number, weekLabel: string, x: number, y: number } | null>(null);

  return (
    <>
      <TopBar title="Reports" />

      <div className="p-8 space-y-10 min-h-screen pb-16">

        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-extrabold text-[#faf9f5] tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Sales Dashboard
            </h1>
            <p className="text-[#ababa8] text-sm mt-1">Commercial performance overview for Siding Depot</p>
          </div>
          {/* Period filter */}
          <div className="flex items-center gap-3">
            <div className="flex bg-[#121412] p-1 rounded-xl">
              {["Week", "Month", "Quarter", "Year"].map((p, i) => (
                <button
                  key={p}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    i === 1
                      ? "bg-[#242624] text-[#aeee2a]"
                      : "text-[#ababa8] hover:text-[#faf9f5]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-2xl p-5 flex flex-col gap-3"
              style={{
                background: "rgba(36,38,36,0.4)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: kpi.bg }}
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  translate="no"
                  style={{ color: kpi.color }}
                >
                  {kpi.icon}
                </span>
              </div>
              {/* Value */}
              <div>
                <p
                  className="text-2xl font-black leading-tight"
                  style={{ color: kpi.color, fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  {kpi.value}
                </p>
                <p className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold mt-0.5">
                  {kpi.label}
                </p>
                <p className="text-[10px] text-[#ababa8] mt-0.5">{kpi.sub}</p>
              </div>
              {/* Trend */}
              {kpi.trend && (
                <div className="flex items-center gap-1">
                  <span
                    className="material-symbols-outlined text-xs"
                    translate="no"
                    style={{ color: kpi.trend.dir === "up" ? "#aeee2a" : "#ff7351" }}
                  >
                    {kpi.trend.dir === "up" ? "trending_up" : "trending_down"}
                  </span>
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: kpi.trend.dir === "up" ? "#aeee2a" : "#ff7351" }}
                  >
                    {kpi.trend.val}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Chart + Summary ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Multi-line Sales Chart */}
          <div
            className="lg:col-span-2 rounded-2xl p-6"
            style={{
              background: "rgba(36,38,36,0.4)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg font-bold text-[#faf9f5]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Performance Timeline by Salesperson
              </h3>
              <span className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">
                Last 8 weeks
              </span>
            </div>

            {/* Custom Grouped Bar Chart */}
            <div className="relative w-full h-56 mt-8 flex items-end justify-between gap-1 md:gap-3" onMouseLeave={() => setHoveredPoint(null)}>
              
              {/* Grid lines */}
              <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none pb-6 z-0">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-full h-px border-t border-dashed border-[#474846]/40" />
                ))}
              </div>

              {lineChartData.map((d, wIdx) => {
                const isHoveredWeek = hoveredPoint?.weekIdx === wIdx;
                const isFirst = wIdx === 0;
                const isLast = wIdx === lineChartData.length - 1;

                return (
                  <div key={d.label} className="relative flex flex-col items-center flex-1 h-full justify-end z-10 w-full group">
                    
                    {/* Tooltip Card (Render ONLY if this is the hovered week) */}
                    {isHoveredWeek && hoveredPoint && (
                      <div className={`absolute z-30 bottom-full mb-2 pointer-events-none transition-all duration-200 ${isFirst ? "left-0" : isLast ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
                        <div className="bg-[#0d0f0d]/90 backdrop-blur-xl border border-[#474846] rounded-xl p-3 min-w-[160px] shadow-[0_8px_30px_rgb(0,0,0,0.8)]">
                          <div className="text-[10px] text-[#ababa8] font-bold uppercase tracking-wider mb-2 border-b border-white/10 pb-1">
                            {hoveredPoint.weekLabel} · <span style={{ color: spMeta[hoveredPoint.spId].color }}>{spMeta[hoveredPoint.spId].name}</span>
                          </div>

                          <div className="space-y-1.5">
                            {/* Fechadas */}
                            <div className="flex justify-between items-center bg-[#242624]/60 p-1.5 rounded border border-[#aeee2a]/20">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#aeee2a]"></span>
                                <span className="text-[10px] text-[#faf9f5]">Fechadas</span>
                              </div>
                              <span className="text-[11px] font-bold text-[#aeee2a]">
                                ${((lineChartData[hoveredPoint.weekIdx][hoveredPoint.spId as keyof typeof d] as {c:number}).c)}k
                              </span>
                            </div>
                            
                            {/* Em negociação */}
                            <div className="flex justify-between items-center bg-[#242624]/40 p-1.5 rounded border border-[#e3eb5d]/10">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#e3eb5d]"></span>
                                <span className="text-[10px] text-[#ababa8]">Em Negociação</span>
                              </div>
                              <span className="text-[11px] font-bold text-[#e3eb5d]">
                                ${((lineChartData[hoveredPoint.weekIdx][hoveredPoint.spId as keyof typeof d] as {n:number}).n)}k
                              </span>
                            </div>

                            {/* Não fechadas / Lost */}
                            <div className="flex justify-between items-center bg-[#242624]/40 p-1.5 rounded border border-[#ff7351]/10">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff7351]"></span>
                                <span className="text-[10px] text-[#ababa8]">Não Fechadas</span>
                              </div>
                              <span className="text-[11px] font-bold text-[#ff7351]">
                                ${((lineChartData[hoveredPoint.weekIdx][hoveredPoint.spId as keyof typeof d] as {l:number}).l)}k
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5 Grouped Bars for the week */}
                    <div className="flex items-end justify-center w-full h-full pb-6 gap-px md:gap-0.5">
                      {spIds.map(spId => {
                        const valObj = d[spId as keyof typeof d] as { c: number };
                        const hPct = (valObj.c / 30) * 100;
                        const minH = Math.max(hPct, 2); // min height 2%
                        const isHovered = hoveredPoint?.spId === spId && hoveredPoint?.weekIdx === wIdx;

                        return (
                          <div
                            key={spId}
                            className="w-full max-w-[10px] rounded-t-sm transition-all cursor-pointer hover:-translate-y-1 relative"
                            style={{
                              height: `${minH}%`,
                              backgroundColor: spMeta[spId].color,
                              opacity: hoveredPoint ? (isHovered ? 1 : 0.2) : 0.9,
                              boxShadow: isHovered ? `0 0 16px ${spMeta[spId].color}A0` : 'none',
                              zIndex: isHovered ? 20 : 10
                            }}
                            onMouseEnter={() => setHoveredPoint({ spId, weekIdx: wIdx, weekLabel: d.label, x: 0, y: 0 })}
                          />
                        );
                      })}
                    </div>
                    {/* X-Label */}
                    <span className="absolute bottom-0 text-[8px] text-[#ababa8] font-bold uppercase">{d.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-8 flex items-center gap-4 flex-wrap">
              {spIds.map(spId => (
                <div key={spId} className="flex items-center gap-1.5 cursor-pointer group" onMouseEnter={() => setHoveredPoint({spId, weekIdx: 5, weekLabel: "W43", x: 0, y: 0})} onMouseLeave={() => setHoveredPoint(null)}>
                  <span className="w-3 h-3 rounded-sm transition-transform group-hover:scale-110" style={{ background: spMeta[spId].color }} />
                  <span className="text-[10px] text-[#ababa8] uppercase font-bold group-hover:text-[#faf9f5] transition-colors">
                    {spMeta[spId].name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Goal Progress */}
          <div
            className="rounded-2xl p-6 flex flex-col gap-6"
            style={{
              background: "rgba(36,38,36,0.4)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <h3
              className="text-lg font-bold text-[#faf9f5]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Monthly Goal
            </h3>

            {/* Circular progress—SVG */}
            <div className="flex flex-col items-center justify-center flex-1">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#242624" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="42"
                    fill="none"
                    stroke="#aeee2a"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - 0.766)}`}
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-3xl font-black text-[#aeee2a]"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    76.6%
                  </span>
                  <span className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">of goal</span>
                </div>
              </div>
            </div>

            {/* Mini stats */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[#ababa8]">Sold</span>
                <span className="text-[#aeee2a] font-bold">$214,500</span>
              </div>
              <div className="w-full bg-[#242624] rounded-full h-1.5">
                <div className="bg-[#aeee2a] h-1.5 rounded-full" style={{ width: "76.6%" }} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#ababa8]">Remaining</span>
                <span className="text-[#ff7351] font-bold">$65,500</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Salesperson Table + Weekly Message ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Salesperson Table */}
          <div
            className="lg:col-span-2 rounded-2xl overflow-hidden"
            style={{
              background: "#121412",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <h3
                className="text-lg font-bold text-[#faf9f5]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Performance by Salesperson
              </h3>
              <span className="text-[10px] text-[#ababa8] uppercase tracking-widest font-bold">Oct 2023</span>
            </div>

            {/* Table */}
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#1e201e]/50">
                  {["Salesperson", "Jobs", "Revenue", "vs Goal", "Trend"].map((col, i) => (
                    <th
                      key={col}
                      className={`px-6 py-3 text-[10px] font-bold text-[#ababa8] uppercase tracking-widest ${
                        i >= 2 ? "text-right" : ""
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {salespeople.map((sp) => (
                  <tr key={sp.name} className="hover:bg-[#1e201e]/40 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#242624] border border-[#474846] flex items-center justify-center text-[11px] font-black text-[#aeee2a]">
                          {sp.initials}
                        </div>
                        <span className="text-sm font-semibold text-[#faf9f5]">{sp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#faf9f5] font-bold">{sp.jobs}</td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className="text-sm font-black"
                        style={{ fontFamily: "Manrope, system-ui, sans-serif", color: "#aeee2a" }}
                      >
                        {sp.total}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-[#242624] rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${sp.pct}%`,
                              backgroundColor: sp.pct >= 70 ? "#aeee2a" : sp.pct >= 40 ? "#e3eb5d" : "#ff7351",
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[#ababa8] w-7 text-right">{sp.pct}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className="material-symbols-outlined text-base"
                        translate="no"
                        style={{ color: sp.trend === "up" ? "#aeee2a" : "#ff7351" }}
                      >
                        {sp.trend === "up" ? "trending_up" : "trending_down"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <h3
                className="text-base font-bold text-[#faf9f5]"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Weekly Summary
              </h3>
            </div>
            <p className="text-[11px] text-[#ababa8]">Ready-to-copy message for your team</p>

            {/* Message box */}
            <div
              className="flex-1 rounded-xl p-4 text-[11px] text-[#faf9f5]/80 leading-relaxed whitespace-pre-line font-mono"
              style={{
                background: "rgba(13,15,13,0.6)",
                border: "1px solid rgba(71,72,70,0.3)",
                minHeight: "200px",
              }}
            >
              {weeklySummary}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#aeee2a] text-[#3a5400] text-xs font-bold hover:brightness-110 transition-all active:scale-95">
                <span className="material-symbols-outlined text-sm" translate="no">content_copy</span>
                Copy Message
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#242624] text-[#ababa8] text-xs font-bold hover:text-[#faf9f5] transition-all">
                <span className="material-symbols-outlined text-sm" translate="no">refresh</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
