"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

/* ────────────────────────────────────────────────── */
/*  Types                                             */
/* ────────────────────────────────────────────────── */

interface ActiveJob {
  jobId: string;
  jobNumber: string | null;
  customerName: string;
  address: string;
  serviceId: string;
}

interface ChangeOrderAttachment {
  id: string;
  url: string;
}

interface ChangeOrderItem {
  id: string;
  description: string;
  change_order_attachments: ChangeOrderAttachment[];
}

interface ChangeOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  job_id: string;
  change_order_items: ChangeOrderItem[];
}

interface ExtraMaterial {
  id: string;
  batch_id: string | null;
  material_name: string;
  quantity: string;
  piece_size: string;
  notes: string | null;
  status: string;
  created_at: string;
  job_id: string;
}

interface ExtraMaterialAttachment {
  id: string;
  extra_material_id: string;
  file_url: string;
  file_name: string | null;
}

interface GroupedBatch {
  batchId: string;
  title: string;
  status: string;
  created_at: string;
  items: ExtraMaterial[];
}

export default function FieldRequestsPage() {
  const router = useRouter();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const [loadingRequests, setLoadingRequests] = useState(false);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [extraMaterials, setExtraMaterials] = useState<GroupedBatch[]>([]);
  const [emAttachments, setEmAttachments] = useState<ExtraMaterialAttachment[]>([]);

  // Accordion state
  const [expandedSection, setExpandedSection] = useState<"CO" | "EM" | null>("CO");

  // Detail Modal State
  const [selectedCO, setSelectedCO] = useState<ChangeOrder | null>(null);
  const [selectedEMBatch, setSelectedEMBatch] = useState<GroupedBatch | null>(null);

  useEffect(() => {
    fetchActiveJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchRequestsForJob(selectedJobId);
    } else {
      setChangeOrders([]);
      setExtraMaterials([]);
    }
  }, [selectedJobId]);

  async function fetchActiveJobs() {
    try {
      setLoadingInitial(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      // Get crew profile
      const { data: crewProfile } = await supabase
        .from("crews")
        .select("id")
        .eq("profile_id", session.user.id)
        .maybeSingle();

      if (!crewProfile) {
        console.error("No crew profile");
        setLoadingInitial(false);
        return;
      }

      // Get active assignments
      const { data: assignments, error } = await supabase
        .from("service_assignments")
        .select(`
          service_id,
          status,
          jobs (
            id,
            job_number,
            customers ( first_name, last_name, address, city )
          )
        `)
        .eq("crew_id", crewProfile.id)
        .in("status", ["scheduled", "in_progress", "assigned"]);

      if (error) throw error;

      // Map to unique jobs (in case multiple services on same job)
      const jobMap = new Map<string, ActiveJob>();

      assignments?.forEach((a: any) => {
        const jobRaw = a.jobs;
        if (!jobRaw) return;
        const job = Array.isArray(jobRaw) ? jobRaw[0] : jobRaw;
        if (!job) return;

        const jId = job.id;
        if (!jobMap.has(jId)) {
          const custRaw = job.customers;
          const customer = Array.isArray(custRaw) ? custRaw[0] : custRaw;

          jobMap.set(jId, {
            jobId: jId,
            jobNumber: job.job_number,
            customerName: customer ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() : "Unknown",
            address: customer ? `${customer.address || ""}, ${customer.city || ""}`.replace(/^,\s/, "") : "",
            serviceId: a.service_id,
          });
        }
      });

      const jobsArr = Array.from(jobMap.values());
      setActiveJobs(jobsArr);

      if (jobsArr.length > 0) {
        setSelectedJobId(jobsArr[0].jobId);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoadingInitial(false);
    }
  }

  async function fetchRequestsForJob(jobId: string) {
    try {
      setLoadingRequests(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      // 1. Fetch Change Orders
      const { data: coData } = await supabase
        .from("change_orders")
        .select("*, change_order_items(*, change_order_attachments(*))")
        .eq("job_id", jobId)
        .eq("requested_by_profile_id", userId)
        .order("created_at", { ascending: false });

      setChangeOrders(coData || []);

      // 2. Fetch Extra Materials
      const { data: emData } = await supabase
        .from("extra_materials")
        .select("*")
        .eq("job_id", jobId)
        .eq("requested_by", userId)
        .order("created_at", { ascending: false });

      if (emData && emData.length > 0) {
        // Group by batch_id
        const grouped = new Map<string, ExtraMaterial[]>();
        emData.forEach(em => {
          // If no batch_id (old data), use ID as batch
          const key = em.batch_id || em.id;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(em);
        });

        const batchArray: GroupedBatch[] = Array.from(grouped.entries()).map(([batchId, items]) => {
          // Find earliest created_at in batch and general status
          const first = items[items.length - 1]; // Because we ordered desc, the first inserted is last in array
          const title = items.length > 1 ? items.map(i => i.material_name).join(" + ") : items[0].material_name;
          return {
            batchId,
            title,
            status: items[0].status,
            created_at: first.created_at,
            items
          };
        });
        
        // sort batches by created_at desc
        batchArray.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setExtraMaterials(batchArray);

        // Fetch attachments for these extra materials
        const emIds = emData.map(e => e.id);
        const { data: attData } = await supabase
          .from("extra_material_attachments")
          .select("*")
          .in("extra_material_id", emIds);

        if (attData) {
          setEmAttachments(attData);
        }
      } else {
        setExtraMaterials([]);
        setEmAttachments([]);
      }

    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }

  // --- Helpers
  const fmtDate = (dStr: string) => {
    return new Date(dStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "pending") return <span className="bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Pending</span>;
    if (s === "approved" || s === "ordered") return <span className="bg-[#60b8f5]/10 text-[#60b8f5] border border-[#60b8f5]/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{s}</span>;
    if (s === "rejected" || s === "cancelled") return <span className="bg-error/10 text-error border border-error/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{s}</span>;
    if (s === "delivered") return <span className="bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Delivered</span>;
    return <span className="bg-outline-variant/20 text-on-surface px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{status}</span>;
  };

  if (loadingInitial) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-6 text-center mt-20">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-on-surface-variant font-bold text-sm">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-on-surface tracking-tight" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>My Requests</h1>
        <p className="text-xs text-on-surface-variant">Track status of your Change Orders and Materials.</p>
      </div>

      {activeJobs.length === 0 ? (
        <div className="bg-surface-container rounded-2xl p-6 text-center border border-outline-variant/10">
          <span className="material-symbols-outlined text-[32px] text-on-surface-variant/50 mb-2">assignment_late</span>
          <p className="text-sm font-bold text-on-surface">No Active Projects</p>
          <p className="text-xs text-on-surface-variant mt-1">You must be assigned to an active project to view or send requests.</p>
        </div>
      ) : (
        <>
          {/* Job Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant pl-1">Select Project</label>
            <div className="relative">
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full appearance-none bg-surface-container border border-outline-variant/30 rounded-xl px-4 py-3 text-sm font-bold text-on-surface focus:outline-none focus:border-primary transition-colors"
              >
                {activeJobs.map(job => (
                  <option key={job.jobId} value={job.jobId}>
                    {job.customerName} {job.jobNumber ? `(#${job.jobNumber})` : ""}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant px-1">{activeJobs.find(j => j.jobId === selectedJobId)?.address}</p>
          </div>

          {loadingRequests ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Change Orders Accordion */}
              <div className="bg-surface-container rounded-2xl border border-outline-variant/20 overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === "CO" ? null : "CO")}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-highest hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#f5a623]/20 text-[#f5a623] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]" translate="no">request_quote</span>
                    </span>
                    <div className="text-left">
                      <h3 className="text-sm font-extrabold text-on-surface">Change Orders</h3>
                      <p className="text-[10px] text-on-surface-variant font-bold">{changeOrders.length} request(s)</p>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined transition-transform duration-300 ${expandedSection === "CO" ? "rotate-180" : ""}`}>expand_more</span>
                </button>
                
                {expandedSection === "CO" && (
                  <div className="p-4 space-y-3 bg-surface-container">
                    {changeOrders.length === 0 ? (
                      <p className="text-xs text-center text-on-surface-variant py-4 font-medium">No Change Orders requested.</p>
                    ) : (
                      changeOrders.map(co => (
                        <div
                          key={co.id}
                          onClick={() => setSelectedCO(co)}
                          className="bg-surface-container-highest rounded-xl p-3 border border-outline-variant/20 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-[10px] text-on-surface-variant mb-0.5">{fmtDate(co.created_at)}</p>
                            <h4 className="text-sm font-bold text-on-surface truncate">{co.title}</h4>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {getStatusBadge(co.status)}
                            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">chevron_right</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Extra Materials Accordion */}
              <div className="bg-surface-container rounded-2xl border border-outline-variant/20 overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === "EM" ? null : "EM")}
                  className="w-full flex items-center justify-between p-4 bg-surface-container-highest hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]" translate="no">inventory_2</span>
                    </span>
                    <div className="text-left">
                      <h3 className="text-sm font-extrabold text-on-surface">Extra Materials</h3>
                      <p className="text-[10px] text-on-surface-variant font-bold">{extraMaterials.length} request(s)</p>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined transition-transform duration-300 ${expandedSection === "EM" ? "rotate-180" : ""}`}>expand_more</span>
                </button>

                {expandedSection === "EM" && (
                  <div className="p-4 space-y-3 bg-surface-container">
                    {extraMaterials.length === 0 ? (
                      <p className="text-xs text-center text-on-surface-variant py-4 font-medium">No Extra Materials requested.</p>
                    ) : (
                      extraMaterials.map(batch => (
                        <div
                          key={batch.batchId}
                          onClick={() => setSelectedEMBatch(batch)}
                          className="bg-surface-container-highest rounded-xl p-3 border border-outline-variant/20 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-[10px] text-on-surface-variant mb-0.5">
                              {fmtDate(batch.created_at)}
                              {batch.items.length > 1 && <span className="ml-2 bg-white/10 px-1.5 py-0.5 rounded text-[9px]">{batch.items.length} items</span>}
                            </p>
                            <h4 className="text-sm font-bold text-on-surface truncate">{batch.title}</h4>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {getStatusBadge(batch.status)}
                            <span className="material-symbols-outlined text-on-surface-variant text-[16px]">chevron_right</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* --- Change Order Detail Drawer --- */}
      {selectedCO && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedCO(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface-container rounded-t-3xl border-t border-outline-variant/30 shadow-2xl z-[70] animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 shrink-0">
              <h3 className="text-base font-black text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Change Order Details</h3>
              <button onClick={() => setSelectedCO(null)} className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: "none" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Status</p>
                  {getStatusBadge(selectedCO.status)}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Date</p>
                  <p className="text-xs font-bold text-on-surface">{fmtDate(selectedCO.created_at)}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Title</p>
                <h4 className="text-sm font-bold text-on-surface">{selectedCO.title}</h4>
              </div>

              {selectedCO.description && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Description / Notes</p>
                  <div className="bg-surface-container-highest p-3 rounded-xl border border-outline-variant/10 text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                    {selectedCO.description}
                  </div>
                </div>
              )}

              {selectedCO.change_order_items && selectedCO.change_order_items.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">Photos</p>
                  <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {selectedCO.change_order_items.flatMap(item => 
                      item.change_order_attachments?.map((photo, i) => (
                        <a key={photo.id} href={photo.url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-outline-variant/30">
                          <img src={photo.url} alt="CO Photo" className="w-full h-full object-cover" />
                        </a>
                      )) || []
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* --- Extra Material Detail Drawer --- */}
      {selectedEMBatch && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedEMBatch(null)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface-container rounded-t-3xl border-t border-outline-variant/30 shadow-2xl z-[70] animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 shrink-0">
              <h3 className="text-base font-black text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Material Request Details</h3>
              <button onClick={() => setSelectedEMBatch(null)} className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5" style={{ scrollbarWidth: "none" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Status</p>
                  {getStatusBadge(selectedEMBatch.status)}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Date</p>
                  <p className="text-xs font-bold text-on-surface">{fmtDate(selectedEMBatch.created_at)}</p>
                </div>
              </div>

              <div className="space-y-4">
                {selectedEMBatch.items.map((item, idx) => {
                  const itemPhotos = emAttachments.filter(a => a.extra_material_id === item.id);
                  return (
                    <div key={item.id} className="bg-surface-container-highest p-4 rounded-xl border border-outline-variant/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-black">{idx + 1}</span>
                        <h4 className="text-sm font-bold text-on-surface">{item.material_name}</h4>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-surface-container p-2 rounded-lg">
                          <p className="text-[8px] uppercase tracking-widest text-on-surface-variant font-bold">Qty</p>
                          <p className="text-sm font-black text-on-surface">{item.quantity}</p>
                        </div>
                        <div className="bg-surface-container p-2 rounded-lg">
                          <p className="text-[8px] uppercase tracking-widest text-on-surface-variant font-bold">Piece Size</p>
                          <p className="text-sm font-black text-on-surface">{item.piece_size}</p>
                        </div>
                      </div>

                      {item.notes && (
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-on-surface-variant font-bold mb-0.5">Notes</p>
                          <p className="text-xs text-on-surface leading-snug whitespace-pre-wrap">{item.notes}</p>
                        </div>
                      )}

                      {itemPhotos.length > 0 && (
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Photos</p>
                          <div className="flex flex-wrap gap-2">
                            {itemPhotos.map((photo) => (
                              <a key={photo.id} href={photo.file_url} target="_blank" rel="noopener noreferrer" className="w-14 h-14 rounded overflow-hidden border border-outline-variant/30">
                                <img src={photo.file_url} alt="Material Photo" className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
