"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export default function SalesProjectsMobile() {
  const router = useRouter();
  const SALES_NAV = [
    { icon: "dashboard", label: "Dashboard", href: "/mobile/sales" },
    { icon: "home_work", label: "Projects", href: "/mobile/sales/projects" },
    { icon: "request_quote", label: "Orders", href: "/mobile/sales/orders" },
    { icon: "calendar_today", label: "Calendar", href: "/mobile/sales/calendar" },
  ];

  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  
  // Header state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    async function fetchJobs() {
      // Fetching the same real data as Desktop, straight from Supabase
      const { data } = await supabase
        .from("jobs")
        .select(`
          id,
          job_number,
          title,
          status,
          city,
          state,
          customer:customers (full_name),
          services:job_services (
            service_type:service_types (name),
            assignments:service_assignments (
              crew:crews (name)
            )
          )
        `)
        .order("created_at", { ascending: false });
        
      setJobs(data ?? []);
      setLoading(false);
    }
    fetchJobs();
  }, []);

  // Filter logic
  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const clientName = (job.customer?.full_name || "").toLowerCase();
    const title = (job.title || "").toLowerCase();
    const services = (job.services ? job.services.map((s: any) => s.service_type?.name).join(" ") : "").toLowerCase();
    const jobNum = (job.job_number || "").toLowerCase();
    
    return clientName.includes(query) || title.includes(query) || services.includes(query) || jobNum.includes(query);
  });

  return (
    <div className="flex flex-col gap-6 p-4 pt-12 pb-32">
      {/* Standard Header */}
      <div className="flex justify-between items-center mb-6 relative">
        {/* Left side: Hamburger Menu */}
        <div className="relative z-50">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 rounded-full bg-[#1e201e] border border-[#474846]/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0"
          >
            <span className="material-symbols-outlined text-[#faf9f5]">menu</span>
          </button>
          
          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute top-12 left-0 w-48 bg-[#1e201e] border border-[#474846]/30 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <Link 
                  href="/mobile/sales/profile"
                  className="flex items-center gap-3 px-4 py-4 hover:bg-[#aeee2a]/10 text-[#faf9f5] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  <span className="font-semibold text-sm">My Profile</span>
                </Link>
                <div className="h-[1px] bg-[#474846]/30 w-full" />
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
        <h1 className="text-lg font-black tracking-widest uppercase text-[#faf9f5] absolute left-1/2 -translate-x-1/2">
          PROJECTS
        </h1>

        {/* Right side: Avatar */}
        <Link href="/mobile/sales/profile" className="w-10 h-10 rounded-full bg-[#1e201e] border border-[#474846]/30 shadow-lg flex items-center justify-center overflow-hidden active:scale-95 transition-transform shrink-0 z-10">
          <img src="https://ui-avatars.com/api/?name=SD&background=aeee2a&color=080808&bold=true" alt="Profile" className="w-full h-full object-cover" />
        </Link>
      </div>

      {/* Global Search Bar */}
      <div className="relative mb-2">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#7B7B78] pointer-events-none">search</span>
        <input 
          type="text"
          placeholder="Search project, client, service..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#121412] text-[#faf9f5] border border-[#474846]/50 rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-[#aeee2a] placeholder-[#7B7B78] transition-colors shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center mt-20 gap-4">
          <span className="material-symbols-outlined text-4xl animate-spin text-[#aeee2a]" translate="no">progress_activity</span>
          <span className="text-[#ababa8] font-bold text-sm tracking-widest uppercase">Loading Projects...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-1 mb-2">
            <span className="text-sm font-bold text-[#ababa8]">
              {filteredJobs.length} {filteredJobs.length === 1 ? 'Project' : 'Projects'} Found
            </span>
            <span className="material-symbols-outlined text-[#aeee2a] text-[20px]">filter_list</span>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-10 p-8 bg-[#121412] rounded-3xl border border-[#474846]/20">
              <span className="material-symbols-outlined text-4xl text-[#7B7B78] mb-3">search_off</span>
              <p className="text-[#faf9f5] font-bold">No projects found</p>
              <p className="text-[#ababa8] text-sm text-center mt-1">Try searching for a different term.</p>
            </div>
          ) : (
            filteredJobs.map((job) => {
              // Extraction
              const clientName = job.customer?.full_name ?? "No Client Assigned";
              const location = job.city ? `${job.city}, ${job.state}` : "Location Pending";
              
              const value = job.contract_price ? formatCurrency(job.contract_price) : "$-- / Pending"; 
              
              const services = job.services && job.services.length > 0 
                ? job.services.map((s: any) => s.service_type?.name).join(", ") 
                : "No Service Defined";

              // Extract the first assigned crew if any
              let partnerName = "Pending Crew Assignment";
              if (job.services) {
                for (const svc of job.services) {
                  if (svc.assignments && svc.assignments.length > 0 && svc.assignments[0].crew) {
                    partnerName = svc.assignments[0].crew.name;
                    break;
                  }
                }
              }

              return (
                <Link href={`/mobile/sales/projects/${job.id}`} key={job.id}>
                  <div className="bg-[#121412] active:scale-[0.98] transition-transform duration-200 rounded-3xl p-5 border border-[#474846]/30 shadow-lg relative overflow-hidden flex flex-col gap-3">
                    {/* Left Accent Neon Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${job.status === 'active' ? 'bg-[#aeee2a]' : 'bg-[#ff7351]'}`} />
                    
                    {/* Top Row: Job Number & Status icon */}
                    <div className="flex justify-between items-center pl-2">
                      <span className="font-mono text-[10px] text-[#7B7B78] font-bold uppercase tracking-widest pl-1">
                        Job {job.job_number}
                      </span>
                      {job.status === "active" ? (
                        <div className="bg-[#aeee2a]/15 text-[#aeee2a] px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-[#aeee2a]/20">Active</div>
                      ) : (
                        <div className="bg-[#ff7351]/15 text-[#ff7351] px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-[#ff7351]/20">Pending</div>
                      )}
                    </div>

                    {/* Client info */}
                    <div className="flex items-center gap-3 mt-1 pl-2">
                      <div className="w-10 h-10 rounded-full bg-[#1e201e] flex items-center justify-center shrink-0 border border-[#474846]/50">
                        <span className="material-symbols-outlined text-[#faf9f5] text-[20px]">person</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-black text-[#faf9f5] leading-tight">{clientName}</span>
                        <span className="text-xs text-[#ababa8] mt-0.5 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">location_on</span>
                          {location}
                        </span>
                      </div>
                    </div>

                    <div className="h-[1px] w-full bg-[#474846]/20 my-1 ml-2" />

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3 pl-2">
                      {/* Service */}
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest font-bold text-[#7B7B78] mb-0.5">Service</span>
                        <span className="text-xs font-bold text-[#faf9f5] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[#aeee2a] text-[12px]">build</span>
                          <span className="truncate">{services}</span>
                        </span>
                      </div>
                      {/* Crew */}
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest font-bold text-[#7B7B78] mb-0.5">Crew Executing</span>
                        <span className="text-xs font-bold text-[#faf9f5] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[#ff7351] text-[12px]">engineering</span>
                          <span className="truncate">{partnerName}</span>
                        </span>
                      </div>
                    </div>

                    {/* Value display */}
                    <div className="mt-2 pl-2 flex items-center justify-between">
                      <div className="flex flex-col">
                          <span className="text-[9px] uppercase tracking-widest font-bold text-[#7B7B78]">Total Value</span>
                          <span className="text-lg font-black text-[#faf9f5] tracking-tight">{value}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#1e201e] flex items-center justify-center hover:bg-[#aeee2a] hover:text-[#080808] transition-colors cursor-pointer border border-[#474846]/50">
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      <MobileBottomNav items={SALES_NAV} />
    </div>
  );
}
