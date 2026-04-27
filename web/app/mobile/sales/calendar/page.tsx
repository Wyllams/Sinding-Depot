"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

// --- Date Helpers ---
const MS_DAY = 86_400_000;

const getMondayOf = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
};

const getWeekDates = (monday: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

export default function SalesMobileCalendar() {
  const router = useRouter();
  const SALES_NAV = [
    { icon: "dashboard",  label: "Dashboard", href: "/mobile/sales" },
    { icon: "group",      label: "Customers", href: "/mobile/sales/customers" },
    { icon: "assignment", label: "Requests",  href: "/mobile/sales/requests" },
  ];

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [weekBase, setWeekBase] = useState<Date | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    setIsMounted(true);
    setWeekBase(getMondayOf(new Date()));
  }, []);

  useEffect(() => {
    if (!weekBase) return;
    async function fetchTasks() {
      // Inner join forces RLS on jobs (only jobs owned by salesperson visible)
      const { data, error } = await supabase
        .from("service_assignments")
        .select(`
          id,
          status,
          scheduled_start_at,
          scheduled_end_at,
          crew:crews (name),
          job_service:job_services!inner (
            service_type:service_types (name),
            job:jobs!inner (
              id,
              job_number,
              title,
              city,
              state,
              service_address_line_1,
              postal_code,
              customer:customers (
                full_name,
                phone
              )
            )
          )
        `)
        .not("scheduled_start_at", "is", null);

      if (data) {
        // Map raw data similarly to the robust Desktop structure
        const mapped = data.map((a: any) => {
          const js = a.job_service;
          const jb = js?.job;
          
          let durationDays = 1;
          if (a.scheduled_end_at && a.scheduled_start_at) {
             const startMs = new Date(a.scheduled_start_at).getTime();
             const endMs = new Date(a.scheduled_end_at).getTime();
             durationDays = Math.max(1, Math.round((endMs - startMs) / MS_DAY));
          }

          return {
            id: a.id,
            jobId: jb?.id,
            jobNumber: jb?.job_number || "",
            jobTitle: jb?.title || "Unknown Project",
            location: jb?.city && jb?.state ? `${jb.city}, ${jb.state}` : "Location Pending",
            street: jb?.service_address_line_1 || "",
            zip: jb?.postal_code || "",
            customerName: jb?.customer?.full_name || "Unknown Customer",
            customerPhone: jb?.customer?.phone || "No phone",
            serviceName: js?.service_type?.name || "Service",
            crewName: a.crew?.name || "No Crew",
            startDateIso: a.scheduled_start_at.split('T')[0],
            durationDays,
            status: a.status
          };
        });

        // Filter valid mapped tasks
        setTasks(mapped.filter((t: any) => t.startDateIso));
      }
      setLoading(false);
    }
    fetchTasks();
  }, [weekBase]);

  const prevWeek = () => { const d = new Date(weekBase!); d.setDate(d.getDate() - 7); setWeekBase(d); };
  const nextWeek = () => { const d = new Date(weekBase!); d.setDate(d.getDate() + 7); setWeekBase(d); };
  const goToday  = () => setWeekBase(getMondayOf(new Date()));

  const weekDates = getWeekDates(weekBase!);
  const weekStartMs = weekDates[0].getTime();
  const weekEndMs = weekDates[6].getTime() + MS_DAY; // End of Sunday

  // Filter tasks that overlap this week
  const visibleTasks = tasks.filter(t => {
     try {
       const taskStartMs = new Date(t.startDateIso + "T00:00:00Z").getTime();
       const taskEndMs = taskStartMs + (t.durationDays * MS_DAY);
       
       // Overlap condition
       return taskStartMs < weekEndMs && taskEndMs > weekStartMs;
     } catch (e) {
       return false;
     }
  });

  if (!isMounted || !weekBase) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#080808] overflow-hidden">
        {/* Placeholder to prevent SSR mismatch while preserving root DOM type */}
        <div className="flex-1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#080808] overflow-hidden">
      
      {/* Top Fixed Header area */}
      <div className="z-40 bg-[#080808] border-b border-outline-variant/30 px-4 pt-12 pb-4 shrink-0 flex flex-col gap-4">
        {/* Standard Header */}
        <div className="flex justify-between items-center mb-1 relative">
          {/* Left side: Hamburger Menu */}
          <div className="relative z-50">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-on-surface">menu</span>
            </button>
            
            {/* Dropdown Menu */}
            {isMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute top-12 left-0 w-48 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                  <Link 
                    href="/mobile/sales/profile"
                    className="flex items-center gap-3 px-4 py-4 hover:bg-primary/10 text-on-surface transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="material-symbols-outlined text-[20px]">person</span>
                    <span className="font-semibold text-sm">My Profile</span>
                  </Link>
                  <div className="h-[1px] bg-outline-variant/30 w-full" />
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-4 hover:bg-red-500/10 text-red-400 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span className="font-semibold text-sm">Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Center: Title */}
          <h1 className="text-lg font-black tracking-widest uppercase text-on-surface absolute left-1/2 -translate-x-1/2 min-w-max text-center">
            SCHEDULE
          </h1>

          {/* Right side: Avatar */}
          <Link href="/mobile/sales/profile" className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 shadow-lg flex items-center justify-center overflow-hidden active:scale-95 transition-transform shrink-0 z-10">
            <img src="https://ui-avatars.com/api/?name=SD&background=aeee2a&color=080808&bold=true" alt="Profile" className="w-full h-full object-cover" />
          </Link>
        </div>
        
        {/* Navigation Wrapper */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
            <button onClick={prevWeek} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high active:scale-95 transition-all text-on-surface">
              <span className="material-symbols-outlined" translate="no">chevron_left</span>
            </button>
            <button onClick={goToday} className="px-3 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high active:scale-95 transition-all">
              <span className="text-on-surface font-bold text-sm tracking-wide">TODAY</span>
            </button>
            <button onClick={nextWeek} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-high active:scale-95 transition-all text-on-surface">
              <span className="material-symbols-outlined" translate="no">chevron_right</span>
            </button>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">
              {new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(weekDates[0])}
            </span>
          </div>
        </div>
      </div>

      {/* Infinite Horizontal Canvas */}
      <div className="flex-1 overflow-x-auto styled-scrollbar relative">
        <div className="min-w-[840px] flex flex-col pt-2 pb-32">
          
          {/* Timeline Header (Sticky Top) */}
          <div className="sticky top-0 z-30 flex bg-[#080808]/90 backdrop-blur-md rounded-b-2xl border-b border-outline-variant/30 shadow-lg">
            {weekDates.map((date, i) => {
               const isToday = new Date().toDateString() === date.toDateString();
               const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date);
               const dayNum = new Intl.DateTimeFormat('en-US', { day: '2-digit', timeZone: 'UTC' }).format(date);
               
               return (
                 <div key={i} className="flex-1 min-w-[120px] max-w-[120px] flex flex-col items-center justify-center py-3 border-r border-outline-variant/20 last:border-0 relative">
                   {isToday && (
                     <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#aeee2a]" />
                   )}
                   <span className="text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">{dayLabel}</span>
                   <span className={`text-lg font-black mt-0.5 ${isToday ? "text-primary" : "text-on-surface"}`}>{dayNum}</span>
                 </div>
               );
            })}
          </div>

          {/* Timeline Body (Rows) */}
          <div className="flex flex-col relative mt-2">
            {/* Background vertical guides */}
            <div className="absolute inset-0 flex pointer-events-none z-0">
               {weekDates.map((_, i) => (
                 <div key={i} className="flex-1 min-w-[120px] max-w-[120px] border-r border-outline-variant/10 last:border-0" />
               ))}
            </div>

            {loading ? (
              <div className="h-40 flex items-center justify-center w-full relative z-10">
                <span className="material-symbols-outlined text-4xl animate-spin text-primary" translate="no">progress_activity</span>
              </div>
            ) : visibleTasks.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center w-full relative z-10">
                <span className="material-symbols-outlined text-[#7B7B78] text-[32px] mb-2" translate="no">event_busy</span>
                <span className="text-on-surface-variant font-bold text-sm tracking-widest uppercase">No Services This Week</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-4 relative z-10 px-1">
                {visibleTasks.map(task => {
                   // Calculate position relative to week
                   const taskStartMs = new Date(task.startDateIso + "T00:00:00Z").getTime();
                   
                   // Math logic to position horizontally
                   const dayIdx = (taskStartMs - weekStartMs) / MS_DAY;
                   const clampedStart = Math.max(0, dayIdx);
                   
                   // Card spans until end of duration, bound by end of week (7)
                   const endIdx = dayIdx + task.durationDays;
                   const clampedEnd = Math.min(7, endIdx);
                   
                   const widthDays = clampedEnd - clampedStart;
                   if (widthDays <= 0) return null;

                   // UI Colors based on status
                   let bgColor = "bg-surface-container-high";
                   let borderColor = "border-outline-variant/40";
                   let barColor = "bg-outline-variant";

                   if (task.status === "in_progress") {
                     bgColor = "bg-error/10";
                     borderColor = "border-error/40";
                     barColor = "bg-error";
                   } else if (task.status === "completed") {
                     bgColor = "bg-primary/10";
                     borderColor = "border-primary/40";
                     barColor = "bg-primary";
                   }
                    return (
                      <div key={task.id} className="relative h-[72px] w-[840px]">
                        <div 
                          onClick={() => setSelectedTask(task)}
                          className={`absolute top-0 bottom-0 rounded-2xl ${bgColor} border ${borderColor} shadow-lg overflow-hidden flex cursor-pointer backdrop-blur-md active:scale-95 transition-transform`}
                          style={{ 
                           left: `calc(${(clampedStart / 7) * 100}% + 4px)`, 
                           width: `calc(${(widthDays / 7) * 100}% - 8px)` 
                         }}
                       >
                         <div className={`w-1.5 h-full ${barColor} shrink-0`} />
                         <div className="flex flex-col p-2 min-w-0 flex-1 relative">
                            <span className="text-on-surface font-black text-xs truncate leading-tight">{task.jobTitle}</span>
                            <span className="text-primary font-bold text-[9px] uppercase tracking-wider mt-0.5 truncate">{task.serviceName}</span>
                            <div className="flex items-center gap-1 mt-auto text-on-surface-variant">
                              <span className="material-symbols-outlined text-[12px]">groups</span>
                              <span className="text-[10px] font-semibold truncate">{task.crewName}</span>
                            </div>
                         </div>
                       </div>
                     </div>
                   );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTask && (
        <>
          <div className="fixed inset-0 bg-[#080808]/80 backdrop-blur-sm z-[60] transition-opacity" onClick={() => setSelectedTask(null)} />
          <div className="fixed bottom-0 left-0 right-0 bg-surface-container-low border-t border-outline-variant/30 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-[60] p-6 pb-12 flex flex-col gap-6 animate-in slide-in-from-bottom duration-300 pointer-events-auto">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary">Service Info</span>
                <h2 className="text-xl font-black text-on-surface mt-1 pr-4">{selectedTask.serviceName}</h2>
                <span className="text-on-surface-variant font-bold text-xs mt-0.5">{selectedTask.jobNumber} - {selectedTask.jobTitle}</span>
              </div>
              <button onClick={() => setSelectedTask(null)} className="w-8 h-8 shrink-0 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest font-bold text-[#7B7B78] mb-1">Status</span>
                <div className="bg-surface-container-high h-11 px-3 rounded-xl border border-outline-variant/20 flex items-center justify-center">
                   <span className={`text-xs font-black uppercase tracking-widest ${selectedTask.status === 'in_progress' ? 'text-error' : selectedTask.status === 'completed' ? 'text-primary' : 'text-on-surface'}`}>
                     {selectedTask.status.replace('_', ' ')}
                   </span>
                </div>
              </div>
              {/* Crew */}
              <div className="flex flex-col overflow-hidden">
                 <span className="text-[10px] uppercase tracking-widest font-bold text-[#7B7B78] mb-1">Crew</span>
                 <div className="bg-surface-container-high h-11 px-3 rounded-xl border border-outline-variant/20 flex items-center gap-2">
                   <span className="material-symbols-outlined text-[14px] text-on-surface shrink-0">engineering</span>
                   <span className="text-xs font-bold text-on-surface truncate leading-none mt-0.5">{selectedTask.crewName}</span>
                 </div>
              </div>
            </div>

            <div className="h-[1px] w-full bg-outline-variant/20" />

            {/* Client Info */}
            <div className="flex flex-col gap-3">
               <div className="flex items-start gap-3">
                 <span className="material-symbols-outlined text-primary text-[18px] shrink-0">person</span>
                 <div className="flex flex-col">
                   <span className="text-on-surface font-bold text-sm">{selectedTask.customerName}</span>
                   <span className="text-on-surface-variant font-medium text-xs mt-0.5">{selectedTask.customerPhone}</span>
                 </div>
               </div>
               <div className="flex items-start gap-3">
                 <span className="material-symbols-outlined text-primary text-[18px] shrink-0">location_on</span>
                 <div className="flex flex-col">
                   <span className="text-on-surface font-bold text-sm">{selectedTask.street}</span>
                   <span className="text-on-surface-variant font-medium text-xs mt-0.5">{selectedTask.location} {selectedTask.zip}</span>
                 </div>
               </div>
               
               <div className="flex items-start gap-3">
                 <span className="material-symbols-outlined text-primary text-[18px] shrink-0">event</span>
                 <div className="flex flex-col">
                   <span className="text-on-surface font-bold text-sm">
                     {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(selectedTask.startDateIso))}
                   </span>
                   <span className="text-on-surface-variant font-medium text-xs mt-0.5">{selectedTask.durationDays} {selectedTask.durationDays === 1 ? 'Day' : 'Days'} Duration</span>
                 </div>
               </div>
            </div>

            {/* Link to Job Details */}
            <Link href={`/mobile/sales/projects/${selectedTask.jobId}`} className="w-full bg-primary text-[#080808] font-black text-sm uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 mt-2 active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(174,238,42,0.15)]">
              View Full Project
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
            
            {/* Safe area spacing */}
            <div className="h-4" />
          </div>
        </>
      )}

      <MobileBottomNav items={SALES_NAV} />
    </div>
  );
}
