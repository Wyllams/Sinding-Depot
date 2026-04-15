"use client";

import Link from "next/link";
import { useState } from "react";

export default function CustomerColors() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Mock form state for the Siding Job
  const [colors, setColors] = useState({
    main: { brand: "Sherwin Williams", name: "Alabaster", code: "SW 7008" },
    trim: { brand: "Sherwin Williams", name: "Tricorn Black", code: "SW 6258" },
    door: { brand: "", name: "", code: "" }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simula a injeção na tabela job_color_selections que criamos no Supabase
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/customer" className="inline-flex items-center text-[#a1a19d] hover:text-[#121412] text-sm font-bold transition-colors mb-4">
           <span className="material-symbols-outlined text-[18px] mr-1" translate="no">arrow_back</span>
           Back to Dashboard
        </Link>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[#121412]">Color Selection</h1>
        <p className="text-[#474846] mt-2">Please define the paint colors for your Siding Installation project.</p>
      </div>

      {success ? (
        <div className="bg-[#f0fae1] border border-[#aeee2a]/40 p-8 rounded-3xl text-center">
          <div className="w-20 h-20 bg-[#aeee2a] text-[#121412] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_10px_30px_rgba(174,238,42,0.4)]">
             <span className="material-symbols-outlined text-[40px]" translate="no">check</span>
          </div>
          <h2 className="font-headline text-2xl font-bold text-[#121412]">Colors Confirmed!</h2>
          <p className="text-[#474846] mt-2 max-w-md mx-auto">
            Your selection has been saved to your project file. Our purchasing team will order exactly what you asked for!
          </p>
          <button 
            onClick={() => setSuccess(false)}
            className="mt-8 text-sm font-bold text-[#121412] underline underline-offset-4"
          >
            Edit Selection
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-[#e5e5e3] rounded-3xl p-8 shadow-sm">
          
          <div className="space-y-8">
            {/* Main Siding */}
            <div className="border-b border-[#e5e5e3] pb-8">
              <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-[#f8f6f0] border border-[#d1d0c9]" />
                Main Siding Area
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                   <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Paint Brand</label>
                   <input type="text" value={colors.main.brand} onChange={e => setColors({...colors, main: {...colors.main, brand: e.target.value}})} className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] focus:ring-1 focus:ring-[#121412] outline-none transition-all" required />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Color Name</label>
                   <input type="text" value={colors.main.name} onChange={e => setColors({...colors, main: {...colors.main, name: e.target.value}})} className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none" required />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Color/SKU Code</label>
                   <input type="text" value={colors.main.code} onChange={e => setColors({...colors, main: {...colors.main, code: e.target.value}})} className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none" required />
                 </div>
              </div>
            </div>

            {/* Trim */}
            <div className="border-b border-[#e5e5e3] pb-8">
              <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-[#2a2b2a] border border-[#1a1b1a]" />
                Trim & Fascia
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                   <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Paint Brand</label>
                   <input type="text" value={colors.trim.brand} onChange={e => setColors({...colors, trim: {...colors.trim, brand: e.target.value}})} className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none" required />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Color Name</label>
                   <input type="text" value={colors.trim.name} onChange={e => setColors({...colors, trim: {...colors.trim, name: e.target.value}})} className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none" required />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Color/SKU Code</label>
                   <input type="text" value={colors.trim.code} onChange={e => setColors({...colors, trim: {...colors.trim, code: e.target.value}})} className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none" required />
                 </div>
              </div>
            </div>

            {/* Front Door */}
            <div>
              <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-orange-500" />
                Front Door / Accent (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                   <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Paint Brand</label>
                   <input type="text" value={colors.door.brand} onChange={e => setColors({...colors, door: {...colors.door, brand: e.target.value}})} placeholder="Leave blank if N/A" className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none placeholder:text-[#d1d0c9]" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Color Name</label>
                   <input type="text" value={colors.door.name} onChange={e => setColors({...colors, door: {...colors.door, name: e.target.value}})} placeholder="Leave blank if N/A" className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none placeholder:text-[#d1d0c9]" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Color/SKU Code</label>
                   <input type="text" value={colors.door.code} onChange={e => setColors({...colors, door: {...colors.door, code: e.target.value}})} placeholder="Leave blank if N/A" className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none placeholder:text-[#d1d0c9]" />
                 </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-end border-t border-[#e5e5e3] pt-6">
            <button 
              type="submit"
              disabled={submitting}
              className="h-14 px-8 bg-[#121412] text-[#faf9f5] rounded-full font-bold shadow-[0_10px_20px_rgba(18,20,18,0.15)] hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                   Submit Selection
                   <span className="material-symbols-outlined text-[18px]" translate="no">verified</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
