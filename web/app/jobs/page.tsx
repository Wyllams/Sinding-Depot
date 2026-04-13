import { Search, Plus, Filter, MoreHorizontal, ChevronDown, Calendar, HardHat } from "lucide-react";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active': return 'bg-[var(--color-siding-green)]/10 text-[var(--color-siding-green)] border-[var(--color-siding-green)]/20';
    case 'Completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Pending': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  }
};

export default function JobsList() {
  const mockJobs = [
    { id: 'JOB-2026-041', customer: 'Sarah Jenkins', address: '124 Oak Street, Atlanta', service: 'Full Siding & Gutters', status: 'Active', date: 'Apr 12, 2026', amount: '$32,450' },
    { id: 'JOB-2026-040', customer: 'Michael Chen', address: '890 Pine Ave, Marietta', service: 'Roofing Repair', status: 'Pending', date: 'Apr 15, 2026', amount: '$8,200' },
    { id: 'JOB-2026-039', customer: 'Robert Smith', address: '450 Elm Dr, Roswell', service: 'Painting Exterior', status: 'Completed', date: 'Mar 28, 2026', amount: '$12,000' },
    { id: 'JOB-2026-038', customer: 'Emily Davis', address: '772 Cedar Ln, Alpharetta', service: 'Hardie Board Siding', status: 'Active', date: 'Apr 05, 2026', amount: '$45,100' },
    { id: 'JOB-2026-037', customer: 'John Garcia', address: '331 Birch Rd, Sandy Springs', service: 'Gutters Only', status: 'Completed', date: 'Mar 20, 2026', amount: '$4,500' },
  ];

  return (
    <main className="h-full overflow-y-auto">
      
      {/* PREMIUM TOPBAR */}
      <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-3 bg-[#050505]/80 backdrop-blur-md border-b border-zinc-800/30">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white mb-0.5">Active Projects</h1>
          <p className="text-[12px] text-zinc-400">Manage all your ongoing construction jobs.</p>
        </div>
        <div className="flex items-center gap-3">
            <button className="relative p-1.5 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/60 rounded-full text-zinc-400 hover:text-white transition-colors">
              <Filter size={15} />
            </button>
            <button className="bg-[var(--color-siding-green)] hover:bg-[var(--color-siding-green-hover)] text-black font-semibold px-4 py-1.5 text-[12px] rounded-full transition-colors flex items-center gap-1.5 shadow-[0_0_15px_rgba(178,210,52,0.15)]">
              <Plus size={15} className="stroke-[3]" />
              Create Job
            </button>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        
        {/* Table Filters & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
           <div className="flex bg-zinc-900/50 border border-zinc-800/60 p-1 rounded-lg">
             <button className="px-3 py-1 text-[12px] font-medium bg-zinc-800 text-white rounded-md shadow-sm">All Jobs</button>
             <button className="px-3 py-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-200 rounded-md">Active (24)</button>
             <button className="px-3 py-1 text-[12px] font-medium text-zinc-400 hover:text-zinc-200 rounded-md">Pending (5)</button>
           </div>
           
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
             <input 
               type="text" 
               placeholder="Search by customer or address..." 
               className="bg-zinc-900/50 border border-zinc-800/60 text-[12px] text-zinc-200 rounded-lg pl-9 pr-4 py-1.5 w-64 focus:outline-none focus:border-[var(--color-siding-green)]/50 transition-colors"
             />
           </div>
        </div>

        {/* DATA TABLE (Premium UI) */}
        <div className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                <th className="py-3 px-5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Job ID</th>
                <th className="py-3 px-5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Customer & Location</th>
                <th className="py-3 px-5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Service</th>
                <th className="py-3 px-5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="py-3 px-5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Start Date</th>
                <th className="py-3 px-5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {mockJobs.map((job, idx) => (
                <tr key={job.id} className="hover:bg-zinc-800/20 transition-colors group">
                  <td className="py-3.5 px-5">
                    <span className="text-[13px] font-medium text-zinc-300">{job.id}</span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-white group-hover:text-[var(--color-siding-green)] transition-colors line-clamp-1">{job.customer}</span>
                      <span className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{job.address}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                       <HardHat size={14} className="text-zinc-600" />
                       <span className="text-[13px] text-zinc-300">{job.service}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2 text-zinc-400">
                       <Calendar size={14} />
                       <span className="text-[13px]">{job.date}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-right pr-6">
                    <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Footer */}
          <div className="border-t border-zinc-800/50 p-4 px-6 flex items-center justify-between bg-zinc-900/20">
             <span className="text-xs text-zinc-500 font-medium">Showing 1 to 5 of 24 entries</span>
             <div className="flex gap-2">
               <button className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50">Previous</button>
               <button className="px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">Next</button>
             </div>
          </div>
        </div>

      </div>
    </main>
  );
}
