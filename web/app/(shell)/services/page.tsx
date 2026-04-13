"use client";

import { useState } from "react";
import { TopBar } from "../../../components/TopBar";

// =============================================
// Service Management
// Rota: /services
// =============================================

interface ServiceCard {
  name: string;
  borderColor: string;
  targetLabel: string;
  targetDate: string;
  badge: { label: string; style: string; icon?: string };
  progress: number;
  progressColor: string;
  progressLabel: string;
  blocker?: { icon: string; text: string; style: string };
  partner?: string;
  team?: string;
  unassigned?: boolean;
  actions: { label: string; style: string }[];
}

const services: ServiceCard[] = [
  {
    name: "Siding Installation",
    borderColor: "#ff7351",
    targetLabel: "Target Finish:",
    targetDate: "Oct 18, 2023",
    badge: { label: "Blocking", style: "bg-[#b92902] text-[#ffd2c8]", icon: "warning" },
    progress: 75,
    progressColor: "#aeee2a",
    progressLabel: "Completing exterior wrap",
    blocker: {
      icon: "report_problem",
      text: "Issue: Material Shortage: Cedar Siding",
      style: "bg-[#ff7351]/5 border border-[#ff7351]/10 text-[#ff7351]",
    },
    partner: "XICARA SIDING",
    team: "Team A",
    actions: [
      { label: "Message Crew", style: "border border-[#474846]/30 text-[#faf9f5] hover:bg-[#242624]" },
      { label: "View Details", style: "bg-[#aeee2a]/10 text-[#aeee2a] hover:bg-[#aeee2a]/20" },
    ],
  },
  {
    name: "Painting & Finishes",
    borderColor: "#aeee2a",
    targetLabel: "Target Finish:",
    targetDate: "Nov 05, 2023",
    badge: { label: "In Progress", style: "bg-[#aeee2a]/10 text-[#aeee2a]" },
    progress: 60,
    progressColor: "#aeee2a",
    progressLabel: "Priming second floor interiors",
    partner: "PAINT PRO LLC",
    team: "Crew 2",
    actions: [
      { label: "Message Crew", style: "border border-[#474846]/30 text-[#faf9f5] hover:bg-[#242624]" },
      { label: "View Details", style: "bg-[#aeee2a]/10 text-[#aeee2a] hover:bg-[#aeee2a]/20" },
    ],
  },
  {
    name: "Roofing & Insulation",
    borderColor: "#eedc47",
    targetLabel: "Target Finish:",
    targetDate: "Dec 01, 2023",
    badge: { label: "On Hold", style: "bg-[#fdeb54] text-[#5f5600]" },
    progress: 30,
    progressColor: "#aeee2a",
    progressLabel: "Awaiting permit clearance",
    blocker: {
      icon: "hourglass_empty",
      text: "Blocker: Permits - 30% processed",
      style: "bg-[#242624] border border-[#474846]/10 text-[#ababa8]",
    },
    partner: "ROOFING KINGS",
    team: "Specialists",
    actions: [
      { label: "Message Crew", style: "border border-[#474846]/30 text-[#faf9f5] hover:bg-[#242624]" },
      { label: "View Details", style: "bg-[#aeee2a]/10 text-[#aeee2a] hover:bg-[#aeee2a]/20" },
    ],
  },
  {
    name: "Custom Deck Build",
    borderColor: "#aeee2a",
    targetLabel: "Target Finish:",
    targetDate: "Oct 25, 2026",
    badge: { label: "Wrapping Up", style: "bg-[#aeee2a]/10 text-[#aeee2a]" },
    progress: 90,
    progressColor: "#aeee2a",
    progressLabel: "Final railing inspection",
    partner: "CUSTOM DECK PROS",
    team: "Master Team",
    actions: [
      { label: "Message Crew", style: "border border-[#474846]/30 text-[#faf9f5] hover:bg-[#242624]" },
      { label: "View Details", style: "bg-[#aeee2a]/10 text-[#aeee2a] hover:bg-[#aeee2a]/20" },
    ],
  },
  {
    name: "Window Replacement",
    borderColor: "#747673",
    targetLabel: "Target Start:",
    targetDate: "Jan 10, 2024",
    badge: { label: "Scheduled", style: "bg-[#242624] text-[#ababa8]" },
    progress: 0,
    progressColor: "#747673",
    progressLabel: "Waiting for structural completion",
    // Unassigned, sem partner
    unassigned: true,
    actions: [
      { label: "Assign Crew", style: "border border-[#474846]/30 text-[#faf9f5] hover:bg-[#242624]" },
      { label: "View Schedule", style: "bg-[#aeee2a]/10 text-[#aeee2a] hover:bg-[#aeee2a]/20" },
    ],
  },
];

const stats = [
  { label: "Active Personnel", value: "42", delta: "+4 Today", valueColor: "#aeee2a", deltaColor: "#aeee2a" },
  { label: "Total Progress (All Sites)", value: "68%", delta: "On Track", valueColor: "#aeee2a", deltaColor: "#aeee2a" },
  { label: "Material Fulfillment", value: "82%", delta: "2 Delays", valueColor: "#ff7351", deltaColor: "#ff7351" },
];

// ─── Card View (compacto) ────────────────────────────────────────
function ServiceCardItem({ svc, onAction }: { svc: ServiceCard; onAction?: (s: ServiceCard, a: string) => void }) {
  return (
    <div
      className="bg-[#121412] rounded-xl p-4 overflow-hidden hover:bg-[#181a18] transition-colors duration-300"
      style={{ borderLeft: `3px solid ${svc.borderColor}` }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-base font-bold leading-tight mb-0.5" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
            {svc.name}
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">{svc.targetLabel}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#faf9f5]">{svc.targetDate}</span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight flex items-center gap-1 ${svc.badge.style}`}>
          {svc.badge.icon && (
            <span className="material-symbols-outlined text-[11px]" translate="no">{svc.badge.icon}</span>
          )}
          {svc.badge.label}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between items-end mb-1">
          <span className="font-black text-lg" style={{ color: svc.progress === 0 ? "#ababa8" : "#aeee2a" }}>
            {svc.progress}%
          </span>
          <span className="text-[#ababa8] text-[10px]">{svc.progressLabel}</span>
        </div>
        <div className="h-1.5 w-full bg-[#242624] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${svc.progress}%`, backgroundColor: svc.progressColor }}
          />
        </div>
      </div>

      {/* Blocker */}
      {svc.blocker && (
        <div className={`rounded-lg p-2 mb-3 ${svc.blocker.style}`}>
          <p className="text-[10px] font-bold uppercase flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[13px]" translate="no">{svc.blocker.icon}</span>
            {svc.blocker.text}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className={`flex -space-x-2 ${svc.unassigned ? "opacity-50" : ""}`}>
          {svc.unassigned ? (
            <div className="px-2 h-7 rounded-full border border-[#242624] bg-[#242624] flex items-center justify-center text-[9px] font-bold text-[#ababa8]">
              Unassigned
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[#faf9f5] flex items-center gap-1.5 uppercase tracking-wide">
                <span className="material-symbols-outlined text-[13px] text-[#aeee2a]" translate="no">storefront</span>
                {svc.partner}
              </span>
              <span className="text-[9px] font-medium text-[#ababa8] ml-4.5">{svc.team}</span>
            </div>
          )}
        </div>
        <div className="flex gap-1.5">
          {svc.actions.map((action) => (
            <button
              key={action.label}
              onClick={() => onAction && onAction(svc, action.label)}
              className={`px-3 py-1.5 text-[9px] font-bold rounded-lg transition-colors uppercase tracking-widest cursor-pointer hover:scale-[1.02] active:scale-95 ${action.style}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────
function ServiceListItem({ svc, onAction }: { svc: ServiceCard; onAction?: (s: ServiceCard, a: string) => void }) {
  return (
    <div
      className="bg-[#121412] rounded-xl px-4 py-3 flex items-center gap-4 hover:bg-[#181a18] transition-colors duration-200"
      style={{ borderLeft: `3px solid ${svc.borderColor}` }}
    >
      {/* Nome + data */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{svc.name}</p>
        <p className="text-[10px] text-[#ababa8]">{svc.targetLabel} {svc.targetDate}</p>
      </div>

      {/* Badge */}
      <span className={`hidden sm:flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight items-center gap-1 whitespace-nowrap ${svc.badge.style}`}>
        {svc.badge.icon && <span className="material-symbols-outlined text-[11px]" translate="no">{svc.badge.icon}</span>}
        {svc.badge.label}
      </span>

      {/* Progress bar + % */}
      <div className="hidden md:flex items-center gap-2 w-36">
        <div className="flex-1 h-1.5 bg-[#242624] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${svc.progress}%`, backgroundColor: svc.progressColor }} />
        </div>
        <span className="text-[10px] font-bold w-7 text-right" style={{ color: svc.progress === 0 ? "#ababa8" : "#aeee2a" }}>
          {svc.progress}%
        </span>
      </div>

      {/* Avatars */}
      <div className={`hidden lg:flex -space-x-2 ${svc.unassigned ? "opacity-40" : ""}`}>
        {svc.unassigned ? (
          <span className="text-[9px] text-[#ababa8]">Unassigned</span>
        ) : (
          <div className="flex flex-col ml-2">
            <span className="text-[10px] font-black text-[#faf9f5] uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px] text-[#aeee2a]" translate="no">storefront</span>
              {svc.partner}
            </span>
            <span className="text-[8px] font-medium text-[#ababa8] ml-4">{svc.team}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        {svc.actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onAction && onAction(svc, action.label)}
            className={`px-3 py-1.5 text-[9px] font-bold rounded-lg transition-colors uppercase tracking-widest cursor-pointer hover:scale-[1.02] active:scale-95 ${action.style}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Service Details Modal ─────────────────────────────────────────
function ServiceDetailsModal({ selectedService, onClose }: { selectedService: ServiceCard; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const tabs = ["Overview", "Daily Logs", "Materials", "Issues"];

  if (!selectedService) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#121412] w-full max-w-4xl h-[90vh] rounded-3xl border border-[#474846]/30 shadow-2xl flex flex-col overflow-hidden relative shadow-[0_10px_50px_rgba(0,0,0,0.8)]"
        style={{ borderTop: `4px solid ${selectedService.borderColor}` }}
      >
        
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-5 sm:px-8 sm:py-6 border-b border-[#474846]/20 bg-[#181a18]/50 shrink-0">
           <div>
             <div className="flex items-center gap-3 mb-1">
               <h2 className="text-2xl font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                 {selectedService.name}
               </h2>
               <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${selectedService.badge.style}`}>
                 {selectedService.badge.icon && <span className="material-symbols-outlined text-[12px]" translate="no">{selectedService.badge.icon}</span>}
                 {selectedService.badge.label}
               </span>
             </div>
             <p className="text-[#ababa8] text-xs">
               {selectedService.targetLabel} <span className="text-[#faf9f5] font-bold">{selectedService.targetDate}</span>
             </p>
           </div>
           <button 
             onClick={onClose} 
             className="w-8 h-8 rounded-full bg-[#242624] hover:bg-[#474846]/50 flex items-center justify-center transition-colors cursor-pointer"
           >
             <span className="material-symbols-outlined text-[18px] text-[#faf9f5]" translate="no">close</span>
           </button>
        </div>

        {/* Tabs */}
        <div className="px-6 sm:px-8 border-b border-[#474846]/20 bg-[#181a18] flex gap-6 shrink-0 pt-2">
          {tabs.map((tab) => (
            <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors cursor-pointer ${
                 activeTab === tab 
                 ? "border-[#aeee2a] text-[#aeee2a]" 
                 : "border-transparent text-[#ababa8] hover:text-[#faf9f5]"
               }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-[#121412]">
          
          {/* Aba: OVERVIEW */}
          {activeTab === "Overview" && (
            <div className="space-y-6 animate-in fade-in duration-300">
               {/* Status Principal */}
               <div className="bg-[#181a18] p-6 rounded-2xl border border-[#474846]/20">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-[#ababa8] mb-1">Current Status</p>
                      <h3 className="text-xl font-bold text-[#faf9f5]">{selectedService.progressLabel}</h3>
                    </div>
                    <span className="text-4xl font-extrabold" style={{ color: selectedService.progress === 0 ? "#ababa8" : "#aeee2a" }}>
                      {selectedService.progress}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-[#242624] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${selectedService.progress}%`, backgroundColor: selectedService.progressColor }}
                    />
                  </div>
               </div>

               {/* Crews & Timelines */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Assigned Crew */}
                 <div>
                    <h4 className="text-xs uppercase font-black tracking-widest text-[#ababa8] mb-4">Assigned Personnel</h4>
                    <div className="bg-[#181a18] rounded-2xl p-5 border border-[#474846]/20">
                      {selectedService.unassigned ? (
                        <div className="flex items-center gap-3 text-[#ababa8]">
                           <span className="material-symbols-outlined" translate="no">person_off</span>
                           <span className="text-sm font-bold">No crew assigned yet.</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 bg-[#121412] rounded-xl border border-[#474846]/30 text-center">
                          <div className="w-14 h-14 rounded-full bg-[#242624] flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-2xl text-[#aeee2a]" translate="no">storefront</span>
                          </div>
                          <h5 className="text-sm font-bold text-[#faf9f5] uppercase tracking-wide">{selectedService.partner}</h5>
                          <p className="text-[10px] text-[#ababa8] uppercase mt-1">{selectedService.team}</p>
                          <div className="mt-3 px-3 py-1 bg-[#aeee2a]/10 text-[#aeee2a] border border-[#aeee2a]/20 text-[9px] font-black uppercase tracking-widest rounded-full">
                            Active On-Site
                          </div>
                        </div>
                      )}
                    </div>
                 </div>

                 {/* Checklist */}
                 <div>
                    <h4 className="text-xs uppercase font-black tracking-widest text-[#ababa8] mb-4">Scope of Work</h4>
                    <div className="bg-[#181a18] rounded-2xl p-5 border border-[#474846]/20 space-y-3">
                      {['Site Preparation & Safety check', 'Material Unloading', 'Primary Installation', 'Quality Inspection', 'Final Sign-off'].map((task, i) => {
                         const isDone = i < 2;
                         const isCurrent = i === 2;
                         return (
                           <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${isDone ? 'opacity-50' : ''} ${isCurrent ? 'bg-[#242624]' : ''}`}>
                             <div className={`w-5 h-5 rounded flex items-center justify-center border ${isDone ? 'bg-[#aeee2a] border-[#aeee2a] text-[#121412]' : 'border-[#474846] text-transparent'}`}>
                               <span className="material-symbols-outlined text-[14px]" translate="no">check</span>
                             </div>
                             <span className="text-sm font-medium text-[#faf9f5]">{task}</span>
                           </div>
                         );
                      })}
                    </div>
                 </div>
               </div>
            </div>
          )}

          {/* Aba: DAILY LOGS */}
          {activeTab === "Daily Logs" && (
            <div className="space-y-4 animate-in fade-in duration-300">              
              <div className="bg-[#181a18] p-5 rounded-2xl border border-[#474846]/20 flex gap-4">
                 <div className="w-12 h-12 bg-[#242624] rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#aeee2a] text-xl" translate="no">photo_camera</span>
                 </div>
                 <div>
                   <p className="text-xs font-black text-[#ababa8] mb-1">TODAY, 2:45 PM • Added by Crew Leader</p>
                   <p className="text-sm font-medium text-[#faf9f5] mb-3 leading-relaxed">
                     Completed the framing checks on the west wing. Material looks solid, zero structural issues found during our internal sweep. We will start installing the first layers tomorrow.
                   </p>
                   <div className="flex gap-2">
                     <div className="w-24 h-16 bg-[#242624] rounded-lg border border-[#474846]/30 overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity">
                       <img src="https://images.unsplash.com/photo-1541888081622-c2e99d86b86e" alt="Site" className="w-full h-full object-cover" />
                     </div>
                     <div className="w-24 h-16 bg-[#242624] rounded-lg border border-[#474846]/30 overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity">
                       <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e" alt="Site" className="w-full h-full object-cover" />
                     </div>
                   </div>
                 </div>
              </div>

              <div className="bg-[#181a18] p-5 rounded-2xl border border-[#474846]/20 flex gap-4 opacity-75">
                 <div className="w-12 h-12 bg-[#242624] rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#ababa8] text-xl" translate="no">edit_note</span>
                 </div>
                 <div>
                   <p className="text-xs font-black text-[#ababa8] mb-1">YESTERDAY, 4:00 PM • Added by Inspector</p>
                   <p className="text-sm font-medium text-[#faf9f5] leading-relaxed">
                     Initial site clearance received. Wait for the weather to clear up before bringing the heavy machinery to the entrance.
                   </p>
                 </div>
              </div>
            </div>
          )}

          {/* Aba: MATERIALS */}
          {activeTab === "Materials" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-[#181a18] rounded-2xl border border-[#474846]/20 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#242624] text-[10px] uppercase font-black tracking-widest text-[#ababa8] border-b border-[#474846]/30">
                      <th className="p-4 py-3">Item Description</th>
                      <th className="p-4 py-3 text-center">Qty / Unit</th>
                      <th className="p-4 py-3 text-right">Fulfillment Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    <tr className="border-b border-[#474846]/20 hover:bg-[#242624]/50">
                      <td className="p-4 py-3 flex items-center gap-3">
                         <span className="material-symbols-outlined text-[#ababa8] text-lg" translate="no">inventory_2</span>
                         <span className="text-[#faf9f5]">Premium Cedar Siding Panels</span>
                      </td>
                      <td className="p-4 py-3 text-center text-[#ababa8]">120 sqft</td>
                      <td className="p-4 py-3 text-right text-[#aeee2a]">Delivered</td>
                    </tr>
                    <tr className="border-b border-[#474846]/20 hover:bg-[#242624]/50">
                      <td className="p-4 py-3 flex items-center gap-3">
                         <span className="material-symbols-outlined text-[#ababa8] text-lg" translate="no">inventory_2</span>
                         <span className="text-[#faf9f5]">Weather-Resistant Wrap</span>
                      </td>
                      <td className="p-4 py-3 text-center text-[#ababa8]">4 Rolls</td>
                      <td className="p-4 py-3 text-right text-[#aeee2a]">Delivered</td>
                    </tr>
                    <tr className="border-b border-[#474846]/20 bg-[#ff7351]/5 hover:bg-[#ff7351]/10">
                      <td className="p-4 py-3 flex items-center gap-3">
                         <span className="material-symbols-outlined text-[#ff7351] text-lg" translate="no">warning</span>
                         <span className="text-[#faf9f5]">Galvanized Nails (Box)</span>
                      </td>
                      <td className="p-4 py-3 text-center text-[#ababa8]">15 Boxes</td>
                      <td className="p-4 py-3 text-right text-[#ff7351]">Delayed Delivery</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Aba: ISSUES */}
          {activeTab === "Issues" && (
            <div className="space-y-4 animate-in fade-in duration-300">
               {selectedService.blocker ? (
                 <div className={`p-6 rounded-2xl border ${selectedService.blocker.style.replace('border-none', '')}`}>
                   <div className="flex justify-between items-start mb-3">
                     <h4 className="text-xs uppercase font-black tracking-widest flex items-center gap-1.5 opacity-80">
                       <span className="material-symbols-outlined text-[16px]" translate="no">{selectedService.blocker.icon}</span>
                       Active Blocker Logged
                     </h4>
                     <span className="text-[10px] font-bold bg-black/20 text-white px-2 py-1 rounded">High Priority</span>
                   </div>
                   <p className="text-base font-bold text-[#faf9f5] mb-2">{selectedService.blocker.text}</p>
                   <p className="text-sm opacity-70 leading-relaxed text-[#ababa8]">
                     This issue requires immediate attention from the operations coordinator. The material order #4829 has been delayed by the supplier and until it arrives, the primary installation phase is officially blocked, which might affect the target finish date.
                   </p>
                 </div>
               ) : (
                 <div className="p-8 rounded-2xl border border-[#474846]/20 bg-[#181a18] text-center flex flex-col items-center gap-3">
                   <div className="w-12 h-12 rounded-full bg-[#242624] flex items-center justify-center">
                     <span className="material-symbols-outlined text-[#aeee2a]" translate="no">check_circle</span>
                   </div>
                   <div>
                     <p className="text-base font-bold text-[#faf9f5]">All Clear</p>
                     <p className="text-sm font-medium text-[#ababa8] mt-1">No active issues or blockers reported for this service line.</p>
                   </div>
                 </div>
               )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:px-8 border-t border-[#474846]/20 bg-[#181a18]/50 flex justify-end shrink-0">
           <button className="px-6 py-2.5 rounded-xl bg-[#aeee2a] hover:bg-[#a0df14] text-[#3a5400] text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-[0_0_15px_rgba(174,238,42,0.15)] flex items-center gap-2">
             Message Crew
             <span className="material-symbols-outlined text-[16px]" translate="no">chat</span>
           </button>
        </div>
        
      </div>
    </div>
  );
}

// ─── Custom Date Picker Dropup ────────────────────────────────────────────────
function CustomDatePickerDropup({ label }: { label: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"days" | "months">("days");
  
  // Real calendar state
  const currentDate = new Date();
  // We use current Year 2026 for demonstration if needed, or stick to real date
  const [currentMonthIndex, setCurrentMonthIndex] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(2026); // Fixed at 2026 for Siding Depot Context, or dynamic

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const fullMonthMap: Record<number, string> = {
    0: 'janeiro', 1: 'fevereiro', 2: 'março', 3: 'abril', 
    4: 'maio', 5: 'junho', 6: 'julho', 7: 'agosto', 
    8: 'setembro', 9: 'outubro', 10: 'novembro', 11: 'dezembro'
  };

  // Calendar logic helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonthIndex);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonthIndex);
  const daysInPrevMonth = getDaysInMonth(currentYear, currentMonthIndex - 1);

  const currentMonthDays = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);
  const prevMonthFillers = Array.from({ length: firstDay }, (_, i) => daysInPrevMonth - firstDay + i + 1);
  
  const totalSlots = prevMonthFillers.length + currentMonthDays.length;
  const nextMonthLength = totalSlots % 7 === 0 ? 0 : 7 - (totalSlots % 7);
  const nextMonthFillers = Array.from({ length: nextMonthLength }, (_, i) => i + 1);

  return (
    <div className="space-y-2 relative">
      <label className="text-[10px] uppercase font-black tracking-widest text-[#ababa8]">{label}</label>
      
      {/* Input box that triggers the dropup */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#181a18] border py-4 px-4 rounded-xl text-sm flex items-center justify-between cursor-pointer transition-all ${
          isOpen ? "border-[#aeee2a] text-[#faf9f5]" : "border-[#474846]/30 text-[#ababa8] hover:border-[#aeee2a]/50"
        }`}
      >
        <span className={selectedDate ? "text-[#faf9f5]" : "text-[#747673]"}>
          {selectedDate ? `${selectedDate.toString().padStart(2, '0')}/${(currentMonthIndex + 1).toString().padStart(2, '0')}/${currentYear}` : "dd/mm/aaaa"}
        </span>
        <span className="material-symbols-outlined text-[18px]" translate="no">calendar_today</span>
      </div>

      {/* The floating Dropup */}
      {isOpen && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 w-[260px] bg-[#242624] border border-[#474846]/40 rounded-xl shadow-2xl z-[150] p-3 animate-in fade-in slide-in-from-bottom-2">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-3 border-b border-[#474846]/20 pb-2">
            <button 
              onClick={() => setViewMode(viewMode === "days" ? "months" : "days")}
              className="text-[#faf9f5] text-xs font-bold flex items-center gap-1 hover:text-[#aeee2a] transition-colors cursor-pointer"
            >
              {viewMode === "days" ? `${fullMonthMap[currentMonthIndex]} de ${currentYear}` : `${currentYear}`}
              <span className="material-symbols-outlined text-[14px]" translate="no">
                {viewMode === "days" ? "arrow_drop_down" : "arrow_drop_up"}
              </span>
            </button>
          </div>

          {/* View: Days */}
          {viewMode === "days" && (
            <>
              {/* Weekdays */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                  <span key={i} className="text-[#ababa8] font-black text-[9px] uppercase tracking-wider">{d}</span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {/* Offset fillers */}
                {prevMonthFillers.map(d => (
                  <span key={`prev-${d}`} className="text-[#474846] text-[11px] py-1 cursor-not-allowed">{d}</span>
                ))}
                
                {currentMonthDays.map(d => (
                  <button 
                    key={`day-${d}`} 
                    onClick={() => { setSelectedDate(d); setIsOpen(false); }}
                    className={`text-[11px] py-1 rounded transition-all cursor-pointer ${
                      selectedDate === d 
                        ? "bg-[rgba(90,139,250,0.2)] text-[#5A8BFA] border border-[#5A8BFA] font-bold" 
                        : "text-[#faf9f5] hover:bg-[#474846]/50"
                    }`}
                  >
                    {d}
                  </button>
                ))}
                
                {/* Trailing fillers */}
                {nextMonthFillers.map(d => (
                  <span key={`next-${d}`} className="text-[#474846] text-[11px] py-1 cursor-not-allowed">{d}</span>
                ))}
              </div>
            </>
          )}

          {/* View: Months */}
          {viewMode === "months" && (
            <div className="grid grid-cols-3 gap-2 mb-2 pt-1 pb-2 relative z-10 w-full">
              {months.map((m, index) => (
                <button
                  key={m}
                  onClick={() => {
                    setCurrentMonthIndex(index);
                    setSelectedDate(null); // Reset day when changing month to avoid invalid dates like Feb 30
                    setViewMode("days");
                  }}
                  className={`text-[11px] py-3 rounded-lg font-bold transition-all cursor-pointer ${
                    currentMonthIndex === index
                      ? "bg-[rgba(90,139,250,0.2)] text-[#5A8BFA] border border-[#5A8BFA]" 
                      : "text-[#faf9f5] bg-[#181a18] border border-[#474846]/30 hover:border-[#aeee2a]/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#474846]/20">
            <button 
              onClick={() => { setSelectedDate(null); setIsOpen(false); setViewMode("days"); }} 
              className="text-[#5A8BFA] hover:text-white transition-colors text-[11px] font-bold tracking-wide cursor-pointer uppercase"
            >
              Limpar
            </button>
            <button 
              onClick={() => { 
                const now = new Date();
                setCurrentMonthIndex(now.getMonth()); 
                setCurrentYear(2026); // Fixed at 2026 for Siding Depot Context
                setSelectedDate(now.getDate()); 
                setIsOpen(false); 
                setViewMode("days"); 
              }} 
              className="text-[#5A8BFA] hover:text-white transition-colors text-[11px] font-bold tracking-wide cursor-pointer uppercase"
            >
              Hoje
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── New Service Modal ────────────────────────────────────────────────────────
function NewServiceModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121412] w-full max-w-2xl rounded-3xl border border-[#474846]/30 shadow-2xl flex flex-col overflow-hidden relative shadow-[0_10px_50px_rgba(0,0,0,0.8)] border-t-[4px] border-t-[#aeee2a]">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between p-6 sm:p-8 border-b border-[#474846]/20 bg-[#181a18]/50">
          <div>
            <h2 className="text-3xl font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
              Initialize New Service
            </h2>
            <p className="text-[#ababa8] text-sm mt-1">
              Deploy a new technical stream. It must be attached to an active project.
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[#242624] hover:bg-[#474846]/50 flex items-center justify-center transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[#faf9f5]" translate="no">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-7 bg-[#121412]">
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-[#ababa8]">Assigned Project *</label>
            <div className="relative">
              <select defaultValue="" className="w-full appearance-none bg-[#181a18] border border-[#474846]/30 py-4 pl-4 pr-10 rounded-xl text-sm text-[#faf9f5] font-medium cursor-pointer focus:ring-1 focus:ring-[#aeee2a] outline-none hover:border-[#aeee2a]/50 transition-colors">
                <option value="" disabled>Select an active project...</option>
                <option>Residence Varela - 123 Main St</option>
                <option>Tower Alpha - 88 Business Blvd</option>
                <option>Sunset Boulevard Estate</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#ababa8] pointer-events-none" translate="no">expand_more</span>
            </div>
            
            {/* Aviso de Prevenção - Arquitetura Segura */}
            <p className="text-[10px] font-bold text-[#ff7351] flex items-center gap-1.5 mt-2 bg-[#ff7351]/5 border border-[#ff7351]/10 px-3 py-2 rounded-lg">
              <span className="material-symbols-outlined text-[16px]" translate="no">error</span>
              If the project doesn't exist yet, you must create its main envelope in the Projects module first.
            </p>
          </div>


          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-[#ababa8]">Assigned Partner</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#ababa8] pointer-events-none text-[18px]" translate="no">storefront</span>
              <select defaultValue="" className="w-full appearance-none bg-[#181a18] border border-[#474846]/30 py-4 pl-11 pr-10 rounded-xl text-sm text-[#faf9f5] font-medium cursor-pointer focus:ring-1 focus:ring-[#aeee2a] outline-none hover:border-[#aeee2a]/50 transition-colors">
                <option value="" disabled>Select a partner...</option>
                <optgroup label="── Siding Crews ──">
                  <option value="XICARA">XICARA</option>
                  <option value="XICARA 2">XICARA 2</option>
                  <option value="WILMAR">WILMAR</option>
                  <option value="WILMAR 2">WILMAR 2</option>
                  <option value="SULA">SULA</option>
                  <option value="LUIZ">LUIZ</option>
                </optgroup>
                <optgroup label="── Doors / Windows ──">
                  <option value="SERGIO">SERGIO</option>
                </optgroup>
                <optgroup label="── Paint Crews ──">
                  <option value="OSVIN">OSVIN</option>
                  <option value="OSVIN 2">OSVIN 2</option>
                  <option value="VICTOR">VICTOR</option>
                  <option value="JUAN">JUAN</option>
                </optgroup>
                <optgroup label="── Gutters ──">
                  <option value="LEANDRO">LEANDRO</option>
                </optgroup>
                <optgroup label="── Roofing ──">
                  <option value="JOSUE">JOSUE</option>
                </optgroup>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#ababa8] pointer-events-none" translate="no">expand_more</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black tracking-widest text-[#ababa8]">Service Discipline</label>
            <div className="relative">
              <select className="w-full appearance-none bg-[#181a18] border border-[#474846]/30 py-4 pl-4 pr-10 rounded-xl text-sm text-[#faf9f5] font-medium cursor-pointer focus:ring-1 focus:ring-[#aeee2a] outline-none hover:border-[#aeee2a]/50 transition-colors">
                <option>Siding &amp; Exteriors</option>
                <option>Roofing</option>
                <option>Windows &amp; Doors</option>
                <option>Gutters &amp; Downspouts</option>
                <option>Decks &amp; Patios</option>
                <option>Exterior Painting</option>
                <option>Dumpster</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#ababa8] pointer-events-none" translate="no">expand_more</span>
            </div>
          </div>


          <div className="grid grid-cols-2 gap-4">
             <CustomDatePickerDropup label="Target Start" />
             <CustomDatePickerDropup label="Target Finish" />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-[#474846]/20 bg-[#181a18]/50 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-6 py-3 rounded-xl border border-[#474846]/40 text-[#faf9f5] text-xs font-bold uppercase tracking-widest hover:bg-[#242624] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button className="px-6 py-3 rounded-xl bg-[#aeee2a] hover:bg-[#a0df14] text-[#3a5400] text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shadow-[0_0_15px_rgba(174,238,42,0.15)] flex items-center gap-2">
            Create Service Log
            <span className="material-symbols-outlined text-[16px]" translate="no">check_circle</span>
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function ServicesPage() {
  const [view, setView] = useState<"card" | "list">("card");
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceCard | null>(null);

  const handleAction = (svc: ServiceCard, action: string) => {
    if (action === "View Details") {
      setSelectedService(svc);
    }
  };

  return (
    <>
      <TopBar
        title="Service Management"
        leftSlot={
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#ababa8] text-sm" translate="no">
              search
            </span>
            <input
              className="bg-[#181a18] border-none rounded-lg pl-10 pr-4 py-2 text-sm text-[#faf9f5] w-64 focus:ring-1 focus:ring-[#aeee2a] transition-all outline-none placeholder:text-[#ababa8]"
              placeholder="Search services..."
              type="text"
            />
          </div>
        }
      />

      <main className="p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
            <div>
              <h2 className="text-4xl font-extrabold tracking-tighter mb-2" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                Service Management
              </h2>
              <p className="text-[#ababa8] font-medium">Overseeing 12 active construction streams across 3 sites.</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle Card / Lista */}
              <div className="flex items-center bg-[#181a18] rounded-xl p-1 gap-1">
                <button
                  onClick={() => setView("card")}
                  title="Visualização em Cards"
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                    view === "card" ? "bg-[#aeee2a]/15 text-[#aeee2a]" : "text-[#ababa8] hover:text-[#faf9f5]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" translate="no">grid_view</span>
                </button>
                <button
                  onClick={() => setView("list")}
                  title="Visualização em Lista"
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
                    view === "list" ? "bg-[#aeee2a]/15 text-[#aeee2a]" : "text-[#ababa8] hover:text-[#faf9f5]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" translate="no">view_list</span>
                </button>
              </div>

              {/* Filter */}
              <div className="relative">
                <select className="appearance-none bg-[#181a18] border-none py-2.5 pl-4 pr-10 rounded-xl text-sm text-[#faf9f5] font-medium cursor-pointer focus:ring-1 focus:ring-[#aeee2a] outline-none">
                  <option>All Services</option>
                  <option>Siding & Exteriors</option>
                  <option>Roofing</option>
                  <option>Windows & Doors</option>
                  <option>Gutters & Downspouts</option>
                  <option>Decks & Patios</option>
                  <option>Exterior Painting</option>
                  <option>Dumpster</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#ababa8] text-sm" translate="no">
                  expand_more
                </span>
              </div>

              {/* New Service */}
              <button 
                onClick={() => setIsNewServiceModalOpen(true)}
                className="bg-[#aeee2a] hover:bg-[#a0df14] text-[#3a5400] font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(174,238,42,0.1)] cursor-pointer text-sm"
              >
                <span className="material-symbols-outlined text-[18px]" translate="no">add_circle</span>
                <span>New Service</span>
              </button>
            </div>
          </div>

          {/* Stats Ticker — topo, visível logo de cara */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="glass-card rounded-2xl p-5 border border-[#474846]/10">
                <p className="text-[10px] font-black text-[#ababa8] uppercase tracking-widest mb-1">{s.label}</p>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-extrabold" style={{ fontFamily: "Manrope, system-ui, sans-serif", color: s.valueColor }}>
                    {s.value}
                  </span>
                  <span className="text-xs font-bold mb-1" style={{ color: s.deltaColor, opacity: 0.6 }}>
                    {s.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Services */}
          {view === "card" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {services.map((svc) => (
                <ServiceCardItem key={svc.name} svc={svc} onAction={handleAction} />
              ))}


            </div>
          )}

          {/* Services — List View */}
          {view === "list" && (
            <div className="flex flex-col gap-2">
              {services.map((svc) => (
                <ServiceListItem key={svc.name} svc={svc} onAction={handleAction} />
              ))}


            </div>
          )}


        </div>
      </main>

      {/* ─── Service Details Modal ─── */}
      {selectedService && (
        <ServiceDetailsModal 
          selectedService={selectedService} 
          onClose={() => setSelectedService(null)} 
        />
      )}

      {isNewServiceModalOpen && (
        <NewServiceModal onClose={() => setIsNewServiceModalOpen(false)} />
      )}
    </>
  );
}
