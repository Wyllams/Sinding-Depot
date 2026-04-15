"use client";

import { ArrowLeft, CheckCircle2, Circle, FileText, ChevronRight, MessageSquare, AlertTriangle, FileSignature, Receipt } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function SalesJobDetail({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use to unwrap the params promise
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  return (
    <main className="h-full bg-[#000000] min-h-[100dvh] pb-24">
      
      {/* HEADER */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-[#050505]/95 backdrop-blur-md border-b border-zinc-900">
        <Link href="/sales/jobs" className="inline-flex items-center gap-2 text-[var(--color-siding-green)] mb-3 hover:text-white transition-colors">
          <ArrowLeft size={16} />
          <span className="text-[12px] font-bold uppercase tracking-widest">Back to Deals</span>
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold font-headline tracking-tighter text-white">Sarah Jenkins</h1>
            <p className="text-[12px] text-zinc-400 mt-1">124 Oak Street • {jobId}</p>
          </div>
          <span className="px-2.5 py-1 rounded-md border border-[var(--color-siding-green)]/20 bg-[var(--color-siding-green)]/10 text-[var(--color-siding-green)] text-[10px] font-bold tracking-wider uppercase">
            Active
          </span>
        </div>
      </header>

      <div className="p-4 space-y-6">

        {/* Commercial Summary Card */}
        <section className="bg-[#0a0a0a] rounded-3xl p-5 border border-zinc-800 relative overflow-hidden">
           
           <h2 className="text-[10px] font-bold text-[var(--color-siding-green)] uppercase tracking-widest mb-1">Contract Value</h2>
           <div className="flex items-end gap-2 mb-4">
             <p className="text-4xl font-black font-headline text-white leading-none">$32,450</p>
             <span className="text-zinc-400 text-xs mb-1">.00</span>
           </div>

           <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 mt-2">
              <div>
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Commission</p>
                 <p className="text-lg font-bold text-white mt-0.5">$1,622</p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Paid to Date</p>
                 <p className="text-lg font-bold text-[var(--color-siding-green)] mt-0.5">$10,000</p>
              </div>
           </div>
        </section>



        {/* Change Orders Section */}
        <section className="bg-zinc-900/50 rounded-3xl p-5 border border-zinc-800">
           <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                 <Receipt size={16} className="text-zinc-500" /> Change Orders (1)
              </h3>
           </div>
           
           <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                 <div>
                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded text-[9px] font-bold tracking-widest uppercase">
                       Pending Signature
                    </span>
                    <h4 className="text-[13px] text-white font-bold mt-2">Extra Fascia Boards</h4>
                 </div>
                 <span className="text-lg font-bold text-white">+$850</span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">
                 Found unexpected rot behind the north wall. Needs 10 extra linear feet.
              </p>
              <button className="mt-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors">
                 Resend Email to Client
              </button>
           </div>
        </section>

      </div>
    </main>
  );
}
