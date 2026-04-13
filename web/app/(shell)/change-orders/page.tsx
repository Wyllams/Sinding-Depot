"use client";

import { useState } from "react";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { TopBar } from "../../../components/TopBar";

// =============================================
// Change Orders & Approvals
// Ported from Stitch HTML (Alterações de Pedido e Aprovações.txt)
// Rota: /change-orders
// =============================================

interface ChangeOrder {
  code: string;
  date: string;
  client: string;
  description: string;
  amount: string;
  badge: { label: string; style: string };
}

const orders: ChangeOrder[] = [
  {
    code: "CO-942",
    date: "24 OCT 2023",
    client: "Apex Developments",
    description: "RFI-112: Foundation Wall Reinforcement due to seismic code update.",
    amount: "$18,450.00",
    badge: { label: "APPROVED", style: "bg-[#aeee2a]/20 text-[#aeee2a]" },
  },
  {
    code: "CO-941",
    date: "23 OCT 2023",
    client: "Zenith Heights",
    description: "Electrical conduit rerouting for main lobby lighting fixtures.",
    amount: "$4,200.00",
    badge: { label: "SENT", style: "bg-[#e3eb5d]/10 text-[#e3eb5d]" },
  },
  {
    code: "CO-940",
    date: "22 OCT 2023",
    client: "Harbor Plaza",
    description: "HVAC ductwork adjustment for Floor 4 server room ventilation.",
    amount: "$12,900.00",
    badge: { label: "DRAFT", style: "bg-[#fff7cf]/10 text-[#fff7cf]" },
  },
  {
    code: "CO-939",
    date: "20 OCT 2023",
    client: "Apex Developments",
    description: "Exterior facade glazing replacement for sustainable glass units.",
    amount: "$45,000.00",
    badge: { label: "APPROVED", style: "bg-[#aeee2a]/20 text-[#aeee2a]" },
  },
  {
    code: "CO-938",
    date: "19 OCT 2023",
    client: "Riverside Lofts",
    description: "Kitchen cabinetry specification upgrade for Phase 1 units.",
    amount: "$3,150.00",
    badge: { label: "APPROVED", style: "bg-[#aeee2a]/20 text-[#aeee2a]" },
  },
  {
    code: "CO-937",
    date: "18 OCT 2023",
    client: "Apex Developments",
    description: "Landscape plumbing relocation due to utility main conflict.",
    amount: "$7,800.00",
    badge: { label: "SENT", style: "bg-[#e3eb5d]/10 text-[#e3eb5d]" },
  },
];

const attachments = [
  { icon: "description", iconColor: "#e3eb5d", name: "Architectural_Plan_V3.pdf" },
  { icon: "image", iconColor: "#aeee2a", name: "OnSite_Photo_1.jpg" },
];

export default function ChangeOrdersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd,   setFilterEnd]   = useState("");

  const filteredOrders = orders.filter((o) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "APPROVED") return o.badge.label === "APPROVED";
    if (activeFilter === "PENDING") return o.badge.label === "SENT" || o.badge.label === "DRAFT";
    return true;
  });

  return (
    <>
      <TopBar
        title="Change Orders & Approvals"
        leftSlot={
          <div className="relative group">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#ababa8] group-focus-within:text-[#aeee2a] transition-colors"
              translate="no"
            >
              search
            </span>
            <input
              className="bg-[#1e201e] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm w-[280px] focus:ring-1 focus:ring-[#aeee2a] text-[#faf9f5] outline-none placeholder:text-[#ababa8]"
              placeholder="Search Change Orders"
              type="text"
            />
          </div>
        }
      />

      <div className="flex flex-col min-h-screen pb-20">

        {/* Page Title under TopBar */}
        <div className="px-8 pt-8 pb-4">
          <h1
            className="text-3xl font-extrabold text-[#faf9f5] tracking-tighter"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
          >
            Change Orders &amp; Approvals
          </h1>
          <p className="text-[#ababa8] text-sm mt-1">Track and manage financial structural adjustments.</p>
        </div>

        {/* Filters Bar */}
        <section className="px-8 mb-8 flex flex-wrap gap-4 items-center">
          {/* Status toggle */}
          <div className="flex bg-[#121412] p-1 rounded-xl">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeFilter === "ALL"
                  ? "bg-[#242624] text-[#aeee2a]"
                  : "text-[#ababa8] hover:text-[#faf9f5]"
              }`}
            >
              ALL ORDERS
            </button>
            <button
              onClick={() => setActiveFilter("PENDING")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeFilter === "PENDING"
                  ? "bg-[#242624] text-[#e3eb5d]"
                  : "text-[#ababa8] hover:text-[#faf9f5]"
              }`}
            >
              PENDING
            </button>
            <button
              onClick={() => setActiveFilter("APPROVED")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeFilter === "APPROVED"
                  ? "bg-[#242624] text-[#aeee2a]"
                  : "text-[#ababa8] hover:text-[#faf9f5]"
              }`}
            >
              APPROVED
            </button>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-[#474846]/30 hidden sm:block" />

          {/* Spacer — empurra date range + botões para a direita */}
          <div className="flex-1" />

          {/* Date range filters */}
          <div className="flex items-center gap-2">
            <CustomDatePicker
              value={filterStart ?? ""}
              onChange={setFilterStart}
              placeholder="Start date"
              disableSundays={false}
              className="w-44"
            />
            <span className="text-[#ababa8] text-[10px] font-black uppercase tracking-widest px-1">→</span>
            <CustomDatePicker
              value={filterEnd ?? ""}
              onChange={setFilterEnd}
              placeholder="End date"
              disableSundays={false}
              className="w-44"
              alignRight={true}
            />
          </div>


          {/* Create Change Order Componente Lateral */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#aeee2a] rounded-xl text-sm font-bold text-[#3a5400] shadow-[0_0_15px_rgba(174,238,42,0.15)] hover:shadow-[0_0_25px_rgba(174,238,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]" translate="no">add</span>
            Create Change Order
          </button>
        </section>

        {/* Change Order Cards Grid */}
        <section className="px-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <div
              key={order.code}
              className="p-6 rounded-2xl flex flex-col justify-between group hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
              style={{
                background: "rgba(36,38,36,0.4)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(174,238,42,0.08)",
              }}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-[#ababa8] tracking-widest uppercase">
                      {order.code} • {order.date}
                    </p>
                    <h3
                      className="text-lg font-bold mt-1 group-hover:text-[#aeee2a] transition-colors"
                      style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                    >
                      {order.client}
                    </h3>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${order.badge.style}`}
                  >
                    {order.badge.label}
                  </span>
                </div>
                <p className="text-[#ababa8] text-sm leading-relaxed mb-6">{order.description}</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-[#ababa8]">Amount</p>
                  <p
                    className="text-2xl font-black text-[#aeee2a]"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    {order.amount}
                  </p>
                </div>
                <button className="w-10 h-10 flex items-center justify-center bg-[#242624] rounded-xl text-[#ababa8] hover:bg-[#aeee2a] hover:text-[#242624] hover:shadow-[0_0_15px_rgba(174,238,42,0.15)] hover:scale-105 active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-[20px]" translate="no">open_in_new</span>
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* ════════════════════════════════════════════════════
          MODAL — CREATE CHANGE ORDER
      ════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
             className="bg-[#181a18] border border-[#474846]/40 rounded-3xl shadow-2xl w-full max-w-3xl p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" 
             style={{ scrollbarWidth: 'none' }}
             onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-8 bg-[#aeee2a] rounded-full" />
                <h2
                  className="text-2xl font-extrabold text-[#faf9f5]"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  Create New Change Order
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                type="button"
                className="w-10 h-10 rounded-full bg-[#242624] flex items-center justify-center hover:bg-[#ba1212] hover:text-[#fff] transition-colors text-[#ababa8]"
              >
                <span className="material-symbols-outlined text-[20px]" translate="no">close</span>
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Project */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#ababa8] tracking-widest uppercase">
                    Project
                  </label>
                  <div className="relative">
                    <select defaultValue="Select Project" className="w-full bg-[#242624] border-none rounded-xl py-3.5 px-4 text-[#faf9f5] focus:ring-1 focus:ring-[#aeee2a] appearance-none outline-none font-bold text-[14px]">
                      <option disabled value="Select Project">Select a Project...</option>
                      <option>Apex Developments</option>
                      <option>Zenith Heights</option>
                      <option>Harbor Plaza</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#ababa8]" translate="no">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Service */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#ababa8] tracking-widest uppercase">
                    Service
                  </label>
                  <div className="relative">
                    <select defaultValue="Select Service" className="w-full bg-[#242624] border-none rounded-xl py-3.5 px-4 text-[#faf9f5] focus:ring-1 focus:ring-[#aeee2a] appearance-none outline-none font-bold text-[14px]">
                      <option disabled value="Select Service">Select Target Service...</option>
                      <option>Siding</option>
                      <option>Doors & Windows</option>
                      <option>Painting</option>
                      <option>Gutters</option>
                      <option>Roofing</option>
                      <option>Decks</option>
                      <option>Dumpster</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#ababa8]" translate="no">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Change Title */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#ababa8] tracking-widest uppercase">
                    Change Title
                  </label>
                  <input
                    className="w-full bg-[#242624] border border-transparent hover:border-[#474846] rounded-xl py-3.5 px-4 text-[#faf9f5] focus:ring-1 focus:ring-[#aeee2a] outline-none placeholder:text-[#ababa8] font-bold text-[14px] transition-colors"
                    placeholder="e.g. Front Door Replacement"
                    type="text"
                  />
                </div>

                {/* Estimated Amount */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#ababa8] tracking-widest uppercase">
                    Estimated Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aeee2a] font-black text-[15px] pointer-events-none">
                      $
                    </span>
                    <input
                      className="w-full bg-[#242624] border border-transparent hover:border-[#474846] rounded-xl py-3.5 pl-8 pr-4 text-[#faf9f5] focus:ring-1 focus:ring-[#aeee2a] outline-none placeholder:text-[#474846] font-bold text-[16px] transition-colors tracking-wide"
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Description */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#ababa8] tracking-widest uppercase">
                  Detailed Description
                </label>
                <textarea
                  className="w-full bg-[#242624] border border-transparent hover:border-[#474846] rounded-xl py-4 px-4 text-[#faf9f5] focus:ring-1 focus:ring-[#aeee2a] outline-none resize-none placeholder:text-[#747673] font-medium text-[14px] transition-colors"
                  placeholder="Explain the structural change requirements, materials, and labor implications..."
                  rows={4}
                />
              </div>

              {/* Attachments Section - Moved Here */}
              <div className="space-y-3 pt-2">
                 <label className="text-xs font-bold text-[#ababa8] tracking-widest uppercase block">
                  Attachments
                 </label>
                 
                 {/* Box dividida: Upload e Lista lado a lado ou col? */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Drop zone */}
                    <div className="border-2 border-dashed border-[#474846]/40 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-[#181a18] hover:border-[#aeee2a]/70 hover:bg-[#aeee2a]/5 transition-colors cursor-pointer group/drop">
                      <span
                        className="material-symbols-outlined text-4xl text-[#474846] group-hover/drop:text-[#aeee2a] mb-3 transition-colors"
                        translate="no"
                      >
                        cloud_upload
                      </span>
                      <p className="text-sm font-bold text-[#faf9f5]">Drag files here</p>
                      <p className="text-[11px] font-medium text-[#ababa8] mt-1">PDF, JPG, PNG up to 20MB</p>
                    </div>

                    {/* Attached file list */}
                    <div className="space-y-2 flex flex-col justify-center">
                      {attachments.map((att) => (
                        <div
                          key={att.name}
                          className="flex items-center justify-between p-3.5 bg-[#242624] rounded-xl border border-[#474846]/20 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="material-symbols-outlined text-[20px]"
                              translate="no"
                              style={{ color: att.iconColor }}
                            >
                              {att.icon}
                            </span>
                            <span className="text-[13px] font-bold text-[#faf9f5]">{att.name}</span>
                          </div>
                          <button className="text-[#ababa8] hover:text-[#ba1212] hover:bg-[#ba1212]/10 p-1 rounded-md transition-colors flex items-center justify-center">
                            <span className="material-symbols-outlined text-[16px]" translate="no">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="mt-10 pt-6 border-t border-[#474846]/30 flex justify-end gap-5">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3.5 rounded-xl border border-[#474846] text-[#faf9f5] font-bold hover:bg-[#242624] transition-colors"
              >
                Cancel
              </button>
              <button className="px-10 py-3.5 rounded-xl bg-[#aeee2a] text-[#3a5400] font-black tracking-wide shadow-lg shadow-[#aeee2a]/20 hover:shadow-[#aeee2a]/40 hover:-translate-y-0.5 active:scale-95 transition-all">
                Submit Change Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
