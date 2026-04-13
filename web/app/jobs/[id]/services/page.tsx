"use client";

import { ArrowLeft, HardHat, PaintRoller, Grip, ChevronRight, MessageSquare, AlertTriangle, CheckCircle2, ChevronDown } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function JobServices({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const servicesData = [
    {
      id: 'siding',
      name: 'Hardie Board Siding',
      icon: HardHat,
      status: 'In Progress',
      progress: 65,
      crew: 'Alpha Team',
      avatar: 'https://i.pravatar.cc/100?img=11',
      date: 'April 14 - April 20'
    },
    {
      id: 'gutters',
      name: 'Seamless Gutters',
      icon: Grip,
      status: 'Pending Start',
      progress: 0,
      crew: 'Omega Crew',
      avatar: 'https://i.pravatar.cc/100?img=15',
      date: 'April 21'
    },
    {
      id: 'painting',
      name: 'Exterior Painting',
      icon: PaintRoller,
      status: 'Completed',
      progress: 100,
      crew: 'Beta Painters',
      avatar: 'https://i.pravatar.cc/100?img=33',
      date: 'April 10 - April 12'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'text-[var(--color-siding-green)] bg-[var(--color-siding-green)]/10 border-[var(--color-siding-green)]/20';
      case 'Completed': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Pending Start': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      default: return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'In Progress': return 'bg-[var(--color-siding-green)]';
      case 'Completed': return 'bg-blue-500';
      default: return 'bg-zinc-700';
    }
  };

  return (
    <main className="h-full overflow-y-auto">
      
      {/* PREMIUM TOPBAR */}
      <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-3 bg-[#050505]/80 backdrop-blur-md border-b border-zinc-800/30">
        <div className="flex items-center gap-4">
          <Link href={`/jobs/${jobId}`} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-zinc-700">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-lg font-bold tracking-tight text-white line-clamp-1">Service Management</h1>
            </div>
            <p className="text-[12px] text-zinc-400">124 Oak Street • Job {jobId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button className="bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-medium px-4 py-1.5 text-[12px] rounded-lg transition-colors flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-orange-400" />
              Report Issue
            </button>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-4">
        
        {servicesData.map((svc) => (
          <div key={svc.id} className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-zinc-700/50 transition-colors">
            {/* Accordion Header / Card Content */}
            <div className="p-5 flex flex-col md:flex-row md:items-center gap-5">
               
               {/* Left: Icon & Title */}
               <div className="flex items-center gap-4 md:w-1/3">
                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getStatusColor(svc.status)}`}>
                    <svc.icon size={18} />
                 </div>
                 <div>
                   <h3 className="text-[14px] font-bold text-white mb-0.5">{svc.name}</h3>
                   <p className="text-[11px] text-zinc-500">{svc.date}</p>
                 </div>
               </div>

               {/* Center: Crew Avatar & Status */}
               <div className="flex items-center gap-6 md:w-1/3">
                  <div className="flex items-center gap-2 pl-2 md:pl-0 border-l border-zinc-800 md:border-none">
                     <img src={svc.avatar} alt="Crew" className="w-7 h-7 rounded-full border border-zinc-700" />
                     <div>
                       <p className="text-[11px] font-semibold text-zinc-200">{svc.crew}</p>
                       <p className="text-[9px] text-zinc-500 uppercase">Assigned</p>
                     </div>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${getStatusColor(svc.status)}`}>
                      {svc.status}
                    </span>
                  </div>
               </div>

               {/* Right: Progress & Action */}
               <div className="flex items-center gap-4 flex-1 justify-end">
                  <div className="flex-1 max-w-[120px]">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[10px] text-zinc-400 font-medium">Progress</span>
                      <span className="text-[10px] text-zinc-200 font-bold">{svc.progress}%</span>
                    </div>
                    <div className="w-full bg-zinc-800/80 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${getProgressBarColor(svc.status)}`} style={{ width: `${svc.progress}%` }}></div>
                    </div>
                  </div>
                  <button className="p-1.5 text-zinc-500 hover:text-white rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-colors ml-2">
                    <ChevronDown size={16} />
                  </button>
               </div>

            </div>

            {/* Simulated Expanded Area for the active one */}
            {svc.id === 'siding' && (
              <div className="bg-black/20 border-t border-zinc-800/30 p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Recent Notes</h4>
                   <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
                     <div className="flex items-center justify-between mb-2">
                       <span className="text-[11px] text-zinc-300 font-medium">Marcos P.</span>
                       <span className="text-[9px] text-zinc-500">2 Hours Ago</span>
                     </div>
                     <p className="text-[12px] text-zinc-400">West wall completed. Moving to the front porch area. We might need extra trim boards.</p>
                   </div>
                 </div>
                 
                 <div>
                   <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Quick Actions</h4>
                   <div className="flex gap-2">
                     <button className="flex items-center gap-1.5 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors">
                       <MessageSquare size={12} /> Message Crew
                     </button>
                     <button className="flex items-center gap-1.5 bg-[var(--color-siding-green)]/10 text-[var(--color-siding-green)] hover:bg-[var(--color-siding-green)]/20 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors border border-[var(--color-siding-green)]/20">
                       <CheckCircle2 size={12} /> Mark Phase Complete
                     </button>
                   </div>
                 </div>
              </div>
            )}
          </div>
        ))}
        
      </div>
    </main>
  );
}
