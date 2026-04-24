"use client";

import { FileText, Search, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SalesDealsList() {
  const [search, setSearch] = useState("");

  const mockDeals = [
    { id: 'JOB-2026-041', name: 'Sarah Jenkins', address: '124 Oak Street', amount: '$32,450', status: 'Active', closeDate: 'Apr 12, 2026' },
    { id: 'JOB-2026-040', name: 'Michael Chen', address: '890 Pine Ave', amount: '$8,200', status: 'Pending', closeDate: 'Apr 15, 2026' },
    { id: 'JOB-2026-038', name: 'Emily Davis', address: '772 Cedar Ln', amount: '$45,100', status: 'Active', closeDate: 'Apr 05, 2026' },
    { id: 'JOB-2026-030', name: 'Thomas Wright', address: '100 North Rd', amount: '$15,000', status: 'Completed', closeDate: 'Mar 10, 2026' },
  ];

  const filteredDeals = mockDeals.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-headline tracking-tight text-white">My Deals</h1>
        <button className="bg-[var(--color-siding-green)] text-mobile-frame p-2 rounded-full shadow-[0_0_15px_rgba(174,238,42,0.4)]">
           <Plus size={20} strokeWidth={3} />
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input 
          type="text" 
          placeholder="Search clients or addresses..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-zinc-800 text-sm text-white rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-[var(--color-siding-green)] transition-colors shadow-inner"
        />
      </div>

      <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
         <button className="bg-[var(--color-siding-green)] text-mobile-frame px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">All Deals ({mockDeals.length})</button>
         <button className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">Active</button>
         <button className="bg-zinc-900 border border-zinc-800 text-zinc-400 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">Pending</button>
      </div>

      <div className="space-y-4">
        {filteredDeals.length > 0 ? filteredDeals.map((deal) => (
          <Link key={deal.id} href={`/sales/jobs/${deal.id}`} className="block bg-[#0a0a0a] border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 rounded-2xl p-4 overflow-hidden relative group transition-colors">
            
            {deal.status === 'Active' && (
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-siding-green)]"></div>
            )}
            {deal.status === 'Pending' && (
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
            )}
            
            <div className="flex justify-between items-start mb-3">
               <div>
                 <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                   {deal.name}
                 </h2>
                 <p className="text-zinc-400 text-xs mt-0.5">{deal.address}</p>
               </div>
               <div className="text-right">
                  <span className="text-lg font-bold font-headline text-[var(--color-siding-green)]">{deal.amount}</span>
               </div>
            </div>

            <div className="flex justify-between items-end border-t border-zinc-800/50 pt-3 mt-1">
               <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  <FileText size={12} /> Closed: {deal.closeDate}
               </div>
               
               <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
                 deal.status === 'Active' ? 'bg-[var(--color-siding-green)]/10 text-[var(--color-siding-green)] border-[var(--color-siding-green)]/20' :
                 deal.status === 'Pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                 'bg-zinc-800 text-zinc-400 border-zinc-700'
               }`}>
                 {deal.status}
               </span>
            </div>
          </Link>
        )) : (
          <div className="text-center py-10 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
             <p className="text-zinc-500 text-sm">No deals found for "{search}"</p>
          </div>
        )}
      </div>

    </div>
  );
}
