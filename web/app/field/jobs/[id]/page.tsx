"use client";

import { FieldTopBar } from "@/components/field/FieldTopBar";
import { useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function FieldJobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get("service_id");
  const resolvedParams = use(params);
  const { id: jobId } = resolvedParams;

  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    if (!serviceId) {
      alert("Missing service_id to complete the job.");
      return;
    }

    const confirmMsg = "Are you sure this job is absolutely completed, debris removed, and ready for final customer signature?";
    if (!confirm(confirmMsg)) return;

    setCompleting(true);
    try {
      // Chama a rotina de concluir (Priority 3.2 Backend) e gerar o Documento (COC)
      const res = await fetch("/api/services/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_service_id: serviceId,
          template_type: "coc_siding", // Mocking siding para esse endpoint no POC
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to complete service");

      alert(`Success! The Certificate of Completion was drafted and the customer has been notified. Check-out confirmed.`);
      router.push("/field/jobs");

    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <>
      <FieldTopBar title="Job Details" showBack />
      
      <div className="p-4 space-y-6">
        {/* Header Visual */}
        <div className="bg-[#1e201e] border border-white/5 p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
             <span className="material-symbols-outlined text-[120px]" translate="no">location_on</span>
          </div>
          
          <div className="bg-[#1a2e00] border border-[#aeee2a]/20 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-4">
             <div className="w-1.5 h-1.5 bg-[#aeee2a] rounded-full animate-pulse" />
             <span className="text-[#aeee2a] text-[10px] font-bold uppercase tracking-widest">Active</span>
          </div>

          <h2 className="text-[#faf9f5] font-headline text-2xl font-bold tracking-tight mb-1">
            400 Broad Street
          </h2>
          <p className="text-[#ababa8] text-sm">Seattle, WA 98109</p>

          <div className="mt-6 flex items-center justify-between border-t border-dashed border-white/5 pt-4">
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-[#474846] uppercase tracking-widest mb-1">Discipline</span>
               <span className="text-[#faf9f5] font-medium text-sm">Siding Installation</span>
             </div>
             <div className="flex flex-col text-right">
               <span className="text-[10px] font-bold text-[#474846] uppercase tracking-widest mb-1">Contact</span>
               <span className="text-[#faf9f5] font-medium text-sm">Mr. Smith</span>
             </div>
          </div>
        </div>

        {/* Câmera e Notas (Mockups Ui) */}
        <div className="flex gap-4">
          <button className="flex-1 bg-[#1e201e] border border-white/5 p-4 rounded-3xl flex flex-col items-center shadow-lg active:scale-95 transition-transform">
             <span className="material-symbols-outlined text-3xl text-[#aeee2a] mb-2" translate="no">photo_camera</span>
             <span className="text-[#faf9f5] font-bold text-sm">Add Photos</span>
             <span className="text-[#474846] text-[10px] font-bold uppercase tracking-widest mt-1">0 Uploads</span>
          </button>
          
          <button className="flex-1 bg-[#1e201e] border border-white/5 p-4 rounded-3xl flex flex-col items-center shadow-lg active:scale-95 transition-transform">
             <span className="material-symbols-outlined text-3xl text-[#aeee2a] mb-2" translate="no">edit_document</span>
             <span className="text-[#faf9f5] font-bold text-sm">Field Notes</span>
             <span className="text-[#474846] text-[10px] font-bold uppercase tracking-widest mt-1">2 Notes</span>
          </button>
        </div>

        {/* Change Orders e Blockers */}
        <div className="space-y-4 pt-2">
          <button className="w-full bg-[#121412] border border-dashed border-white/10 p-5 rounded-3xl flex items-center justify-between active:bg-white/5 transition-colors">
            <div className="flex flex-col items-start">
               <span className="text-[#faf9f5] font-bold text-sm flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#ff7351] text-lg" translate="no">inventory_2</span>
                 Request Material (Extra)
               </span>
               <span className="text-[#ababa8] text-xs mt-1">Drafts a Change Order for Home Office</span>
            </div>
            <span className="material-symbols-outlined text-[#474846]" translate="no">add_circle</span>
          </button>

          <button className="w-full bg-[#121412] border border-dashed border-white/10 p-5 rounded-3xl flex items-center justify-between active:bg-white/5 transition-colors">
            <div className="flex flex-col items-start">
               <span className="text-[#faf9f5] font-bold text-sm flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#ff7351] text-lg" translate="no">report</span>
                 Report Blocker
               </span>
               <span className="text-[#ababa8] text-xs mt-1">Weather, Access issues, etc.</span>
            </div>
            <span className="material-symbols-outlined text-[#474846]" translate="no">add_circle</span>
          </button>
        </div>

        {/* ACÃO FATAL: CONCLUIR */}
        <div className="pt-8 pb-32">
          <button 
            onClick={handleComplete}
            disabled={completing}
            className="w-full h-16 bg-[#aeee2a] text-[#1a2e00] font-bold text-lg rounded-full shadow-[0_10px_40px_rgba(174,238,42,0.25)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {completing ? (
               <div className="w-6 h-6 border-2 border-[#1a2e00]/20 border-t-[#1a2e00] rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined" translate="no">done_all</span>
                MARK AS COMPLETED
              </>
            )}
          </button>
          <p className="text-center text-[#474846] text-[10px] uppercase tracking-widest font-bold mt-4">
            Generates certificate & notifies client
          </p>
        </div>

      </div>
    </>
  );
}
