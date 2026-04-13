"use client";

import { TopBar } from "../../../components/TopBar";

// =============================================
// Pending Issues & Blockers
// Ported from Stitch HTML (Bloqueadores de problemas pendentes.txt)
// Rota: /issues
// =============================================

interface Issue {
  id: string;
  title: string;
  subtitle: string;
  project: string;
  status: { label: string; style: string };
  priority: { label: string; dotColor: string };
  assignee: { initials: string; name: string };
  dueDate: string;
  dueDateStyle?: string;
  activity: { heights: string[]; colors: string[] }[];
  activityOpacity?: string;
}

const issues: Issue[] = [
  {
    id: "#8972",
    title: "Permit Delay - Level 24",
    subtitle: "Zoning regulation dispute",
    project: "Axiom Tower Site A",
    status: { label: "Blocked", style: "bg-[#b92902] text-[#ffd2c8]" },
    priority: { label: "High", dotColor: "#ff7351" },
    assignee: { initials: "EH", name: "Elena Hart" },
    dueDate: "Oct 12, 2023",
    activity: [{ heights: ["3", "5", "2", "4", "6"], colors: ["#aeee2a", "#aeee2a", "#474846", "#aeee2a", "#aeee2a"] }],
  },
  {
    id: "#8969",
    title: "Structural Steel Shortage",
    subtitle: "Supply chain logistics failure",
    project: "Axiom Tower Site B",
    status: { label: "Blocked", style: "bg-[#b92902] text-[#ffd2c8]" },
    priority: { label: "High", dotColor: "#ff7351" },
    assignee: { initials: "DW", name: "David Wu" },
    dueDate: "Oct 15, 2023",
    activity: [{ heights: ["2", "3", "4", "2", "1"], colors: ["#aeee2a", "#aeee2a", "#aeee2a", "#aeee2a", "#aeee2a"] }],
  },
  {
    id: "#8978",
    title: "HVAC Routing Conflict",
    subtitle: "Mechanical/Electrical overlay issue",
    project: "Axiom Tower Site A",
    status: { label: "Open", style: "bg-[#aeee2a]/20 text-[#aeee2a]" },
    priority: { label: "Medium", dotColor: "#e3eb5d" },
    assignee: { initials: "MK", name: "Maya Khan" },
    dueDate: "Oct 20, 2023",
    activity: [{ heights: ["4", "5", "6", "5", "4"], colors: ["#aeee2a", "#aeee2a", "#aeee2a", "#aeee2a", "#aeee2a"] }],
  },
  {
    id: "#8955",
    title: "Exterior Cladding Finish",
    subtitle: "Final color verification pending",
    project: "Axiom Tower Site C",
    status: { label: "Resolved", style: "bg-[#242624] text-[#ababa8]" },
    priority: { label: "Low", dotColor: "#747673" },
    assignee: { initials: "TR", name: "Tom Rivers" },
    dueDate: "Oct 05, 2023",
    dueDateStyle: "line-through text-[#ababa8]",
    activity: [{ heights: ["2", "2", "2", "2", "2"], colors: ["#aeee2a", "#aeee2a", "#aeee2a", "#aeee2a", "#aeee2a"] }],
    activityOpacity: "opacity-20",
  },
];

// Heights in px from original (h-3=12, h-5=20, h-2=8, h-4=16, h-6=24)
const activityBars: Record<string, number> = { "1": 4, "2": 8, "3": 12, "4": 16, "5": 20, "6": 24 };

const issueActivity: { heights: number[]; dimIdx: number }[] = [
  { heights: [12, 20, 8, 16, 24], dimIdx: 2 },
  { heights: [8, 12, 16, 8, 4], dimIdx: 4 },
  { heights: [16, 20, 24, 20, 16], dimIdx: -1 },
  { heights: [8, 8, 8, 8, 8], dimIdx: -1 },
];

const chartBars = [
  { pct: 40, val: "12" },
  { pct: 60, val: "18" },
  { pct: 85, val: "25" },
  { pct: 100, val: "31", active: true },
  { pct: 70, val: "21" },
  { pct: 45, val: "14" },
  { pct: 30, val: "9" },
];

export default function IssuesPage() {
  return (
    <>
      <TopBar
        title="Pending Issues & Blockers"
        leftSlot={
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#ababa8]"
              translate="no"
            >
              search
            </span>
            <input
              className="bg-[#121412] border-none rounded-full pl-10 pr-4 py-2 text-sm text-[#faf9f5] w-80 focus:ring-1 focus:ring-[#aeee2a]/30 outline-none placeholder:text-[#ababa8]/50"
              placeholder="Search blockers, permits, or team members..."
              type="text"
            />
          </div>
        }
      />

      {/* Content Canvas */}
      <div className="p-8 space-y-8 min-h-screen">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2
              className="text-3xl font-extrabold text-[#faf9f5] tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Pending Issues & Blockers
            </h2>
            <p className="text-[#ababa8] mt-2 text-sm">
              Managing{" "}
              <span className="text-[#aeee2a] font-bold">41 critical active issues</span>{" "}
              across Axiom Tower
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 bg-[#1e201e] hover:bg-[#242624] text-[#faf9f5] font-semibold rounded-xl flex items-center gap-2 transition-all">
              <span className="material-symbols-outlined text-sm" translate="no">download</span>
              Export
            </button>
            <button className="px-5 py-2.5 bg-[#aeee2a] text-[#3a5400] font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-[#aeee2a]/10 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-sm" translate="no">add</span>
              New Issue
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Status */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest px-1">
              Status
            </label>
            <div className="flex bg-[#121412] p-1 rounded-full w-fit">
              <button className="px-6 py-1.5 rounded-full text-xs font-bold bg-[#aeee2a] text-[#3a5400] transition-all">
                All
              </button>
              <button className="px-6 py-1.5 rounded-full text-xs font-medium text-[#ababa8] hover:text-[#faf9f5] transition-all">
                Open
              </button>
              <button className="px-6 py-1.5 rounded-full text-xs font-medium text-[#ababa8] hover:text-[#faf9f5] transition-all">
                Blocked
              </button>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest px-1">
              Priority
            </label>
            <div className="flex bg-[#121412] p-1 rounded-full w-fit">
              <button className="px-5 py-1.5 rounded-full text-xs font-medium text-[#faf9f5] transition-all hover:bg-[#1e201e]">
                High
              </button>
              <button className="px-5 py-1.5 rounded-full text-xs font-medium text-[#ababa8] hover:text-[#faf9f5] transition-all">
                Medium
              </button>
              <button className="px-5 py-1.5 rounded-full text-xs font-medium text-[#ababa8] hover:text-[#faf9f5] transition-all">
                Low
              </button>
            </div>
          </div>

          {/* Issue Type */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest px-1">
              Issue Type
            </label>
            <div className="flex bg-[#121412] p-1 rounded-full overflow-x-auto w-fit">
              {["Permit", "Financing", "Weather", "Material", "Labor"].map((t) => (
                <button
                  key={t}
                  className="px-4 py-1.5 rounded-full text-xs font-medium text-[#ababa8] whitespace-nowrap hover:text-[#faf9f5] transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#121412] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e201e]/50">
                {["ID", "Title", "Project", "Status", "Priority", "Assigned To", "Due Date", "Activity"].map(
                  (col, i) => (
                    <th
                      key={col}
                      className={`px-6 py-4 text-[10px] font-bold text-[#ababa8] uppercase tracking-widest ${
                        i === 6 ? "text-right" : i === 7 ? "text-center" : ""
                      }`}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#474846]/10">
              {issues.map((issue, idx) => (
                <tr
                  key={issue.id}
                  className="group hover:bg-[#242624]/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-5 text-sm font-mono text-[#ababa8]">{issue.id}</td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-[#faf9f5] font-semibold text-sm">{issue.title}</span>
                      <span className="text-xs text-[#ababa8]">{issue.subtitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm text-[#faf9f5]">{issue.project}</td>
                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tight ${issue.status.style}`}
                    >
                      {issue.status.label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: issue.priority.dotColor }}
                      />
                      <span className="text-xs font-bold text-[#faf9f5]">{issue.priority.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#242624] flex items-center justify-center text-[10px] font-bold border border-[#474846] text-[#faf9f5]">
                        {issue.assignee.initials}
                      </div>
                      <span className="text-xs text-[#faf9f5]">{issue.assignee.name}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-5 text-right text-xs font-bold ${issue.dueDateStyle ?? "text-[#faf9f5]"}`}>
                    {issue.dueDate}
                  </td>
                  {/* Activity sparkline */}
                  <td className="px-6 py-5">
                    <div className={`flex items-center justify-center gap-[3px] ${issue.activityOpacity ?? ""}`}>
                      {issueActivity[idx].heights.map((h, bi) => (
                        <div
                          key={bi}
                          className="w-1 rounded-full"
                          style={{
                            height: `${h}px`,
                            backgroundColor:
                              bi === issueActivity[idx].dimIdx ? "#474846" : "#aeee2a",
                          }}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="px-8 py-6 border-t border-[#474846]/10 flex items-center justify-between text-[11px] font-bold tracking-widest uppercase text-[#ababa8]">
            <div className="flex items-center gap-4">
              <span className="cursor-pointer hover:text-[#aeee2a] transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-sm" translate="no">swap_vert</span>
                Table Sorting
              </span>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <button className="opacity-30 cursor-not-allowed">
                  <span className="material-symbols-outlined text-base" translate="no">chevron_left</span>
                </button>
                <span className="text-[#faf9f5]">
                  <span className="text-[#aeee2a]">1-10</span> of 41
                </span>
                <button className="hover:text-[#aeee2a] transition-colors">
                  <span className="material-symbols-outlined text-base" translate="no">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Layout: Chart + Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">

          {/* Blocker Timeline Chart */}
          <div className="lg:col-span-2 space-y-6">
            <h3
              className="text-lg font-bold text-[#faf9f5]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Blocker Timeline Analysis
            </h3>
            <div
              className="h-64 rounded-2xl flex items-end justify-between p-8 gap-2"
              style={{
                background: "rgba(36,38,36,0.4)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {chartBars.map((bar) => (
                <div
                  key={bar.val}
                  className="relative group transition-all rounded-t-lg w-full"
                  style={{
                    height: `${bar.pct}%`,
                    backgroundColor: bar.active ? "#aeee2a" : "rgba(174,238,42,0.2)",
                  }}
                >
                  <div
                    className={`absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold transition-opacity ${
                      bar.active ? "opacity-100 text-[#aeee2a]" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {bar.val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Site Location Map */}
          <div className="space-y-6">
            <h3
              className="text-lg font-bold text-[#faf9f5]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Site Location
            </h3>
            <div className="h-64 rounded-2xl overflow-hidden relative group border border-[#474846]/20">
              <img
                alt="Job Site Map"
                className="w-full h-full object-cover grayscale brightness-50 group-hover:scale-110 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcGQVEGilaGIU5ku5Y1Vz3nE7uqEbNUHfaLMHWs5uzw0I1pX6Jo2XJ-T704RKwTKu-kZhTPwgBwNZYZW7yLPqNQrSo6f3QI6z4GjNAGhBRNwdXZwI63doFNDVtiDSGcAgWr5QwI4HO_ZO-jxMtpo4JcmybtGhSA-N39HD3e6pgUlcFkTpM-zgbwAvP7D8oKHVZ-QuMNVbYi5fX8jdcV6a_PPR-TdGD7_V7kWGLZp9NDa0b3dOUd3Lrp9UcuIshB2jSr6M5PeFb3KM"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f0d] via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#aeee2a] flex items-center justify-center text-[#3a5400] shadow-lg shadow-[#aeee2a]/20">
                  <span className="material-symbols-outlined" translate="no">location_on</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#faf9f5]">Axiom Tower Site A</p>
                  <p className="text-[10px] text-[#aeee2a]">Sector 7-G | North Grid</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
