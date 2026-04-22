"use client";

import { FieldChangeOrderModal } from "@/components/field/FieldChangeOrderModal";
import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ────────────────────────────────────────────────── */
/*  Types                                             */
/* ────────────────────────────────────────────────── */

interface JobDetail {
  jobId: string;
  title: string;
  address: string;
  city: string;
  state: string;
  serviceType: string;
  assignmentStatus: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
}

/* ────────────────────────────────────────────────── */
/*  Component                                         */
/* ────────────────────────────────────────────────── */

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

  // Job detail state
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  // Action states
  const [completing, setCompleting] = useState(false);
  const [showCOModal, setShowCOModal] = useState(false);
  const [coSuccess, setCOSuccess] = useState(false);

  // Extra Material modal
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialName, setMaterialName] = useState("");
  const [materialQty, setMaterialQty] = useState("1");
  const [materialSize, setMaterialSize] = useState("");
  const [materialNotes, setMaterialNotes] = useState("");
  const [submittingMaterial, setSubmittingMaterial] = useState(false);
  const [materialSuccess, setMaterialSuccess] = useState(false);

  // ─── Load real job data ──────────────────────────
  useEffect(() => {
    const loadJob = async (): Promise<void> => {
      setLoadingJob(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get job details
        const { data: jobData } = await supabase
          .from("jobs")
          .select("id, title, service_address_line_1, city, state")
          .eq("id", jobId)
          .single();

        if (!jobData) { setLoadingJob(false); return; }

        // Get service type + assignment status
        let serviceType = "Service";
        let assignmentStatus = "scheduled";
        let scheduledStart: string | null = null;
        let scheduledEnd: string | null = null;

        if (serviceId) {
          const { data: jsData } = await supabase
            .from("job_services")
            .select("id, service_types ( name )")
            .eq("id", serviceId)
            .single();

          if (jsData) {
            const stRaw = jsData.service_types;
            const st = Array.isArray(stRaw) ? stRaw[0] : stRaw;
            serviceType = st?.name ?? "Service";
          }

          // Get crew to find crew_id
          const { data: crew } = await supabase
            .from("crews")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle();

          if (crew) {
            const { data: sa } = await supabase
              .from("service_assignments")
              .select("status, scheduled_start_at, scheduled_end_at")
              .eq("job_service_id", serviceId)
              .eq("crew_id", crew.id)
              .maybeSingle();

            if (sa) {
              assignmentStatus = sa.status;
              scheduledStart = sa.scheduled_start_at;
              scheduledEnd = sa.scheduled_end_at;
            }
          }
        }

        setJob({
          jobId: jobData.id,
          title: jobData.title,
          address: jobData.service_address_line_1,
          city: jobData.city,
          state: jobData.state,
          serviceType,
          assignmentStatus,
          scheduledStart,
          scheduledEnd,
        });
      } catch {
        // silent
      }
      setLoadingJob(false);
    };
    loadJob();
  }, [jobId, serviceId]);

  // ─── Handle Complete ──────────────────────────
  const handleComplete = async (): Promise<void> => {
    if (!serviceId) {
      alert("Missing service_id to complete the job.");
      return;
    }

    const confirmMsg = "Are you sure this job is absolutely completed, debris removed, and ready for final customer signature?";
    if (!confirm(confirmMsg)) return;

    setCompleting(true);
    try {
      const res = await fetch("/api/services/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_service_id: serviceId,
          template_type: "coc_siding",
        }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to complete service");

      alert(`Success! The Certificate of Completion was drafted and the customer has been notified. Check-out confirmed.`);
      router.push("/field/jobs");

    } catch (e: unknown) {
      alert("Error: " + (e as Error).message);
    } finally {
      setCompleting(false);
    }
  };

  // ─── Handle Extra Material Request ─────────────
  const handleSubmitMaterial = async (): Promise<void> => {
    if (!materialName.trim()) { alert("Enter the material name."); return; }
    if (!materialQty || Number(materialQty) < 1) { alert("Enter a valid quantity."); return; }

    setSubmittingMaterial(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.from("extra_materials").insert({
        job_id: jobId,
        material_name: materialName.trim(),
        quantity: Number(materialQty),
        piece_size: materialSize.trim(),
        notes: materialNotes.trim() || null,
        customer_name: job?.title ?? "",
        status: "pending",
        requested_by: user.id,
        requested_by_name: profile?.full_name ?? "Partner",
      });

      if (error) throw new Error(error.message);

      // Success
      setShowMaterialModal(false);
      setMaterialName("");
      setMaterialQty("1");
      setMaterialSize("");
      setMaterialNotes("");
      setMaterialSuccess(true);
      setTimeout(() => setMaterialSuccess(false), 8000);
    } catch (e: unknown) {
      alert("Error: " + (e as Error).message);
    } finally {
      setSubmittingMaterial(false);
    }
  };

  // ─── Helpers ──────────────────────────────────
  function formatDateShort(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function statusBadge(status: string): { label: string; color: string; pulse: boolean } {
    switch (status) {
      case "in_progress": return { label: "In Progress", color: "#aeee2a", pulse: true };
      case "scheduled":   return { label: "Scheduled", color: "#60a5fa", pulse: false };
      case "completed":   return { label: "Completed", color: "#6b7280", pulse: false };
      case "assigned":    return { label: "Assigned", color: "#f59e0b", pulse: false };
      default: return { label: status.replace(/_/g, " "), color: "#6b7280", pulse: false };
    }
  }

  // ─── Loading state ────────────────────────────
  if (loadingJob) {
    return (
      <div className="flex justify-center py-20 bg-[#050505] min-h-full">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-[var(--color-siding-green)] rounded-full animate-spin" />
      </div>
    );
  }

  const badge = job ? statusBadge(job.assignmentStatus) : { label: "Active", color: "#aeee2a", pulse: true };

  return (
    <>
      <div className="p-4 space-y-6 bg-[#050505] min-h-full">
        {/* Header Visual */}
        <div className="bg-[#1e201e] border border-white/5 p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
             <span className="material-symbols-outlined text-[120px]" translate="no">location_on</span>
          </div>
          
          <div 
            className="px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-4"
            style={{
              backgroundColor: `${badge.color}15`,
              border: `1px solid ${badge.color}30`,
            }}
          >
             <div 
               className={`w-1.5 h-1.5 rounded-full ${badge.pulse ? "animate-pulse" : ""}`}
               style={{ backgroundColor: badge.color }}
             />
             <span 
               className="text-[10px] font-bold uppercase tracking-widest"
               style={{ color: badge.color }}
             >
               {badge.label}
             </span>
          </div>

          <h2 className="text-[#faf9f5] font-headline text-2xl font-bold tracking-tight mb-1">
            {job?.address ?? "Loading..."}
          </h2>
          <p className="text-[#ababa8] text-sm">{job?.city}, {job?.state}</p>

          <div className="mt-6 flex items-center justify-between border-t border-dashed border-white/5 pt-4">
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-[#474846] uppercase tracking-widest mb-1">Service</span>
               <span className="text-[#faf9f5] font-medium text-sm">{job?.serviceType ?? "Service"}</span>
             </div>
             <div className="flex flex-col text-right">
               <span className="text-[10px] font-bold text-[#474846] uppercase tracking-widest mb-1">Customer</span>
               <span className="text-[#faf9f5] font-medium text-sm">{job?.title ?? "—"}</span>
             </div>
          </div>

          {/* Dates */}
          {job?.scheduledStart && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-zinc-500 text-xs">
              <span className="material-symbols-outlined text-[14px]" translate="no">calendar_month</span>
              <span>
                {formatDateShort(job.scheduledStart)}
                {job.scheduledEnd ? ` → ${formatDateShort(job.scheduledEnd)}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Success feedbacks */}
        {coSuccess && (
          <div className="flex items-center gap-3 bg-[#1a2e00] border border-[#aeee2a]/20 rounded-3xl p-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-10 rounded-full bg-[#aeee2a]/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#aeee2a]" translate="no">check_circle</span>
            </div>
            <div>
              <p className="text-[#faf9f5] font-bold text-sm">Change Order Submitted!</p>
              <p className="text-[#ababa8] text-xs mt-0.5">Home Office will review and add pricing.</p>
            </div>
            <button onClick={() => setCOSuccess(false)} className="ml-auto text-[#474846] active:text-[#ababa8] transition-colors shrink-0">
              <span className="material-symbols-outlined text-lg" translate="no">close</span>
            </button>
          </div>
        )}

        {materialSuccess && (
          <div className="flex items-center gap-3 bg-[#1a2e00] border border-[#aeee2a]/20 rounded-3xl p-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-10 rounded-full bg-[#aeee2a]/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#aeee2a]" translate="no">check_circle</span>
            </div>
            <div>
              <p className="text-[#faf9f5] font-bold text-sm">Material Request Sent!</p>
              <p className="text-[#ababa8] text-xs mt-0.5">The office will review and approve your request.</p>
            </div>
            <button onClick={() => setMaterialSuccess(false)} className="ml-auto text-[#474846] active:text-[#ababa8] transition-colors shrink-0">
              <span className="material-symbols-outlined text-lg" translate="no">close</span>
            </button>
          </div>
        )}

        {/* Camera & Notes */}
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

        {/* Change Orders & Extra Material Request */}
        <div className="space-y-4 pt-2">
          <button 
            onClick={() => setShowCOModal(true)}
            className="w-full bg-[#121412] border border-dashed border-white/10 p-5 rounded-3xl flex items-center justify-between active:bg-white/5 transition-colors"
          >
            <div className="flex flex-col items-start">
               <span className="text-[#faf9f5] font-bold text-sm flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#ff7351] text-lg" translate="no">inventory_2</span>
                 Request Change Order
               </span>
               <span className="text-[#ababa8] text-xs mt-1">Report issues or request extras for Home Office</span>
            </div>
            <span className="material-symbols-outlined text-[#474846]" translate="no">add_circle</span>
          </button>

          {/* REQUEST EXTRA MATERIAL — replaces "Report Blocker" */}
          <button 
            onClick={() => setShowMaterialModal(true)}
            className="w-full bg-[#121412] border border-dashed border-white/10 p-5 rounded-3xl flex items-center justify-between active:bg-white/5 transition-colors"
          >
            <div className="flex flex-col items-start">
               <span className="text-[#faf9f5] font-bold text-sm flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#f59e0b] text-lg" translate="no">package_2</span>
                 Request Extra Material
               </span>
               <span className="text-[#ababa8] text-xs mt-1">Need extra supplies? Send a request to the office.</span>
            </div>
            <span className="material-symbols-outlined text-[#474846]" translate="no">add_circle</span>
          </button>
        </div>

        {/* COMPLETE BUTTON */}
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

      {/* Modal de Change Order */}
      {showCOModal && (
        <FieldChangeOrderModal
          jobId={jobId}
          serviceId={serviceId}
          onClose={() => setShowCOModal(false)}
          onSaved={() => {
            setShowCOModal(false);
            setCOSuccess(true);
            setTimeout(() => setCOSuccess(false), 8000);
          }}
        />
      )}

      {/* ─── EXTRA MATERIAL REQUEST MODAL ─────────── */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowMaterialModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-[#121412] border-t border-white/10 rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300">
            {/* Handle bar */}
            <div className="flex justify-center mb-5">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            {/* Title */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#f59e0b]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#f59e0b]" translate="no">package_2</span>
              </div>
              <div>
                <h3 className="text-[#faf9f5] font-bold text-lg">Request Extra Material</h3>
                <p className="text-zinc-500 text-xs">This will be sent to the office for approval.</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Material Name */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2 pl-1">
                  Material Name
                </label>
                <input
                  type="text"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  placeholder="e.g. J-Channel, Corner Post, Vinyl Siding..."
                  className="w-full bg-[#0a0a0a] border border-[#242624] rounded-xl px-4 py-3.5 text-sm font-bold text-[#faf9f5] placeholder-[#474846] focus:outline-none focus:border-[#f59e0b]/50 transition-all"
                />
              </div>

              {/* Qty + Piece Size row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2 pl-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={materialQty}
                    onChange={(e) => setMaterialQty(e.target.value)}
                    placeholder="1"
                    className="w-full bg-[#0a0a0a] border border-[#242624] rounded-xl px-4 py-3.5 text-sm font-bold text-[#faf9f5] placeholder-[#474846] focus:outline-none focus:border-[#f59e0b]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2 pl-1">
                    Piece Size
                  </label>
                  <input
                    type="text"
                    value={materialSize}
                    onChange={(e) => setMaterialSize(e.target.value)}
                    placeholder={`e.g. 12' x 6"`}
                    className="w-full bg-[#0a0a0a] border border-[#242624] rounded-xl px-4 py-3.5 text-sm font-bold text-[#faf9f5] placeholder-[#474846] focus:outline-none focus:border-[#f59e0b]/50 transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#ababa8] mb-2 pl-1">
                  Notes
                </label>
                <textarea
                  value={materialNotes}
                  onChange={(e) => setMaterialNotes(e.target.value)}
                  placeholder="Explain the purpose: what is it for, where will it be used..."
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#242624] rounded-xl px-4 py-3 text-sm font-bold text-[#faf9f5] placeholder-[#474846] focus:outline-none focus:border-[#f59e0b]/50 transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitMaterial}
                disabled={submittingMaterial || !materialName.trim()}
                className="w-full mt-2 bg-[#f59e0b] text-[#1a1a00] rounded-xl py-4 font-black uppercase tracking-widest text-xs disabled:opacity-50 transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {submittingMaterial ? (
                  <div className="w-5 h-5 border-2 border-[#1a1a00]/30 border-t-[#1a1a00] rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg" translate="no">send</span>
                    Send Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
