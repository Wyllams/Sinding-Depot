import React from "react";
import { DollarSign, Target, TrendingUp } from "lucide-react";

export default function SalesDashboard() {
  return (
    <div className="p-5 space-y-8 bg-[#0a0a0a] min-h-[100dvh]">

      {/* Greeting Layout */}
      <section className="pt-2">
        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.15em] mb-1">
          Welcome Back
        </p>
        <h1 className="text-[32px] font-black font-headline text-white leading-none tracking-tight mb-2">
          Nick Garner
        </h1>
        <p className="text-[14px] text-[var(--color-siding-green)] font-medium">
          You have 12 active deals in your pipeline.
        </p>
      </section>

      {/* 2 Square Cards (Sales Data) */}
      <div className="grid grid-cols-2 gap-4">
         
         <div className="bg-[#151515] rounded-3xl p-5 flex flex-col justify-between aspect-square">
            <div className="w-10 h-10 rounded-full bg-[var(--color-siding-green)]/10 flex items-center justify-center">
              <DollarSign size={20} className="text-[var(--color-siding-green)]" />
            </div>
            <div>
              <p className="text-3xl font-black font-headline text-white tracking-tighter">12</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Active Deals</p>
            </div>
         </div>

         <div className="bg-[#151515] rounded-3xl p-5 flex flex-col justify-between aspect-square">
            <div className="w-10 h-10 rounded-full bg-[var(--color-siding-green)]/10 flex items-center justify-center">
              <Target size={20} className="text-[var(--color-siding-green)]" />
            </div>
            <div>
              <p className="text-3xl font-black font-headline text-white tracking-tighter">64%</p>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Win Rate</p>
            </div>
         </div>

      </div>

      {/* Wide Bottom Card (Sales Data) */}
      <div className="bg-[#151515] border border-[var(--color-siding-green)]/20 rounded-3xl p-5 relative overflow-hidden">
         <div className="absolute top-5 right-5 text-[var(--color-siding-green)]/40">
           <TrendingUp size={24} />
         </div>
         <h2 className="text-[11px] font-bold text-[var(--color-siding-green)] uppercase tracking-widest mb-1">Monthly Quota</h2>
         <p className="text-xl font-bold font-headline text-white mb-2">$85,400 <span className="text-sm text-zinc-500 font-normal">/ 100k</span></p>
         <div className="w-full bg-[#050505] h-2 rounded-full overflow-hidden mb-3 border border-zinc-800">
            <div className="h-full bg-[var(--color-siding-green)] w-[85%] rounded-full"></div>
         </div>
         <p className="text-xs text-zinc-400 font-medium leading-relaxed pr-8">
           You are 85% to your monthly sales goal. Keep pushing to unlock your bonus!
         </p>
      </div>

    </div>
  );
}
