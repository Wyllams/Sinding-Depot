"use client";

import { FieldChangeOrderModal } from "@/components/field/FieldChangeOrderModal";
import { FieldDailyLogModal } from "@/components/field/FieldDailyLogModal";
import FieldCOCModal from "@/components/field/FieldCOCModal";
import { CustomDropdown } from "@/components/CustomDropdown";
import { useState, useEffect, use, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ────────────────────────────────────────────────── */
/*  Types                                             */
/* ────────────────────────────────────────────────── */

interface JobDetail {
  jobId: string;
  jobTitle: string;
  address: string;
  city: string;
  state: string;
  customerName: string;
  salespersonName: string;
  assignmentStatus: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  totalDays: number;
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

  // Daily Logs
  const [showDailyLogModal, setShowDailyLogModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [logSuccess, setLogSuccess] = useState(false);
  const [pendingDailyLogFiles, setPendingDailyLogFiles] = useState<File[]>([]);
  const [pendingDailyLogExistingUrls, setPendingDailyLogExistingUrls] = useState<string[]>([]);
  const hiddenDailyLogInputRef = useRef<HTMLInputElement>(null);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  const loadDailyLogs = async () => {
    if (!serviceId) return;
    const { data } = await supabase
      .from("daily_logs")
      .select("day_number, images")
      .eq("job_service_id", serviceId);
    if (data) setDailyLogs(data);
  };

  useEffect(() => {
    loadDailyLogs();
  }, [serviceId]);

  // Extra Material modal
  type ExtraMaterialItem = { name: string; qty: string; size: string; notes: string };
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialItems, setMaterialItems] = useState<ExtraMaterialItem[]>([{ name: "", qty: "1", size: "", notes: "" }]);
  const [submittingMaterial, setSubmittingMaterial] = useState(false);
  const [materialSuccess, setMaterialSuccess] = useState(false);

  const addMaterialItem = () => {
    setMaterialItems([...materialItems, { name: "", qty: "1", size: "", notes: "" }]);
  };

  const removeMaterialItem = (index: number) => {
    setMaterialItems(materialItems.filter((_, i) => i !== index));
  };

  const updateMaterialItem = (index: number, field: keyof ExtraMaterialItem, value: string) => {
    const newItems = [...materialItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setMaterialItems(newItems);
  };

  // COC (Certificate of Completion)
  const [showCOCModal, setShowCOCModal] = useState(false);

  const handleGlobalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setPendingDailyLogFiles(Array.from(e.target.files));
      setShowDailyLogModal(true);
    }
    // Reset so same selection triggers again
    if (hiddenDailyLogInputRef.current) hiddenDailyLogInputRef.current.value = "";
  };

  // Paint Colors
  const [showPaintModal, setShowPaintModal] = useState(false);
  const [paintColors, setPaintColors] = useState<any[]>([]);
  const [serviceTypeCode, setServiceTypeCode] = useState("");


  // ─── Load real job data ──────────────────────────
  useEffect(() => {
    const loadJob = async (): Promise<void> => {
      setLoadingJob(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get job details + customer + salesperson
        const { data: jobData } = await supabase
          .from("jobs")
          .select(`
            id, 
            title, 
            status,
            service_address_line_1, 
            city, 
            state,
            customers ( full_name ),
            salespersons ( full_name )
          `)
          .eq("id", jobId)
          .single();

        if (!jobData) { setLoadingJob(false); return; }

        const custRaw = jobData.customers;
        const customer = Array.isArray(custRaw) ? custRaw[0] : custRaw;
        
        const salesRaw = jobData.salespersons;
        const salesperson = Array.isArray(salesRaw) ? salesRaw[0] : salesRaw;

        // Get assignment status — use jobs.status as the primary status (same as Desktop)
        let assignmentStatus = (jobData as any).status || "pending";
        let scheduledStart: string | null = null;
        let scheduledEnd: string | null = null;
        let sTypeCode = "";

        if (serviceId) {
          // Get crew to find crew_id
          const { data: crew } = await supabase
            .from("crews")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle();

          if (crew) {
            const { data: sa } = await supabase
              .from("service_assignments")
              .select("scheduled_start_at, scheduled_end_at")
              .eq("job_service_id", serviceId)
              .eq("crew_id", crew.id)
              .maybeSingle();

            if (sa) {
              scheduledStart = sa.scheduled_start_at;
              scheduledEnd = sa.scheduled_end_at;
            }
          }

          // Fetch the service type code (e.g. "painting")
          const { data: js } = await supabase
            .from("job_services")
            .select("service_types(code)")
            .eq("id", serviceId)
            .maybeSingle();

          if (js && js.service_types && !Array.isArray(js.service_types)) {
            sTypeCode = (js.service_types as any).code;
            setServiceTypeCode(sTypeCode);
          }
        }

        // If it's a painting service, fetch the color selections
        if (sTypeCode === "painting") {
          const { data: colors } = await supabase
            .from("job_color_selections")
            .select("*")
            .eq("job_id", jobId);
          if (colors) {
            setPaintColors(colors);
          }
        }

        // Calculate total days excluding Sundays
        let totalDays = 1;
        if (scheduledStart && scheduledEnd) {
          const start = new Date(scheduledStart);
          const end = new Date(scheduledEnd);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            let days = 0;
            let curr = new Date(start);
            while (curr <= end) {
              if (curr.getDay() !== 0) days++; // Skip Sundays
              curr.setDate(curr.getDate() + 1);
            }
            totalDays = Math.max(1, days);
          }
        }

        setJob({
          jobId: jobData.id,
          jobTitle: jobData.title,
          address: jobData.service_address_line_1,
          city: jobData.city,
          state: jobData.state,
          customerName: customer?.full_name ?? "Unknown Customer",
          salespersonName: salesperson?.full_name ?? "Unknown Rep",
          assignmentStatus,
          scheduledStart,
          scheduledEnd,
          totalDays,
        });
      } catch {
        // silent
      }
      setLoadingJob(false);
    };
    loadJob();
  }, [jobId, serviceId]);

  // ─── Handle Duration Change ───────────────────
  const [updatingDuration, setUpdatingDuration] = useState(false);

  const handleDurationChange = async (newDaysStr: string) => {
    if (!serviceId || !job?.scheduledStart) return;
    const newDays = parseInt(newDaysStr, 10);
    if (isNaN(newDays) || newDays < 1) return;

    setUpdatingDuration(true);
    
    // Add newDays - 1 working days to scheduledStart to get new scheduledEnd
    const startObj = new Date(job.scheduledStart);
    let added = 0;
    while (added < newDays - 1) {
      startObj.setDate(startObj.getDate() + 1);
      if (startObj.getDay() !== 0) added++; // Skip Sundays
    }
    
    // Preserve standard time by forcing T12:00:00.000Z or similar if needed,
    // but typically we can just keep the time of scheduledStart or use the date part
    const newEndIso = startObj.toISOString().split("T")[0] + "T12:00:00.000Z";

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if(!user) throw new Error("No user");
        
        const { data: crew } = await supabase
            .from("crews")
            .select("id")
            .eq("profile_id", user.id)
            .maybeSingle();

        if(!crew) throw new Error("No crew found");

        const { error } = await supabase
          .from("service_assignments")
          .update({ scheduled_end_at: newEndIso })
          .eq("job_service_id", serviceId)
          .eq("crew_id", crew.id);

        if (error) throw error;
        
        // Optimistic update
        setJob({ ...job, scheduledEnd: newEndIso, totalDays: newDays });
    } catch (err) {
        console.error("Failed to update duration", err);
        alert("Failed to update duration.");
    } finally {
        setUpdatingDuration(false);
    }
  };

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

      alert(`Success! Service marked as completed. The Certificate of Completion was drafted and sent to the customer for signature.`);
      
      // Update optimistic state
      setJob(prev => prev ? { ...prev, assignmentStatus: "done" } : null);
      
      router.push("/field/jobs");

    } catch (e: unknown) {
      alert("Error: " + (e as Error).message);
    } finally {
      setCompleting(false);
    }
  };

  // ─── Handle Extra Material Request ─────────────
  const handleSubmitMaterial = async (): Promise<void> => {
    const validItems = materialItems.filter(item => item.name.trim() !== "" && Number(item.qty) > 0);
    
    if (validItems.length === 0) { 
      alert("Please enter at least one valid material with a quantity greater than 0."); 
      return; 
    }

    setSubmittingMaterial(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const itemsToInsert = validItems.map(item => ({
        job_id: jobId,
        material_name: item.name.trim(),
        quantity: Number(item.qty),
        piece_size: item.size.trim(),
        notes: item.notes.trim() || null,
        customer_name: job?.jobTitle ?? "",
        status: "pending",
        requested_by: user.id,
        requested_by_name: profile?.full_name ?? "Partner",
      }));

      const { error } = await supabase.from("extra_materials").insert(itemsToInsert);

      if (error) throw new Error(error.message);

      // Push notification to admins
      try {
        const itemSummary = validItems.map(i => `${i.qty}x ${i.name}`).join(", ");
        await fetch('/api/push/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: '📦 Extra Material Request',
            body: `${profile?.full_name ?? 'Partner'} requested: ${itemSummary} for ${job?.customerName || 'a customer'}`,
            url: `/projects/${jobId}`,
            tag: 'extra-material-request',
            notificationType: 'extra_material_request',
            relatedEntityId: jobId,
          }),
        });
      } catch { /* non-blocking */ }

      // Success
      setShowMaterialModal(false);
      setMaterialItems([{ name: "", qty: "1", size: "", notes: "" }]);
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
      case "pending":      return { label: "Pending", color: "#ef4444", pulse: false };
      case "in_progress": return { label: "In Progress", color: "#aeee2a", pulse: true };
      case "scheduled":   return { label: "Scheduled", color: "#60a5fa", pulse: false };
      case "completed":   return { label: "Completed", color: "#6b7280", pulse: false };
      case "done":        return { label: "Done", color: "#16a34a", pulse: false };
      case "assigned":    return { label: "Assigned", color: "#f59e0b", pulse: false };
      default: return { label: status.replace(/_/g, " "), color: "#6b7280", pulse: false };
    }
  }

  // ─── Loading state ────────────────────────────
  if (loadingJob) {
    return (
      <div className="flex justify-center py-20 bg-mobile-frame min-h-full">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-[var(--color-siding-green)] rounded-full animate-spin" />
      </div>
    );
  }

  const badge = job ? statusBadge(job.assignmentStatus) : { label: "Active", color: "#aeee2a", pulse: true };

  return (
    <>
      <div className="p-4 space-y-6 bg-mobile-frame min-h-full">
        {/* Header Visual */}
        <div className="bg-surface-container-high border border-white/5 p-6 rounded-3xl relative overflow-hidden">
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

          <h2 className="text-on-surface font-headline text-2xl font-bold tracking-tight mb-1">
            {job?.address ?? "Loading..."}
          </h2>
          <p className="text-on-surface-variant text-sm">{job?.city}, {job?.state}</p>

          <div className="mt-6 flex items-center justify-between border-t border-dashed border-white/5 pt-4">
             <div className="flex flex-col">
               <span className="text-[10px] font-bold text-[var(--color-siding-green)] uppercase tracking-widest mb-1">Rep</span>
               <span className="text-on-surface font-medium text-sm flex items-center gap-1.5">
                 <span className="material-symbols-outlined text-[14px]" translate="no">person</span>
                 {job?.salespersonName ?? "—"}
               </span>
             </div>
             <div className="flex flex-col text-right">
               <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">Customer</span>
               <span className="text-on-surface font-medium text-sm">{job?.customerName ?? "—"}</span>
             </div>
          </div>

          {/* Start Date */}
          {job?.scheduledStart && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-zinc-500 font-medium text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]" translate="no">calendar_month</span>
                <span>Start: {formatDateShort(job.scheduledStart)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Duration Dropdown */}
        <div className="pt-2">
          <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2 pl-1 flex items-center gap-2">
            Duration (Days)
            {updatingDuration && <span className="w-3 h-3 border border-t-[var(--color-siding-green)] rounded-full animate-spin ml-2"></span>}
          </h3>
          <CustomDropdown
            value={job ? String(job.totalDays) : "1"}
            onChange={handleDurationChange}
            options={Array.from({ length: 30 }).map((_, i) => ({
              value: String(i + 1),
              label: `${i + 1} day${i === 0 ? '' : 's'}`
            }))}
            className="w-full bg-surface-container-high border border-white/5 rounded-2xl pl-5 pr-4 py-4 text-sm font-bold text-on-surface flex justify-between items-center transition-colors hover:bg-[#252825]"
            disabled={updatingDuration || !job}
          />
        </div>

        {/* Success feedbacks */}
        {logSuccess && (
          <div className="flex items-center gap-3 bg-[#1a2e00] border border-primary/20 rounded-3xl p-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary" translate="no">check_circle</span>
            </div>
            <div>
              <p className="text-on-surface font-bold text-sm">Daily Log Saved!</p>
              <p className="text-on-surface-variant text-xs mt-0.5">The office has been notified.</p>
            </div>
            <button onClick={() => setLogSuccess(false)} className="ml-auto text-outline-variant active:text-on-surface-variant transition-colors shrink-0">
              <span className="material-symbols-outlined text-lg" translate="no">close</span>
            </button>
          </div>
        )}

        {coSuccess && (
          <div className="flex items-center gap-3 bg-[#1a2e00] border border-primary/20 rounded-3xl p-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary" translate="no">check_circle</span>
            </div>
            <div>
              <p className="text-on-surface font-bold text-sm">Change Order Submitted!</p>
              <p className="text-on-surface-variant text-xs mt-0.5">Home Office will review and add pricing.</p>
            </div>
            <button onClick={() => setCOSuccess(false)} className="ml-auto text-outline-variant active:text-on-surface-variant transition-colors shrink-0">
              <span className="material-symbols-outlined text-lg" translate="no">close</span>
            </button>
          </div>
        )}

        {materialSuccess && (
          <div className="flex items-center gap-3 bg-[#1a2e00] border border-primary/20 rounded-3xl p-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary" translate="no">check_circle</span>
            </div>
            <div>
              <p className="text-on-surface font-bold text-sm">Material Request Sent!</p>
              <p className="text-on-surface-variant text-xs mt-0.5">The office will review and approve your request.</p>
            </div>
            <button onClick={() => setMaterialSuccess(false)} className="ml-auto text-outline-variant active:text-on-surface-variant transition-colors shrink-0">
              <span className="material-symbols-outlined text-lg" translate="no">close</span>
            </button>
          </div>
        )}



        {/* Daily Logs */}
        <div className="pt-2 pb-2">
          <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2 pl-1">Daily Logs</h3>
          <div className="flex overflow-x-auto gap-3 pt-2 pb-2 px-1 -mx-1 scrollbar-hide">
            {Array.from({ length: job?.totalDays || 1 }).map((_, i) => {
              const dayNum = i + 1;
              const logForDay = dailyLogs.find(l => l.day_number === dayNum);
              const photoCount = logForDay?.images?.length || 0;

              return (
                <div key={i} className="relative flex-shrink-0">
                  {photoCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-primary text-[#1a1a00] text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-surface-container-low z-10 shadow-sm">
                      {photoCount}
                    </span>
                  )}
                  <button
                    onClick={() => { 
                      setSelectedDay(dayNum);
                      const existingPhotos = logForDay?.images || [];
                      setPendingDailyLogExistingUrls(existingPhotos);
                      
                      if (existingPhotos.length === 0) {
                        hiddenDailyLogInputRef.current?.click();
                      } else {
                        setPendingDailyLogFiles([]);
                        setShowDailyLogModal(true);
                      }
                    }}
                    className="w-full h-full bg-surface-container-high border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] active:scale-95 transition-transform shadow-sm"
                  >
                    <span className="material-symbols-outlined text-primary text-2xl mb-1" translate="no">event_note</span>
                    <span className="text-on-surface font-bold text-sm">Day {dayNum}</span>
                  </button>
                </div>
              );
            })}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            ref={hiddenDailyLogInputRef}
            onChange={handleGlobalFileChange}
          />
        </div>

        {/* Change Orders & Extra Material Request */}
        <div className="space-y-4 pt-2">
          <button 
            onClick={() => setShowCOModal(true)}
            className="w-full bg-surface-container-low border border-dashed border-white/10 p-5 rounded-3xl flex items-center justify-between active:bg-white/5 transition-colors"
          >
            <div className="flex flex-col items-start">
               <span className="text-on-surface font-bold text-sm flex items-center gap-2">
                 <span className="material-symbols-outlined text-error text-lg" translate="no">inventory_2</span>
                 Request Change Order
               </span>
               <span className="text-on-surface-variant text-xs mt-1">Report issues or request extras for Home Office</span>
            </div>
            <span className="material-symbols-outlined text-outline-variant" translate="no">add_circle</span>
          </button>

          {/* REQUEST EXTRA MATERIAL — replaces "Report Blocker" */}
          <button 
            onClick={() => setShowMaterialModal(true)}
            className="w-full bg-surface-container-low border border-dashed border-white/10 p-5 rounded-3xl flex items-center justify-between active:bg-white/5 transition-colors"
          >
            <div className="flex flex-col items-start">
               <span className="text-on-surface font-bold text-sm flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#f59e0b] text-lg" translate="no">package_2</span>
                 Request Extra Material
               </span>
               <span className="text-on-surface-variant text-xs mt-1">Need extra supplies? Send a request to the office.</span>
            </div>
               <span className="material-symbols-outlined text-outline-variant" translate="no">add_circle</span>
            </button>

            {/* Paint Colors (Visible Only for Painters) */}
            {serviceTypeCode === 'painting' && (
              <button 
                onClick={() => setShowPaintModal(true)}
                className="w-full bg-surface-container-low border border-dashed border-white/10 p-5 rounded-3xl flex items-center justify-between active:bg-white/5 transition-colors"
              >
                <div className="flex flex-col items-start">
                   <span className="text-on-surface font-bold text-sm flex items-center gap-2">
                     <span className="material-symbols-outlined text-[#3b82f6] text-lg" translate="no">palette</span>
                     View Paint Colors
                   </span>
                   <span className="text-on-surface-variant text-xs mt-1">Check the colors selected by the customer</span>
                </div>
                <span className="material-symbols-outlined text-outline-variant" translate="no">chevron_right</span>
              </button>
            )}

            {/* COC Button */}
            <button 
              onClick={() => setShowCOCModal(true)}
              className="w-full bg-surface-container-high border border-white/5 p-5 rounded-3xl flex items-center justify-between active:scale-[0.98] transition-transform"
            >
               <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-3xl text-primary" translate="no">verified</span>
                  <div className="text-left">
                    <h4 className="text-on-surface font-bold text-base">Certificate of Completion</h4>
                    <p className="text-zinc-500 text-xs mt-1">Submit the signed COC for {job?.jobTitle || 'this service'}</p>
                  </div>
               </div>
               <span className="material-symbols-outlined text-outline-variant" translate="no">chevron_right</span>
            </button>
            
          </div>

        {/* COMPLETE BUTTON */}
        <div className="pt-8 pb-32">
          <button 
            onClick={handleComplete}
            disabled={completing}
            className="w-full h-16 bg-primary text-[#1a2e00] font-bold text-lg rounded-full shadow-[0_10px_40px_rgba(174,238,42,0.25)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
          <p className="text-center text-outline-variant text-[10px] uppercase tracking-widest font-bold mt-4">
            Generates certificate & notifies client
          </p>
        </div>

      </div>

      {/* Modal de Change Order */}
      {showCOModal && serviceId && (
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

      {/* Modal de Daily Log */}
      {showDailyLogModal && serviceId && (
        <FieldDailyLogModal
          jobId={jobId}
          serviceId={serviceId as string}
          dayNumber={selectedDay}
          initialFiles={pendingDailyLogFiles}
          existingUrls={pendingDailyLogExistingUrls}
          onClose={() => {
            setShowDailyLogModal(false);
            setPendingDailyLogFiles([]);
            setPendingDailyLogExistingUrls([]);
          }}
          onSaved={() => {
            setShowDailyLogModal(false);
            setPendingDailyLogFiles([]);
            setPendingDailyLogExistingUrls([]);
            setLogSuccess(true);
            setTimeout(() => setLogSuccess(false), 8000);
            loadDailyLogs();
          }}
        />
      )}

      {/* Modal de COC */}
      {showCOCModal && serviceId && (
        <FieldCOCModal
          jobId={jobId}
          serviceId={serviceId as string}
          serviceName={job?.jobTitle || 'Service'}
          onClose={() => setShowCOCModal(false)}
          onSaved={() => {
            setShowCOCModal(false);
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
          <div className="relative w-full max-w-md bg-surface-container-low border-t border-white/10 rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300">
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
                <h3 className="text-on-surface font-bold text-lg">Request Extra Material</h3>
                <p className="text-zinc-500 text-xs">This will be sent to the office for approval.</p>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4 max-h-[65dvh] overflow-y-auto pb-4 custom-scrollbar">
              {materialItems.map((item, index) => (
                <div key={index} className="bg-surface-container-high border border-white/5 rounded-2xl p-4 relative space-y-4">
                  {materialItems.length > 1 && (
                    <button 
                      onClick={() => removeMaterialItem(index)}
                      className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]" translate="no">delete</span>
                    </button>
                  )}
                  {/* Material Name */}
                  <div className={materialItems.length > 1 ? "pr-8" : ""}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
                      Material Name {materialItems.length > 1 ? `#${index + 1}` : ""}
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateMaterialItem(index, 'name', e.target.value)}
                      placeholder="e.g. J-Channel, Vinyl Siding..."
                      className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none focus:border-[#f59e0b]/50 transition-all"
                    />
                  </div>

                  {/* Qty + Piece Size row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateMaterialItem(index, 'qty', e.target.value)}
                        placeholder="1"
                        className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none focus:border-[#f59e0b]/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
                        Piece Size
                      </label>
                      <input
                        type="text"
                        value={item.size}
                        onChange={(e) => updateMaterialItem(index, 'size', e.target.value)}
                        placeholder={`e.g. 12' x 6"`}
                        className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none focus:border-[#f59e0b]/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
                      Notes
                    </label>
                    <textarea
                      value={item.notes}
                      onChange={(e) => updateMaterialItem(index, 'notes', e.target.value)}
                      placeholder="Explain the purpose..."
                      rows={2}
                      className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none focus:border-[#f59e0b]/50 transition-all resize-none"
                    />
                  </div>
                </div>
              ))}

              {/* Add More Button */}
              <button
                onClick={addMaterialItem}
                className="w-full bg-[#0a0a0a] border border-dashed border-[#f59e0b]/30 text-[#f59e0b] rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#f59e0b]/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]" translate="no">add</span>
                Add Another Item
              </button>

              {/* Submit Button */}
              <button
                onClick={handleSubmitMaterial}
                disabled={submittingMaterial || materialItems.every(i => !i.name.trim())}
                className="w-full mt-2 bg-[#f59e0b] text-[#1a1a00] rounded-xl py-4 font-black uppercase tracking-widest text-xs disabled:opacity-50 transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {submittingMaterial ? (
                  <div className="w-5 h-5 border-2 border-[#1a1a00]/30 border-t-[#1a1a00] rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg" translate="no">send</span>
                    Send Request ({materialItems.filter(i => i.name.trim()).length} items)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAINT COLORS MODAL */}
      {showPaintModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 pb-0 sm:pb-6 bg-layout-bg/80 backdrop-blur-sm transition-opacity">
          <div className="bg-surface-container-low w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl border border-white/10 animate-in slide-in-from-bottom flex flex-col max-h-[90dvh]">
            
            {/* Header */}
            <div className="sticky top-0 bg-surface-container-low px-6 pt-6 pb-4 border-b border-white/5 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#3b82f6]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#3b82f6]" translate="no">palette</span>
                </div>
                <div>
                  <h3 className="text-on-surface font-black text-lg">Paint Colors</h3>
                  <p className="text-on-surface-variant text-xs">Customer Selections</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPaintModal(false)}
                className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 pb-28 overflow-y-auto space-y-4">
              {paintColors.length === 0 ? (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-4xl text-zinc-600 mb-2" translate="no">format_paint</span>
                  <p className="text-zinc-400 text-sm">No paint colors selected yet.</p>
                </div>
              ) : (
                <div className="bg-surface-container-high border border-white/5 rounded-2xl p-5 space-y-4">
                  {paintColors.map((color) => (
                    <div key={color.id} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <span className="text-on-surface-variant font-medium text-sm">{color.surface_area}:</span>
                      <div className="text-right">
                        <span className="text-on-surface font-bold text-sm">
                          {color.brand === 'Sherwin-Williams' ? 'SW' : color.brand} {color.color_code} {color.color_name ? `(${color.color_name})` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>

  );
}
