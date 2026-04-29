"use client";

import { FieldChangeOrderModal } from "@/components/field/FieldChangeOrderModal";
import { FieldDailyLogModal } from "@/components/field/FieldDailyLogModal";
import FieldCOCModal from "@/components/field/FieldCOCModal";
import { FieldLaborBillModal } from "@/components/field/FieldLaborBillModal";
import { CustomDropdown } from "@/components/CustomDropdown";
import { useState, useEffect, use, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";

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

interface LaborBillSummary {
  id: string;
  status: string;
  total: number;
  created_at: string;
  templateCode: string;
  templateTitle: string;
  crewName: string | null;
  installerName: string | null;
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
  const t = useTranslations("FieldJobDetail");

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
  type ExtraMaterialItem = { name: string; qty: string; size: string; notes: string; photos: File[] };
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialItems, setMaterialItems] = useState<ExtraMaterialItem[]>([{ name: "", qty: "1", size: "", notes: "", photos: [] }]);
  const [submittingMaterial, setSubmittingMaterial] = useState(false);
  const [materialSuccess, setMaterialSuccess] = useState(false);

  const addMaterialItem = () => {
    setMaterialItems([...materialItems, { name: "", qty: "1", size: "", notes: "", photos: [] }]);
  };

  const removeMaterialItem = (index: number) => {
    setMaterialItems(materialItems.filter((_, i) => i !== index));
  };

  const updateMaterialItem = (index: number, field: keyof ExtraMaterialItem, value: string) => {
    const newItems = [...materialItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setMaterialItems(newItems);
  };

  const addPhotosToItem = (index: number, files: FileList | null) => {
    if (!files) return;
    const newItems = [...materialItems];
    newItems[index] = { ...newItems[index], photos: [...newItems[index].photos, ...Array.from(files)] };
    setMaterialItems(newItems);
  };

  const removePhotoFromItem = (itemIndex: number, photoIndex: number) => {
    const newItems = [...materialItems];
    newItems[itemIndex] = { ...newItems[itemIndex], photos: newItems[itemIndex].photos.filter((_, i) => i !== photoIndex) };
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

  // Labor Bills
  const [laborBills, setLaborBills] = useState<LaborBillSummary[]>([]);
  const [loadingLaborBills, setLoadingLaborBills] = useState(false);
  const [selectedLaborBill, setSelectedLaborBill] = useState<LaborBillSummary | null>(null);


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
          customerName: customer?.full_name ?? t("unknownCustomer"),
          salespersonName: salesperson?.full_name ?? t("unknownRep"),
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

  // ─── Load Labor Bills for this job ─────────────
  useEffect(() => {
    const loadLaborBills = async (): Promise<void> => {
      setLoadingLaborBills(true);
      try {
        const { data } = await supabase
          .from("job_labor_bills")
          .select(`
            id, status, total, created_at,
            labor_bill_templates:labor_bill_templates!job_labor_bills_template_id_fkey(title, code),
            crews(name),
            installer_name
          `)
          .eq("job_id", jobId)
          .order("created_at", { ascending: false });

        if (data) {
          const mapped: LaborBillSummary[] = data.map((b: any) => {
            const tmpl = Array.isArray(b.labor_bill_templates) ? b.labor_bill_templates[0] : b.labor_bill_templates;
            const crewData = Array.isArray(b.crews) ? b.crews[0] : b.crews;
            return {
              id: b.id,
              status: b.status,
              total: Number(b.total || 0),
              created_at: b.created_at,
              templateCode: tmpl?.code || "",
              templateTitle: tmpl?.title || "",
              crewName: crewData?.name || null,
              installerName: b.installer_name || null,
            };
          });
          setLaborBills(mapped);
        }
      } catch {
        // silent
      }
      setLoadingLaborBills(false);
    };
    loadLaborBills();
  }, [jobId]);

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
        alert(t("durationFailed"));
    } finally {
        setUpdatingDuration(false);
    }
  };

  // ─── Handle Complete ──────────────────────────
  const handleComplete = async (): Promise<void> => {
    if (!serviceId) {
      alert(t("missingServiceId"));
      return;
    }

    const confirmMsg = t("confirmComplete");
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

      alert(t("successComplete"));
      
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
      alert(t("invalidMaterial")); 
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

      // Generate a single batch_id to group all items from this submission
      const batchId = crypto.randomUUID();

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
        batch_id: batchId,
      }));

      const { data: insertedRows, error } = await supabase
        .from("extra_materials")
        .insert(itemsToInsert)
        .select("id");

      if (error) throw new Error(error.message);

      // Upload photos for each item
      if (insertedRows) {
        for (let i = 0; i < validItems.length; i++) {
          const item = validItems[i];
          const row = insertedRows[i];
          if (!row || item.photos.length === 0) continue;
          for (const photo of item.photos) {
            try {
              const formData = new FormData();
              formData.append("file", photo);
              formData.append("folder", `extra-materials/${jobId}`);
              const res = await fetch("/api/upload", { method: "POST", body: formData });
              const result = await res.json();
              if (res.ok && result.url) {
                await supabase.from("extra_material_attachments").insert({
                  extra_material_id: row.id,
                  file_url: result.url,
                  file_name: photo.name,
                });
              }
            } catch { /* non-blocking */ }
          }
        }
      }

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
      setMaterialItems([{ name: "", qty: "1", size: "", notes: "", photos: [] }]);
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
      case "pending":      return { label: t("pending"), color: "#ef4444", pulse: false };
      case "in_progress": return { label: t("inProgress"), color: "#aeee2a", pulse: true };
      case "scheduled":   return { label: t("scheduled"), color: "#60a5fa", pulse: false };
      case "completed":   return { label: t("completed"), color: "#22c55e", pulse: false };
      case "done":        return { label: t("done"), color: "#22c55e", pulse: false };
      case "assigned":    return { label: t("assigned"), color: "#f59e0b", pulse: false };
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
               <span className="text-[10px] font-bold text-[var(--color-siding-green)] uppercase tracking-widest mb-1">{t("rep")}</span>
               <span className="text-on-surface font-medium text-sm flex items-center gap-1.5">
                 <span className="material-symbols-outlined text-[14px]" translate="no">person</span>
                 {job?.salespersonName ?? "—"}
               </span>
             </div>
             <div className="flex flex-col text-right">
               <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">{t("customer")}</span>
               <span className="text-on-surface font-medium text-sm">{job?.customerName ?? "—"}</span>
             </div>
          </div>

          {/* Start Date */}
          {job?.scheduledStart && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-zinc-500 font-medium text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]" translate="no">calendar_month</span>
                <span>{t("start")}: {formatDateShort(job.scheduledStart)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Labor Bills */}
        <div className="pt-2">
          <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2 pl-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]" translate="no">receipt_long</span>
            {t("laborBills")}
            {loadingLaborBills && <span className="w-3 h-3 border border-t-[var(--color-siding-green)] rounded-full animate-spin ml-1"></span>}
          </h3>

          {!loadingLaborBills && laborBills.length === 0 && (
            <div className="bg-surface-container-high border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center gap-2">
              <div className="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-xl" translate="no">receipt_long</span>
              </div>
              <p className="text-on-surface-variant text-xs font-medium">{t("noLaborBills")}</p>
            </div>
          )}

          {laborBills.length > 0 && (
            <div className="space-y-2">
              {laborBills.map((bill) => {
                const d = new Date(bill.created_at);
                const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const isSiding = bill.templateCode.includes("siding");
                const statusStyles: Record<string, { bg: string; text: string }> = {
                  draft: { bg: "bg-surface-container-highest", text: "text-on-surface-variant" },
                  submitted: { bg: "bg-[#60b8f5]/15", text: "text-[#60b8f5]" },
                  approved: { bg: "bg-[#22c55e]/15", text: "text-[#22c55e]" },
                };
                const st = statusStyles[bill.status] || statusStyles.draft;

                return (
                  <button
                    key={bill.id}
                    onClick={() => setSelectedLaborBill(bill)}
                    className="w-full text-left bg-surface-container-high border border-white/5 rounded-2xl p-4 hover:bg-surface-container-high/80 active:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSiding ? "bg-[#ff7351]/10" : "bg-[#60b8f5]/10"}`}>
                          <span className={`material-symbols-outlined text-lg ${isSiding ? "text-[#ff7351]" : "text-[#60b8f5]"}`} translate="no">
                            {isSiding ? "home_repair_service" : "format_paint"}
                          </span>
                        </div>
                        <div>
                          <p className="text-on-surface font-bold text-sm">{bill.templateTitle || (isSiding ? "Siding" : "Paint")}</p>
                          <p className="text-on-surface-variant text-[10px]">{dateStr}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${st.bg} ${st.text}`}>
                        {bill.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                        <span className="material-symbols-outlined text-[14px]" translate="no">person</span>
                        <span>{bill.crewName || bill.installerName || "—"}</span>
                      </div>
                      <span className="text-primary font-black text-base">
                        ${bill.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Duration Dropdown */}
        <div className="pt-2">
          <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2 pl-1 flex items-center gap-2">
            {t("durationDays")}
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
              <p className="text-on-surface font-bold text-sm">{t("dailyLogSaved")}</p>
              <p className="text-on-surface-variant text-xs mt-0.5">{t("officeNotified")}</p>
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
              <p className="text-on-surface font-bold text-sm">{t("coSubmitted")}</p>
              <p className="text-on-surface-variant text-xs mt-0.5">{t("officeReviewCO")}</p>
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
              <p className="text-on-surface font-bold text-sm">{t("materialSent")}</p>
              <p className="text-on-surface-variant text-xs mt-0.5">{t("officeReviewMaterial")}</p>
            </div>
            <button onClick={() => setMaterialSuccess(false)} className="ml-auto text-outline-variant active:text-on-surface-variant transition-colors shrink-0">
              <span className="material-symbols-outlined text-lg" translate="no">close</span>
            </button>
          </div>
        )}



        {/* Daily Logs */}
        <div className="pt-2 pb-2">
          <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2 pl-1">{t("dailyLogs")}</h3>
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
                    <span className="text-on-surface font-bold text-sm">{t("day")} {dayNum}</span>
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
                 {t("requestCO")}
               </span>
               <span className="text-on-surface-variant text-xs mt-1">{t("reportIssues")}</span>
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
                 {t("requestExtra")}
               </span>
               <span className="text-on-surface-variant text-xs mt-1">{t("needSupplies")}</span>
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
                     {t("viewPaint")}
                   </span>
                   <span className="text-on-surface-variant text-xs mt-1">{t("checkColors")}</span>
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
                    <h4 className="text-on-surface font-bold text-base">{t("coc")}</h4>
                    <p className="text-zinc-500 text-xs mt-1">{t("submitCOC")} {job?.jobTitle || 'service'}</p>
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
                {t("markCompleted")}
              </>
            )}
          </button>
          <p className="text-center text-outline-variant text-[10px] uppercase tracking-widest font-bold mt-4">
            {t("generatesCert")}
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
                <h3 className="text-on-surface font-bold text-lg">{t("requestExtra")}</h3>
                <p className="text-zinc-500 text-xs">{t("sentToOffice")}</p>
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
                      {t("materialName")} {materialItems.length > 1 ? `#${index + 1}` : ""}
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
                        {t("quantity")}
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
                        {t("pieceSize")}
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
                      {t("notes")}
                    </label>
                    <textarea
                      value={item.notes}
                      onChange={(e) => updateMaterialItem(index, 'notes', e.target.value)}
                      placeholder={t("explainPurpose")}
                      rows={2}
                      className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none focus:border-[#f59e0b]/50 transition-all resize-none"
                    />
                  </div>

                  {/* Photos */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
                      {t("addPhotos")}
                    </label>
                    {item.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.photos.map((photo, pi) => (
                          <div key={pi} className="relative w-16 h-16 rounded-lg overflow-hidden border border-outline-variant/30">
                            <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removePhotoFromItem(index, pi)}
                              className="absolute top-0 right-0 w-5 h-5 bg-black/70 flex items-center justify-center rounded-bl-lg"
                            >
                              <span className="text-white text-[10px]">✕</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer hover:text-[#f59e0b] transition-colors">
                      <span className="material-symbols-outlined text-[16px]" translate="no">add_a_photo</span>
                      {t("addPhotos")}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => addPhotosToItem(index, e.target.files)}
                      />
                    </label>
                  </div>
                </div>
              ))}

              {/* Add More Button */}
              <button
                onClick={addMaterialItem}
                className="w-full bg-[#0a0a0a] border border-dashed border-[#f59e0b]/30 text-[#f59e0b] rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#f59e0b]/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]" translate="no">add</span>
                {t("addAnother")}
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
                    {t("sendRequest")} ({materialItems.filter(i => i.name.trim()).length} {t("items")})
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
                  <h3 className="text-on-surface font-black text-lg">{t("paintColors")}</h3>
                  <p className="text-on-surface-variant text-xs">{t("customerSelections")}</p>
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
                  <p className="text-zinc-400 text-sm">{t("noPaint")}</p>
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

      {/* Render the selected Labor Bill Modal */}
      {selectedLaborBill && (
        <FieldLaborBillModal
          billId={selectedLaborBill.id}
          templateId={selectedLaborBill.template_id}
          billTitle={selectedLaborBill.templateTitle || (selectedLaborBill.templateCode.includes("siding") ? "Siding" : "Paint")}
          billTotal={selectedLaborBill.total}
          billStatus={selectedLaborBill.status}
          isSiding={selectedLaborBill.templateCode.includes("siding")}
          onClose={() => setSelectedLaborBill(null)}
        />
      )}
    </>

  );
}
