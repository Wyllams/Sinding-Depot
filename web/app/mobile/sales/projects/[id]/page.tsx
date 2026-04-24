"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MobileProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      if (!jobId) return;
      
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id, job_number, title, status, city, state, service_address_line_1, postal_code,
          description,
          customer:customers (full_name, email, phone),
          services:job_services (
            service_type:service_types (name),
            assignments:service_assignments (
              crew:crews (name)
            )
          ),
          blockers (title, type, status)
        `)
        .eq("id", jobId)
        .single();
        
      if (error) {
        console.error("Error fetching job details:", error);
      }

      if (data) {
        setJob(data);
      }
      setLoading(false);
    }
    fetchJob();
  }, [jobId]);

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center h-[100dvh] gap-4 w-full">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary" translate="no">progress_activity</span>
          <span className="text-on-surface-variant font-bold text-sm tracking-widest uppercase">Loading Project...</span>
        </div>
     );
  }

  if (!job) {
    return (
      <div className="p-6 pt-12 flex flex-col items-center justify-center gap-4">
        <span className="material-symbols-outlined text-4xl text-error">warning</span>
        <h1 className="text-white text-xl font-bold">Project not found</h1>
        <button onClick={() => router.back()} className="px-6 py-2 bg-surface-container-high rounded-full text-primary font-bold mt-4 border border-outline-variant/50">Go Back</button>
      </div>
    );
  }

  const fullAddress = [job.service_address_line_1, job.city, job.state, job.postal_code].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-6 p-4 pt-12 pb-32 w-full max-w-full overflow-hidden">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
         <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shrink-0 active:scale-95 transition-transform shadow-lg">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
         </button>
         <div className="flex flex-col ml-1">
            <span className="text-primary text-[10px] uppercase font-bold tracking-widest pl-1">Project Details</span>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Job {job.job_number}</h1>
         </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-surface-container-low rounded-3xl p-5 border border-outline-variant/30 shadow-lg relative flex flex-col gap-4">
         <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl ${job.status === 'active' ? 'bg-primary' : 'bg-error'}`} />
         
         <div className="flex justify-between items-center pl-2">
            <span className="text-lg font-black text-on-surface leading-tight">{job.customer?.full_name ?? "No Client"}</span>
            {job.status === "active" ? (
               <div className="bg-primary/15 text-primary px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-primary/20">Active</div>
            ) : (
               <div className="bg-error/15 text-error px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border border-error/20">Pending</div>
            )}
         </div>

         <div className="h-[1px] w-full bg-outline-variant/20 my-1 ml-2" />

         <div className="flex flex-col gap-3 pl-2">
            <div className="flex items-start gap-3">
               <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#7B7B78] text-[16px]">location_on</span>
               </div>
               <div className="flex flex-col pt-0.5">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-[#7B7B78] mb-0.5">Address</span>
                  <span className="text-sm font-medium text-on-surface">{fullAddress || "Not specified"}</span>
               </div>
            </div>

            <div className="flex items-start gap-3 mt-1">
               <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#7B7B78] text-[16px]">phone</span>
               </div>
               <div className="flex flex-col pt-0.5">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-[#7B7B78] mb-0.5">Phone</span>
                  <span className="text-sm font-medium text-on-surface">{job.customer?.phone || "Not specified"}</span>
               </div>
            </div>

            <div className="flex items-start gap-3 mt-1">
               <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#7B7B78] text-[16px]">mail</span>
               </div>
               <div className="flex flex-col pt-0.5">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-[#7B7B78] mb-0.5">Email</span>
                  <span className="text-sm font-medium text-on-surface">{job.customer?.email || "Not specified"}</span>
               </div>
            </div>
         </div>
      </div>

      {/* Services and Crews */}
      <div className="flex flex-col gap-3 mt-2">
         <div className="flex items-center gap-2 px-2">
             <span className="material-symbols-outlined text-[18px] text-primary">handyman</span>
             <h2 className="text-on-surface-variant font-bold text-sm tracking-widest uppercase">Services & Crews</h2>
         </div>
         
         {job.services && job.services.length > 0 ? (
            job.services.map((svc: any, idx: number) => {
               const crewName = svc.assignments && svc.assignments.length > 0 && svc.assignments[0].crew 
                  ? svc.assignments[0].crew.name 
                  : "Unassigned";

               return (
                  <div key={idx} className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-lg flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50">
                           <span className="material-symbols-outlined text-primary">build</span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-on-surface">{svc.service_type?.name}</span>
                           <span className="text-[9px] text-[#7B7B78] font-bold uppercase tracking-widest mt-0.5">Service Type</span>
                        </div>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-xs font-medium text-on-surface flex items-center gap-1">
                           <span className="material-symbols-outlined text-error text-[14px]">engineering</span>
                           {crewName}
                        </span>
                        <span className="text-[9px] text-[#7B7B78] font-bold uppercase tracking-widest mt-0.5">Execution</span>
                     </div>
                  </div>
               )
            })
         ) : (
            <div className="px-2 text-xs text-[#7B7B78] font-medium bg-surface-container-low py-4 rounded-xl text-center border border-outline-variant/30">No services assigned yet.</div>
         )}
      </div>

      {/* Description / Notes */}
      {job.description && (
         <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-2 px-2">
                <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                <h2 className="text-on-surface-variant font-bold text-sm tracking-widest uppercase">Notes</h2>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 shadow-lg">
               <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed opacity-90">{job.description}</p>
            </div>
         </div>
      )}

      {/* Documents & Media Vault */}
      <div className="flex flex-col gap-3 mt-4">
         <div className="flex items-center gap-2 px-2">
             <span className="material-symbols-outlined text-[18px] text-[#60b8f5]">folder_open</span>
             <h2 className="text-on-surface-variant font-bold text-sm tracking-widest uppercase">Documents & Media</h2>
         </div>
         
         <div className="flex flex-col gap-3">
            {/* Docs */}
            <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-lg flex items-center justify-between active:scale-[0.98] transition-transform">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                     <span className="material-symbols-outlined text-primary">description</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-on-surface">Contracts & Docs</span>
                     <span className="text-[10px] text-[#7B7B78] uppercase tracking-widest mt-0.5">Permits, Quotes</span>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#7B7B78]">0 Files</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
               </div>
            </div>

            {/* Photos */}
            <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-lg flex items-center justify-between active:scale-[0.98] transition-transform">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#60b8f5]/10 border border-[#60b8f5]/20 flex items-center justify-center">
                     <span className="material-symbols-outlined text-[#60b8f5]">photo_library</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-on-surface">Site Photos</span>
                     <span className="text-[10px] text-[#7B7B78] uppercase tracking-widest mt-0.5">Before, During, After</span>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#7B7B78]">0 Files</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
               </div>
            </div>

            {/* Videos */}
            <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 shadow-lg flex items-center justify-between active:scale-[0.98] transition-transform">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20 flex items-center justify-center">
                     <span className="material-symbols-outlined text-[#f5a623]">videocam</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-on-surface">Video Reports</span>
                     <span className="text-[10px] text-[#7B7B78] uppercase tracking-widest mt-0.5">Inspections</span>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#7B7B78]">0 Files</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
               </div>
            </div>
         </div>
      </div>
      
    </div>
  );
}
