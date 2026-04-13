"use client";

import Link from "next/link";
import { useState } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";

// =============================================
// Construction Jobs | Command Center
// Ported from Stitch HTML design
// Rota: /projects
// =============================================

const GATE_CONFIG: Record<string, { color: string, icon: string, title: string, desc: string }> = {
  NOT_CONTACTED: { color: "#ba1212", icon: "phone_disabled", title: "Action Required", desc: "Nick hasn't called the customer yet to schedule this project." },
  READY: { color: "#1f8742", icon: "check_circle", title: "Cleared for Dispatch", desc: "Project has been contacted and is fully ready to start." },
  WINDOWS: { color: "#165eb3", icon: "window", title: "Waiting on Windows", desc: "Production is blocked pending window delivery." },
  DOORS: { color: "#f09a1a", icon: "door_front", title: "Waiting on Doors", desc: "Production is blocked pending door delivery." },
  FINANCING: { color: "#ebd27a", icon: "account_balance", title: "Pending Financing", desc: "Waiting for funding approval before starting." },
  MATERIALS: { color: "#306870", icon: "inventory_2", title: "Material Shortage", desc: "Awaiting critical material delivery to site." },
  HOA: { color: "#9acbf0", icon: "gavel", title: "HOA Approval", desc: "Pending authorization from neighborhood committee." },
  OTHER_REPAIRS: { color: "#d1a3f0", icon: "carpenter", title: "Other Repairs First", desc: "Blocked by preliminary structural repairs needed." },
  NO_ANSWER: { color: "#f2a074", icon: "voicemail", title: "Customer Unreachable", desc: "Attempted contact but customer hasn't replied yet." },
  PERMIT: { color: "#747673", icon: "contract", title: "Pending Permit", desc: "Waiting on city or county permit clearance." }
};

const initialJobs = [
  {
    sp: "M",
    id: "#1402",
    client: "Modern Homes LLC",
    services: ["Renovation"],
    status: "Active",
    statusStyle: "bg-green-500/10 text-green-400 border border-green-500/20",
    gate: "READY",
  },
  {
    sp: "M",
    id: "#1399",
    client: "Modern Homes LLC",
    services: ["Renovation", "Windows"],
    status: "Planning",
    statusStyle: "bg-[#e3eb5d]/10 text-[#e3eb5d] border border-[#e3eb5d]/20",
    gate: "HOA",
  },
  {
    sp: "A",
    id: "#1398",
    client: "Apex Dev",
    services: ["Drywall", "Painting"],
    status: "Planning",
    statusStyle: "bg-[#e3eb5d]/10 text-[#e3eb5d] border border-[#e3eb5d]/20",
    gate: "NOT_CONTACTED",
  },
  {
    sp: "F",
    id: "#1397",
    client: "Zenith Group",
    services: ["Drywall", "Painting", "Insulation"],
    status: "Blocked",
    statusStyle: "bg-[#ff7351]/10 text-[#ff7351] border border-[#ff7351]/20",
    gate: "WINDOWS",
  },
  {
    sp: "R",
    id: "#1396",
    client: "Riverdale Co.",
    services: ["Electrical Wiring"],
    status: "Active",
    statusStyle: "bg-green-500/10 text-green-400 border border-green-500/20",
    gate: "READY",
  },
];

const filters = [
  { label: "Status", value: "All Statuses", icon: "expand_more" },
  { label: "Client", value: "Select Client", icon: "expand_more" },
  { label: "Services", value: "Architecture, Dev...", icon: "expand_more" },
  { label: "Blocked", value: "Show All", icon: "expand_more" },
  { label: "Date Range", value: "Last 30 Days", icon: "calendar_month" },
];

export default function ProjectsPage() {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; client: string } | null>(null);
  const [projectList, setProjectList] = useState(initialJobs);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const handleGateChange = (index: number, newGate: string) => {
    const newList = [...projectList];
    newList[index].gate = newGate;

    // Atualizar aba de status baseado no Operational Status:
    if (newGate === "READY") {
      newList[index].status = "Active";
      newList[index].statusStyle = "bg-green-500/10 text-green-400 border border-green-500/20";
    } else if (newGate === "NOT_CONTACTED") {
      newList[index].status = "Planning";
      newList[index].statusStyle = "bg-[#e3eb5d]/10 text-[#e3eb5d] border border-[#e3eb5d]/20";
    } else {
      newList[index].status = "Blocked";
      newList[index].statusStyle = "bg-[#ff7351]/10 text-[#ff7351] border border-[#ff7351]/20";
    }
    
    setProjectList(newList);
  };

  return (
    <>
      <TopBar title="Command Center" />

      {/* ── Main Content ── */}
      <main className="px-8 pb-12 pt-6 min-h-screen bg-[#0d0f0d]">

        {/* Page Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1
              className="text-4xl font-extrabold tracking-tight text-[#faf9f5] mb-2"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Construction Jobs
            </h1>
          </div>
          <Link href="/new-project">
            <button
              className="bg-[#aeee2a] hover:bg-[#a0df14] text-[#3a5400] font-bold px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              <span className="material-symbols-outlined" translate="no">add_circle</span>
              New Project
            </button>
          </Link>
        </div>

        {/* ── Filters ── */}
        <div className="glass-card rounded-2xl px-6 py-5 mb-8 flex flex-wrap items-end gap-8">

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Status</label>
            <select className="bg-[#242624] px-3 py-2 rounded-lg text-sm text-[#faf9f5] cursor-pointer hover:bg-[#2a2d2a] transition-colors outline-none border-none appearance-none w-36">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Client</label>
            <select className="bg-[#242624] px-3 py-2 rounded-lg text-sm text-[#faf9f5] cursor-pointer hover:bg-[#2a2d2a] transition-colors outline-none border-none appearance-none w-44">
              <option value="">Select Client</option>
              <option value="modern-homes">Modern Homes LLC</option>
              <option value="apex">Apex Dev</option>
              <option value="zenith">Zenith Group</option>
              <option value="riverdale">Riverdale Co.</option>
            </select>
          </div>

          {/* Services */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Services</label>
            <select className="bg-[#242624] px-3 py-2 rounded-lg text-sm text-[#faf9f5] cursor-pointer hover:bg-[#2a2d2a] transition-colors outline-none border-none appearance-none w-36">
              <option value="">All Services</option>
              <option value="siding">Siding</option>
              <option value="gutters">Gutters</option>
              <option value="painting">Painting</option>
              <option value="windows">Windows</option>
              <option value="decks">Decks</option>
              <option value="roofing">Roofing</option>
              <option value="dumpster">Dumpster</option>
            </select>
          </div>

          {/* Date Range — label acima da seta central */}
          <div className="flex items-end gap-3 ml-auto">
            <CustomDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Start"
              disableSundays={false}
              className="w-36"
            />
            {/* Coluna central: label + seta */}
            <div className="flex flex-col items-center gap-1.5 pb-1">
              <span className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold whitespace-nowrap">
                Date Range
              </span>
              <span className="text-[#474846] text-sm font-black">→</span>
            </div>
            <CustomDatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="End"
              disableSundays={false}
              className="w-36"
              alignRight={true}
            />
          </div>

        </div>

        {/* ── Data Table ── */}


        <div className="bg-[#121412] rounded-3xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1e201e]/50">
                {["SP", "Client", "Services", "Gating / Operational Status", "Status", ""].map((col) => (
                  <th
                    key={col}
                    className={`px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#ababa8] ${col === "SP" ? "text-center" : ""}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#474846]/10">
              {projectList.map((job, i) => (
                <tr
                  key={i}
                  className="transition-colors group relative hover:bg-[#1e201e]"
                >
                  {/* SP (Sales Person) */}
                  <td className="px-6 py-5">
                    <div className="w-8 h-8 mx-auto rounded bg-[#1a1c1a] border border-[#2a2d2a] flex items-center justify-center text-[#4da8da] font-black text-xs shadow-inner uppercase">
                      {job.sp}
                    </div>
                  </td>

                  {/* Client */}
                  <td className="px-6 py-5">
                    <Link
                      href={`/projects/${job.id.replace('#', '')}`}
                      className="text-[#faf9f5] font-medium hover:text-[#aeee2a] hover:underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      {job.client}
                    </Link>
                  </td>

                  {/* Services */}
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap items-center gap-2 max-w-[280px]">
                      {job.services.map((srv, idx) => (
                        <span key={idx} className="bg-[#1a1c1a] border border-[#3e403e] rounded-md px-2.5 py-1 text-[11px] font-bold text-[#faf9f5] whitespace-nowrap shadow-sm">
                          {srv}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Gating / Operational Status (Dropdown) */}
                  <td className="px-6 py-4">
                    <div className="relative group w-[210px]">
                      <select 
                        value={job.gate}
                        onChange={(e) => handleGateChange(i, e.target.value)}
                        className="w-full appearance-none bg-[#0a0a0a] border border-[#474846] rounded-xl pl-10 pr-8 py-2 text-[9px] font-black uppercase tracking-widest text-[#faf9f5] shadow-inner focus:outline-none focus:border-[#aeee2a] cursor-pointer transition-colors custom-select-arrow"
                      >
                        <option value="NOT_CONTACTED" className="bg-[#ba1212] text-white">🔴 NOT YET CONTACTED</option>
                        <option value="READY" className="bg-[#1f8742] text-white">🟢 READY TO START</option>
                        <option value="WINDOWS" className="bg-[#165eb3] text-white">🔵 WINDOWS</option>
                        <option value="DOORS" className="bg-[#f09a1a] text-black">🟠 DOORS</option>
                        <option value="FINANCING" className="bg-[#ebd27a] text-black">🟡 FINANCING</option>
                        <option value="MATERIALS" className="bg-[#306870] text-white">🪨 MATERIALS</option>
                        <option value="HOA" className="bg-[#9acbf0] text-black">📄 HOA</option>
                        <option value="OTHER_REPAIRS" className="bg-[#d1a3f0] text-black">🛠️ OTHER REPAIRS</option>
                        <option value="NO_ANSWER" className="bg-[#f2a074] text-black">📴 NO ANSWER</option>
                        <option value="PERMIT" className="bg-[#747673] text-white">📋 PERMIT</option>
                      </select>
                      
                      {/* Icone Visual Overlay  */}
                      <div 
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 pointer-events-none"
                        style={{ 
                          backgroundColor: `${GATE_CONFIG[job.gate].color}25`,
                          border: `1px solid ${GATE_CONFIG[job.gate].color}40`,
                        }}
                      >
                         <span className="material-symbols-outlined text-[13px]" style={{ color: GATE_CONFIG[job.gate].color }} translate="no">
                           {GATE_CONFIG[job.gate].icon}
                         </span>
                      </div>

                      {/* Dropdown Icon */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#ababa8] group-hover:text-[#faf9f5] transition-colors">
                        <span className="material-symbols-outlined text-[16px]" translate="no">expand_more</span>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full ${job.statusStyle}`}
                    >
                      {job.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5 text-right w-20">
                    <button
                      onClick={() => setDeleteTarget({ id: job.id, client: job.client })}
                      className="inline-flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100 text-[#ababa8] hover:text-[#ff7351] hover:bg-[#ff7351]/10"
                      title="Excluir projeto"
                    >
                      <span className="material-symbols-outlined text-lg" translate="no">
                        delete
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="mt-8 flex items-center justify-between text-sm text-[#ababa8]">
          <p>
            Showing <span className="text-[#faf9f5] font-bold">1-10</span> of 14 projects
          </p>
          <div className="flex gap-2">
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1e201e] hover:bg-[#2a2d2a] transition-colors">
              <span className="material-symbols-outlined text-sm" translate="no">chevron_left</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#aeee2a] text-[#3a5400] font-bold">
              1
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1e201e] hover:bg-[#2a2d2a] transition-colors">
              2
            </button>
            <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#1e201e] hover:bg-[#2a2d2a] transition-colors">
              <span className="material-symbols-outlined text-sm" translate="no">chevron_right</span>
            </button>
          </div>
        </div>
      </main>

      {/* ── Modal de Confirmação de Exclusão ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#181a18] border border-[#474846]/30 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#ff7351]/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#ff7351] text-2xl" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Excluir Projeto</h3>
                <p className="text-sm text-[#ababa8] mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-[#faf9f5] text-sm mb-8">
              Tem certeza que deseja excluir o projeto de{" "}
              <span className="font-bold text-[#aeee2a]">{deleteTarget.client}</span>{" "}
              <span className="text-[#ababa8]">({deleteTarget.id})</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] font-bold hover:bg-[#242624] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 rounded-xl bg-[#ff7351] text-white font-bold hover:bg-[#e5623f] transition-all cursor-pointer active:scale-95 shadow-[0_0_20px_rgba(255,115,81,0.2)]"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
