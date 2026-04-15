import Link from "next/link";

export default function CustomerDashboard() {
  return (
    <div className="space-y-10">
      
      {/* Welcome Section */}
      <section className="bg-white p-8 rounded-3xl border border-[#e5e5e3] shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div>
             <h2 className="text-[#a1a19d] text-xs font-bold uppercase tracking-widest mb-1">Project Status</h2>
             <h1 className="font-headline text-3xl font-bold tracking-tight text-[#121412]">Welcome, Mr. Smith!</h1>
             <p className="text-[#474846] mt-2 max-w-lg">
               Your siding installation at <strong>400 Broad Street</strong> is currently underway. Here's a quick overview of what needs your attention today.
             </p>
           </div>
           
           <div className="bg-[#f0fae1] border border-[#aeee2a]/40 p-4 rounded-2xl flex items-center gap-4 shrink-0 transition-all hover:shadow-md cursor-default">
              <div className="w-12 h-12 bg-[#aeee2a] text-[#121412] rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined" translate="no">engineering</span>
              </div>
              <div>
                <span className="block font-headline font-bold text-[#121412]">In Progress</span>
                <span className="block text-xs font-bold uppercase tracking-widest text-[#5c8a00] mt-0.5">Crew on site</span>
              </div>
           </div>
        </div>
      </section>

      {/* Actionable Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Colors Card - Needs Action */}
        <Link href="/customer/colors" className="group bg-white p-6 rounded-3xl border border-[#e5e5e3] shadow-sm hover:shadow-md hover:border-[#121412] transition-all flex flex-col justify-between h-56 relative overflow-hidden">
           <div className="absolute top-4 right-4 w-3 h-3 bg-[#ff7351] rounded-full animate-pulse shadow-[0_0_8px_rgba(255,115,81,0.6)]" />
           <div>
             <div className="w-10 h-10 bg-[#fff1ec] text-[#ff7351] rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined" translate="no">format_paint</span>
             </div>
             <h3 className="font-headline font-bold text-xl text-[#121412]">Color Selection</h3>
             <p className="text-[#474846] text-sm mt-2 line-clamp-2">
               Action required! Please submit your paint choices so our teams can prepare the materials.
             </p>
           </div>
           <div className="flex items-center text-[#ff7351] font-bold text-sm">
             <span>Start Selection</span>
             <span className="material-symbols-outlined ml-1 text-[18px] group-hover:translate-x-1 transition-transform" translate="no">arrow_right_alt</span>
           </div>
        </Link>

        {/* Change Orders */}
        <Link href="/customer/change-orders" className="group bg-white p-6 rounded-3xl border border-[#e5e5e3] shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-56">
           <div>
             <div className="w-10 h-10 bg-[#f5f5f5] text-[#121412] rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined" translate="no">request_quote</span>
             </div>
             <h3 className="font-headline font-bold text-xl text-[#121412]">Change Orders</h3>
             <p className="text-[#474846] text-sm mt-2 line-clamp-2">
               Review and approve any material additions or scope changes discovered during the job.
             </p>
           </div>
           <div className="flex items-center justify-between">
             <span className="text-xs font-bold text-[#a1a19d] uppercase tracking-widest">0 Pending</span>
             <span className="material-symbols-outlined text-[#121412] group-hover:translate-x-1 transition-transform" translate="no">arrow_forward</span>
           </div>
        </Link>
        
        {/* Documents */}
        <Link href="/customer/documents" className="group bg-white p-6 rounded-3xl border border-[#e5e5e3] shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-56">
           <div>
             <div className="w-10 h-10 bg-[#f5f5f5] text-[#121412] rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined" translate="no">folder_open</span>
             </div>
             <h3 className="font-headline font-bold text-xl text-[#121412]">My Documents</h3>
             <p className="text-[#474846] text-sm mt-2 line-clamp-2">
               Access your master contract, completion certificates, and warranties.
             </p>
           </div>
           <div className="flex items-center justify-between">
             <span className="text-xs font-bold text-[#a1a19d] uppercase tracking-widest">3 Documents</span>
             <span className="material-symbols-outlined text-[#121412] group-hover:translate-x-1 transition-transform" translate="no">arrow_forward</span>
           </div>
        </Link>
      </div>
      
    </div>
  );
}
