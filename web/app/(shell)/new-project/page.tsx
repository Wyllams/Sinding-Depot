"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { TopBar } from "../../../components/TopBar";

// =============================================
// Create New Job | Iron & Lime
// Rota: /new-project (dentro do grupo (shell) → tem Sidebar)
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
type GateConfigKey = keyof typeof GATE_CONFIG;

const services = [
  { id: "siding",   icon: "view_day",       label: "Siding", partners: ["Siding Depot", "Xicara", "Xicara 2", "Wilmar", "Wilmar 2", "Sula", "Luis"] },
  { id: "gutters",  icon: "horizontal_rule", label: "Gutters", partners: ["Siding Depot", "Leandro"] },
  { id: "painting", icon: "format_paint",   label: "Painting", partners: ["Siding Depot", "Osvin", "Osvin 2", "Victor", "Juan"] },
  { id: "windows",  icon: "window",         label: "Windows",  partners: ["Siding Depot", "Sergio"] },
  { id: "decks",    icon: "deck",           label: "Decks",    partners: ["Siding Depot"] },
  { id: "roofing",  icon: "roofing",        label: "Roofing",  partners: ["Siding Depot", "Josue"] },
  { id: "dumpster", icon: "delete",         label: "Dumpster", partners: ["Siding Depot"] },
];

const inputCls =
  "w-full bg-[#242624] border border-transparent rounded-lg py-3 px-4 text-[#faf9f5] placeholder:text-[#747673] focus:outline-none focus:border-[#aeee2a] focus:ring-1 focus:ring-[#aeee2a] transition-all cursor-pointer h-[48px] text-[15px]";

const labelCls = "text-xs uppercase tracking-wider text-[#ababa8] font-bold";

// ---- Carrossel de Serviços ----
type Service = { id: string; icon: string; label: string; partners?: string[] };

function ServicesCarousel({
  services,
  selected,
  toggle,
  assignedPartners,
  onAssignClick
}: {
  services: Service[];
  selected: string[];
  toggle: (id: string) => void;
  assignedPartners: Record<string, string>;
  onAssignClick: (svc: Service) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // Calcula a largura de um card (min-w-[calc(25%-12px)] ≈ 25% do container)
    const cardWidth = el.clientWidth / 4;
    el.scrollBy({ left: dir === "right" ? cardWidth : -cardWidth, behavior: "smooth" });
  };

  return (
    <div className="relative group/carousel">
      {/* Seta Esquerda */}
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full bg-[#242624] border border-[#474846]/40 text-[#ababa8] hover:text-[#aeee2a] hover:border-[#aeee2a]/40 flex items-center justify-center shadow-lg transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[20px]" translate="no">chevron_left</span>
      </button>

      {/* Faixa de cards — scroll horizontal suave, sem scrollbar visível */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-1 pt-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {services.map((svc) => {
          const on = selected.includes(svc.id);
          const partner = assignedPartners[svc.id];
          const hasPartnersList = svc.partners && svc.partners.length > 0;
          return (
            <div
              key={svc.id}
              onClick={() => {
                if (!on) toggle(svc.id); // Liga a aba
                if (hasPartnersList) {
                  onAssignClick(svc);    // Mostra o pop-up
                } else if (on) {
                  toggle(svc.id);        // Desliga se tiver logado mas n tem pop-up
                }
              }}
              className={`relative flex-shrink-0 w-[calc(25%-12px)] min-w-[140px] px-2 py-5 rounded-xl cursor-pointer transition-all group ${
                on
                  ? "bg-[#121412] border-2 border-[#aeee2a] shadow-[0_0_15px_rgba(174,238,42,0.1)]"
                  : "bg-[#121412] border border-[#474846]/15 hover:bg-[#1e201e]"
              }`}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <span
                  className={`material-symbols-outlined text-3xl transition-colors ${
                    on ? "text-[#aeee2a]" : "text-[#ababa8] group-hover:text-[#aeee2a]"
                  }`}
                  translate="no"
                >
                  {svc.icon}
                </span>
                <span className="font-bold tracking-tight text-sm text-[#faf9f5]">{svc.label}</span>
              </div>
              
              {/* Box de atribuição visual (assign) se o item for selecionado e tiver parceiros */}
              {on && hasPartnersList && (
                <div className="mt-3 flex justify-center w-full">
                   {partner ? (
                       <span className="text-[10px] font-bold text-[#faf9f5] uppercase tracking-wider bg-[#aeee2a]/20 border border-[#aeee2a] px-2.5 py-1 rounded-md">{partner}</span>
                   ) : (
                       <span className="text-[10px] font-bold text-[#faf9f5] uppercase tracking-wider border border-[#aeee2a]/50 bg-[#aeee2a]/10 hover:bg-[#aeee2a]/20 transition-colors px-2.5 py-1 rounded-full">Assign Partner</span>
                   )}
                </div>
              )}
              
              {/* O checkmark superior caso on mas sem partners (Dumpster, Decks) */}
              {on && !hasPartnersList && (
                <div className="absolute top-2 right-2 text-[#aeee2a]">
                  <span
                    className="material-symbols-outlined"
                    translate="no"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Seta Direita */}
      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full bg-[#242624] border border-[#474846]/40 text-[#ababa8] hover:text-[#aeee2a] hover:border-[#aeee2a]/40 flex items-center justify-center shadow-lg transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[20px]" translate="no">chevron_right</span>
      </button>
    </div>
  );
}

// ---- Custom Date Picker (Premium Dark) ----
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function CustomDatePicker({ 
  value, 
  onChange, 
  placeholder = "dd/mm/yyyy" 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string 
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const current = value ? new Date(value + "T12:00:00") : new Date();
  const [viewMonth, setViewMonth] = useState(current.getMonth());
  const [viewYear, setViewYear] = useState(current.getFullYear());
  
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const initDate = value ? new Date(value + "T12:00:00") : new Date();
      setViewMonth(initDate.getMonth());
      setViewYear(initDate.getFullYear());
    }
  }, [isOpen, value]);

  const formattedValue = value ? (() => {
    const d = new Date(value + "T12:00:00");
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
  })() : "";

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const selectDate = (day: number) => {
    const yyyy = viewYear;
    const mm = (viewMonth + 1).toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#242624] border border-transparent rounded-lg py-3 px-4 flex items-center justify-between cursor-pointer hover:border-[#474846] transition-colors h-[48px] focus-within:border-[#aeee2a] focus-within:ring-1 focus-within:ring-[#aeee2a]`}
      >
        <span className={`text-[15px] ${value ? "text-[#faf9f5]" : "text-[#747673] tracking-wider"}`}>
          {value ? formattedValue : placeholder}
        </span>
        <span className="material-symbols-outlined text-[#747673] text-[18px]" translate="no">
          calendar_month
        </span>
      </div>

      {isOpen && (
        <div className="absolute top-14 left-0 z-50 w-72 bg-[#1a1c1a] border border-[#474846]/50 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-[#faf9f5] ml-2 text-[15px]">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <div className="flex gap-1">
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); viewMonth === 0 ? (setViewMonth(11), setViewYear(viewYear - 1)) : setViewMonth(viewMonth - 1); }} 
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#242624] text-[#ababa8] hover:text-[#faf9f5] transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]" translate="no">chevron_left</span>
              </button>
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); viewMonth === 11 ? (setViewMonth(0), setViewYear(viewYear + 1)) : setViewMonth(viewMonth + 1); }} 
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#242624] text-[#ababa8] hover:text-[#faf9f5] transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]" translate="no">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-black uppercase text-[#ababa8]">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {blanks.map(b => (
              <div key={`blank-${b}`} className="w-8 h-8 mx-auto" />
            ))}
            {daysArray.map(day => {
              const today = new Date();
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSelected = value && (() => {
                  const s = new Date(value + "T12:00:00");
                  return s.getDate() === day && s.getMonth() === viewMonth && s.getFullYear() === viewYear;
              })();

              return (
                <button
                  type="button"
                  key={day}
                  onClick={(e) => { e.stopPropagation(); selectDate(day); }}
                  className={`w-8 h-8 mx-auto flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors cursor-pointer
                    ${isSelected ? "bg-[#aeee2a] text-[#050505] font-black hover:bg-[#9bdd22]" 
                      : isToday ? "bg-[#242624] text-[#aeee2a] border border-[#aeee2a]/30 hover:bg-[#323632]" 
                      : "text-[#faf9f5] hover:bg-[#242624]"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#474846]/20">
             <button type="button" onClick={() => { onChange(""); setIsOpen(false); }} className="text-xs font-bold text-[#ababa8] hover:text-[#e04545] transition-colors cursor-pointer px-2 py-1">
               Clear
             </button>
             <button type="button" onClick={() => { 
                 const now = new Date(); 
                 onChange(`${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`);
                 setIsOpen(false);
               }} 
               className="text-xs font-bold text-[#aeee2a] hover:text-[#9bdd22] transition-colors cursor-pointer px-2 py-1">
               Today
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="material-symbols-outlined text-[#aeee2a]" translate="no">
        {icon}
      </span>
      <h2 className="text-xl font-bold" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
        {title}
      </h2>
    </div>
  );
}


export default function NewProjectPage() {
  const [selected, setSelected] = useState<string[]>(["siding"]);
  const [gateStatus, setGateStatus] = useState<GateConfigKey>("NOT_CONTACTED");
  const [spStatus, setSpStatus] = useState<string>("M");
  
  const [openPartnerModal, setOpenPartnerModal] = useState<Service | null>(null);
  const [assignedPartners, setAssignedPartners] = useState<Record<string, string>>({});
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  return (
    <>
      <TopBar title="Create New Job" leftSlot={
        <Link href="/projects">
          <div className="flex items-center gap-2 text-[#aeee2a] cursor-pointer">
            <span className="material-symbols-outlined text-sm" translate="no">arrow_back</span>
            <span className="text-sm uppercase tracking-widest font-bold">Back to Jobs</span>
          </div>
        </Link>
      } />

      {/* Content area — pr-[420px] leaves space for the fixed map panel */}
      <main className="pb-24 px-8 pt-8 xl:pr-[440px] overflow-x-hidden">
        <div className="max-w-3xl">

          {/* Page Title */}
          <div className="mb-12">
            <h1
              className="text-4xl font-extrabold tracking-tight mb-2"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Create New Job
            </h1>
            <p className="text-[#ababa8] text-lg">Define details for a new project</p>
          </div>

          <form className="space-y-12">

            {/* Client Information */}
            <section>
              <SectionHeader icon="person_add" title="Client Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 rounded-xl bg-[#121412] border border-[#474846]/15">
                <div className="space-y-2">
                  <label className={labelCls}>Client Name</label>
                  <input className={inputCls} placeholder="John Doe" type="text" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Company Name</label>
                  <input className={inputCls} placeholder="Acme Construction Co." type="text" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Phone Number</label>
                  <input className={inputCls} placeholder="(555) 000-0000" type="tel" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} placeholder="john@example.com" type="email" />
                </div>
              </div>
            </section>

            {/* Project Address */}
            <section>
              <SectionHeader icon="location_on" title="Project Address" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8 rounded-xl bg-[#121412] border border-[#474846]/15">
                <div className="md:col-span-4 space-y-2">
                  <label className={labelCls}>Street Address</label>
                  <input className={inputCls} placeholder="123 Industrial Way" type="text" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className={labelCls}>City</label>
                  <input className={inputCls} placeholder="New York" type="text" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>State</label>
                  <input className={inputCls} placeholder="GA" type="text" maxLength={2} />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>ZIP Code</label>
                  <input className={inputCls} placeholder="10001" type="text" />
                </div>
              </div>
            </section>

            {/* Job Details */}
            <section>
              <SectionHeader icon="architecture" title="Job Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 p-8 rounded-xl bg-[#121412] border border-[#474846]/15">
                <div className="space-y-2">
                  <label className={labelCls}>Job Title</label>
                  <input className={inputCls} placeholder="Exterior Renovation" type="text" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Start Date</label>
                  <CustomDatePicker value={startDate} onChange={setStartDate} placeholder="dd/mm/yyyy" />
                </div>
                <div className="space-y-2 relative">
                  <label className={labelCls}>End Date</label>
                  <CustomDatePicker value={endDate} onChange={setEndDate} placeholder="dd/mm/yyyy" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>SQ</label>
                  <input className={inputCls} placeholder="e.g. 24.5" type="text" />
                </div>
              </div>
            </section>

            {/* Services Requested — Carousel */}
            <section>
              <SectionHeader icon="handyman" title="Services Requested" />
              <ServicesCarousel 
                services={services} 
                selected={selected} 
                toggle={toggle} 
                assignedPartners={assignedPartners}
                onAssignClick={setOpenPartnerModal}
              />
            </section>

            {/* Operational Status & Sales Person Wrapper */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 pb-4">
              
              {/* Operational Status / Gating */}
              <div className="flex flex-col">
                <SectionHeader icon="traffic" title="Operational Status" />
                <div className="p-8 rounded-xl bg-[#121412] border border-[#474846]/15 h-full">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#ababa8] ml-1">Initial Project Gate</label>
                    <div className="relative group w-full">
                      <select 
                        value={gateStatus}
                        onChange={(e) => setGateStatus(e.target.value as GateConfigKey)}
                        className="w-full appearance-none bg-[#0a0a0a] border border-[#474846] rounded-xl pl-12 pr-8 py-3.5 text-xs font-black uppercase tracking-widest text-[#faf9f5] shadow-inner focus:outline-none focus:border-[#aeee2a] cursor-pointer transition-colors custom-select-arrow"
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
                      
                      {/* Icone Visual Overlay */}
                      <div 
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 pointer-events-none"
                        style={{ 
                          backgroundColor: `${GATE_CONFIG[gateStatus].color}25`,
                          border: `1px solid ${GATE_CONFIG[gateStatus].color}40`,
                        }}
                      >
                         <span className="material-symbols-outlined text-[15px]" style={{ color: GATE_CONFIG[gateStatus].color }} translate="no">
                           {GATE_CONFIG[gateStatus].icon}
                         </span>
                      </div>

                      {/* Dropdown Icon */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#ababa8] group-hover:text-[#faf9f5] transition-colors">
                        <span className="material-symbols-outlined text-[20px]" translate="no">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sales Person (SP) */}
              <div className="flex flex-col">
                <SectionHeader icon="badge" title="Sales Person" />
                <div className="p-8 rounded-xl bg-[#121412] border border-[#474846]/15 h-full">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#ababa8] ml-1">Assigned Seller</label>
                     <div className="relative group w-full">
                      <select 
                        value={spStatus}
                        onChange={(e) => setSpStatus(e.target.value)}
                        className="w-full appearance-none bg-[#0a0a0a] border border-[#474846] rounded-xl pl-16 pr-8 py-3.5 text-xs font-black uppercase tracking-widest text-[#faf9f5] shadow-inner focus:outline-none focus:border-[#aeee2a] cursor-pointer transition-colors custom-select-arrow"
                      >
                        <option value="M">M</option>
                        <option value="R">Ruby (R)</option>
                        <option value="A">A</option>
                        <option value="F">F</option>
                      </select>
                      
                      {/* Avatar / Inicial Overlay */}
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 pointer-events-none bg-[#1a1c1a] border border-[#2a2d2a] text-[#4da8da]">
                        <span className="font-black text-sm uppercase">
                          {spStatus === 'R' ? 'R' : spStatus}
                        </span>
                      </div>

                      {/* Dropdown Icon */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#ababa8] group-hover:text-[#faf9f5] transition-colors">
                        <span className="material-symbols-outlined text-[20px]" translate="no">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Additional Information */}
            <section>
              <SectionHeader icon="description" title="Additional Information" />
              <div className="p-8 rounded-xl bg-[#121412] border border-[#474846]/15">
                <div className="space-y-2">
                  <label className={labelCls}>Project Notes</label>
                  <textarea
                    className={inputCls + " h-auto min-h-[160px] resize-none"}
                    placeholder="Provide any additional context or specific requirements for this job..."
                    rows={6}
                  />
                </div>
              </div>
            </section>

            {/* Footer Buttons */}
            <footer className="flex items-center justify-end gap-6 pt-4 pb-12">
              <Link href="/projects">
                <button
                  className="px-8 py-3 rounded-xl border border-[#474846] text-[#ababa8] font-bold hover:bg-[#1e201e] transition-all cursor-pointer"
                  type="button"
                >
                  Cancel
                </button>
              </Link>
              <button
                className="px-10 py-3 rounded-xl bg-[#aeee2a] text-[#3a5400] font-bold shadow-[0_0_20px_rgba(174,238,42,0.2)] hover:shadow-[0_0_30px_rgba(174,238,42,0.4)] transition-all active:scale-95 cursor-pointer"
                type="submit"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Create Job
              </button>
            </footer>
          </form>
        </div>
      </main>

      {/* ── Map Preview Panel — fixed to right side of viewport (xl+) ── */}
      <div className="hidden xl:block fixed right-0 top-0 h-full w-[400px] p-6 pointer-events-none z-30">
        <div className="h-full w-full glass-card rounded-3xl border border-[#474846]/20 overflow-hidden relative pointer-events-auto">
          {/* Map image */}
          <div className="absolute inset-0 z-0">
            <img
              className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
              alt="Satellite map urban neighborhood with green highlights"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1Hp59mrKmha0ODBeyPk5bl8FoQ_-pCzr3y4R0EOkrPC79zO2WLMO2uq9-zX4uwPDUQMP63wBc6jFub_Oy-oc9rkY0j4qRRM0a0fMGdcXQvjAHU--X04u5Y9OncI5Ioc-QR40P-tVWv3gU6u1bFzVPhy8q_rSp4-NbRGC02sjR30w5HYAN0Hf-iko-nfSiGSQvNqRMDAyag8Xj6nITm1FvZR8zDxwml64Tw8fo2hZWu5ARHsPhtXnEdPXliODUriv2h7xdpG43iKg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f0d] via-transparent to-transparent" />
          </div>

          {/* Panel content */}
          <div className="relative z-10 p-8 flex flex-col h-full">
            <div className="mb-auto">
              <h3
                className="text-xl font-bold text-[#aeee2a] mb-2"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Project Preview
              </h3>
              <p className="text-sm text-[#ababa8]">
                Visualizing job site impact and logistics based on entered address.
              </p>
            </div>

            <div className="bg-[#242624]/80 backdrop-blur-md p-6 rounded-2xl border border-[#474846]/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#aeee2a]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#aeee2a]" translate="no">
                    streetview
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase text-[#ababa8] font-bold">Pending Geolocation</p>
                  <p className="font-bold">Enter address to sync</p>
                </div>
              </div>
              <div className="w-full h-1 bg-[#121412] rounded-full overflow-hidden">
                <div className="h-full w-1/3 bg-[#aeee2a]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MODAL — ASSIGN PARTNER
      ════════════════════════════════════════════════════ */}
      {openPartnerModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setOpenPartnerModal(null)}>
            <div className="bg-[#181a18] border border-[#474846]/40 rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#aeee2a]/10 flex items-center justify-center border border-[#aeee2a]/20">
                      <span className="material-symbols-outlined text-[#aeee2a] text-[24px]" translate="no">
                        {openPartnerModal.icon}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">{openPartnerModal.label}</h2>
                      <p className="text-xs text-[#ababa8] mt-1 font-medium">Select a partner for this duty</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenPartnerModal(null)}
                    type="button"
                    className="w-8 h-8 rounded-full bg-[#242624] flex items-center justify-center hover:bg-[#aeee2a] hover:text-[#3a5400] transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm" translate="no">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2" style={{ scrollbarWidth: "none" }}>
                  {openPartnerModal.partners?.map((partner) => {
                    const isSelected = assignedPartners[openPartnerModal.id] === partner;
                    return (
                      <button
                        key={partner}
                        type="button"
                        onClick={() => {
                          setAssignedPartners((prev) => ({ ...prev, [openPartnerModal.id]: partner }));
                          setOpenPartnerModal(null);
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
                  
                  {assignedPartners[openPartnerModal.id] && (
                      <button 
                        type="button"
                        onClick={() => {
                          const current = { ...assignedPartners };
                          delete current[openPartnerModal.id];
                          setAssignedPartners(current);
                          setOpenPartnerModal(null);
                        }}
                        className="mt-4 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[#ba1212]/30 text-[#ba1212] hover:bg-[#ba1212]/10 transition-colors"
                      >
                        <span className="text-xs font-bold uppercase tracking-wider">Unassign Partner</span>
                      </button>
                  )}
                </div>
            </div>
         </div>
      )}
    </>
  );
}
