"use client";

import { ArrowLeft, CheckCircle2, Circle, FileText, AlertTriangle, Users, Calendar, MoreHorizontal, ChevronRight, MessageSquare, Download } from "lucide-react";
import Link from "next/link";
import { use } from "react";

// For Next.js 15, params are treated as Promises
export default function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use to unwrap the params promise
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  return (
    <main className="h-full overflow-y-auto">
      
      {/* PREMIUM TOPBAR */}
      <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-3 bg-[#050505]/80 backdrop-blur-md border-b border-zinc-800/30">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-700">
            <ArrowLeft size={16} />
            <span className="text-[13px] font-medium uppercase tracking-wider">Voltar</span>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-lg font-bold tracking-tight text-white line-clamp-1 max-w-[300px]">124 Oak Street</h1>
              <span className="px-2 py-0.5 rounded-full border border-[var(--color-siding-green)]/20 bg-[var(--color-siding-green)]/10 text-[var(--color-siding-green)] text-[10px] font-semibold tracking-wider">ACTIVE</span>
            </div>
            <p className="text-[12px] text-zinc-400">Job {jobId} • Sarah Jenkins</p>
          </div>
        </div>
        
        {/* Aggressive Quick Actions */}
        <div className="flex items-center gap-2">
            <button className="bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-medium px-4 py-1.5 text-[12px] rounded-lg transition-colors flex items-center gap-1.5">
              <MessageSquare size={14} />
              Quick Note
            </button>
            <button className="bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-400 font-medium px-4 py-1.5 text-[12px] rounded-lg transition-colors flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Report Blocker
            </button>
            <Link href={`/jobs/${jobId}/services`} className="bg-[var(--color-siding-green)] hover:bg-[var(--color-siding-green-hover)] text-black font-semibold px-4 py-1.5 text-[12px] rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(178,210,52,0.15)] ml-2">
              Manage Services
              <ChevronRight size={14} className="stroke-[3]" />
            </Link>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Progress Timeline */}
        <div className="lg:col-span-8 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[14px] font-bold text-white uppercase tracking-wider">Project Timeline</h2>
            <select className="bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 rounded-md px-2 py-1 outline-none focus:border-[var(--color-siding-green)]">
              <option>All Updates</option>
              <option>Blockers Only</option>
            </select>
          </div>
          
          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-[13px] top-2 bottom-2 w-px bg-zinc-800/80"></div>
            
            <div className="space-y-6">
              
              {/* Timeline Item 1 */}
              <div className="relative flex gap-4">
                 <div className="w-7 h-7 rounded-full bg-[var(--color-siding-green)]/20 border-2 border-[#050505] text-[var(--color-siding-green)] flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(178,210,52,0.2)]">
                    <CheckCircle2 size={14} className="stroke-[3]" />
                 </div>
                 <div className="pt-1">
                    <h3 className="text-[13px] font-semibold text-white">Contract Signed & Deposit Paid</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Initial payload of $10,000 processed.</p>
                    <span className="text-[10px] text-zinc-500 font-medium uppercase mt-2 block">Apr 12, 09:30 AM</span>
                 </div>
              </div>

               {/* Timeline Item 2 */}
              <div className="relative flex gap-4">
                 <div className="w-7 h-7 rounded-full bg-[var(--color-siding-green)]/20 border-2 border-[#050505] text-[var(--color-siding-green)] flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(178,210,52,0.2)]">
                    <CheckCircle2 size={14} className="stroke-[3]" />
                 </div>
                 <div className="pt-1">
                    <h3 className="text-[13px] font-semibold text-white">Materials Ordered</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">James Hardie panels (Midnight Blue) purchased.</p>
                    <span className="text-[10px] text-zinc-500 font-medium uppercase mt-2 block">Apr 13, 11:15 AM</span>
                 </div>
              </div>

               {/* Timeline Item 3 (Current/Blocker) */}
              <div className="relative flex gap-4">
                 <div className="w-7 h-7 rounded-full bg-orange-500/20 border-2 border-[#050505] text-orange-400 flex items-center justify-center shrink-0 z-10 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                    <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                     </span>
                 </div>
                 <div className="pt-1 bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 w-full backdrop-blur-sm -mt-2">
                    <div className="flex justify-between items-start">
                      <h3 className="text-[13px] font-semibold text-orange-400">Permit Delay (HOA Approval)</h3>
                      <button className="text-zinc-500 hover:text-white"><MoreHorizontal size={14}/></button>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">Pending signature from neighborhood committee.</p>
                    <span className="text-[10px] text-orange-500/60 font-medium uppercase mt-2 block">Waiting since Apr 14</span>
                 </div>
              </div>

               {/* Timeline Item 4 (Future) */}
              <div className="relative flex gap-4 opacity-50 grayscale">
                 <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#050505] text-zinc-500 flex items-center justify-center shrink-0 z-10">
                    <Circle size={10} />
                 </div>
                 <div className="pt-1">
                    <h3 className="text-[13px] font-semibold text-zinc-300">Crew Deployment</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Scheduled to start demolition.</p>
                 </div>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Cloud of Widgets */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Widget: Operational Status (R/G & Waiting On) */}
          <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 overflow-visible">
            <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
               <span className="material-symbols-outlined text-[16px] text-zinc-500" translate="no">traffic</span>
               Operational Status
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Current Gate (Waiting On)</label>
                <div className="relative group">
                  <select className="w-full appearance-none bg-[#050505] border border-zinc-800 rounded-xl px-4 py-3 text-[12px] font-black tracking-wider text-white shadow-inner focus:outline-none focus:border-[var(--color-siding-green)]/50 cursor-pointer transition-colors custom-select-arrow hover:border-zinc-700">
                    <option value="NOT_CONTACTED" className="bg-[#ba1212] text-white">🔴 NOT YET CONTACTED</option>
                    <option value="READY" className="bg-[#1f8742] text-white">🟢 READY TO START</option>
                    <option value="WINDOWS" className="bg-[#165eb3] text-white">🔵 WINDOWS</option>
                    <option value="DOORS" className="bg-[#f09a1a] text-black">🟠 DOORS</option>
                    <option value="FINANCING" className="bg-[#f7df94] text-black">🟡 FINANCING</option>
                    <option value="MATERIALS" className="bg-[#306870] text-white">🪨 MATERIALS</option>
                    <option value="HOA" className="bg-[#b3d9f2] text-black">📄 HOA</option>
                    <option value="OTHER_REPAIRS" className="bg-[#e4ccf5] text-black">🛠️ OTHER REPAIRS</option>
                    <option value="NO_ANSWER" className="bg-[#fab896] text-black">📴 NO ANSWER</option>
                    <option value="PERMIT" className="bg-[#4d4e4f] text-white">📋 PERMIT</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[18px]">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Red / Green visual cue based on selection (Mocked as Red for initial state) */}
              <div className="flex items-center gap-3 bg-[#ba1212]/10 border border-[#ba1212]/20 p-2.5 rounded-xl">
                 <div className="w-8 h-8 rounded-lg bg-[#ba1212] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-[16px]" translate="no">call_off</span>
                 </div>
                 <div>
                   <p className="text-[11px] font-bold text-[#ba1212] uppercase tracking-wide">Action Required</p>
                   <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">Nick hasn't called the customer yet to schedule.</p>
                 </div>
              </div>
            </div>
          </div>

          {/* Widget: Crew */}
          <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[12px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                 <Users size={14} className="text-zinc-500" /> Crew Assignment
              </h3>
              <span className="text-[10px] text-zinc-500 uppercase font-medium">Pending Approval</span>
            </div>
            <div className="flex items-center gap-3 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/50 opacity-60 grayscale cursor-not-allowed">
               <div className="w-10 h-10 rounded-lg bg-zinc-800 cover bg-center" style={{ backgroundImage: "url('https://i.pravatar.cc/100?img=11')" }}></div>
               <div className="flex-1">
                 <h4 className="text-[13px] font-semibold text-zinc-200">Alpha Siding Team</h4>
                 <p className="text-[11px] text-zinc-500">Not Dispatched yet.</p>
               </div>
            </div>
          </div>

          {/* Widget: Documents */}
          <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4">
            <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
               <FileText size={14} className="text-zinc-500" /> Documents
            </h3>
            <div className="space-y-2">
               <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-lg border border-transparent hover:border-zinc-800">
                  <div className="flex items-center gap-2">
                     <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-md"><FileText size={12}/></div>
                     <span className="text-[12px] text-zinc-300">Signed_Contract.pdf</span>
                  </div>
                  <button className="text-zinc-500 hover:text-[var(--color-siding-green)]"><Download size={14}/></button>
               </div>
               <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-lg border border-transparent hover:border-zinc-800">
                  <div className="flex items-center gap-2">
                     <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-md"><FileText size={12}/></div>
                     <span className="text-[12px] text-zinc-300">Material_Invoice.pdf</span>
                  </div>
                  <button className="text-zinc-500 hover:text-[var(--color-siding-green)]"><Download size={14}/></button>
               </div>
            </div>
            <button className="w-full mt-3 py-1.5 border border-dashed border-zinc-700 rounded-lg text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors">
               + Upload Blueprint / Doc
            </button>
          </div>

          {/* Widget: Schedule */}
          <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4">
            <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
               <Calendar size={14} className="text-zinc-500" /> Master Schedule
            </h3>
            <div className="space-y-2">
               <div className="flex justify-between items-center bg-[var(--color-siding-green)]/5 border border-[var(--color-siding-green)]/10 p-2.5 rounded-lg">
                  <span className="text-[12px] text-[var(--color-siding-green)] font-medium">Estimated End</span>
                  <span className="text-[12px] text-white font-bold">April 30, 2026</span>
               </div>
               <div className="flex justify-between items-center px-2 py-1">
                  <span className="text-[11px] text-zinc-500">Working Days</span>
                  <span className="text-[11px] text-zinc-300">14 Days</span>
               </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
