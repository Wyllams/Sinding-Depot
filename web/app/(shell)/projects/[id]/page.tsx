"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { TopBar } from "../../../../components/TopBar";

// =============================================
// Job Detail - OAKWOOD OFFICE PARK
// Rota dinâmica: /projects/[id]
// Ported from Stitch HTML (Detalhes do Projeto.txt)
// =============================================

const timelineItems = [
  {
    icon: "check_circle",
    filled: true,
    active: true,
    title: "Foundation Pour",
    badge: "2H AGO",
    badgeActive: true,
    desc: "Phase 2 pour completed for North Wing. Quality check passed.",
    date: "Sept 18, 2023",
  },
  {
    icon: "construction",
    filled: false,
    active: false,
    title: "Structural Steel Install",
    badge: "3D AGO",
    badgeActive: false,
    desc: "Main structural frame delivery and initial assembly on site.",
    date: "Sept 15, 2023",
  },
  {
    icon: "task_alt",
    filled: false,
    active: false,
    title: "Permits Approved",
    badge: "1W AGO",
    badgeActive: false,
    desc: "All city building permits signed and posted on site trailer.",
    date: "Sept 10, 2023",
  },
];

const quickActions = [
  { icon: "event_note", label: "Schedule Inspection", key: "inspection" },
  { icon: "request_quote", label: "Request Quote", key: "quote" },
  { icon: "history_edu", label: "Create Daily Log", key: "dailylog" },
  { icon: "map", label: "View Map", key: "map" },
  { icon: "chat_bubble", label: "Message Crew", key: null },
];

const projectServices = [
  { id: "siding", title: "Siding Crews", icon: "carpenter", partners: ["Siding Depot", "Xicara", "Xicara 2", "Wilmar", "Wilmar 2", "Sula", "Luis"] },
  { id: "doors", title: "Doors/Windows", icon: "door_front", partners: ["Siding Depot", "Sergio"] },
  { id: "paint", title: "Paint Crews", icon: "format_paint", partners: ["Siding Depot", "Osvin", "Osvin 2", "Victor", "Juan"] },
  { id: "gutters", title: "Gutters", icon: "water_drop", partners: ["Siding Depot", "Leandro"] },
  { id: "roofing", title: "Roofing", icon: "roofing", partners: ["Siding Depot", "Josue"] },
];

const blockers = [
  {
    icon: "cloud",
    title: "Weather Delay",
    desc: "Forecast: Heavy Rain for 48h",
    urgent: true,
  },
  {
    icon: "inventory_2",
    title: "Material Shortage",
    desc: 'Backordered: Rebar 5/8"',
    urgent: false,
    iconColor: "#eedc47",
  },
  {
    icon: "verified_user",
    title: "Inspection Pending",
    desc: "Electrical Rough-in (Tier 2)",
    urgent: false,
    iconColor: "#aeee2a",
  },
];

const documents = [
  { name: "Architectural Plans V4", type: "BLUEPRINT", date: "Sept 12, 2023" },
  { name: "Site Survey PDF", type: "SURVEY", date: "Sept 10, 2023" },
  { name: "Safety Manual 2023", type: "SAFETY", date: "Aug 28, 2023" },
  { name: "Permit Approval Docs", type: "LEGAL", date: "Aug 15, 2023" },
];

// ─── DatePicker customizado ───────────────────────────────────────
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_HEADER = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const selected = value ? new Date(value + 'T00:00:00') : null;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  };

  const displayValue = selected
    ? selected.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  const isSelected = (day: number) =>
    !!selected && selected.getFullYear() === viewYear && selected.getMonth() === viewMonth && selected.getDate() === day;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-[#242624] border rounded-xl text-sm transition-colors ${
          open ? 'border-[#aeee2a]' : 'border-[#474846] hover:border-[#747673]'
        }`}
      >
        <span className={selected ? 'text-[#faf9f5]' : 'text-[#747673]'}>
          {displayValue || 'Selecione a data'}
        </span>
        <span
          className={`material-symbols-outlined text-sm transition-transform ${open ? 'rotate-180 text-[#aeee2a]' : 'text-[#ababa8]'}`}
          translate="no"
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[60] bg-[#181a18] border border-[#474846]/60 rounded-xl shadow-2xl overflow-hidden">
          {/* Header mês/ano */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#474846]/30">
            <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#242624] text-[#ababa8] hover:text-[#faf9f5] transition-colors">
              <span className="material-symbols-outlined text-[16px]" translate="no">chevron_left</span>
            </button>
            <span className="text-xs font-bold text-[#faf9f5] uppercase tracking-wide">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#242624] text-[#ababa8] hover:text-[#faf9f5] transition-colors">
              <span className="material-symbols-outlined text-[16px]" translate="no">chevron_right</span>
            </button>
          </div>

          {/* Grid compacto */}
          <div className="px-3 pt-2 pb-1">
            {/* Cabeçalho dias da semana */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_HEADER.map(d => (
                <div key={d} className="text-center text-[9px] font-bold text-[#747673] uppercase py-0.5">{d}</div>
              ))}
            </div>
            {/* Células dos dias — h-8 fixo, sem aspect-square */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) =>
                day === null ? (
                  <div key={i} className="h-8" />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`h-8 w-full rounded-lg text-xs font-medium transition-all ${
                      isSelected(day)
                        ? 'bg-[#aeee2a] text-[#3a5400] font-bold shadow-[0_0_10px_rgba(174,238,42,0.25)]'
                        : isToday(day)
                        ? 'border border-[#aeee2a]/50 text-[#aeee2a]'
                        : 'text-[#faf9f5] hover:bg-[#242624]'
                    }`}
                  >
                    {day}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="flex justify-between items-center px-4 py-2 border-t border-[#474846]/20">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-[11px] text-[#ababa8] hover:text-[#faf9f5] transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                setViewYear(t.getFullYear());
                setViewMonth(t.getMonth());
                selectDay(t.getDate());
              }}
              className="text-[11px] text-[#aeee2a] font-bold hover:underline"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente Modal base ───────────────────────────────────────
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#181a18] border border-[#474846]/40 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-visible"
        onClick={(e) => e.stopPropagation()}
        style={{ overflowY: 'auto', overflowX: 'visible' }}
      >
        {children}
      </div>
    </div>
  );
}

type GateConfigKey = "NOT_CONTACTED" | "READY" | "WINDOWS" | "DOORS" | "FINANCING" | "MATERIALS" | "HOA" | "OTHER_REPAIRS" | "NO_ANSWER" | "PERMIT";

const GATE_CONFIG: Record<GateConfigKey, { color: string, icon: string, title: string, desc: string }> = {
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

export default function ProjectDetailPage() {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [openServiceModal, setOpenServiceModal] = useState<typeof projectServices[0] | null>(null);
  const [assignedPartners, setAssignedPartners] = useState<Record<string, string>>({});
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionNote, setInspectionNote] = useState("");
  const [quoteStatus, setQuoteStatus] = useState<"pending" | "read" | "accepted" | "rejected">("pending");
  const [logText, setLogText] = useState("");
  const [logPhotos, setLogPhotos] = useState<string[]>([]);
  const [logVideos, setLogVideos] = useState<string[]>([]);
  const [logDocs, setLogDocs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const projectAddress = "1400 Oak Ave, Seattle, WA 98101";

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(projectAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setter((prev) => [...prev, url]);
    });
  };

  const close = () => setOpenModal(null);

  return (
    <>
      <TopBar subtitle="Active Phase" title="OAKWOOD OFFICE PARK" />

      {/* Main */}
      <main className="p-8 min-h-screen">

        {/* Hero Header */}
        <div className="mb-10">
          <Link href="/projects" className="inline-flex items-center gap-2 text-[#ababa8] hover:text-[#aeee2a] transition-colors mb-6 font-bold text-xs tracking-widest uppercase">
            <span className="material-symbols-outlined text-[16px]" translate="no">arrow_back</span>
            Voltar
          </Link>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <h1
              className="text-4xl md:text-5xl font-extrabold text-[#faf9f5]"
              style={{ fontFamily: "Manrope, system-ui, sans-serif", letterSpacing: "-0.02em" }}
            >
              Job Detail: OAKWOOD OFFICE PARK
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-4 py-1.5 bg-[#aeee2a] text-[#3a5400] text-xs font-bold rounded-full tracking-wider">
              STATUS: IN PROGRESS - ACTIVE
            </span>
            <span className="px-4 py-1.5 bg-[#ff7351] text-[#450900] text-xs font-bold rounded-full tracking-wider uppercase">
              PRIORITY: HIGH
            </span>
            <div className="flex items-center gap-2 text-[#ababa8] ml-4">
              <span className="material-symbols-outlined text-sm" translate="no">location_on</span>
              <span className="text-sm font-medium">1400 Oak Ave, Seattle</span>
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── Left Column: Timeline + Map (4/12) ── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Job Timeline */}
            <div className="bg-[#121412] rounded-xl p-6">
              <h3
                className="text-lg font-bold mb-8 border-b border-[#474846]/30 pb-4 uppercase"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                JOB TIMELINE
              </h3>
              <div className="relative pl-8 space-y-10">
                {/* Vertical line */}
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[#474846]" />

                {timelineItems.map((item, i) => (
                  <div key={i} className="relative">
                    <div
                      className={`absolute -left-8 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-[#0d0f0d] ${
                        item.active ? "bg-[#aeee2a]" : "bg-[#242624] border border-[#474846]"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-sm ${item.active ? "text-[#3a5400]" : "text-[#ababa8]"}`}
                        translate="no"
                        style={item.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {item.icon}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-[#faf9f5]">{item.title}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.badgeActive
                              ? "text-[#aeee2a] bg-[#aeee2a]/10"
                              : "text-[#ababa8] bg-[#242624]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#ababa8] leading-relaxed">{item.desc}</p>
                      <p className="text-[11px] mt-2 font-semibold text-[#747673]">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Site Map */}
            <div className="bg-[#121412] rounded-xl overflow-hidden aspect-video relative group cursor-pointer">
              <img
                alt="Job Site Map"
                className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXYRwkZuE7uAxmwIsiSwrovrl8JaOG-QOX4jOMntyJdOFX7xC4pW8UVK8_R_wX62XGjZ3CnAmwSyZP09hN3l9lt76OuvJ43JHm1E0R43w4-jwUAOMsTYsWvGX-J7Q9synXREBx7QM1oPR1uB6gcnlB0wWbr7AX4RvXu12PrI9gIotaLbB66vdYJif-XK85a09F9jkt9Yg9SZx5lNVQtq9TCs6Dtj6M424HGRwN735bq-0Ij4nSsDgD2BbVcFDHX9WUbijlanozPUk"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f0d] to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="text-xs font-bold text-[#aeee2a] uppercase">Site Location</span>
                <h4 className="font-bold">1400 Oak Ave, Seattle, WA</h4>
              </div>
              <button className="absolute top-4 right-4 bg-[#aeee2a] text-[#3a5400] p-2 rounded-lg shadow-xl">
                <span className="material-symbols-outlined" translate="no">fullscreen</span>
              </button>
            </div>
          </div>

          {/* ── Right Column (8/12) ── */}
          <div className="lg:col-span-8 space-y-8">

            {/* Quick Actions */}
            <div>
              <h3 className="text-xs font-bold text-[#ababa8] tracking-[0.2em] mb-4 uppercase">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {quickActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => a.key && setOpenModal(a.key)}
                    className="flex flex-col items-center justify-center gap-3 p-6 glass-card rounded-xl hover:bg-[#aeee2a]/20 transition-all group"
                  >
                    <span
                      className="material-symbols-outlined text-[#aeee2a] group-hover:scale-110 transition-transform"
                      translate="no"
                    >
                      {a.icon}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-center">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>


            {/* Crews + Blockers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Assigned Partner Services */}
              <div className="bg-[#121412] rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3
                    className="text-sm font-bold uppercase tracking-widest"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    PARTNERS & CREWS
                  </h3>
                </div>
                <div className="space-y-3">
                  {projectServices.map((svc) => {
                    const assigned = assignedPartners[svc.id];
                    return (
                      <div
                        key={svc.id}
                        onClick={() => setOpenServiceModal(svc)}
                        className="flex items-center justify-between p-4 rounded-lg bg-[#1e201e] border border-[#474846]/20 hover:border-[#aeee2a]/50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${assigned ? 'bg-[#aeee2a] text-[#3a5400]' : 'bg-[#242624] text-[#ababa8] group-hover:text-white'}`}>
                            <span className="material-symbols-outlined" translate="no">
                              {svc.icon}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-sm text-[#faf9f5] block">{svc.title}</span>
                            {assigned ? (
                              <span className="text-[11px] font-bold text-[#aeee2a] uppercase tracking-wider">
                                {assigned}
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium text-[#ababa8] uppercase tracking-wider group-hover:text-orange-400">
                                Click to Assign
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-[#474846] group-hover:text-[#aeee2a] transition-colors" translate="no">
                          chevron_right
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending Blockers */}
              <div className="bg-[#121412] rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3
                    className="text-sm font-bold uppercase tracking-widest"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    PENDING BLOCKERS
                  </h3>
                  <button className="text-[#ff7351] text-xs font-bold">URGENT</button>
                </div>
                <div className="space-y-4">
                  {blockers.map((b) => (
                    <div
                      key={b.title}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        b.urgent
                          ? "bg-[#ff7351]/10 border-[#ff7351]/20"
                          : "bg-[#1e201e] border-[#474846]/10"
                      }`}
                    >
                      <span
                        className="material-symbols-outlined"
                        translate="no"
                        style={{ color: b.urgent ? "#ff7351" : b.iconColor || "#aeee2a" }}
                      >
                        {b.icon}
                      </span>
                      <div>
                        <p className="font-bold text-sm">{b.title}</p>
                        <p className="text-xs text-[#ababa8]">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-[#121412] rounded-xl p-6">
              <div className="flex justify-between items-center mb-6 px-2">
                <h3
                  className="text-sm font-bold uppercase tracking-widest"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  RECENT DOCUMENTS
                </h3>
                <button className="flex items-center gap-2 text-[#aeee2a] font-bold text-xs">
                  <span className="material-symbols-outlined text-sm" translate="no">upload</span>
                  ADD DOCUMENT
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-[#ababa8] tracking-widest uppercase">
                      <th className="pb-4 px-2">Document Name</th>
                      <th className="pb-4 px-2">Type</th>
                      <th className="pb-4 px-2">Uploaded</th>
                      <th className="pb-4 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-[#474846]/10">
                    {documents.map((doc) => (
                      <tr key={doc.name} className="group hover:bg-[#1e201e] transition-colors">
                        <td className="py-4 px-2 font-bold">{doc.name}</td>
                        <td className="py-4 px-2">
                          <span className="px-2 py-0.5 bg-[#242624] rounded text-[10px] font-bold">
                            {doc.type}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-[#ababa8]">{doc.date}</td>
                        <td className="py-4 px-2 text-right">
                          <button className="text-[#aeee2a] hover:underline font-bold text-xs uppercase">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ════════════════════════════════════════════════════
          MODAL — ASSIGN PARTNER
      ════════════════════════════════════════════════════ */}
      {openServiceModal && (
        <Modal onClose={() => setOpenServiceModal(null)}>
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#aeee2a]/10 flex items-center justify-center border border-[#aeee2a]/20">
                  <span className="material-symbols-outlined text-[#aeee2a] text-[24px]" translate="no">
                    {openServiceModal.icon}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">{openServiceModal.title}</h2>
                  <p className="text-xs text-[#ababa8] mt-1 font-medium">Select a partner for this duty</p>
                </div>
              </div>
              <button
                onClick={() => setOpenServiceModal(null)}
                className="w-8 h-8 rounded-full bg-[#242624] flex items-center justify-center hover:bg-[#aeee2a] hover:text-[#3a5400] transition-colors"
              >
                <span className="material-symbols-outlined text-sm" translate="no">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {openServiceModal.partners.map((partner) => {
                const isSelected = assignedPartners[openServiceModal.id] === partner;
                return (
                  <button
                    key={partner}
                    onClick={() => {
                      setAssignedPartners((prev) => ({ ...prev, [openServiceModal.id]: partner }));
                      setOpenServiceModal(null);
                    }}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-[#aeee2a]/10 border-[#aeee2a] shadow-[0_0_15px_rgba(174,238,42,0.1)]' 
                        : 'bg-[#181a18] border-[#474846]/40 hover:bg-[#242624] hover:border-[#747673]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-[#aeee2a] text-[#3a5400]' : 'bg-[#242624] text-[#ababa8]'}`}>
                        {partner.charAt(0)}
                      </div>
                      <span className={`text-sm font-bold tracking-wide uppercase ${isSelected ? 'text-[#aeee2a]' : 'text-[#faf9f5]'}`}>
                        {partner}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[#aeee2a]" translate="no">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
              
              <button 
                onClick={() => {
                  const current = { ...assignedPartners };
                  delete current[openServiceModal.id];
                  setAssignedPartners(current);
                  setOpenServiceModal(null);
                }}
                className="mt-4 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[#ba1212]/30 text-[#ba1212] hover:bg-[#ba1212]/10 transition-colors"
              >
                <span className="text-xs font-bold uppercase tracking-wider">Unassign Partner</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL 1 — SCHEDULE INSPECTION
      ════════════════════════════════════════════════════ */}
      {openModal === "inspection" && (
        <Modal onClose={close}>
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#aeee2a]" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>event_note</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Schedule Inspection</h2>
                  <p className="text-xs text-[#ababa8]" translate="no">OAKWOOD OFFICE PARK</p>
                </div>
              </div>
              <button onClick={close} className="text-[#ababa8] hover:text-[#faf9f5] p-1 rounded-lg hover:bg-[#242624] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            <div className="space-y-5" style={{ overflow: 'visible' }}>
              <div className="space-y-2" style={{ overflow: 'visible' }}>
                <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Data da Inspeção *</label>
                <DatePicker value={inspectionDate} onChange={setInspectionDate} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Tipo de Inspeção</label>
                <select className="w-full bg-[#242624] border border-[#474846] rounded-xl px-4 py-3 text-[#faf9f5] outline-none focus:border-[#aeee2a] transition-colors appearance-none">
                  <option>City Permit Inspection</option>
                  <option>Quality Control</option>
                  <option>HOA Approval</option>
                  <option>Final Walkthrough</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Observações</label>
                <textarea
                  value={inspectionNote}
                  onChange={(e) => setInspectionNote(e.target.value)}
                  placeholder="Detalhes adicionais sobre a inspeção..."
                  rows={3}
                  className="w-full bg-[#242624] border border-[#474846] rounded-xl px-4 py-3 text-[#faf9f5] outline-none focus:border-[#aeee2a] transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button onClick={close} className="px-6 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] font-bold hover:bg-[#242624] transition-all">Cancelar</button>
              <button
                disabled={!inspectionDate}
                onClick={close}
                className="px-6 py-2.5 rounded-xl bg-[#aeee2a] text-[#3a5400] font-bold hover:bg-[#a0df14] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(174,238,42,0.2)]"
              >
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL 2 — REQUEST QUOTE
      ════════════════════════════════════════════════════ */}
      {openModal === "quote" && (
        <Modal onClose={close}>
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e3eb5d]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#e3eb5d]" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>request_quote</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Request Quote</h2>
                  <p className="text-xs text-[#ababa8]">Change Order / Serviço adicional</p>
                </div>
              </div>
              <button onClick={close} className="text-[#ababa8] hover:text-[#faf9f5] p-1 rounded-lg hover:bg-[#242624] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>


            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Descrição do Serviço Adicional</label>
                <textarea rows={3} placeholder="Ex: Adicionar calhas no ala norte..." className="w-full bg-[#242624] border border-[#474846] rounded-xl px-4 py-3 text-[#faf9f5] outline-none focus:border-[#e3eb5d] transition-colors resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Valor (USD)</label>
                  <input type="number" placeholder="0.00" className="w-full bg-[#242624] border border-[#474846] rounded-xl px-4 py-3 text-[#faf9f5] outline-none focus:border-[#e3eb5d] transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Prazo adicional</label>
                  <input type="text" placeholder="Ex: +3 dias" className="w-full bg-[#242624] border border-[#474846] rounded-xl px-4 py-3 text-[#faf9f5] outline-none focus:border-[#e3eb5d] transition-colors" />
                </div>
              </div>
            </div>

            {/* Status do documento */}
            <div className="bg-[#121412] rounded-xl p-4 mb-6 border border-[#474846]/20">
              <p className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold mb-3">Status do Documento</p>
              <div className="grid grid-cols-2 gap-3">
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${ quoteStatus !== 'pending' ? 'border-[#aeee2a]/30 bg-[#aeee2a]/5' : 'border-[#474846]/30 bg-[#1e201e]' }`}>
                  <span className={`material-symbols-outlined text-sm ${ quoteStatus !== 'pending' ? 'text-[#aeee2a]' : 'text-[#ababa8]' }`} translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>
                    { quoteStatus !== 'pending' ? 'mark_email_read' : 'mail' }
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-[#faf9f5]">Documento Lido</p>
                    <p className="text-[10px] text-[#ababa8]">{ quoteStatus !== 'pending' ? 'Sim — Apr 12' : 'Aguardando...' }</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                  quoteStatus === 'accepted' ? 'border-[#aeee2a]/30 bg-[#aeee2a]/5' :
                  quoteStatus === 'rejected' ? 'border-[#ff7351]/30 bg-[#ff7351]/5' :
                  'border-[#474846]/30 bg-[#1e201e]'
                }`}>
                  <span className={`material-symbols-outlined text-sm ${
                    quoteStatus === 'accepted' ? 'text-[#aeee2a]' :
                    quoteStatus === 'rejected' ? 'text-[#ff7351]' : 'text-[#ababa8]'
                  }`} translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>
                    { quoteStatus === 'accepted' ? 'thumb_up' : quoteStatus === 'rejected' ? 'thumb_down' : 'pending' }
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-[#faf9f5]">Resposta</p>
                    <p className={`text-[10px] font-bold ${
                      quoteStatus === 'accepted' ? 'text-[#aeee2a]' :
                      quoteStatus === 'rejected' ? 'text-[#ff7351]' : 'text-[#ababa8]'
                    }`}>
                      { quoteStatus === 'accepted' ? 'ACEITO ✓' : quoteStatus === 'rejected' ? 'NÃO ACEITO ✗' : 'Aguardando...' }
                    </p>
                  </div>
                </div>
              </div>
              {/* Simulação de resposta do cliente (para demo) */}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setQuoteStatus('read')} className="flex-1 py-1.5 text-[10px] font-bold rounded-lg border border-[#474846] text-[#ababa8] hover:bg-[#242624] transition-all">Simular: Lido</button>
                <button onClick={() => setQuoteStatus('accepted')} className="flex-1 py-1.5 text-[10px] font-bold rounded-lg border border-[#aeee2a]/40 text-[#aeee2a] hover:bg-[#aeee2a]/10 transition-all">Simular: Aceito</button>
                <button onClick={() => setQuoteStatus('rejected')} className="flex-1 py-1.5 text-[10px] font-bold rounded-lg border border-[#ff7351]/40 text-[#ff7351] hover:bg-[#ff7351]/10 transition-all">Simular: Recusado</button>
              </div>
            </div>

            {/* Envio */}
            <p className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold mb-3">Enviar para o Cliente</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e201e] border border-[#474846] text-[#faf9f5] font-bold text-sm hover:bg-[#242624] transition-all">
                <span className="material-symbols-outlined text-sm text-[#aeee2a]" translate="no">email</span> Via E-mail
              </button>
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1e201e] border border-[#474846] text-[#faf9f5] font-bold text-sm hover:bg-[#242624] transition-all">
                <span className="material-symbols-outlined text-sm text-[#aeee2a]" translate="no">sms</span> Via SMS
              </button>
            </div>

            <div className="flex gap-3 justify-between">
              <button onClick={close} className="px-6 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] font-bold hover:bg-[#242624] transition-all">Cancelar</button>
              <button onClick={close} className="px-6 py-2.5 rounded-xl bg-[#e3eb5d] text-[#3a3d00] font-bold hover:bg-[#d4db4e] transition-all active:scale-95 shadow-[0_0_20px_rgba(227,235,93,0.15)]">Criar & Enviar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL 3 — CREATE DAILY LOG
      ════════════════════════════════════════════════════ */}
      {openModal === "dailylog" && (
        <Modal onClose={close}>
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#aeee2a]" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Create Daily Log</h2>
                  <p className="text-xs text-[#ababa8]">Diário de Obra — {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <button onClick={close} className="text-[#ababa8] hover:text-[#faf9f5] p-1 rounded-lg hover:bg-[#242624] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            {/* O que foi feito */}
            <div className="space-y-2 mb-6">
              <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">O que foi feito hoje *</label>
              <textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Descreva as atividades realizadas, estado da obra, condições climáticas..."
                rows={4}
                className="w-full bg-[#242624] border border-[#474846] rounded-xl px-4 py-3 text-[#faf9f5] outline-none focus:border-[#aeee2a] transition-colors resize-none"
              />
            </div>

            {/* Material gasto */}
            <div className="space-y-2 mb-6">
              <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold">Material Gasto</label>
              <input type="text" placeholder="Ex: 40 painéis James Hardie, 12 parafusos..." className="w-full bg-[#242624] border border-[#474846] rounded-xl px-4 py-3 text-[#faf9f5] outline-none focus:border-[#aeee2a] transition-colors" />
            </div>

            {/* Linhas de mídia — estilo borda esquerda grossa */}
            <div className="space-y-2 mb-8">

              {/* FOTOS */}
              <div className="relative overflow-hidden rounded-xl border border-[#474846]/20 bg-[#121412]" style={{ borderLeft: '4px solid #aeee2a' }}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <label className="w-6 h-6 rounded-full flex items-center justify-center bg-[#aeee2a]/10 hover:bg-[#aeee2a]/20 transition-colors">
                      <span className="material-symbols-outlined text-[#aeee2a] text-[18px] leading-none" translate="no">add</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, setLogPhotos)} />
                    </label>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#faf9f5]">Fotos</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${logPhotos.length > 0 ? 'text-[#aeee2a]' : 'text-[#474846]'}`}>
                    {logPhotos.length > 0 ? `${logPhotos.length} arquivo${logPhotos.length > 1 ? 's' : ''} anexado${logPhotos.length > 1 ? 's' : ''}` : 'Nenhuma imagem'}
                  </span>
                </div>
                {logPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap px-4 pb-3">
                    {logPhotos.map((src, i) => (
                      <img key={i} src={src} alt="foto" className="w-14 h-12 object-cover rounded-lg border border-[#474846]/30" />
                    ))}
                  </div>
                )}
              </div>

              {/* VÍDEOS */}
              <div className="relative overflow-hidden rounded-xl border border-[#474846]/20 bg-[#121412]" style={{ borderLeft: '4px solid #aeee2a' }}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <label className="w-6 h-6 rounded-full flex items-center justify-center bg-[#aeee2a]/10 hover:bg-[#aeee2a]/20 transition-colors">
                      <span className="material-symbols-outlined text-[#aeee2a] text-[18px] leading-none" translate="no">add</span>
                      <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => handleFileUpload(e, setLogVideos)} />
                    </label>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#faf9f5]">Vídeos</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${logVideos.length > 0 ? 'text-[#aeee2a]' : 'text-[#474846]'}`}>
                    {logVideos.length > 0 ? `${logVideos.length} arquivo${logVideos.length > 1 ? 's' : ''} anexado${logVideos.length > 1 ? 's' : ''}` : 'Nenhum vídeo'}
                  </span>
                </div>
                {logVideos.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-4 pb-3">
                    {logVideos.map((_, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e201e] rounded-lg border border-[#474846]/30 text-[11px] text-[#ababa8]">
                        <span className="material-symbols-outlined text-[#aeee2a] text-[14px]" translate="no">videocam</span>
                        vídeo_{i + 1}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DOCUMENTOS */}
              <div className="relative overflow-hidden rounded-xl border border-[#474846]/20 bg-[#121412]" style={{ borderLeft: '4px solid #aeee2a' }}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <label className="w-6 h-6 rounded-full flex items-center justify-center bg-[#aeee2a]/10 hover:bg-[#aeee2a]/20 transition-colors">
                      <span className="material-symbols-outlined text-[#aeee2a] text-[18px] leading-none" translate="no">add</span>
                      <input type="file" accept=".pdf,.doc,.docx" multiple className="hidden" onChange={(e) => handleFileUpload(e, setLogDocs)} />
                    </label>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#faf9f5]">Docs</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${logDocs.length > 0 ? 'text-[#aeee2a]' : 'text-[#474846]'}`}>
                    {logDocs.length > 0 ? `${logDocs.length} arquivo${logDocs.length > 1 ? 's' : ''} anexado${logDocs.length > 1 ? 's' : ''}` : 'Nenhum documento'}
                  </span>
                </div>
                {logDocs.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-4 pb-3">
                    {logDocs.map((_, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e201e] rounded-lg border border-[#474846]/30 text-[11px] text-[#ababa8]">
                        <span className="material-symbols-outlined text-[#aeee2a] text-[14px]" translate="no">description</span>
                        doc_{i + 1}.pdf
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={close} className="px-6 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] font-bold hover:bg-[#242624] transition-all">Cancelar</button>
              <button
                disabled={!logText}
                onClick={close}
                className="px-6 py-2.5 rounded-xl bg-[#aeee2a] text-[#3a5400] font-bold hover:bg-[#a0df14] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(174,238,42,0.2)]"
              >
                Salvar Log
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL 4 — VIEW MAP
      ════════════════════════════════════════════════════ */}
      {openModal === "map" && (
        <Modal onClose={close}>
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#aeee2a]" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>View Map</h2>
                  <p className="text-xs text-[#ababa8]">Localização da obra</p>
                </div>
              </div>
              <button onClick={close} className="text-[#ababa8] hover:text-[#faf9f5] p-1 rounded-lg hover:bg-[#242624] transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            {/* Mapa incorporado via iframe OpenStreetMap (gratuito) */}
            <div className="rounded-xl overflow-hidden mb-4 border border-[#474846]/30">
              <iframe
                title="Project Location"
                src="https://www.openstreetmap.org/export/embed.html?bbox=-122.3440%2C47.6050%2C-122.3200%2C47.6200&layer=mapnik&marker=47.6101%2C-122.3420"
                width="100%"
                height="280"
                style={{ border: 0, filter: "invert(0.9) hue-rotate(180deg) saturate(0.6)" }}
                loading="lazy"
              />
            </div>

            {/* Endereço + botão copiar */}
            <div className="flex items-center gap-3 bg-[#121412] rounded-xl p-4 border border-[#474846]/20 mb-6">
              <span className="material-symbols-outlined text-[#aeee2a]" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              <p className="flex-1 text-[#faf9f5] text-sm font-medium">{projectAddress}</p>
              <button
                onClick={handleCopyAddress}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  copied
                    ? 'bg-[#aeee2a]/10 text-[#aeee2a] border border-[#aeee2a]/30'
                    : 'bg-[#242624] text-[#ababa8] hover:text-[#faf9f5] hover:bg-[#2a2d2a] border border-[#474846]'
                }`}
              >
                <span className="material-symbols-outlined text-sm" translate="no">{copied ? 'check' : 'content_copy'}</span>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <button onClick={close} className="w-full py-2.5 rounded-xl border border-[#474846] text-[#ababa8] font-bold hover:bg-[#242624] transition-all">Fechar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
