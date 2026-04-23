"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "../../../../components/TopBar";
import CustomDatePicker from "../../../../components/CustomDatePicker";
import { CustomDropdown } from "../../../../components/CustomDropdown";
import { supabase } from "../../../../lib/supabase";
import { calculateServiceDuration } from "../../../../lib/duration-calculator";
import { SCHEDULING_PAUSED } from "../../../../lib/scheduling-flag";
import { ProjectWeatherCard } from "../../../../components/ProjectWeatherCard";

// ─── Discipline visuals (reused from /crews) ──────────────────────
const DISCIPLINE_VIS: Record<string, { icon: string; color: string }> = {
  siding:   { icon: "home_work",    color: "#aeee2a" },
  windows:  { icon: "sensor_door",  color: "#f5a623" },
  doors:    { icon: "door_front",   color: "#f5a623" },
  painting: { icon: "format_paint", color: "#60b8f5" },
  gutters:  { icon: "water_drop",   color: "#c084fc" },
  roofing:  { icon: "roofing",      color: "#ef4444" },
  decks:    { icon: "deck",         color: "#f5a623" },
};

// ─── All available services (matches Create Job layout — with partners) ──
type SubServiceDef = { id: string; icon: string; label: string };
type ServiceDef = { id: string; icon: string; label: string; color: string; partners: string[]; subServices?: SubServiceDef[] };

const DWD_SUB_SERVICES: SubServiceDef[] = [
  { id: "doors",   icon: "door_front", label: "Doors" },
  { id: "windows", icon: "window",     label: "Windows" },
  { id: "decks",   icon: "deck",       label: "Decks" },
];

const ALL_SERVICES: ServiceDef[] = [
  { id: "siding",   icon: "view_day",       label: "Siding",   color: "#aeee2a", partners: ["SIDING DEPOT", "XICARA", "XICARA 02", "WILMAR", "WILMAR 02", "SULA", "LUIS"] },
  { id: "gutters",  icon: "horizontal_rule", label: "Gutters",  color: "#c084fc", partners: ["SIDING DEPOT", "LEANDRO"] },
  { id: "painting", icon: "format_paint",   label: "Painting", color: "#60b8f5", partners: ["SIDING DEPOT", "OSVIN", "OSVIN 02", "VICTOR", "JUAN"] },
  { id: "doors_windows_decks", icon: "window", label: "Doors / Windows / Decks", color: "#f5a623", partners: ["SIDING DEPOT", "SERGIO"], subServices: DWD_SUB_SERVICES },
  { id: "roofing",  icon: "roofing",        label: "Roofing",  color: "#ef4444", partners: ["SIDING DEPOT", "JOSUE"] },
  { id: "dumpster", icon: "delete",         label: "Dumpster", color: "#64748b", partners: ["SIDING DEPOT"] },
];

// ─── Input classes (matches Create Job) ──────────────────────────
const detailInputCls =
  "w-full bg-[#242624] border border-transparent rounded-lg py-3 px-4 text-[#faf9f5] placeholder:text-[#747673] focus:outline-none focus:border-[#aeee2a] focus:ring-1 focus:ring-[#aeee2a] transition-all h-[48px] text-[15px]";
const detailLabelCls = "text-xs uppercase tracking-wider text-[#ababa8] font-bold";

// ─── SectionHeader (matches Create Job) ──────────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="material-symbols-outlined text-[#aeee2a]" translate="no">
        {icon}
      </span>
      <h2 className="text-xl font-bold" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
        {title}
      </h2>
    </div>
  );
}

// ─── Services Carousel for Detail page (matches Create Job exactly) ───
function DetailServicesCarousel({
  selectedCodes,
  onToggle,
  assignedPartners,
  onAssignClick,
}: {
  selectedCodes: string[];
  onToggle: (svcCode: string) => void;
  assignedPartners: Record<string, string>;
  onAssignClick: (svc: ServiceDef) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.clientWidth / 4;
    el.scrollBy({ left: dir === "right" ? cardWidth : -cardWidth, behavior: "smooth" });
  };

  return (
    <div className="relative group/carousel">
      {/* Left arrow */}
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full bg-[#242624] border border-[#474846]/40 text-[#ababa8] hover:text-[#aeee2a] hover:border-[#aeee2a]/40 flex items-center justify-center shadow-lg transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[20px]" translate="no">chevron_left</span>
      </button>

      {/* Cards strip */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-1 pt-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {ALL_SERVICES.map((svc) => {
          // For combined cards (doors/windows/decks), check if ANY sub-service is active
          const hasSubs = svc.subServices && svc.subServices.length > 0;
          const on = hasSubs
            ? svc.subServices!.some((sub) => selectedCodes.includes(sub.id))
            : selectedCodes.includes(svc.id);
          const partner = assignedPartners[svc.id];
          const hasPartnersList = svc.partners && svc.partners.length > 0;

          return (
            <div
              key={svc.id}
              onClick={() => {
                if (hasPartnersList) {
                  onAssignClick(svc);
                } else if (on) {
                  onToggle(svc.id);
                } else {
                  onToggle(svc.id);
                }
              }}
              className={`relative flex-shrink-0 px-2 py-5 rounded-xl cursor-pointer transition-all group ${
                hasSubs ? "w-[calc(40%-12px)] min-w-[240px]" : "w-[calc(25%-12px)] min-w-[140px]"
              } ${
                on
                  ? "bg-[#121412] border-2"
                  : "bg-[#121412] border border-[#474846]/15 hover:bg-[#1e201e]"
              }`}
              style={on ? { borderColor: svc.color, boxShadow: `0 0 15px ${svc.color}1A` } : {}}
            >
              {/* ── Combined card: 3 sub-service icons side by side ── */}
              {hasSubs ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-center gap-5">
                    {svc.subServices!.map((sub) => {
                      const subOn = selectedCodes.includes(sub.id);
                      return (
                        <div key={sub.id} className="flex flex-col items-center gap-1">
                          <span
                            className={`material-symbols-outlined text-2xl transition-colors ${
                              on
                                ? (subOn ? "" : "text-[#faf9f5]/60")
                                : "text-[#ababa8]"
                            }`}
                            style={on && subOn ? { color: svc.color } : {}}
                            translate="no"
                          >
                            {sub.icon}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors text-[#faf9f5]`}>
                            {sub.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ── Standard single-service card ── */
                <div className="flex flex-col items-center text-center gap-2">
                  <span
                    className={`material-symbols-outlined text-3xl transition-colors ${
                      !on ? "text-[#ababa8]" : ""
                    }`}
                    style={on ? { color: svc.color } : {}}
                    translate="no"
                  >
                    {svc.icon}
                  </span>
                  <span className="font-bold tracking-tight text-sm text-[#faf9f5]">{svc.label}</span>
                </div>
              )}

              {/* Partner badge */}
              {on && hasPartnersList && (
                <div className="mt-3 flex justify-center w-full">
                   {partner ? (
                       <span className="text-[10px] font-bold text-[#faf9f5] uppercase tracking-wider px-2.5 py-1 rounded-md border" style={{ backgroundColor: `${svc.color}33`, borderColor: svc.color }}>{partner}</span>
                   ) : (
                       <span className="text-[10px] font-bold text-[#faf9f5] uppercase tracking-wider border px-2.5 py-1 rounded-full transition-colors" style={{ backgroundColor: `${svc.color}1A`, borderColor: `${svc.color}80` }}>Assign Partner</span>
                   )}
                </div>
              )}

              {/* X to deselect */}
              {on && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(svc.id);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-[#1a1c1a] border border-[#ff7351]/50 text-[#ff7351] hover:bg-[#ff7351] hover:text-[#121412] transition-colors shadow-md z-10 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]" translate="no">close</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right arrow */}
      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full bg-[#242624] border border-[#474846]/40 text-[#ababa8] hover:text-[#aeee2a] hover:border-[#aeee2a]/40 flex items-center justify-center shadow-lg transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[20px]" translate="no">chevron_right</span>
      </button>
    </div>
  );
}

interface AvailableCrew {
  id: string;
  name: string;
  phone: string | null;
  matchedSpecialties: string[];
};

// =============================================
// Project Details — /projects/[id]
// Conectado ao Supabase
// Layout: 3 blocos (Info + Crews + Documents/Media)
// Timeline infinita → REMOVIDA (solicitação Nick)
// =============================================

// ─── Tipos ────────────────────────────────────────────────────────
interface JobDetail {
  id: string;
  job_number: string;
  title: string;
  status: string;
  city: string;
  state: string;
  address: string | null;
  zip_code: string | null;
  requested_start_date: string | null;
  estimated_end_date: string | null;
  notes: string | null;
  customer: { id: string; full_name: string; email: string; phone: string | null } | null;
  salesperson: { full_name: string } | null;
  salesperson_id?: string | null;
  contract_amount?: number | null;
  contract_signed_at?: string | null;
  sq?: number | null;
  services: { id: string; service_type: { name: string } | null }[];
  blockers: { id: string; title: string; type: string; status: string }[];
  crews: {
    crew: { id: string; name: string; discipline: string; phone: string | null } | null;
    start_date: string | null;
    end_date: string | null;
  }[];
  change_orders: { id: string; title: string; status: string; proposed_amount: number | null }[];
}

// ─── Status Map (3 values matching calendar popup) ─────────────────────
const STATUS_MAP: Record<string, { label: string; style: string }> = {
  active:  { label: "Confirmed", style: "bg-[#aeee2a] text-[#3a5400]"           },
  draft:   { label: "Tentative", style: "bg-[#e3eb5d]/20 text-[#e3eb5d]"        },
  on_hold: { label: "Pending",   style: "bg-[#ff7351]/20 text-[#ff7351]"        },
};

const BLOCKER_ICON: Record<string, string> = {
  weather:  "cloud",
  material: "inventory_2",
  permit:   "contract",
  customer: "phone_disabled",
  crew:     "groups",
  other:    "warning",
};

// ─── Gate Config ─────────────────────────────────────────────────
const GATE_CONFIG: Record<string, { color: string; icon: string; title: string }> = {
  NOT_CONTACTED: { color: "#ba1212", icon: "phone_disabled",  title: "Not Yet Contacted" },
  READY:         { color: "#1f8742", icon: "check_circle",    title: "Ready to Start"    },
  WINDOWS:       { color: "#165eb3", icon: "window",          title: "Waiting on Windows"},
  DOORS:         { color: "#f09a1a", icon: "door_front",      title: "Waiting on Doors"  },
  FINANCING:     { color: "#ebd27a", icon: "account_balance", title: "Pending Financing" },
  MATERIALS:     { color: "#306870", icon: "inventory_2",     title: "Material Shortage" },
  HOA:           { color: "#9acbf0", icon: "gavel",           title: "HOA Approval"      },
  OTHER_REPAIRS: { color: "#d1a3f0", icon: "hardware",        title: "Other Repairs First"},
  NO_ANSWER:     { color: "#f2a074", icon: "voicemail",       title: "No Answer"         },
  PERMIT:        { color: "#747673", icon: "contract",         title: "Pending Permit"    },
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "—";
  return `${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear()}`;
}

// ─── Paint Colors Card (Admin) ────────────────────────────────────
function PaintColorsCard({ jobId }: { jobId: string }) {
  const [colors, setColors] = useState<{ surface_area: string; color_code: string; brand: string; status: string }[]>([]);
  const [loadingColors, setLoadingColors] = useState(true);
  const [paintDate, setPaintDate] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Fetch submitted colors
        const { data: colorData } = await supabase
          .from("job_color_selections")
          .select("surface_area, color_code, brand, status")
          .eq("job_id", jobId);
        setColors(colorData || []);

        // Fetch paint schedule 
        const { data: paintSvc } = await supabase
          .from("job_services")
          .select("id, service_type:service_types!inner(name)")
          .eq("job_id", jobId)
          .eq("service_type.name", "Painting")
          .maybeSingle();

        if (paintSvc) {
          const { data: assignment } = await supabase
            .from("service_assignments")
            .select("scheduled_start_at")
            .eq("job_service_id", paintSvc.id)
            .maybeSingle();

          if (assignment?.scheduled_start_at) {
            setPaintDate(assignment.scheduled_start_at);
            const lockTime = new Date(new Date(assignment.scheduled_start_at).getTime() - 24 * 60 * 60 * 1000);
            setIsLocked(new Date() >= lockTime);
          }
        }

        // Check override
        const { data: jobData } = await supabase
          .from("jobs")
          .select("color_edit_override_until")
          .eq("id", jobId)
          .single();
        if (jobData?.color_edit_override_until && new Date(jobData.color_edit_override_until) > new Date()) {
          setOverrideActive(true);
        }
      } catch (err) {
        console.error("[PaintColors]", err);
      } finally {
        setLoadingColors(false);
      }
    })();
  }, [jobId]);

  async function handleOverride(): Promise<void> {
    setOverriding(true);
    try {
      const res = await fetch("/api/colors/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, durationMinutes: 120 }),
      });
      if (res.ok) setOverrideActive(true);
    } catch (err) {
      console.error("[Override]", err);
    } finally {
      setOverriding(false);
    }
  }

  const visibleColors = colors.filter((c) => c.color_code !== "NOT_PAINTED");

  return (
    <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8] flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-[#f5a623]" translate="no">format_paint</span>
          Paint Colors
        </h3>
        {isLocked && (
          <div className="flex items-center gap-2">
            {overrideActive ? (
              <span className="text-[10px] font-bold text-[#aeee2a] bg-[#aeee2a]/10 px-2 py-1 rounded-full">✓ Edit Allowed</span>
            ) : (
              <button
                onClick={handleOverride}
                disabled={overriding}
                className="text-[10px] font-bold text-[#f5a623] bg-[#f5a623]/10 hover:bg-[#f5a623]/20 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {overriding ? (
                  <div className="w-3 h-3 border border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[12px]" translate="no">lock_open</span>
                    Allow Edit (2h)
                  </>
                )}
              </button>
            )}
            <span className="text-[10px] font-bold text-[#ff7351] bg-[#ff7351]/10 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]" translate="no">lock</span>
              Locked
            </span>
          </div>
        )}
      </div>

      {loadingColors ? (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-[#474846] border-t-[#aeee2a] rounded-full animate-spin" />
        </div>
      ) : visibleColors.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-xs text-[#474846]">No colors submitted yet</p>
          {paintDate && (
            <p className="text-[10px] text-[#ababa8] mt-1">
              Paint scheduled: {(() => { const _d = new Date(paintDate); return `${(_d.getMonth() + 1).toString().padStart(2, '0')}/${_d.getDate().toString().padStart(2, '0')}/${_d.getFullYear()}`; })()}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-0">
          {visibleColors.map((c) => (
            <div key={c.surface_area} className="flex items-center justify-between py-2.5 border-b border-[#474846]/15 last:border-0">
              <span className="text-xs text-[#ababa8] capitalize">{c.surface_area.replace(/_/g, " ")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-[#faf9f5] font-mono">{c.color_code}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  c.status === "approved" ? "bg-[#aeee2a]/20 text-[#aeee2a]" : "bg-[#f5a623]/20 text-[#f5a623]"
                }`}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
          {paintDate && (
            <div className="pt-3 mt-2 border-t border-[#474846]/30">
              <p className="text-[10px] text-[#ababa8] flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]" translate="no">event</span>
                Paint: {(() => { const _d = new Date(paintDate); return `${(_d.getMonth() + 1).toString().padStart(2, '0')}/${_d.getDate().toString().padStart(2, '0')}/${_d.getFullYear()}`; })()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function ProjectDetailPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "crews" | "documents" | "extra_material">("overview");
  const [copied, setCopied] = useState(false);
  const [gateStatus, setGateStatus] = useState<string>("READY");
  const [crewPopupOpen, setCrewPopupOpen] = useState(false);
  const [availableCrews, setAvailableCrews] = useState<AvailableCrew[]>([]);
  const [loadingCrews, setLoadingCrews] = useState(false);
  const [expandedCrewGroups, setExpandedCrewGroups] = useState<Record<string, boolean>>({});
  const [swapTarget, setSwapTarget] = useState<{ assignmentId: string; jobServiceId: string; serviceName: string } | null>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // States para gerenciar a edição global
  const [allSalespersons, setAllSalespersons] = useState<{ id: string; full_name: string }[]>([]);
  const [editingServices, setEditingServices] = useState(false);
  const [allServiceTypes, setAllServiceTypes] = useState<{ id: string; name: string }[]>([]);
  const [addingServiceId, setAddingServiceId] = useState("");

  // ── Partner assignment modal states (same as Create Job) ──
  const [openPartnerModal, setOpenPartnerModal] = useState<ServiceDef | null>(null);
  const [assignedPartners, setAssignedPartners] = useState<Record<string, string>>({});
  const [windowCount, setWindowCount] = useState("");
  const [windowTrim, setWindowTrim] = useState<"yes" | "no" | "">("");
  const [windowsStep, setWindowsStep] = useState<"partner" | "subservices" | "config" | "deckscope" | "edit_menu" | "edit_windows" | "edit_deckscope">("partner");
  const [selectedSubSvcs, setSelectedSubSvcs] = useState<string[]>([]);

  // ── Decks scope config ──
  const DECK_SCOPE_OPTIONS = [
    { value: "rebuild_demo", label: "Deck Rebuild (Demo)", days: 5 },
    { value: "rebuild_porch", label: "Deck Rebuild (W/ Porch)", days: 10 },
    { value: "new_deck_build", label: "New Deck Build", days: 4 },
    { value: "floor_replacement", label: "Floor Replacement", days: 4 },
    { value: "railing", label: "Railing", days: 1 },
  ];
  const [deckScope, setDeckScope] = useState("");

  // ── Dumpster Photos ──
  const [dumpsterPhotos, setDumpsterPhotos] = useState<{ id: string; url: string; file_name: string | null; created_at: string }[]>([]);
  const [loadingDumpster, setLoadingDumpster] = useState(false);
  const [uploadingDumpster, setUploadingDumpster] = useState(false);
  const [dumpsterPreview, setDumpsterPreview] = useState<string | null>(null);
  const dumpsterInputRef = useRef<HTMLInputElement>(null);

  // ── Extra Material ──
  const [extraMaterials, setExtraMaterials] = useState<{
    id: string; material_name: string; customer_name: string; quantity: number; piece_size: string;
    document_url: string | null; document_name: string | null; notes: string | null;
    status: string; created_at: string;
  }[]>([]);
  const [loadingExtraMat, setLoadingExtraMat] = useState(false);
  const [showAddExtraMat, setShowAddExtraMat] = useState(false);
  const [emMaterialName, setEmMaterialName] = useState("");
  const [emQty, setEmQty] = useState("1");
  const [emSize, setEmSize] = useState("");
  const [emNotes, setEmNotes] = useState("");
  const [uploadingExtraDoc, setUploadingExtraDoc] = useState(false);
  const [emDocUrl, setEmDocUrl] = useState<string | null>(null);
  const [emDocName, setEmDocName] = useState<string | null>(null);
  const extraMatDocRef = useRef<HTMLInputElement>(null);
  const [emActionMenu, setEmActionMenu] = useState<string | null>(null);
  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [editMatFields, setEditMatFields] = useState<{
    material_name: string; quantity: string; piece_size: string;
    document_url: string | null; document_name: string | null;
  }>({ material_name: "", quantity: "1", piece_size: "", document_url: null, document_name: null });
  const editMatDocRef = useRef<HTMLInputElement>(null);
  const [uploadingEditDoc, setUploadingEditDoc] = useState(false);

  const handleAutoSave = async (
    table: "jobs" | "customers",
    recordId: string,
    field: string,
    value: string | number | null
  ) => {
    if (!recordId) return;
    try {
      const { error } = await supabase.from(table).update({ [field]: value }).eq("id", recordId);
      if (error) throw error;
      // Refresh silently without flashing
      // We will rely on React input local value and re-fetching on the background to make it perfectly sync
      fetchJob();
    } catch (e: any) {
      console.error("AutoSave Error:", e);
      alert("Failed to save " + field);
    }
  };

  // ─── SQ Update Handler (bidirectional sync with schedule popup) ───
  const handleSqUpdate = async (newValue: string): Promise<void> => {
    const raw = newValue.replace(/[^0-9.]/g, '');
    const num = parseFloat(raw);
    const sqValue = isNaN(num) ? 0 : num;

    // 1. Save to jobs.sq
    const { error: jobErr } = await supabase.from("jobs").update({ sq: sqValue }).eq("id", job.id);
    if (jobErr) console.error("[SQ Sync] jobs.sq update error:", jobErr);

    // 2. Update job_services.quantity and recalculate durations for SQ-based services
    const sqServiceNames = ["siding", "painting"];
    for (const svc of (job.services ?? [])) {
      const svcName: string = (svc as any).service_type?.name?.toLowerCase() ?? "";
      if (!svcName || !sqServiceNames.includes(svcName)) continue;

      // Update job_services.quantity
      const { error: jsErr } = await supabase.from("job_services").update({
        quantity: sqValue,
        unit_of_measure: "SQ",
      }).eq("id", svc.id);
      if (jsErr) console.error("[SQ Sync] job_services update error:", jsErr);

      // Recalculate duration for each service_assignment
      const assignments: any[] = (svc as any).assignments ?? [];
      for (const assignment of assignments) {
        if (!assignment.scheduled_start_at) continue;

        const crewName: string = assignment.crew?.name || "SIDING DEPOT";
        const newDuration = calculateServiceDuration(crewName, svcName, sqValue);

        // Calculate new end date from start date + new duration
        const startIso = new Date(assignment.scheduled_start_at).toISOString().split("T")[0];
        const endAt = new Date(startIso + "T08:00:00");
        endAt.setDate(endAt.getDate() + newDuration);

        const { error: saErr } = await supabase.from("service_assignments").update({
          scheduled_end_at: endAt.toISOString(),
        }).eq("id", assignment.id);
        if (saErr) console.error("[SQ Sync] service_assignment duration update error:", saErr);
      }
    }

    // Re-fetch to update UI
    fetchJob();
  };

  // Fetch crews whose specialties match this project's services
  const fetchMatchingCrews = useCallback(async () => {
    if (!job) return;
    setLoadingCrews(true);
    try {
      // Get the service type codes for this job
      const svcCodes = job.services
        .map((s: any) => s.service_type?.name?.toLowerCase())
        .filter(Boolean) as string[];

      if (svcCodes.length === 0) {
        setAvailableCrews([]);
        return;
      }

      // Map service_type names to specialty codes (explicit mapping)
      const SVC_TO_SPEC: Record<string, string[]> = {
        siding: ["siding_installation"],
        painting: ["painting"],
        gutters: ["gutters"],
        roofing: ["roofing"],
        doors: ["doors"],
        windows: ["windows"],
        decks: ["deck_building"],
      };
      const specCodesToSearch = svcCodes.flatMap(c => SVC_TO_SPEC[c] || [c, `${c}_installation`, `${c}_building`]);

      // Get specialty IDs that match our service types
      const { data: matchedSpecs } = await supabase
        .from("specialties")
        .select("id, code, name")
        .in("code", specCodesToSearch);

      if (!matchedSpecs || matchedSpecs.length === 0) {
        setAvailableCrews([]);
        return;
      }

      const specIds = matchedSpecs.map(s => s.id);

      // Get crew_specialties rows for those specialty IDs
      const { data: csRows } = await supabase
        .from("crew_specialties")
        .select("crew_id, specialty:specialties (name)")
        .in("specialty_id", specIds);

      if (!csRows || csRows.length === 0) {
        setAvailableCrews([]);
        return;
      }

      // Group by crew_id
      const crewMap = new Map<string, string[]>();
      for (const row of csRows as any[]) {
        const cid = row.crew_id;
        const specName = row.specialty?.name ?? "";
        if (!crewMap.has(cid)) crewMap.set(cid, []);
        crewMap.get(cid)!.push(specName);
      }

      // Fetch crew details
      const crewIds = Array.from(crewMap.keys());
      const { data: crewRows } = await supabase
        .from("crews")
        .select("id, name, phone, active")
        .in("id", crewIds);

      const mapped: AvailableCrew[] = (crewRows ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        matchedSpecialties: crewMap.get(c.id) ?? [],
      }));

      setAvailableCrews(mapped);
    } catch (err) {
      console.error("[CrewPopup] fetch error:", err);
    } finally {
      setLoadingCrews(false);
    }
  }, [job]);

  const fetchJob = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      // Main query — without change_orders (has RLS that blocks anon reads)
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id, job_number, title, status, gate_status, city, state, service_address_line_1, postal_code,
          requested_start_date, target_completion_date, contract_signed_at, description, salesperson_id, contract_amount, sq,
          customer:customers (id, full_name, email, phone),
          salesperson:salespersons (full_name),
          services:job_services (
            id,
            service_type:service_types (id, name),
            assignments:service_assignments (
              id,
              crew:crews (id, name, phone),
              scheduled_start_at,
              scheduled_end_at
            )
          ),
          blockers (id, title, type, status)
        `)
        .eq("id", jobId)
        .single();

      if (error || !data) {
        console.error("[ProjectDetail] main query error:", error);
        setNotFound(true);
        return;
      }

      // Separate query for change_orders (RLS-protected, may fail for non-auth sessions)
      const { data: coData } = await supabase
        .from("change_orders")
        .select("id, title, status, proposed_amount")
        .eq("job_id", jobId);

      const j = data as any;
      const mapped: JobDetail = {
        id: j.id,
        job_number: j.job_number,
        title: j.title,
        status: j.status,
        city: j.city ?? "",
        state: j.state ?? "",
        address: j.service_address_line_1,
        zip_code: j.postal_code,
        requested_start_date: j.requested_start_date,
        estimated_end_date: j.target_completion_date,
        notes: j.description,
        customer: j.customer,
        salesperson: j.salesperson,
        salesperson_id: j.salesperson_id,
        contract_amount: j.contract_amount ?? null,
        contract_signed_at: j.contract_signed_at ?? null,
        sq: j.sq ?? null,
        services: j.services ?? [],
        blockers: j.blockers ?? [],
        crews: (j.services ?? []).flatMap((s: any) => 
          (s.assignments ?? []).map((a: any) => ({
             assignment_id: a.id,
             job_service_id: s.id,
             crew: { ...a.crew, discipline: s.service_type?.name ?? "General" },
             start_date: a.scheduled_start_at,
             end_date: a.scheduled_end_at
          }))
        ).filter((c: any) => c.crew && c.crew.id),
        change_orders: coData ?? [],
      };

      setJob(mapped);

      // Populate assignedPartners from existing service_assignments
      const partnerMap: Record<string, string> = {};
      const dwdCodes = ["doors", "windows", "decks"];
      for (const svc of mapped.services) {
        const svcCode = (svc as any).service_type?.name?.toLowerCase();
        const firstAssignment = ((svc as any).assignments ?? [])[0];
        if (svcCode && firstAssignment?.crew?.name) {
          const crewName = firstAssignment.crew.name.toUpperCase();
          // Map doors/windows/decks sub-services to the combined card key
          if (dwdCodes.includes(svcCode)) {
            partnerMap["doors_windows_decks"] = crewName;
          } else {
            partnerMap[svcCode] = crewName;
          }
        }
      }
      setAssignedPartners(partnerMap);

      // Prioridade: gate_status salvo no DB → fallback: deriva dos blockers
      const savedGate = (j as any).gate_status as string | null;
      if (savedGate && GATE_CONFIG[savedGate]) {
        // Usa exatamente o valor salvo pelo usuário
        setGateStatus(savedGate);
      } else {
        // Fallback: inferir do primeiro blocker aberto ou do status do job
        const openBlocker = mapped.blockers.find((b) => b.status === "open");
        if (openBlocker) {
          const t = openBlocker.type?.toUpperCase();
          if (t === "WEATHER") setGateStatus("OTHER_REPAIRS");
          else if (t === "MATERIAL") setGateStatus("MATERIALS");
          else if (t === "PERMIT") setGateStatus("PERMIT");
          else if (t === "CUSTOMER") setGateStatus("NOT_CONTACTED");
          else setGateStatus("OTHER_REPAIRS");
        } else {
          setGateStatus(mapped.status === "active" ? "READY" : "NOT_CONTACTED");
        }
      }
    } catch (err) {
      console.error("[ProjectDetail] fetch error:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // ── Fetch milestones for the Documents tab ──
  const fetchMilestones = useCallback(async () => {
    if (!jobId) return;
    setLoadingMilestones(true);
    try {
      const { data } = await supabase
        .from("project_payment_milestones")
        .select("id, title, document_type, status, amount, sort_order, signed_at, signature_data_url, job_service_id")
        .eq("job_id", jobId)
        .order("sort_order", { ascending: true });
      setMilestones(data || []);
    } catch (err) {
      console.error("[Milestones] fetch error:", err);
    } finally {
      setLoadingMilestones(false);
    }
  }, [jobId]);

  async function loadSalespersons() {
    // Busca na tabela users (ou salespersons dependendo do banco real)
    // De acordo com DB schema Siding Depot: A view 'salespersons' retorna full_name. Mas para o SELECT edit precisamos ID.
    const { data } = await supabase.from("salespersons").select("id, full_name").order("full_name");
    if (data) setAllSalespersons(data);
  }

  useEffect(() => { 
    fetchJob(); 
    loadSalespersons();
  }, [fetchJob]);


  // Load milestones and dumpster photos when switching to documents tab
  useEffect(() => {
    if (activeTab === "documents") {
      fetchMilestones();
      fetchDumpsterPhotos();
    }
    if (activeTab === "extra_material") {
      fetchExtraMaterials();
    }
  }, [activeTab, fetchMilestones]);

  // ── Extra Material Functions ──
  async function fetchExtraMaterials() {
    setLoadingExtraMat(true);
    const { data, error } = await supabase
      .from("extra_materials")
      .select("id, material_name, customer_name, quantity, piece_size, document_url, document_name, notes, status, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (!error && data) setExtraMaterials(data);
    setLoadingExtraMat(false);
  }

  async function handleAddExtraMaterial() {
    if (!emMaterialName.trim() || !emSize.trim()) return;
    const { error } = await supabase.from("extra_materials").insert({
      job_id: jobId,
      material_name: emMaterialName.trim(),
      customer_name: job?.customer?.full_name ?? "",
      quantity: parseInt(emQty) || 1,
      piece_size: emSize.trim(),
      document_url: emDocUrl,
      document_name: emDocName,
      notes: emNotes.trim() || null,
      status: "pending",
    });
    if (!error) {
      setEmMaterialName(""); setEmQty("1"); setEmSize(""); setEmNotes("");
      setEmDocUrl(null); setEmDocName(null); setShowAddExtraMat(false);
      await fetchExtraMaterials();
    }
  }

  async function handleExtraMatDocUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingExtraDoc(true);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `extra-materials/${jobId}`);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");
      setEmDocUrl(result.url);
      setEmDocName(file.name);
    } catch (err) {
      console.error("[ExtraMat] Upload error:", err);
    }
    setUploadingExtraDoc(false);
  }

  async function handleDeleteExtraMat(id: string) {
    const { error } = await supabase.from("extra_materials").delete().eq("id", id);
    if (!error) setExtraMaterials((prev) => prev.filter((m) => m.id !== id));
    setEmActionMenu(null);
  }

  function startEditMat(mat: typeof extraMaterials[number]) {
    setEditingMatId(mat.id);
    setEditMatFields({
      material_name: mat.material_name,
      quantity: String(mat.quantity),
      piece_size: mat.piece_size,
      document_url: mat.document_url,
      document_name: mat.document_name,
    });
    setEmActionMenu(null);
  }

  async function handleSaveEditMat() {
    if (!editingMatId) return;
    const { error } = await supabase.from("extra_materials").update({
      material_name: editMatFields.material_name.trim(),
      quantity: parseInt(editMatFields.quantity) || 1,
      piece_size: editMatFields.piece_size.trim(),
      document_url: editMatFields.document_url,
      document_name: editMatFields.document_name,
      updated_at: new Date().toISOString(),
    }).eq("id", editingMatId);
    if (!error) {
      setExtraMaterials((prev) => prev.map((m) => m.id === editingMatId ? {
        ...m,
        material_name: editMatFields.material_name.trim(),
        quantity: parseInt(editMatFields.quantity) || 1,
        piece_size: editMatFields.piece_size.trim(),
        document_url: editMatFields.document_url,
        document_name: editMatFields.document_name,
      } : m));
    }
    setEditingMatId(null);
  }

  async function handleEditMatDocUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingEditDoc(true);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `extra-materials/${jobId}`);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");
      setEditMatFields((prev) => ({ ...prev, document_url: result.url, document_name: file.name }));
    } catch (err) {
      console.error("[EditMat] Upload error:", err);
    }
    setUploadingEditDoc(false);
  }

  async function handleExtraMatStatus(id: string, newStatus: string) {
    await supabase.from("extra_materials").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    setExtraMaterials((prev) => prev.map((m) => m.id === id ? { ...m, status: newStatus } : m));
  }

  // ── Dumpster Photos Functions ──
  async function fetchDumpsterPhotos() {
    setLoadingDumpster(true);
    const { data, error } = await supabase
      .from("dumpster_photos")
      .select("id, url, file_name, created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (!error && data) setDumpsterPhotos(data);
    setLoadingDumpster(false);
  }

  async function handleDumpsterUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingDumpster(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", `dumpster/${jobId}`);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Upload failed");

        const { error: dbErr } = await supabase.from("dumpster_photos").insert({
          job_id: jobId,
          url: result.url,
          file_name: file.name,
        });
        if (dbErr) console.error("[Dumpster] DB insert error:", dbErr);
      }
      await fetchDumpsterPhotos();
    } catch (err) {
      console.error("[Dumpster] Upload error:", err);
    }
    setUploadingDumpster(false);
  }

  async function handleDeleteDumpsterPhoto(photoId: string) {
    const { error } = await supabase.from("dumpster_photos").delete().eq("id", photoId);
    if (!error) setDumpsterPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function handleGateChange(gate: string) {
    setGateStatus(gate);
    // Sync Job Start Status: READY → Active (Confirmed), anything else → Pending
    const newJobStatus = gate === "READY" ? "active" : "on_hold";
    await supabase
      .from("jobs")
      .update({ gate_status: gate, status: newJobStatus })
      .eq("id", jobId);
    setJob((prev: any) => prev ? { ...prev, status: newJobStatus } : prev);
  }

  async function handleResolveBlocker(blockerId: string) {
    await supabase.from("blockers").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", blockerId);
    setJob((prev: any) => prev
      ? { ...prev, blockers: prev.blockers.map((b: any) => b.id === blockerId ? { ...b, status: "resolved" } : b) }
      : prev
    );
  }

  async function loadServiceTypes() {
    const { data } = await supabase.from("service_types").select("id, name").order("name");
    if (data) setAllServiceTypes(data);
  }

  // ── Persist partner selection to service_assignment ──
  // Called when the user picks a partner from the service card modal
  async function persistPartnerToAssignment(svcCode: string, partnerName: string): Promise<void> {
    if (!job) return;
    try {
      // 1. Find the job_service for this service code
      let jobService = job.services.find(
        (s: any) => s.service_type?.name?.toLowerCase() === svcCode
      );

      // If job_service doesn't exist, create it first
      if (!jobService) {
        let types = allServiceTypes;
        if (types.length === 0) {
          const { data } = await supabase.from("service_types").select("id, name").order("name");
          types = data || [];
          setAllServiceTypes(types);
        }
        const svcType = types.find((st) => st.name.toLowerCase() === svcCode);
        if (!svcType) {
          console.warn(`[persistPartner] service_type for '${svcCode}' not found`);
          return;
        }
        const { data: newSvc, error: insertErr } = await supabase
          .from("job_services")
          .insert({
            job_id: job.id,
            service_type_id: svcType.id,
            scope_of_work: "Standard exterior work",
          })
          .select("id, service_type:service_types(id, name)")
          .single();
        if (insertErr || !newSvc) {
          console.error("[persistPartner] job_service insert error:", insertErr);
          return;
        }
        // Update local state so subsequent calls find this service
        const updatedServices = [...job.services, { ...newSvc, assignments: [] }];
        setJob((prev: any) => prev ? { ...prev, services: updatedServices } : prev);
        jobService = newSvc;
        console.log(`[persistPartner] Auto-created job_service for '${svcCode}'`);
      }

      // 2. Resolve crew_id from partner name
      const { data: crewMatch } = await supabase
        .from("crews")
        .select("id")
        .ilike("name", partnerName)
        .limit(1);
      const crewId = crewMatch?.[0]?.id || null;

      // 3. Resolve specialty_id
      const SPEC_CODE_MAP: Record<string, string> = {
        siding: "siding_installation", painting: "painting",
        windows: "windows", doors: "doors", decks: "deck_building",
        gutters: "gutters", roofing: "roofing",
      };
      const specCode = SPEC_CODE_MAP[svcCode] || svcCode;
      const { data: specMatch } = await supabase
        .from("specialties")
        .select("id")
        .eq("code", specCode)
        .maybeSingle();
      const specialtyId = specMatch?.id || null;

      // 4. Check if assignment already exists
      const existingAssignment = (jobService as any).assignments?.[0];

      if (existingAssignment) {
        // Update existing assignment's crew
        const { error } = await supabase
          .from("service_assignments")
          .update({ crew_id: crewId, specialty_id: specialtyId })
          .eq("id", existingAssignment.id);
        if (error) console.error("[persistPartner] update error:", error);
        else console.log(`[persistPartner] Updated ${svcCode} → ${partnerName}`);
      } else {
        // Create new assignment with calculated dates
        const sq = job.sq ? Number(job.sq) : 0;
        const duration = calculateServiceDuration(partnerName, svcCode, sq);
        const todayIso = new Date().toISOString().split("T")[0];
        const jobStartDate = job.requested_start_date;

        // Cascade logic: find the LATEST predecessor end date
        const CASCADE_PREDECESSORS: Record<string, string[]> = {
          painting: ["siding", "decks"], gutters: ["painting", "siding"],
          roofing: ["gutters", "painting", "siding"],
        };
        let startIso = todayIso;
        if (jobStartDate && todayIso <= jobStartDate) startIso = jobStartDate;

        const predecessors = CASCADE_PREDECESSORS[svcCode] || [];
        // Find the MAX end date across ALL predecessors (not just the first found)
        for (const pred of predecessors) {
          const predSvc = job.services.find(
            (s: any) => s.service_type?.name?.toLowerCase() === pred
          );
          const predAssignment = (predSvc as any)?.assignments?.[0];
          if (predAssignment?.scheduled_end_at) {
            const predEnd = new Date(predAssignment.scheduled_end_at);
            if (predEnd.getDay() === 0) predEnd.setDate(predEnd.getDate() + 1);
            const nextDay = predEnd.toISOString().split("T")[0];
            if (nextDay > startIso) startIso = nextDay;
            // Don't break — check ALL predecessors to find the latest
          }
        }

        // Skip Sunday
        const sd = new Date(startIso + "T12:00:00");
        if (sd.getDay() === 0) { sd.setDate(sd.getDate() + 1); startIso = sd.toISOString().split("T")[0]; }

        // Calculate end date
        const ed = new Date(startIso + "T12:00:00");
        let rem = duration - 1;
        while (rem > 0) { ed.setDate(ed.getDate() + 1); if (ed.getDay() !== 0) rem--; }
        const endAt = new Date(ed);
        endAt.setDate(endAt.getDate() + 1);

        const { error } = await supabase.from("service_assignments").insert({
          job_service_id: jobService.id,
          crew_id: crewId,
          specialty_id: specialtyId,
          status: "scheduled",
          scheduled_start_at: new Date(startIso + "T08:00:00").toISOString(),
          scheduled_end_at: endAt.toISOString(),
        });
        if (error) console.error("[persistPartner] insert error:", error);
        else console.log(`[persistPartner] Created assignment for ${svcCode} → ${partnerName}`);
      }

      fetchJob();
    } catch (err) {
      console.error("[persistPartner] error:", err);
    }
  }

  async function handleAddService(overrideTypeId?: string) {
    const effectiveId = overrideTypeId || addingServiceId;
    if (!effectiveId) return;
    try {
      const selectedType = allServiceTypes.find(s => s.id === effectiveId);
      const svcName = selectedType?.name?.toLowerCase() || "";
      
      const { data, error } = await supabase
        .from("job_services")
        .insert({ 
          job_id: jobId, 
          service_type_id: effectiveId,
          scope_of_work: "Standard exterior work",
        })
        .select("id, service_type:service_types(name)")
        .single();
      
      if (error) throw error;
      
      const addedServices = [data];

      // Auto-add Painting if Siding is selected and not already in job
      if (svcName === "siding") {
        const hasPainting = job?.services.some((s: any) => s.service_type?.name?.toLowerCase() === "painting");
        if (!hasPainting) {
           const paintingType = allServiceTypes.find(s => s.name.toLowerCase() === "painting");
           if (paintingType) {
              const { data: paintData, error: paintError } = await supabase
                  .from("job_services")
                  .insert({ 
                    job_id: jobId, 
                    service_type_id: paintingType.id,
                    scope_of_work: "Standard painting work",
                  })
                  .select("id, service_type:service_types(name)")
                  .single();
              if (!paintError && paintData) {
                  addedServices.push(paintData);
              }
           }
        }
      }

      // Auto-add Roofing if Gutters is selected and not already in job
      if (svcName === "gutters") {
        const hasRoofing = job?.services.some((s: any) => s.service_type?.name?.toLowerCase() === "roofing");
        if (!hasRoofing) {
           const roofingType = allServiceTypes.find(s => s.name.toLowerCase() === "roofing");
           if (roofingType) {
              const { data: roofData, error: roofError } = await supabase
                  .from("job_services")
                  .insert({ 
                    job_id: jobId, 
                    service_type_id: roofingType.id,
                    scope_of_work: "Standard roofing work",
                  })
                  .select("id, service_type:service_types(name)")
                  .single();
              if (!roofError && roofData) {
                  addedServices.push(roofData);
              }
           }
        }
      }

      // ── Create service_assignments for each added service ──
      // This ensures they appear on the calendar immediately.
      const jobStartDate = job?.requested_start_date
        ? new Date(job.requested_start_date).toISOString().split("T")[0]
        : null;
      const todayIso = new Date().toISOString().split("T")[0];
      const sq = job?.sq ? Number(job.sq) : 0;

      // Duration calculator — uses partner-specific SQ tables
      const calcDuration = (code: string, partnerName: string): number => {
        // If decks and a scope is selected, use scope-based duration
        if (code === "decks" && deckScope) {
          const opt = DECK_SCOPE_OPTIONS.find(o => o.value === deckScope);
          if (opt) return opt.days;
        }
        return calculateServiceDuration(partnerName, code, sq);
      };

      // Skip-Sunday helper
      const skipSunday = (iso: string): string => {
        const d = new Date(iso + "T12:00:00");
        if (d.getDay() === 0) { d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }
        return iso;
      };

      // Add working days helper
      const addWorkingDays = (startIso: string, days: number): string => {
        const d = new Date(startIso + "T12:00:00");
        let remaining = days - 1;
        while (remaining > 0) {
          d.setDate(d.getDate() + 1);
          if (d.getDay() !== 0) remaining--;
        }
        return d.toISOString().split("T")[0];
      };

      // Get existing service end dates for cascade calc
      const existingAssignments = (job?.services ?? []).flatMap((s: any) =>
        (s.assignments ?? []).map((a: any) => ({
          code: s.service_type?.name?.toLowerCase() || "",
          end: a.scheduled_end_at ? new Date(a.scheduled_end_at).toISOString().split("T")[0] : null,
        }))
      );

      // Cascade predecessors map — Painting waits for the LATEST of Siding AND Decks
      const CASCADE_PREDECESSORS: Record<string, string[]> = {
        painting: ["siding", "decks"],
        gutters:  ["painting", "siding"],
        roofing:  ["gutters", "painting", "siding"],
      };

      // Default crew map (used for duration calc and crew assignment)
      const crewNameMap: Record<string, string> = {
        windows: "SERGIO", doors: "SERGIO", decks: "SERGIO",
        siding: "XICARA", painting: "OSVIN",
        gutters: "LEANDRO", roofing: "JOSUE",
      };

      for (const svc of addedServices) {
        const svcCode = ((svc as any).service_type?.name?.toLowerCase()) || "";
        const crewForDuration = crewNameMap[svcCode] || "SIDING DEPOT";
        const duration = calcDuration(svcCode, crewForDuration);
        let startIso = todayIso; // Default: today

        // For windows/doors/decks: use today if project already started, else job start
        if (svcCode === "windows" || svcCode === "doors" || svcCode === "decks") {
          if (jobStartDate && todayIso <= jobStartDate) {
            startIso = jobStartDate;
          }
          // else: today (already default)
        } else {
          // Cascade: find the LATEST predecessor end date (MAX across all predecessors)
          const predecessors = CASCADE_PREDECESSORS[svcCode] || [];
          for (const pred of predecessors) {
            const predAssign = existingAssignments.find((a: any) => a.code === pred && a.end);
            if (predAssign && predAssign.end) {
              const predEnd = new Date(predAssign.end + "T12:00:00");
              predEnd.setDate(predEnd.getDate() + 1);
              if (predEnd.getDay() === 0) predEnd.setDate(predEnd.getDate() + 1);
              const nextDay = predEnd.toISOString().split("T")[0];
              if (nextDay > startIso) startIso = nextDay;
              // Don't break — check ALL predecessors to find the latest
            }
          }
          // If no predecessor found, use today or job start
          if (!predecessors.length || !existingAssignments.some((a: any) => predecessors.includes(a.code) && a.end)) {
            if (jobStartDate && todayIso <= jobStartDate) {
              startIso = jobStartDate;
            }
          }
        }

        startIso = skipSunday(startIso);
        const endIso = addWorkingDays(startIso, duration);
        const startAt = new Date(startIso + "T08:00:00");
        const endAt = new Date(endIso + "T12:00:00");
        endAt.setDate(endAt.getDate() + 1);

        const defaultCrew = crewNameMap[svcCode] || "";
        const { data: crewMatch } = defaultCrew
          ? await supabase.from("crews").select("id").ilike("name", defaultCrew).limit(1)
          : { data: null };
        const crewId = crewMatch?.[0]?.id || null;

        // Find specialty_id (required by DB trigger)
        const specialtyNameMap: Record<string, string> = {
          siding: "Siding Installation", painting: "Painting",
          gutters: "Gutters", roofing: "Roofing",
          windows: "Windows", doors: "Doors", decks: "Deck Building",
        };
        const specName = specialtyNameMap[svcCode] || svcCode;
        const { data: specMatch } = await supabase
          .from("specialties")
          .select("id")
          .ilike("name", specName)
          .limit(1);
        const specialtyId = specMatch?.[0]?.id || null;

        if (!SCHEDULING_PAUSED) {
          const { error: assignErr } = await supabase
            .from("service_assignments")
            .insert({
              job_service_id: svc.id,
              crew_id: crewId,
              specialty_id: specialtyId,
              status: "scheduled",
              scheduled_start_at: startAt.toISOString(),
              scheduled_end_at: endAt.toISOString(),
            });

          if (assignErr) {
            console.error("[AddService] assignment error for " + svcCode + ":", assignErr);
          } else {
            console.log("[AddService] Created assignment for " + svcCode + ": " + startIso + " -> " + endIso);
          }
        }
      }

      setJob((j: any) => j ? { ...j, services: [...j.services, ...addedServices] } : j);
      setAddingServiceId("");

      // ── Auto-create window_order when Windows is added ──
      const hasWindows = addedServices.some((s: any) => s.service_type?.name?.toLowerCase() === "windows");
      if (hasWindows && job) {
        const wQty = parseInt(windowCount) || null;
        const { error: woErr } = await supabase.from("window_orders").insert({
          job_id: job.id,
          customer_name: job.customer?.full_name || job.title || "",
          status: "Measurement",
          money_collected: "NO",
          quantity: wQty,
          quote: null,
          deposit: null,
          ordered_on: null,
          expected_delivery: null,
          supplier: "",
          order_number: null,
          notes: windowTrim === "yes" ? "Trim: YES" : windowTrim === "no" ? "Trim: NO" : null,
        });
        if (woErr) console.error("[AddService] Error creating window_order:", woErr);
        else console.log("[AddService] Auto-created window_order for job:", job.id);
      }
      
      // Re-fetch to update crews/assignments display
      fetchJob();
    } catch (err: any) {
      console.error("[AddService] error:", err);
      alert(`Error adding service: ${err.message || JSON.stringify(err)}`);
    }
  }

  async function handleRemoveService(jobServiceId: string) {
    try {
      await supabase.from("job_services").delete().eq("id", jobServiceId);
      setJob((j: any) => j ? { ...j, services: j.services.filter((s: any) => s.id !== jobServiceId) } : j);
    } catch (err) {
      console.error("[RemoveService] error:", err);
    }
  }

  function handleCopyAddress() {
    const addr = `${job?.address ?? ""}, ${job?.city ?? ""}, ${job?.state ?? ""}`.trim().replace(/^,\s*/, "");
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Loading / Not Found ─────────────────────────────────────────
  if (loading) {
    return (
      <>
        <TopBar />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4 text-[#ababa8]">
            <span className="material-symbols-outlined text-5xl animate-spin" translate="no">progress_activity</span>
            <p className="text-base font-bold">Loading project...</p>
          </div>
        </main>
      </>
    );
  }

  if (notFound || !job) {
    return (
      <>
        <TopBar />
        <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1e201e] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-[#ff7351]" translate="no">error</span>
          </div>
          <p className="text-lg font-bold text-[#faf9f5]">Project not found</p>
          <Link href="/projects">
            <button className="px-6 py-2.5 bg-[#aeee2a] text-[#3a5400] font-bold rounded-xl hover:bg-[#a0df14] transition-colors">
              Back to Projects
            </button>
          </Link>
        </main>
      </>
    );
  }

  const statusConf = STATUS_MAP[job.status] ?? STATUS_MAP.draft;
  const fullAddress = job.address && job.address !== "Pendente" 
    ? job.address 
    : [job.city, job.state, job.zip_code].filter(Boolean).join(", ");
  const gateConf = GATE_CONFIG[gateStatus] ?? GATE_CONFIG.READY;
  const openBlockers = job.blockers.filter((b: any) => b.status === "open");
  const pendingCOs = job.change_orders.filter((co: any) => co.status === "pending_customer_approval");
  const pendingValue = pendingCOs.reduce((s: number, co: any) => s + (co.proposed_amount ?? 0), 0);

  return (
    <>
      <TopBar />

      <main className="px-4 sm:px-6 lg:px-8 pb-16 pt-6 min-h-screen">

        {/* ── Back + Hero ── */}
        <div className="mb-8">
          <Link href="/projects" className="inline-flex items-center gap-2 text-[#ababa8] hover:text-[#aeee2a] transition-colors mb-5 font-bold text-xs tracking-widest uppercase">
            <span className="material-symbols-outlined text-[16px]" translate="no">arrow_back</span>
            All Projects
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-[#faf9f5] tracking-tighter leading-none mb-3" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                {job.customer?.full_name ?? job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-4 py-1.5 text-xs font-bold rounded-full tracking-wider ${statusConf.style}`}>
                  {statusConf.label}
                </span>
                <span className="text-[#ababa8] text-sm font-mono">{job.job_number}</span>
                {fullAddress && (
                  <button
                    onClick={handleCopyAddress}
                    className="flex items-center gap-1.5 text-[#ababa8] hover:text-[#aeee2a] transition-colors text-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]" translate="no">location_on</span>
                    {fullAddress}
                    <span className="material-symbols-outlined text-[12px]" translate="no">
                      {copied ? "check" : "content_copy"}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Gate Status Inline */}
            <div className="relative z-10 w-[210px] min-w-[210px]">
              <CustomDropdown
                value={gateStatus}
                onChange={(val) => handleGateChange(val)}
                options={Object.entries(GATE_CONFIG).map(([k, v]) => ({ value: k, label: v.title }))}
                className="w-full bg-[#121412] border border-[#474846] rounded-xl pl-8 pr-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#faf9f5] hover:border-[#aeee2a] transition-colors flex justify-between items-center"
              />
              <div
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center pointer-events-none z-10"
                style={{ backgroundColor: `${gateConf.color}20` }}
              >
                <span className="material-symbols-outlined text-[13px] pointer-events-none" style={{ color: gateConf.color }} translate="no">
                  {gateConf.icon}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Start Date",     
              key: "requested_start_date",
              value: job.requested_start_date,          
              icon: "event" 
            },
            { label: "End Date",       
              key: "estimated_end_date",
              value: job.estimated_end_date, // Note o field chama target_completion_date e é salvo assim, vamos ver.
              icon: "event_busy" 
            },
            { label: "Open Blockers",  value: String(openBlockers.length),             icon: "warning", danger: openBlockers.length > 0 },
            { label: "Pending COs",    value: pendingCOs.length > 0 ? `${pendingCOs.length} · $${pendingValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "None", icon: "request_quote" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-[#121412] rounded-2xl p-4 border border-[#474846]/15 group">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ color: kpi.danger ? "#ff7351" : "#aeee2a" }}
                  translate="no"
                >
                  {kpi.icon}
                </span>
                <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest">{kpi.label}</p>
              </div>
              
              {kpi.label.includes("Date") ? (
                <CustomDatePicker
                  value={kpi.value ? new Date(kpi.value as string).toISOString().split('T')[0] : ''}
                  onChange={(iso) => handleAutoSave("jobs", job.id, kpi.key === "estimated_end_date" ? "target_completion_date" : (kpi.key as string), iso || null)}
                  variant="ghost"
                  placeholder="Set date"
                  className="text-sm font-black -ml-1 pl-1 py-1 rounded hover:bg-[#242624] focus-within:bg-[#1e201e] transition-colors"
                />
              ) : (
                <p className={`text-sm font-black ${kpi.danger ? "text-[#ff7351]" : "text-[#faf9f5]"}`}>{kpi.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Weather Card (auto-loads city from project) ── */}
        <ProjectWeatherCard city={job.city ?? ""} state={job.state ?? ""} />

        {/* ── Tabs ── */}
        <div className="flex bg-[#121412] p-1 rounded-xl w-fit max-w-full overflow-x-auto gap-0.5 mb-8">
          {[
            { key: "overview",        label: "Overview",        icon: "dashboard" },
            { key: "crews",           label: "Crews",           icon: "groups" },
            { key: "documents",       label: "Documents",       icon: "folder" },
            { key: "extra_material",  label: "Extra Material",  icon: "inventory_2" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                activeTab === tab.key
                  ? "bg-[#242624] text-[#aeee2a]"
                  : "text-[#ababa8] hover:text-[#faf9f5]"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]" translate="no">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            TAB 1: OVERVIEW
        ══════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-12">

            {/* ── Section: Client Information ── */}
            <section>
              <SectionHeader icon="person_add" title="Client Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 rounded-xl bg-[#121412] border border-[#474846]/15">
                <div className="space-y-2">
                  <label className={detailLabelCls}>Client Name *</label>
                  <input
                    type="text"
                    defaultValue={job.customer?.full_name ?? ""}
                    onBlur={(e) => job.customer?.id && handleAutoSave("customers", job.customer.id, "full_name", e.target.value)}
                    placeholder="Customer Name"
                    className={detailInputCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className={detailLabelCls}>Email</label>
                  <input
                    type="email"
                    defaultValue={job.customer?.email ?? ""}
                    onBlur={(e) => job.customer?.id && handleAutoSave("customers", job.customer.id, "email", e.target.value)}
                    placeholder="customer@email.com"
                    className={detailInputCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className={detailLabelCls}>Phone Number</label>
                  <input
                    type="tel"
                    defaultValue={job.customer?.phone ?? ""}
                    onBlur={(e) => job.customer?.id && handleAutoSave("customers", job.customer.id, "phone", e.target.value)}
                    placeholder="(555) 000-0000"
                    className={`${detailInputCls} font-mono`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={detailLabelCls}>Salesperson</label>
                  <div className="relative">
                    <CustomDropdown
                      value={job.salesperson_id || ""}
                      onChange={(val) => handleAutoSave("jobs", job.id, "salesperson_id", val || null)}
                      options={allSalespersons.map(s => ({ value: s.id, label: s.full_name }))}
                      placeholder="No Salesperson"
                      className={`${detailInputCls} cursor-pointer flex justify-between items-center`}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ── Section: Project Address ── */}
            <section>
              <SectionHeader icon="location_on" title="Project Address" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8 rounded-xl bg-[#121412] border border-[#474846]/15">
                <div className="md:col-span-4 space-y-2">
                  <label className={detailLabelCls}>Street Address *</label>
                  <input
                    type="text"
                    defaultValue={job.address ?? ""}
                    onBlur={(e) => handleAutoSave("jobs", job.id, "service_address_line_1", e.target.value)}
                    placeholder="123 Industrial Way"
                    className={detailInputCls}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className={detailLabelCls}>City *</label>
                  <input
                    type="text"
                    defaultValue={job.city ?? ""}
                    onBlur={(e) => handleAutoSave("jobs", job.id, "city", e.target.value)}
                    placeholder="City"
                    className={detailInputCls}
                  />
                </div>
                <div className="space-y-2">
                  <label className={detailLabelCls}>State *</label>
                  <input
                    type="text"
                    defaultValue={job.state ?? ""}
                    onBlur={(e) => handleAutoSave("jobs", job.id, "state", e.target.value)}
                    placeholder="GA"
                    className={detailInputCls}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <label className={detailLabelCls}>ZIP Code *</label>
                  <input
                    type="text"
                    defaultValue={job.zip_code ?? ""}
                    onBlur={(e) => handleAutoSave("jobs", job.id, "postal_code", e.target.value)}
                    placeholder="10001"
                    className={detailInputCls}
                  />
                </div>
              </div>
            </section>

            {/* ── Section: Job Details ── */}
            <section>
              <SectionHeader icon="architecture" title="Job Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-8 rounded-xl bg-[#121412] border border-[#474846]/15">
                <div className="space-y-2">
                  <label className={detailLabelCls}>Contract Value</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aeee2a] font-bold text-[15px]">$</span>
                    <input
                      type="text"
                      defaultValue={job.contract_amount != null ? job.contract_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                      onBlur={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, '');
                        const num = parseFloat(raw);
                        handleAutoSave("jobs", job.id, "contract_amount", isNaN(num) ? 0 : num);
                      }}
                      placeholder="0.00"
                      className={`${detailInputCls} pl-8 font-black`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={detailLabelCls}>Sold Date</label>
                  <CustomDatePicker
                    value={job.contract_signed_at ?? ''}
                    onChange={(iso) => handleAutoSave("jobs", job.id, "contract_signed_at", iso || null)}
                    placeholder="Set date"
                    disableSundays={false}
                  />
                </div>
                <div className="space-y-2">
                  <label className={detailLabelCls}>SQ (Square)</label>
                  <input
                    type="text"
                    defaultValue={job.sq != null ? String(job.sq) : ""}
                    onBlur={(e) => handleSqUpdate(e.target.value)}
                    placeholder="e.g. 24.5"
                    className={`${detailInputCls} font-black`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={detailLabelCls}>Job Number</label>
                  <div className={`${detailInputCls} flex items-center text-[#ababa8] cursor-default`}>
                    {job.job_number}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Section: Services Requested (Carousel — matches Create Job) ── */}
            <section>
              <SectionHeader icon="handyman" title="Services Requested" />
              <DetailServicesCarousel
                selectedCodes={job.services.map((s: any) => s.service_type?.name?.toLowerCase()).filter(Boolean)}
                assignedPartners={assignedPartners}
                onToggle={async (svcCode: string) => {
                  const svcDef = ALL_SERVICES.find((s) => s.id === svcCode);
                  // Combined card: remove ALL sub-services
                  if (svcDef?.subServices) {
                    for (const sub of svcDef.subServices) {
                      const existing = job.services.find((s: any) => s.service_type?.name?.toLowerCase() === sub.id);
                      if (existing) await handleRemoveService(existing.id);
                    }
                    setAssignedPartners((prev) => { const n = { ...prev }; delete n[svcCode]; return n; });
                  } else {
                    const existingSvc = job.services.find((s: any) => s.service_type?.name?.toLowerCase() === svcCode);
                    if (existingSvc) {
                      await handleRemoveService(existingSvc.id);
                      setAssignedPartners((prev) => { const n = { ...prev }; delete n[svcCode]; return n; });
                    }
                  }
                }}
                onAssignClick={(svc) => {
                  if (svc.subServices) {
                    // Combined DWD card: pre-select currently active sub-services
                    const activeSubs = svc.subServices
                      .filter((sub) => job.services.some((s: any) => s.service_type?.name?.toLowerCase() === sub.id))
                      .map((sub) => sub.id);
                    setSelectedSubSvcs(activeSubs);
                    
                    // If partner already assigned, show edit menu instead of partner step
                    if (assignedPartners[svc.id]) {
                      setWindowsStep("edit_menu");
                    } else {
                      setWindowsStep("partner");
                    }
                  } else {
                    // All other service cards (Roofing, Gutters, Painting, Siding)
                    // Always go directly to partner selection — no edit menu
                    setWindowsStep("partner");
                  }
                  setOpenPartnerModal(svc);
                }}
              />
            </section>

            {/* ── Section: Operational Status & Salesperson (side-by-side) ── */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8">
              <div className="flex flex-col">
                <SectionHeader icon="traffic" title="Operational Status" />
                <div className="p-6 sm:p-8 rounded-xl bg-[#121412] border border-[#474846]/15 h-full">
                  <div className="space-y-4">
                    <label className={detailLabelCls}>Current Gate Status</label>
                    <div className="relative group w-full">
                      <CustomDropdown
                        value={gateStatus}
                        onChange={(val) => handleGateChange(val)}
                        options={Object.entries(GATE_CONFIG).map(([k, v]) => ({ value: k, label: v.title }))}
                        className="w-full bg-[#0a0a0a] border border-[#474846] rounded-xl pl-12 pr-4 py-3.5 text-xs font-black uppercase tracking-widest text-[#faf9f5] shadow-inner transition-colors flex justify-between items-center hover:border-[#aeee2a]/50"
                      />
                      <div
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 pointer-events-none"
                        style={{
                          backgroundColor: `${gateConf.color}25`,
                          border: `1px solid ${gateConf.color}40`,
                        }}
                      >
                        <span className="material-symbols-outlined text-[15px]" style={{ color: gateConf.color }} translate="no">
                          {gateConf.icon}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Paint Colors */}
              <div className="flex flex-col">
                <SectionHeader icon="palette" title="Paint Colors" />
                <PaintColorsCard jobId={job.id} />
              </div>
            </section>

            {/* ── Section: Internal Notes ── */}
            <section>
              <SectionHeader icon="description" title="Internal Notes" />
              <div className="p-8 rounded-xl bg-[#121412] border border-[#474846]/15">
                <div className="space-y-2">
                  <label className={detailLabelCls}>Project Notes</label>
                  <textarea
                    defaultValue={job.notes || ""}
                    onBlur={(e) => handleAutoSave("jobs", job.id, "description", e.target.value)}
                    placeholder="Provide any additional context or specific requirements for this job..."
                    className={`${detailInputCls} h-auto min-h-[160px] resize-none`}
                    rows={6}
                  />
                </div>
              </div>
            </section>

            {/* ── Section: Change Orders ── */}
            <section>
              <div className="flex items-center justify-between">
                <SectionHeader icon="request_quote" title="Change Orders" />
                <Link href="/change-orders">
                  <button className="text-[#aeee2a] text-xs font-bold uppercase hover:underline tracking-widest mb-6">View All →</button>
                </Link>
              </div>
              <div className="p-8 rounded-xl bg-[#121412] border border-[#474846]/15">
                {job.change_orders.length === 0 ? (
                  <p className="text-sm text-[#474846] text-center py-4">No change orders for this project</p>
                ) : (
                  <div className="space-y-3">
                    {job.change_orders.map((co: any) => {
                      const coColors: Record<string, string> = {
                        draft: "#fff7cf",
                        pending_customer_approval: "#e3eb5d",
                        approved: "#aeee2a",
                        rejected: "#ff7351",
                        cancelled: "#747673",
                      };
                      const c = coColors[co.status] ?? "#ababa8";
                      return (
                        <div key={co.id} className="flex items-center justify-between p-4 bg-[#242624] rounded-xl border border-[#474846]/15 hover:border-[#474846]/40 transition-colors">
                          <div>
                            <p className="text-sm font-bold text-[#faf9f5]">{co.title}</p>
                            <span
                              className="text-[10px] font-black uppercase"
                              style={{ color: c }}
                            >
                              {co.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-sm font-black text-[#faf9f5]">
                            {co.proposed_amount != null ? `$${co.proposed_amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 2: CREWS
        ══════════════════════════════════════════════════ */}
        {activeTab === "crews" && (
          <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Assigned Crews & Partners</h3>
              <Link href="/crews">
                <button className="text-[#aeee2a] text-xs font-bold hover:underline">Manage Crews →</button>
              </Link>
            </div>

            {job.crews.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-[#ababa8]">
                <div className="w-14 h-14 rounded-full bg-[#1e201e] flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-[#aeee2a]" translate="no">groups</span>
                </div>
                <p className="text-sm font-bold text-[#faf9f5]">No crews assigned yet</p>
                <p className="text-xs">Browse available crews that match this project's services.</p>
                <button
                  onClick={() => { setCrewPopupOpen(true); fetchMatchingCrews(); }}
                  className="mt-2 px-5 py-2 bg-[#aeee2a] text-[#3a5400] font-bold text-xs rounded-xl hover:bg-[#a0df14] transition-colors cursor-pointer"
                >
                  Browse Crews
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {job.crews.map((jc: any, idx: number) => {
                  const discKey = (jc.crew?.discipline ?? "").toLowerCase();
                  const cVis = DISCIPLINE_VIS[discKey] ?? { icon: "construction", color: "#ababa8" };
                  return (
                    <div key={idx} className="bg-[#1e201e] rounded-xl p-5 border border-[#474846]/20 hover:border-[#474846]/40 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${cVis.color}12`, border: `1px solid ${cVis.color}25` }}
                          >
                            <span className="material-symbols-outlined" style={{ color: cVis.color }} translate="no">{cVis.icon}</span>
                          </div>
                          <div>
                            <p className="font-black text-[#faf9f5] text-sm uppercase tracking-wide">{jc.crew?.name ?? "—"}</p>
                            <p className="text-[10px] uppercase font-bold" style={{ color: cVis.color }}>{jc.crew?.discipline ?? "—"}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSwapTarget({
                              assignmentId: jc.assignment_id,
                              jobServiceId: jc.job_service_id,
                              serviceName: jc.crew?.discipline ?? "",
                            });
                            setCrewPopupOpen(true);
                            fetchMatchingCrews();
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-[#ababa8] hover:text-[#faf9f5] bg-[#242624] hover:bg-[#323632] border border-[#474846]/30 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[13px]" translate="no">swap_horiz</span>
                          Change
                        </button>
                      </div>
                      <div className="space-y-1 text-xs text-[#ababa8]">
                        {jc.start_date && <p>Start: <span className="text-[#faf9f5] font-bold">{fmt(jc.start_date)}</span></p>}
                        {jc.end_date && <p>End: <span className="text-[#faf9f5] font-bold">{fmt(jc.end_date)}</span></p>}
                        {!jc.start_date && !jc.end_date && <p className="text-[#474846] italic">No schedule set</p>}
                      </div>
                    </div>
                  );
                })}
                
                {/* Add Crew Button Card */}
                <button 
                  onClick={() => { setCrewPopupOpen(true); fetchMatchingCrews(); }}
                  className="bg-[#1e201e]/30 border-2 border-dashed border-[#474846]/40 rounded-xl p-5 flex flex-col items-center justify-center min-h-[140px] hover:border-[#aeee2a]/50 hover:bg-[#aeee2a]/5 transition-colors cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-[#242624] group-hover:bg-[#aeee2a]/20 flex items-center justify-center mb-3 transition-colors">
                    <span className="material-symbols-outlined text-[#474846] group-hover:text-[#aeee2a] transition-colors" translate="no">add</span>
                  </div>
                  <span className="text-xs font-bold text-[#ababa8] group-hover:text-[#faf9f5] transition-colors">Assign Another Crew</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 3: DOCUMENTS & MEDIA VAULT
        ══════════════════════════════════════════════════ */}
        {activeTab === "documents" && (
          <div className="space-y-6">

            {/* Vault Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#faf9f5]">Project Vault</h3>
              <p className="text-xs text-[#ababa8]">Documents, photos, and media files for {job.job_number}</p>
            </div>

            {/* ── Signing Documents (Milestones) ── */}
            <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#818cf8]" translate="no">contract_edit</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#faf9f5]">Signing Documents</h4>
                    <p className="text-[10px] text-[#ababa8]">Job Start Certificate & Certificates of Completion</p>
                  </div>
                </div>
                <button
                  onClick={fetchMilestones}
                  className="text-[10px] text-[#aeee2a] font-bold uppercase tracking-wider hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {loadingMilestones ? (
                <div className="flex justify-center py-8">
                  <span className="material-symbols-outlined text-2xl text-[#ababa8] animate-spin" translate="no">progress_activity</span>
                </div>
              ) : milestones.length === 0 ? (
                <p className="text-xs text-[#474846] py-4 text-center">No signing documents generated yet. They are created automatically when a new project is submitted.</p>
              ) : (
                <div className="space-y-3">
                  {milestones.map((ms: any) => {
                    const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
                      draft:             { bg: "bg-[#474846]/15", text: "text-[#ababa8]", label: "Draft" },
                      pending_signature: { bg: "bg-[#f59e0b]/10", text: "text-[#f59e0b]", label: "Awaiting Signature" },
                      signed:            { bg: "bg-[#22c55e]/10", text: "text-[#22c55e]", label: "Signed" },
                      paid:              { bg: "bg-[#818cf8]/10", text: "text-[#818cf8]", label: "Paid" },
                    };
                    const sc = STATUS_COLORS[ms.status] || STATUS_COLORS.draft;
                    const isDraft = ms.status === "draft";
                    const isPending = ms.status === "pending_signature";
                    const isSigned = ms.status === "signed" || ms.status === "paid";
                    const signingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/projects/${jobId}/contract/${ms.id}`;

                    return (
                      <div key={ms.id} className="bg-[#1e201e] rounded-xl p-4 border border-[#474846]/15">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="material-symbols-outlined text-[20px] text-[#818cf8] shrink-0" translate="no">
                              {ms.document_type === "job_start" ? "play_circle" : "verified"}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-[#faf9f5] truncate">{ms.title}</p>
                              <p className="text-[10px] text-[#ababa8]">
                                {ms.amount > 0 ? `$${ms.amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "No value set"}
                                {ms.signed_at && ` · Signed ${fmt(ms.signed_at)}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                              {sc.label}
                            </span>

                            {isDraft && (
                              <button
                                onClick={async () => {
                                  await supabase.from("project_payment_milestones").update({ status: "pending_signature" }).eq("id", ms.id);
                                  fetchMilestones();
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#aeee2a] text-[#3a5400] text-[10px] font-black uppercase rounded-lg hover:bg-[#a0df14] transition-colors cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]" translate="no">send</span>
                                Send to Client
                              </button>
                            )}

                            {isSigned && (
                              <button
                                onClick={() => window.open(signingUrl, "_blank")}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#818cf8]/10 text-[#818cf8] text-[10px] font-black uppercase rounded-lg hover:bg-[#818cf8]/20 transition-colors cursor-pointer border border-[#818cf8]/20"
                              >
                                <span className="material-symbols-outlined text-[14px]" translate="no">visibility</span>
                                View
                              </button>
                            )}

                            {isSigned && (
                              <button
                                onClick={() => {
                                  const url = `/api/documents/download?milestoneId=${ms.id}`;
                                  window.open(url, "_blank");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22c55e]/10 text-[#22c55e] text-[10px] font-black uppercase rounded-lg hover:bg-[#22c55e]/20 transition-colors cursor-pointer border border-[#22c55e]/20"
                              >
                                <span className="material-symbols-outlined text-[14px]" translate="no">picture_as_pdf</span>
                                PDF
                              </button>
                            )}

                            {(isPending || isSigned) && (
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(signingUrl);
                                  setCopiedLink(ms.id);
                                  setTimeout(() => setCopiedLink(null), 2000);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#242624] text-[#faf9f5] text-[10px] font-bold rounded-lg hover:bg-[#323632] transition-colors cursor-pointer border border-[#474846]/30"
                              >
                                <span className="material-symbols-outlined text-[14px]" translate="no">
                                  {copiedLink === ms.id ? "check" : "link"}
                                </span>
                                {copiedLink === ms.id ? "Copied!" : "Copy Link"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4 Upload Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Block 1: Contracts & Documents */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#aeee2a]/10 border border-[#aeee2a]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#aeee2a]" translate="no">description</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#faf9f5]">Contracts & Docs</h4>
                    <p className="text-[10px] text-[#ababa8]">Permits, contracts, quotes</p>
                  </div>
                </div>
                <div className="flex-1 border-2 border-dashed border-[#474846]/40 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#0d0f0d] hover:border-[#aeee2a]/40 hover:bg-[#aeee2a]/5 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-3xl text-[#474846] group-hover:text-[#aeee2a] mb-2 transition-colors" translate="no">upload_file</span>
                  <p className="text-xs font-bold text-[#faf9f5]">Drop files here</p>
                  <p className="text-[10px] text-[#ababa8] mt-1">PDF, DOCX up to 20MB</p>
                </div>
                <p className="text-[10px] text-[#474846] text-center mt-3">No documents yet</p>
              </div>

              {/* Block 2: Photos */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#60b8f5]/10 border border-[#60b8f5]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#60b8f5]" translate="no">photo_library</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#faf9f5]">Site Photos</h4>
                    <p className="text-[10px] text-[#ababa8]">Before, during, after</p>
                  </div>
                </div>
                <div className="flex-1 border-2 border-dashed border-[#474846]/40 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#0d0f0d] hover:border-[#60b8f5]/40 hover:bg-[#60b8f5]/5 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-3xl text-[#474846] group-hover:text-[#60b8f5] mb-2 transition-colors" translate="no">add_photo_alternate</span>
                  <p className="text-xs font-bold text-[#faf9f5]">Upload photos</p>
                  <p className="text-[10px] text-[#ababa8] mt-1">JPG, PNG, HEIC up to 20MB</p>
                </div>
                <p className="text-[10px] text-[#474846] text-center mt-3">No photos yet</p>
              </div>

              {/* Block 3: Videos */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#f5a623]" translate="no">videocam</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#faf9f5]">Video Reports</h4>
                    <p className="text-[10px] text-[#ababa8]">Walkthroughs, inspections</p>
                  </div>
                </div>
                <div className="flex-1 border-2 border-dashed border-[#474846]/40 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-[#0d0f0d] hover:border-[#f5a623]/40 hover:bg-[#f5a623]/5 transition-colors cursor-pointer group">
                  <span className="material-symbols-outlined text-3xl text-[#474846] group-hover:text-[#f5a623] mb-2 transition-colors" translate="no">video_library</span>
                  <p className="text-xs font-bold text-[#faf9f5]">Drop videos here</p>
                  <p className="text-[10px] text-[#ababa8] mt-1">MP4, MOV up to 200MB</p>
                </div>
                <p className="text-[10px] text-[#474846] text-center mt-3">No videos yet</p>
              </div>

              {/* Block 4: Dumpster Photos (FUNCTIONAL) */}
              <div className="bg-[#121412] rounded-2xl p-6 border border-[#474846]/15 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#64748b]/10 border border-[#64748b]/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#64748b]" translate="no">delete</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-[#faf9f5]">Dumpster</h4>
                    <p className="text-[10px] text-[#ababa8]">Dumpster delivery & pickup photos</p>
                  </div>
                  {dumpsterPhotos.length > 0 && (
                    <span className="text-[10px] font-bold text-[#64748b] bg-[#64748b]/10 px-2 py-1 rounded-lg">
                      {dumpsterPhotos.length} photo{dumpsterPhotos.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Upload Drop Zone */}
                <input
                  ref={dumpsterInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleDumpsterUpload(e.target.files)}
                />
                <div
                  onClick={() => dumpsterInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-[#64748b]", "bg-[#64748b]/10"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-[#64748b]", "bg-[#64748b]/10"); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-[#64748b]", "bg-[#64748b]/10"); handleDumpsterUpload(e.dataTransfer.files); }}
                  className="border-2 border-dashed border-[#474846]/40 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-[#0d0f0d] hover:border-[#64748b]/40 hover:bg-[#64748b]/5 transition-colors cursor-pointer group"
                >
                  {uploadingDumpster ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#64748b]/30 border-t-[#64748b] rounded-full animate-spin" />
                      <span className="text-xs text-[#ababa8] font-bold">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-2xl text-[#474846] group-hover:text-[#64748b] mb-1 transition-colors" translate="no">add_a_photo</span>
                      <p className="text-xs font-bold text-[#faf9f5]">Upload dumpster photos</p>
                      <p className="text-[10px] text-[#ababa8] mt-0.5">JPG, PNG, HEIC up to 20MB</p>
                    </>
                  )}
                </div>

                {/* Photo Gallery */}
                {loadingDumpster ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-[#64748b]/30 border-t-[#64748b] rounded-full animate-spin" />
                  </div>
                ) : dumpsterPhotos.length === 0 ? (
                  <p className="text-[10px] text-[#474846] text-center mt-3">No dumpster photos yet</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {dumpsterPhotos.map((photo) => (
                      <div key={photo.id} className="relative group/photo rounded-lg overflow-hidden aspect-square bg-[#0d0f0d] border border-[#474846]/20">
                        <img
                          src={photo.url}
                          alt={photo.file_name || "Dumpster photo"}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setDumpsterPreview(photo.url)}
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteDumpsterPhoto(photo.id); }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity hover:bg-red-500/80"
                        >
                          <span className="material-symbols-outlined text-[14px] text-white" translate="no">close</span>
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                          <p className="text-[8px] text-white truncate">{photo.file_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vault note */}
            <div className="flex items-start gap-3 bg-[#121412] rounded-xl p-4 border border-[#474846]/15">
              <span className="material-symbols-outlined text-[#aeee2a] shrink-0 text-[18px]" translate="no">info</span>
              <p className="text-xs text-[#ababa8] leading-relaxed">
                File storage integration with Supabase Storage is in the next sprint. Documents uploaded here will be securely stored and accessible to your team and client portal.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 4: EXTRA MATERIAL
        ══════════════════════════════════════════════════ */}
        {activeTab === "extra_material" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black tracking-tight" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Extra Material Requests</h3>
                <p className="text-xs text-[#ababa8]">Purchase requests for extra materials needed on this project</p>
              </div>
              <button
                onClick={() => setShowAddExtraMat(true)}
                className="bg-[#aeee2a] hover:bg-[#a0df14] text-[#3a5400] font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 cursor-pointer text-xs"
              >
                <span className="material-symbols-outlined text-[16px]" translate="no">add_circle</span>
                New Request
              </button>
            </div>

            {/* Table */}
            <div className="bg-[#121412] rounded-2xl overflow-hidden border border-[#474846]/15">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1e201e]/50">
                    {["Date", "Material", "Qty", "Piece Size", "Document", "Status", ""].map((col) => (
                      <th key={col} className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#ababa8]">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#474846]/10">
                  {loadingExtraMat ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-[#ababa8]">
                          <span className="material-symbols-outlined text-2xl animate-spin" translate="no">progress_activity</span>
                          <p className="text-xs font-bold">Loading requests...</p>
                        </div>
                      </td>
                    </tr>
                  ) : extraMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-[#ababa8]">
                          <div className="w-12 h-12 rounded-full bg-[#1e201e] flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl text-[#aeee2a]" translate="no">inventory_2</span>
                          </div>
                          <p className="text-sm font-bold text-[#faf9f5]">No requests yet</p>
                          <p className="text-xs">Click &quot;New Request&quot; to add an extra material order.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    extraMaterials.map((mat) => {
                      const statusColors: Record<string, string> = {
                        pending: "bg-[#f5a623]/15 text-[#f5a623]",
                        ordered: "bg-[#60b8f5]/15 text-[#60b8f5]",
                        delivered: "bg-[#aeee2a]/15 text-[#aeee2a]",
                        cancelled: "bg-[#ff7351]/15 text-[#ff7351]",
                      };
                      const isEditing = editingMatId === mat.id;
                      return (
                        <tr key={mat.id} className={`transition-colors group ${isEditing ? "bg-[#aeee2a]/[0.04]" : "hover:bg-[#1e201e]"}`}>
                          <td className="px-5 py-4 text-xs text-[#ababa8]">{fmt(mat.created_at)}</td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                value={editMatFields.material_name}
                                onChange={(e) => setEditMatFields((p) => ({ ...p, material_name: e.target.value }))}
                                className="bg-[#1e201e] border border-[#474846]/40 rounded-lg px-3 py-1.5 text-sm text-[#faf9f5] w-full outline-none focus:border-[#aeee2a]/50"
                              />
                            ) : (
                              <span className="text-sm text-[#faf9f5] font-medium">{mat.material_name || "—"}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                type="number" min="1"
                                value={editMatFields.quantity}
                                onChange={(e) => setEditMatFields((p) => ({ ...p, quantity: e.target.value }))}
                                className="bg-[#1e201e] border border-[#474846]/40 rounded-lg px-3 py-1.5 text-xs text-[#faf9f5] w-20 outline-none focus:border-[#aeee2a]/50"
                              />
                            ) : (
                              <span className="bg-[#242624] px-3 py-1 rounded-lg text-xs font-bold text-[#faf9f5]">{mat.quantity}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input
                                value={editMatFields.piece_size}
                                onChange={(e) => setEditMatFields((p) => ({ ...p, piece_size: e.target.value }))}
                                className="bg-[#1e201e] border border-[#474846]/40 rounded-lg px-3 py-1.5 text-sm text-[#faf9f5] w-full outline-none focus:border-[#aeee2a]/50"
                              />
                            ) : (
                              <span className="text-sm text-[#ababa8]">{mat.piece_size}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input ref={editMatDocRef} type="file" className="hidden" onChange={(e) => handleEditMatDocUpload(e.target.files)} />
                                {editMatFields.document_url ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px] text-[#aeee2a]" translate="no">check_circle</span>
                                    <span className="text-xs text-[#faf9f5] truncate max-w-[100px]">{editMatFields.document_name}</span>
                                    <button onClick={() => setEditMatFields((p) => ({ ...p, document_url: null, document_name: null }))} className="text-[#ababa8] hover:text-[#ff7351] cursor-pointer">
                                      <span className="material-symbols-outlined text-[14px]" translate="no">close</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => editMatDocRef.current?.click()}
                                    disabled={uploadingEditDoc}
                                    className="text-xs text-[#ababa8] hover:text-[#aeee2a] transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    {uploadingEditDoc ? (
                                      <div className="w-3 h-3 border-2 border-[#aeee2a]/30 border-t-[#aeee2a] rounded-full animate-spin" />
                                    ) : (
                                      <span className="material-symbols-outlined text-[14px]" translate="no">upload_file</span>
                                    )}
                                    Attach
                                  </button>
                                )}
                              </div>
                            ) : mat.document_url ? (
                              <a
                                href={mat.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#60b8f5] hover:text-[#aeee2a] transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="material-symbols-outlined text-[14px]" translate="no">attach_file</span>
                                {mat.document_name || "View"}
                              </a>
                            ) : (
                              <span className="text-xs text-[#474846]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <select
                              value={mat.status}
                              onChange={(e) => handleExtraMatStatus(mat.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border-none outline-none cursor-pointer ${statusColors[mat.status] || statusColors.pending}`}
                              style={{ background: "transparent" }}
                            >
                              <option value="pending" className="bg-[#121412] text-[#faf9f5]">Pending</option>
                              <option value="ordered" className="bg-[#121412] text-[#faf9f5]">Ordered</option>
                              <option value="delivered" className="bg-[#121412] text-[#faf9f5]">Delivered</option>
                              <option value="cancelled" className="bg-[#121412] text-[#faf9f5]">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleDeleteExtraMat(mat.id)}
                              className="p-1.5 rounded-lg text-[#ababa8] hover:text-[#ff7351] hover:bg-[#ff7351]/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]" translate="no">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Request Modal */}
            {showAddExtraMat && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddExtraMat(false)}>
                <div className="bg-[#181a18] border border-[#474846]/30 rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()} style={{ animation: "fadeInScale 0.2s ease-out" }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#aeee2a]" translate="no">inventory_2</span>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>New Extra Material Request</h3>
                      <p className="text-[10px] text-[#ababa8]">Fill in the details for the material order</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Material Name */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold block mb-1.5">Material Name</label>
                      <input value={emMaterialName} onChange={(e) => setEmMaterialName(e.target.value)} className={detailInputCls} placeholder="e.g. J-Channel, Soffit, Fascia..." />
                    </div>

                    {/* Qty + Size row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold block mb-1.5">Quantity (pcs)</label>
                        <input type="number" min="1" value={emQty} onChange={(e) => setEmQty(e.target.value)} className={detailInputCls} />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold block mb-1.5">Piece Size</label>
                        <input value={emSize} onChange={(e) => setEmSize(e.target.value)} className={detailInputCls} placeholder={'e.g. 12ft, 4x8, 10"'} />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold block mb-1.5">Notes (optional)</label>
                      <input value={emNotes} onChange={(e) => setEmNotes(e.target.value)} className={detailInputCls} placeholder="Additional details..." />
                    </div>

                    {/* Document */}
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#ababa8] font-bold block mb-1.5">Document (optional)</label>
                      <input ref={extraMatDocRef} type="file" className="hidden" onChange={(e) => handleExtraMatDocUpload(e.target.files)} />
                      {emDocUrl ? (
                        <div className="flex items-center gap-2 bg-[#242624] rounded-lg px-4 py-3">
                          <span className="material-symbols-outlined text-[#aeee2a] text-[16px]" translate="no">check_circle</span>
                          <span className="text-xs text-[#faf9f5] font-medium truncate flex-1">{emDocName}</span>
                          <button onClick={() => { setEmDocUrl(null); setEmDocName(null); }} className="text-[#ababa8] hover:text-[#ff7351] transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-[16px]" translate="no">close</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => extraMatDocRef.current?.click()}
                          disabled={uploadingExtraDoc}
                          className="w-full border-2 border-dashed border-[#474846]/40 rounded-lg py-3 flex items-center justify-center gap-2 text-xs text-[#ababa8] hover:border-[#aeee2a]/40 hover:text-[#faf9f5] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {uploadingExtraDoc ? (
                            <><div className="w-4 h-4 border-2 border-[#aeee2a]/30 border-t-[#aeee2a] rounded-full animate-spin" /> Uploading...</>
                          ) : (
                            <><span className="material-symbols-outlined text-[16px]" translate="no">upload_file</span> Attach document</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6 justify-end">
                    <button
                      onClick={() => setShowAddExtraMat(false)}
                      className="px-5 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] font-bold text-xs hover:bg-[#242624] transition-all cursor-pointer"
                    >Cancel</button>
                    <button
                      onClick={handleAddExtraMaterial}
                      disabled={!emMaterialName.trim() || !emSize.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#aeee2a] text-[#3a5400] font-bold text-xs hover:bg-[#a0df14] transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >Add Request</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════
          CREW SELECTION POPUP
      ══════════════════════════════════════════════════ */}
      {crewPopupOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => { setCrewPopupOpen(false); setSwapTarget(null); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-[#121412] border border-[#474846]/30 rounded-2xl shadow-2xl overflow-hidden"
            style={{ animation: "fadeInScale 0.2s ease-out" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#474846]/20">
              <div>
                <h2 className="text-lg font-black text-[#faf9f5] tracking-tight" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  {swapTarget ? "Change Crew" : "Available Crews"}
                </h2>
                <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest mt-1">
                  {swapTarget
                    ? `Swapping crew for: ${swapTarget.serviceName}`
                    : `Matching: ${job.services.map((s: any) => s.service_type?.name).filter(Boolean).join(", ") || "All Services"}`
                  }
                </p>
              </div>
              <button
                onClick={() => { setCrewPopupOpen(false); setSwapTarget(null); }}
                className="w-8 h-8 rounded-lg bg-[#1e201e] flex items-center justify-center text-[#ababa8] hover:text-[#faf9f5] hover:bg-[#242624] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]" translate="no">close</span>
              </button>
            </div>

            {/* Service Tags */}
            <div className="px-6 py-3 border-b border-[#474846]/10 flex flex-wrap gap-2">
              {job.services.map((s: any, i: number) => {
                const svcKey = s.service_type?.name?.toLowerCase() ?? "";
                const vis = DISCIPLINE_VIS[svcKey] ?? { icon: "construction", color: "#ababa8" };
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: `${vis.color}15`, color: vis.color, border: `1px solid ${vis.color}30` }}
                  >
                    <span className="material-symbols-outlined text-[13px]" translate="no">{vis.icon}</span>
                    {s.service_type?.name ?? "Service"}
                  </span>
                );
              })}
            </div>

            {/* Body */}
            <div className="px-6 py-5 max-h-[400px] overflow-y-auto space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#474846 transparent" }}>
              {loadingCrews ? (
                <div className="flex flex-col items-center gap-3 py-12 text-[#ababa8]">
                  <span className="material-symbols-outlined text-3xl animate-spin" translate="no">progress_activity</span>
                  <p className="text-sm font-bold">Finding matching crews...</p>
                </div>
              ) : availableCrews.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-[#ababa8]">
                  <div className="w-14 h-14 rounded-full bg-[#1e201e] flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-[#ff7351]" translate="no">group_off</span>
                  </div>
                  <p className="text-sm font-bold text-[#faf9f5]">No crews found</p>
                  <p className="text-xs text-center">
                    No registered crews match the services for this project.<br />
                    Register crews in the <Link href="/crews" className="text-[#aeee2a] hover:underline font-bold">Crews & Partners</Link> module first.
                  </p>
                </div>
              ) : (() => {
                // In swap mode, only show crews matching the specific service being swapped
                const crewsToShow = swapTarget
                  ? availableCrews.filter((c) =>
                      c.matchedSpecialties.some((spec) => {
                        const specNorm = spec.toLowerCase().replace(/ (installation|building)$/, "");
                        const svcNorm = swapTarget.serviceName.toLowerCase();
                        return specNorm === svcNorm || spec.toLowerCase() === svcNorm;
                      })
                    )
                  : availableCrews;

                // Group crews by specialty for organized display
                const grouped = new Map<string, AvailableCrew[]>();
                for (const crew of crewsToShow) {
                  for (const spec of crew.matchedSpecialties) {
                    // In swap mode, only group under the matching specialty
                    if (swapTarget) {
                      const specNorm = spec.toLowerCase().replace(/ (installation|building)$/, "");
                      const svcNorm = swapTarget.serviceName.toLowerCase();
                      if (specNorm !== svcNorm && spec.toLowerCase() !== svcNorm) continue;
                    }
                    if (!grouped.has(spec)) grouped.set(spec, []);
                    if (!grouped.get(spec)!.find(c => c.id === crew.id)) {
                      grouped.get(spec)!.push(crew);
                    }
                  }
                }

                return Array.from(grouped.entries()).map(([specName, crews]) => {
                  const specKey = specName.toLowerCase().replace(/ (installation|building)$/, "");
                  const vis = DISCIPLINE_VIS[specKey] ?? { icon: "construction", color: "#ababa8" };

                  return (
                    <div key={specName} className="mb-4 last:mb-0">
                      {/* Section Header */}
                      <button
                        onClick={() => setExpandedCrewGroups(prev => ({ ...prev, [specName]: !prev[specName] }))}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2.5 cursor-pointer transition-all hover:brightness-125 focus:outline-none"
                        style={{ backgroundColor: `${vis.color}08`, borderLeft: `3px solid ${vis.color}` }}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ color: vis.color }}
                          translate="no"
                        >
                          {vis.icon}
                        </span>
                        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: vis.color }}>
                          {specName}
                        </span>
                        <span className="ml-auto flex items-center gap-3 text-[10px] text-[#474846] font-bold">
                          {crews.length} crew{crews.length !== 1 ? "s" : ""}
                          <span 
                            className="material-symbols-outlined text-[16px] transition-transform duration-200"
                            style={{ transform: expandedCrewGroups[specName] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            translate="no"
                          >
                            expand_more
                          </span>
                        </span>
                      </button>

                      {/* Crew cards inside this group */}
                      {expandedCrewGroups[specName] && (
                        <div className="space-y-2 pl-2">
                          {crews.map((crew) => (
                          <div
                            key={crew.id}
                            className="flex items-center gap-4 p-4 bg-[#1a1c1a] rounded-xl border border-[#474846]/20 hover:border-opacity-50 transition-all duration-200 group"
                            style={{ ["--accent" as string]: vis.color }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${vis.color}40`)}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
                          >
                            {/* Avatar */}
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${vis.color}12`, border: `1px solid ${vis.color}25` }}
                            >
                              <span className="text-lg font-black" style={{ color: vis.color }}>
                                {crew.name.charAt(0).toUpperCase()}
                              </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-[#faf9f5] text-sm uppercase tracking-wide truncate">{crew.name}</p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {crew.matchedSpecialties.map((s, i) => {
                                  const sKey = s.toLowerCase().replace(/ (installation|building)$/, "");
                                  const sVis = DISCIPLINE_VIS[sKey] ?? { icon: "build", color: "#ababa8" };
                                  return (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase"
                                      style={{ backgroundColor: `${sVis.color}15`, color: sVis.color }}
                                    >
                                      {s}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Phone */}
                            {crew.phone && (
                              <span className="text-xs text-[#ababa8] font-mono shrink-0">{crew.phone}</span>
                            )}

                            {/* Action */}
                            <button
                              onClick={async (e) => {
                                const btn = e.currentTarget;
                                try {
                                  // Locate the matched service on this project
                                  const svc = job.services.find((s: any) => s.service_type?.name?.toLowerCase() === specKey);
                                  if (!svc || !svc.id) {
                                    alert("Matching service ID not found on this project.");
                                    return;
                                  }
                                  
                                  // Determine specialty matching the service (similar to new-project logic)
                                  const SPEC_CODE_MAP: Record<string, string> = {
                                    siding: "siding_installation",
                                    "siding installation": "siding_installation",
                                    painting: "painting",
                                    windows: "windows",
                                    doors: "doors",
                                    gutters: "gutters",
                                    roofing: "roofing",
                                    decks: "deck_building",
                                  };
                                  const specCode = SPEC_CODE_MAP[specKey] || specKey;
                                  const { data: spec } = await supabase.from("specialties").select("id").eq("code", specCode).maybeSingle();
                                  
                                  const specialty_id = spec?.id || "26652a43-728d-43c1-935a-c39f1dea4d7d"; // fallback

                                  // ─── SWAP MODE: update existing assignment crew ───
                                  if (swapTarget) {
                                    const { error } = await supabase
                                      .from('service_assignments')
                                      .update({ crew_id: crew.id, specialty_id: specialty_id })
                                      .eq('id', swapTarget.assignmentId);
                                    if (error) throw error;
                                    btn.textContent = "Swapped ✓";
                                    btn.style.backgroundColor = vis.color;
                                    btn.style.color = "#121412";
                                    btn.disabled = true;
                                    setSwapTarget(null);
                                    setCrewPopupOpen(false);
                                    fetchJob();
                                    return;
                                  }

                                  // ─── NEW ASSIGNMENT: calculate dates from SQ ───
                                  const parsedSq = parseFloat(job.sq ?? 0);
                                  const jobStartDate = job.requested_start_date;
                                  let scheduled_start_at: string | null = null;
                                  let scheduled_end_at: string | null = null;

                                  if (jobStartDate) {
                                    let duration = 1;
                                    if (specKey === "siding") duration = Math.max(1, Math.ceil(parsedSq / 8));
                                    else if (specKey === "painting") duration = Math.max(1, Math.ceil(parsedSq / 10));

                                    const startAt = new Date(jobStartDate + "T08:00:00");
                                    const endDay = new Date(jobStartDate + "T12:00:00");
                                    let added = 0;
                                    while (added < duration - 1) {
                                      endDay.setDate(endDay.getDate() + 1);
                                      if (endDay.getDay() !== 0) added++; // Skip Sundays
                                    }
                                    const endAt = new Date(endDay);
                                    endAt.setDate(endAt.getDate() + 1); // exclusive boundary for calendar

                                    scheduled_start_at = startAt.toISOString();
                                    scheduled_end_at = endAt.toISOString();
                                  }

                                  const { error } = await supabase.from('service_assignments').insert({
                                    job_service_id: svc.id,
                                    crew_id: crew.id,
                                    specialty_id: specialty_id,
                                    status: scheduled_start_at ? "scheduled" : "planned",
                                    scheduled_start_at,
                                    scheduled_end_at,
                                  });
                                  
                                  if (error) throw error;
                                  
                                  // Visual feedback immediately without closing the modal
                                  btn.textContent = "Assigned ✓";
                                  btn.style.backgroundColor = vis.color;
                                  btn.style.color = "#121412";
                                  btn.disabled = true;
                                  btn.style.cursor = "default";
                                  
                                  fetchJob();
                                } catch(err: any) {
                                  alert("Error assigning crew: " + (err.message || JSON.stringify(err)));
                                }
                              }}
                              className="px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                              style={{
                                backgroundColor: `${vis.color}12`,
                                color: vis.color,
                                border: `1px solid ${vis.color}25`,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${vis.color}25`)}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `${vis.color}12`)}
                            >
                              {swapTarget ? "Select" : "Assign"}
                            </button>
                          </div>
                        ))}
                      </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#474846]/20 flex items-center justify-between">
              <Link href="/crews" className="text-[#aeee2a] text-xs font-bold hover:underline">
                Manage All Crews →
              </Link>
              <button
                onClick={() => { setCrewPopupOpen(false); setSwapTarget(null); }}
                className="px-4 py-2 bg-[#242624] text-[#faf9f5] text-xs font-bold rounded-xl hover:bg-[#2e302e] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <style jsx>{`
            @keyframes fadeInScale {
              from { opacity: 0; transform: scale(0.95); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}
      {/* ═══════ MODAL — ASSIGN PARTNER ═══════ */}
      {openPartnerModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setOpenPartnerModal(null)}>
            <div className="bg-[#181a18] border border-[#474846]/40 rounded-2xl shadow-2xl w-full max-w-lg p-8" onClick={(e) => e.stopPropagation()} style={{ animation: "fadeInScale .2s ease" }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ backgroundColor: `${openPartnerModal.color}1A`, borderColor: `${openPartnerModal.color}33` }}>
                      <span className="material-symbols-outlined text-[24px]" style={{ color: openPartnerModal.color }} translate="no">{openPartnerModal.icon}</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">{openPartnerModal.label}</h2>
                      <p className="text-xs text-[#ababa8] mt-1 font-medium">
                        {windowsStep === "partner" ? "Select a partner" : windowsStep === "subservices" ? "Select services" : windowsStep === "config" ? "Configure windows" : windowsStep === "deckscope" ? "Configure deck scope" : windowsStep === "edit_menu" ? "Edit configuration" : windowsStep === "edit_windows" ? "Edit windows config" : windowsStep === "edit_deckscope" ? "Edit deck scope" : ""}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setOpenPartnerModal(null)} type="button" className="w-8 h-8 rounded-full bg-[#242624] flex items-center justify-center hover:bg-[#aeee2a] hover:text-[#3a5400] transition-colors">
                    <span className="material-symbols-outlined text-sm" translate="no">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2" style={{ scrollbarWidth: "none" }}>

                  {/* ── STEP 1: Select Partner ── */}
                  {windowsStep === "partner" && (
                    <>
                      {openPartnerModal.partners?.map((partner) => {
                        const isSelected = assignedPartners[openPartnerModal.id] === partner;
                        return (
                          <button key={partner} type="button"
                            onClick={() => {
                              const svcId = openPartnerModal.id;
                              setAssignedPartners((prev) => ({ ...prev, [svcId]: partner }));
                              // Combined card → go to sub-services step
                              if (openPartnerModal.subServices) {
                                setWindowsStep("subservices");
                                return;
                              }
                              // ── Persist to DB: create/update service_assignment ──
                              persistPartnerToAssignment(svcId, partner);
                              // Auto-chain: Siding → Painting
                              if (svcId === "siding") {
                                const p = ALL_SERVICES.find((s) => s.id === "painting");
                                if (p) { setOpenPartnerModal(p); return; }
                              }
                              // Auto-chain: Gutters → Roofing
                              if (svcId === "gutters") {
                                const r = ALL_SERVICES.find((s) => s.id === "roofing");
                                if (r) { setOpenPartnerModal(r); return; }
                              }
                              setOpenPartnerModal(null);
                            }}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isSelected ? '' : 'bg-[#181a18] border-[#474846]/40 hover:bg-[#242624] hover:border-[#747673]'}`}
                            style={isSelected ? { backgroundColor: `${openPartnerModal.color}1A`, borderColor: openPartnerModal.color } : {}}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? '' : 'bg-[#242624] text-[#ababa8]'}`}
                                   style={isSelected ? { backgroundColor: openPartnerModal.color, color: '#000' } : {}}>
                                {partner.charAt(0)}
                              </div>
                              <span className={`text-sm font-bold tracking-wide uppercase ${isSelected ? '' : 'text-[#faf9f5]'}`} style={isSelected ? { color: openPartnerModal.color } : {}}>{partner}</span>
                            </div>
                            {isSelected && <span className="material-symbols-outlined" style={{ color: openPartnerModal.color }} translate="no">check_circle</span>}
                          </button>
                        );
                      })}
                      {assignedPartners[openPartnerModal.id] && (
                        <button type="button" onClick={() => {
                          const c = { ...assignedPartners }; delete c[openPartnerModal.id]; setAssignedPartners(c);
                          setWindowCount(""); setWindowTrim(""); setSelectedSubSvcs([]); setDeckScope(""); setOpenPartnerModal(null);
                        }} className="mt-4 flex items-center justify-center p-3 rounded-xl border border-dashed border-[#ba1212]/30 text-[#ba1212] hover:bg-[#ba1212]/10 transition-colors">
                          <span className="text-xs font-bold uppercase tracking-wider">Unassign Partner</span>
                        </button>
                      )}
                    </>
                  )}

                  {/* ── STEP 2: Sub-service selection (combined DWD card only) ── */}
                  {windowsStep === "subservices" && openPartnerModal.subServices && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">check</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">Partner</span>
                        </div>
                        <div className="w-8 h-px bg-[#474846]"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623]/20 border border-[#f5a623] flex items-center justify-center">
                            <span className="text-[10px] font-black text-[#f5a623]">2</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#faf9f5] uppercase tracking-wider">Select Services</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#ababa8]">
                        Assigned to <span className="text-[#f5a623] font-bold uppercase">{assignedPartners[openPartnerModal.id]}</span>. Select which services to include:
                      </p>
                      {openPartnerModal.subServices.map((sub) => {
                        const checked = selectedSubSvcs.includes(sub.id);
                        return (
                          <button key={sub.id} type="button"
                            onClick={() => setSelectedSubSvcs((prev) => checked ? prev.filter((x) => x !== sub.id) : [...prev, sub.id])}
                            className={`flex items-center gap-4 w-full p-4 rounded-xl border transition-all ${checked ? '' : 'bg-[#181a18] border-[#474846]/40 hover:bg-[#242624]'}`}
                            style={checked ? { backgroundColor: `${openPartnerModal.color}1A`, borderColor: openPartnerModal.color } : {}}
                          >
                            <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${checked ? '' : 'border-[#474846]'}`}
                                 style={checked ? { backgroundColor: openPartnerModal.color, borderColor: openPartnerModal.color } : {}}>
                              {checked && <span className="material-symbols-outlined text-[16px] text-[#000]" translate="no">check</span>}
                            </div>
                            <span className="material-symbols-outlined text-xl" style={{ color: checked ? openPartnerModal.color : '#747673' }} translate="no">{sub.icon}</span>
                            <span className={`text-sm font-bold uppercase tracking-wide ${checked ? 'text-[#faf9f5]' : 'text-[#ababa8]'}`}>{sub.label}</span>
                          </button>
                        );
                      })}
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setWindowsStep("partner")} className="flex-1 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] text-xs font-bold hover:bg-[#242624] transition-all">Back</button>
                        <button type="button" disabled={selectedSubSvcs.length === 0}
                          onClick={async () => {
                            // Add each selected sub-service to DB
                            let types = allServiceTypes;
                            if (types.length === 0) {
                              const { data } = await supabase.from("service_types").select("id, name").order("name");
                              types = data || []; setAllServiceTypes(types);
                            }
                            const partnerName = assignedPartners[openPartnerModal.id] || "";
                            for (const subId of selectedSubSvcs) {
                              // Skip decks here — it will be created in the deckscope step
                              if (subId === "decks") continue;
                              const exists = job?.services?.some((s: any) => s.service_type?.name?.toLowerCase() === subId);
                              if (!exists) {
                                const match = types.find((st) => st.name.toLowerCase() === subId);
                                if (match) await handleAddService(match.id);
                              }
                              // Persist partner assignment to DB
                              await persistPartnerToAssignment(subId, partnerName);
                            }
                            // Remove sub-services that were deselected
                            const allSubIds = openPartnerModal.subServices!.map((s) => s.id);
                            for (const subId of allSubIds) {
                              if (!selectedSubSvcs.includes(subId)) {
                                const existing = job?.services?.find((s: any) => s.service_type?.name?.toLowerCase() === subId);
                                if (existing) await handleRemoveService(existing.id);
                              }
                            }
                            // If windows is selected, go to config (then deckscope after)
                            if (selectedSubSvcs.includes("windows")) { setWindowsStep("config"); return; }
                            // If only decks is selected (no windows), go to deckscope
                            if (selectedSubSvcs.includes("decks")) { setWindowsStep("deckscope"); return; }
                            // For doors only — close and persist
                            for (const subId of selectedSubSvcs) {
                              await persistPartnerToAssignment(subId, partnerName);
                            }
                            setOpenPartnerModal(null);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-[#f5a623] text-[#000] text-xs font-black uppercase tracking-wider hover:bg-[#e09015] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >Confirm</button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: Windows Config ── */}
                  {windowsStep === "config" && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center"><span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">check</span></div>
                        <div className="w-8 h-px bg-[#474846]"></div>
                        <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center"><span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">check</span></div>
                        <div className="w-8 h-px bg-[#474846]"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623]/20 border border-[#f5a623] flex items-center justify-center"><span className="text-[10px] font-black text-[#f5a623]">3</span></div>
                          <span className="text-[10px] font-bold text-[#faf9f5] uppercase tracking-wider">Windows Config</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#ababa8]">Assigned to <span className="text-[#f5a623] font-bold uppercase">{assignedPartners[openPartnerModal.id]}</span>. Configure windows:</p>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#ababa8]">How many windows?</label>
                        <input type="number" min="1" value={windowCount} onChange={(e) => setWindowCount(e.target.value)} placeholder="e.g. 42"
                          className="w-full bg-[#242624] border border-transparent rounded-lg py-3 px-4 text-[#faf9f5] placeholder:text-[#747673] focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#ababa8]">Trim?</label>
                        <CustomDropdown value={windowTrim} onChange={(val) => setWindowTrim(val as "yes" | "no")}
                          options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} placeholder="Select..."
                          className="w-full bg-[#242624] border border-[#474846] rounded-lg px-4 py-3 text-[15px] text-[#faf9f5] hover:border-[#f5a623]/50 transition-colors flex justify-between items-center" />
                      </div>
                      {windowCount && windowTrim && (
                        <div className="p-4 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#f5a623] text-lg" translate="no">calendar_month</span>
                            <div>
                              <p className="text-sm font-bold text-[#faf9f5]">Duration: <span className="text-[#f5a623]">{Math.max(1, Math.round(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20)))} day{Math.max(1, Math.round(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20))) !== 1 ? "s" : ""}</span></p>
                              <p className="text-[10px] text-[#ababa8] mt-0.5">{parseInt(windowCount)} windows ÷ {windowTrim === "yes" ? "12" : "20"}/day</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setWindowsStep("subservices")} className="flex-1 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] text-xs font-bold hover:bg-[#242624] transition-all">Back</button>
                        <button type="button" disabled={!windowCount || !windowTrim}
                          onClick={async () => { 
                            // Persist windows assignment with count/trim config
                            const partnerName = assignedPartners[openPartnerModal.id] || "";
                            await persistPartnerToAssignment("windows", partnerName);
                            // If decks is also selected, go to deckscope next
                            if (selectedSubSvcs.includes("decks")) { setWindowsStep("deckscope"); return; }
                            // Persist all other selected sub-services too
                            for (const subId of selectedSubSvcs) {
                              if (subId !== "windows" && subId !== "decks") {
                                await persistPartnerToAssignment(subId, partnerName);
                              }
                            }
                            setWindowsStep("partner"); setOpenPartnerModal(null); 
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-[#f5a623] text-[#000] text-xs font-black uppercase tracking-wider hover:bg-[#e09015] transition-all disabled:opacity-30 disabled:cursor-not-allowed">Confirm</button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP: Deck Scope Config ── */}
                  {windowsStep === "deckscope" && (
                    <div className="space-y-6">
                      {/* Step indicator */}
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">check</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">Previous</span>
                        </div>
                        <div className="w-8 h-px bg-[#474846]"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623]/20 border border-[#f5a623] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#f5a623]" translate="no">deck</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#faf9f5] uppercase tracking-wider">Deck Scope</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#ababa8]">
                        Assigned to <span className="text-[#f5a623] font-bold uppercase">{assignedPartners[openPartnerModal.id]}</span>. Select the scope of work for the deck:
                      </p>

                      {/* Scope Dropdown */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#ababa8]">
                          Scope
                        </label>
                        <CustomDropdown
                          value={deckScope}
                          onChange={(val) => setDeckScope(val)}
                          options={DECK_SCOPE_OPTIONS.map(o => ({
                            value: o.value,
                            label: `${o.label} — ${o.days >= 7 ? `${Math.round(o.days / 5)} weeks` : `${o.days} day${o.days !== 1 ? "s" : ""}`}`,
                          }))}
                          placeholder="Select scope..."
                          className="w-full bg-[#242624] border border-[#474846] rounded-lg px-4 py-3 text-[15px] text-[#faf9f5] hover:border-[#f5a623]/50 transition-colors flex justify-between items-center"
                        />
                      </div>

                      {/* Duration preview */}
                      {deckScope && (() => {
                        const opt = DECK_SCOPE_OPTIONS.find(o => o.value === deckScope);
                        if (!opt) return null;
                        const durationLabel = opt.days >= 7
                          ? `${Math.round(opt.days / 5)} weeks (${opt.days} working days)`
                          : `${opt.days} day${opt.days !== 1 ? "s" : ""}`;
                        return (
                          <div className="p-4 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-[#f5a623] text-lg" translate="no">calendar_month</span>
                              <div>
                                <p className="text-sm font-bold text-[#faf9f5]">
                                  Estimated Duration:{" "}
                                  <span className="text-[#f5a623]">{durationLabel}</span>
                                </p>
                                <p className="text-[10px] text-[#ababa8] mt-0.5">
                                  {opt.label} scope selected
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Go back to windows config if windows was selected, otherwise subservices
                            if (selectedSubSvcs.includes("windows")) { setWindowsStep("config"); }
                            else { setWindowsStep("subservices"); }
                          }}
                          className="flex-1 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] text-xs font-bold hover:bg-[#242624] transition-all"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!deckScope}
                          onClick={async () => {
                            // Now create the Decks service with deckScope already set
                            let types = allServiceTypes;
                            if (types.length === 0) {
                              const { data } = await supabase.from("service_types").select("id, name").order("name");
                              types = data || []; setAllServiceTypes(types);
                            }
                            const decksExists = job?.services?.some((s: any) => s.service_type?.name?.toLowerCase() === "decks");
                            if (!decksExists) {
                              const match = types.find((st) => st.name.toLowerCase() === "decks");
                              if (match) await handleAddService(match.id);
                            }
                            // Persist all selected sub-service assignments to DB
                            const partnerName = assignedPartners[openPartnerModal.id] || "";
                            for (const subId of selectedSubSvcs) {
                              await persistPartnerToAssignment(subId, partnerName);
                            }
                            setWindowsStep("partner");
                            setOpenPartnerModal(null);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-[#f5a623] text-[#000] text-xs font-black uppercase tracking-wider hover:bg-[#e09015] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}


                  {/* ── EDIT MENU: Choose what to edit ── */}
                  {windowsStep === "edit_menu" && openPartnerModal && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">edit</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">Edit Configuration</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#ababa8]">
                        Partner: <span className="text-[#f5a623] font-bold uppercase">{assignedPartners[openPartnerModal.id]}</span>. Choose what to edit:
                      </p>

                      {/* ── Sub-Services Toggle (Mark / Unmark) ── */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#747673]">Services</label>
                        <div className="space-y-1.5">
                          {(openPartnerModal.subServices ?? []).map((sub: { id: string; label: string; icon: string }) => {
                            const isActive = job.services.some((s: any) => s.service_type?.name?.toLowerCase() === sub.id);
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={async () => {
                                  if (isActive) {
                                    // ── REMOVE service ──
                                    const existing = job.services.find((s: any) => s.service_type?.name?.toLowerCase() === sub.id);
                                    if (!existing) return;
                                    await handleRemoveService(existing.id);

                                    // Also remove related window_orders if removing "windows" or "doors"
                                    if (sub.id === "windows" || sub.id === "doors") {
                                      const { error: woErr } = await supabase
                                        .from("window_orders")
                                        .delete()
                                        .eq("job_id", job.id);
                                      if (woErr) console.error("[EditMenu] Error removing window_orders:", woErr);
                                      else console.log("[EditMenu] Removed window_orders for job:", job.id);
                                    }

                                    await fetchJob();
                                    setSelectedSubSvcs((prev) => prev.filter((x) => x !== sub.id));

                                    // If no sub-services remain active, close modal and clear partner
                                    const remainingActive = (openPartnerModal.subServices ?? [])
                                      .filter((s: { id: string }) => s.id !== sub.id)
                                      .some((s: { id: string }) => job.services.some((js: any) => js.service_type?.name?.toLowerCase() === s.id));
                                    if (!remainingActive) {
                                      setAssignedPartners((prev) => { const n = { ...prev }; delete n[openPartnerModal.id]; return n; });
                                      setOpenPartnerModal(null);
                                    }
                                  } else {
                                    // ── RE-ADD service ──
                                    // 1. Fetch service_type_id
                                    let allTypes = allServiceTypes;
                                    if (!allTypes.length) {
                                      const { data } = await supabase.from("service_types").select("id, name").order("name");
                                      allTypes = data || [];
                                      setAllServiceTypes(allTypes);
                                    }
                                    const svcType = allTypes.find((t: any) => t.name.toLowerCase() === sub.id);
                                    if (!svcType) { console.error("[EditMenu] service_type not found for", sub.id); return; }

                                    // 2. Create job_service
                                    const { data: newSvc, error: svcErr } = await supabase
                                      .from("job_services")
                                      .insert({ job_id: job.id, service_type_id: svcType.id, scope_of_work: `${sub.label} service` })
                                      .select("id, service_type:service_types(name)")
                                      .single();
                                    if (svcErr || !newSvc) { console.error("[EditMenu] Error creating job_service:", svcErr); return; }

                                    // 3. Calculate duration and create assignment (skip for decks — needs scope selection first)
                                    if (sub.id !== "decks") {
                                      const sq = job.sq ?? 0;
                                      const partnerName = assignedPartners[openPartnerModal.id] || "SERGIO";
                                      const dur = calculateServiceDuration(partnerName, sub.id, sq);
                                      const jobStartDate = job.requested_start_date;
                                      const todayIso = new Date().toISOString().split("T")[0];
                                      let startIso = todayIso;
                                      if (jobStartDate && todayIso <= jobStartDate) startIso = jobStartDate;

                                      // Skip Sunday
                                      const sd = new Date(startIso + "T12:00:00");
                                      if (sd.getDay() === 0) { sd.setDate(sd.getDate() + 1); startIso = sd.toISOString().split("T")[0]; }

                                      // Add working days
                                      const ed = new Date(startIso + "T12:00:00");
                                      let rem = dur - 1;
                                      while (rem > 0) { ed.setDate(ed.getDate() + 1); if (ed.getDay() !== 0) rem--; }
                                      const endIso = ed.toISOString().split("T")[0];

                                      const startAt = new Date(startIso + "T08:00:00");
                                      const endAt = new Date(endIso + "T12:00:00");
                                      endAt.setDate(endAt.getDate() + 1);

                                      // Find crew and specialty
                                      const crewNameMap: Record<string, string> = { windows: "SERGIO", doors: "SERGIO", decks: "SERGIO" };
                                      const crewDefault = crewNameMap[sub.id] || "SERGIO";
                                      const { data: crewMatch } = await supabase.from("crews").select("id").ilike("name", crewDefault).limit(1);
                                      const crewId = crewMatch?.[0]?.id || null;

                                      const specNameMap: Record<string, string> = { windows: "Windows", doors: "Doors", decks: "Deck Building" };
                                      const specName = specNameMap[sub.id] || sub.id;
                                      const { data: specMatch } = await supabase.from("specialties").select("id").ilike("name", specName).limit(1);
                                      const specialtyId = specMatch?.[0]?.id || null;

                                      if (!SCHEDULING_PAUSED) {
                                        const { error: assignErr } = await supabase.from("service_assignments").insert({
                                          job_service_id: newSvc.id,
                                          crew_id: crewId,
                                          specialty_id: specialtyId,
                                          status: "scheduled",
                                          scheduled_start_at: startAt.toISOString(),
                                          scheduled_end_at: endAt.toISOString(),
                                        });
                                        if (assignErr) console.error("[EditMenu] assignment error:", assignErr);
                                        else console.log("[EditMenu] Re-added", sub.id, ":", startIso, "->", endIso);
                                      }
                                    }

                                    await fetchJob();
                                    setSelectedSubSvcs((prev) => [...prev, sub.id]);

                                    // Auto-create window_order when re-adding Windows
                                    if (sub.id === "windows" || sub.id === "doors") {
                                      const wQty = parseInt(windowCount) || null;
                                      const { error: woErr } = await supabase.from("window_orders").insert({
                                        job_id: job.id,
                                        customer_name: job.customer?.full_name || job.title || "",
                                        status: "Measurement",
                                        money_collected: "NO",
                                        quantity: wQty,
                                        quote: null,
                                        deposit: null,
                                        ordered_on: null,
                                        expected_delivery: null,
                                        supplier: "",
                                        order_number: null,
                                        notes: windowTrim === "yes" ? "Trim: YES" : windowTrim === "no" ? "Trim: NO" : null,
                                      });
                                      if (woErr) console.error("[EditMenu] Error creating window_order:", woErr);
                                      else console.log("[EditMenu] Auto-created window_order for job:", job.id);
                                    }

                                    // If re-adding decks, go to deckscope step
                                    if (sub.id === "decks") {
                                      setWindowsStep("edit_deckscope");
                                    }
                                  }
                                }}
                                className={`flex items-center justify-between w-full p-3 rounded-xl border transition-all ${isActive ? 'border-[#f5a623]/30 bg-[#f5a623]/5 hover:bg-[#f5a623]/10' : 'border-[#474846]/20 bg-[#181a18] hover:bg-[#242624] hover:border-[#f5a623]/20'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? 'bg-[#f5a623]/20' : 'bg-[#242624]'}`}>
                                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[#f5a623]' : 'text-[#747673]'}`} translate="no">{sub.icon}</span>
                                  </div>
                                  <span className={`text-sm font-bold uppercase tracking-wide ${isActive ? 'text-[#faf9f5]' : 'text-[#747673]'}`}>{sub.label}</span>
                                </div>
                                <div className={`w-10 h-6 rounded-full flex items-center transition-all ${isActive ? 'bg-[#f5a623] justify-end' : 'bg-[#474846]/40 justify-start'}`}>
                                  <div className={`w-4 h-4 rounded-full mx-1 transition-all ${isActive ? 'bg-[#000]' : 'bg-[#747673]'}`} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Windows Config button (only if windows is active) */}
                      {job.services.some((s: any) => s.service_type?.name?.toLowerCase() === "windows") && (
                        <button
                          type="button"
                          onClick={() => setWindowsStep("edit_windows")}
                          className="flex items-center gap-4 w-full p-4 rounded-xl border border-[#f5a623]/30 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#f5a623]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#f5a623]" translate="no">window</span>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-[#faf9f5]">Windows Config</p>
                            <p className="text-[10px] text-[#ababa8]">Change window count and trim settings</p>
                          </div>
                          <span className="material-symbols-outlined text-[#f5a623] ml-auto" translate="no">chevron_right</span>
                        </button>
                      )}

                      {/* Deck Scope button (only if decks is active) */}
                      {job.services.some((s: any) => s.service_type?.name?.toLowerCase() === "decks") && (
                        <button
                          type="button"
                          onClick={() => setWindowsStep("edit_deckscope")}
                          className="flex items-center gap-4 w-full p-4 rounded-xl border border-[#f5a623]/30 bg-[#f5a623]/10 hover:bg-[#f5a623]/20 transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#f5a623]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#f5a623]" translate="no">deck</span>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-[#faf9f5]">Deck Scope</p>
                            <p className="text-[10px] text-[#ababa8]">Change deck scope and duration</p>
                          </div>
                          <span className="material-symbols-outlined text-[#f5a623] ml-auto" translate="no">chevron_right</span>
                        </button>
                      )}

                      {/* Change Partner button */}
                      <button
                        type="button"
                        onClick={() => setWindowsStep("partner")}
                        className="flex items-center gap-4 w-full p-4 rounded-xl border border-[#474846]/40 bg-[#181a18] hover:bg-[#242624] transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#242624] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#ababa8]" translate="no">group</span>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-[#faf9f5]">Change Partner / Services</p>
                          <p className="text-[10px] text-[#ababa8]">Reassign partner or change sub-services</p>
                        </div>
                        <span className="material-symbols-outlined text-[#ababa8] ml-auto" translate="no">chevron_right</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOpenPartnerModal(null)}
                        className="w-full py-2.5 rounded-xl border border-[#474846] text-[#ababa8] text-xs font-bold hover:bg-[#242624] transition-all"
                      >
                        Close
                      </button>
                    </div>
                  )}

                  {/* ── EDIT WINDOWS: Reconfigure windows ── */}
                  {windowsStep === "edit_windows" && openPartnerModal && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">edit</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">Edit Windows Config</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#ababa8]">
                        Update the windows configuration. Changes will be reflected in the calendar.
                      </p>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#ababa8]">How many windows?</label>
                        <input type="number" min="1" value={windowCount} onChange={(e) => setWindowCount(e.target.value)} placeholder="e.g. 42"
                          className="w-full bg-[#242624] border border-transparent rounded-lg py-3 px-4 text-[#faf9f5] placeholder:text-[#747673] focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#ababa8]">Trim?</label>
                        <CustomDropdown value={windowTrim} onChange={(val) => setWindowTrim(val as "yes" | "no")}
                          options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} placeholder="Select..."
                          className="w-full bg-[#242624] border border-[#474846] rounded-lg px-4 py-3 text-[15px] text-[#faf9f5] hover:border-[#f5a623]/50 transition-colors flex justify-between items-center" />
                      </div>
                      {windowCount && windowTrim && (
                        <div className="p-4 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#f5a623] text-lg" translate="no">calendar_month</span>
                            <div>
                              <p className="text-sm font-bold text-[#faf9f5]">New Duration: <span className="text-[#f5a623]">{Math.max(1, Math.round(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20)))} day{Math.max(1, Math.round(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20))) !== 1 ? "s" : ""}</span></p>
                              <p className="text-[10px] text-[#ababa8] mt-0.5">{parseInt(windowCount)} windows ÷ {windowTrim === "yes" ? "12" : "20"}/day</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setWindowsStep("edit_menu")} className="flex-1 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] text-xs font-bold hover:bg-[#242624] transition-all">Back</button>
                        <button type="button" disabled={!windowCount || !windowTrim}
                          onClick={async () => {
                            // Recalculate and update windows assignment in DB
                            const newDays = Math.max(1, Math.round(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20)));
                            const windowsSvc = job?.services?.find((s: any) => s.service_type?.name?.toLowerCase() === "windows");
                            if (windowsSvc?.assignments?.[0]) {
                              const assignment = windowsSvc.assignments[0];
                              const startDate = assignment.scheduled_start_at ? new Date(assignment.scheduled_start_at) : new Date();
                              const startIso = startDate.toISOString().split("T")[0];
                              // Add working days
                              const d = new Date(startIso + "T12:00:00");
                              let remaining = newDays - 1;
                              while (remaining > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) remaining--; }
                              const endIso = d.toISOString().split("T")[0];
                              const endAt = new Date(endIso + "T12:00:00");
                              endAt.setDate(endAt.getDate() + 1);

                              const { error } = await supabase.from("service_assignments")
                                .update({ scheduled_end_at: endAt.toISOString() })
                                .eq("id", assignment.id);
                              if (error) console.error("[EditWindows] update error:", error);
                              else console.log("[EditWindows] Updated windows:", startIso, "->", endIso, `(${newDays} days)`);
                            }
                            // Re-fetch job data using the full mapping
                            await fetchJob();
                            setWindowsStep("edit_menu");
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-[#f5a623] text-[#000] text-xs font-black uppercase tracking-wider hover:bg-[#e09015] transition-all disabled:opacity-30 disabled:cursor-not-allowed">Save Changes</button>
                      </div>
                    </div>
                  )}

                  {/* ── EDIT DECK SCOPE: Reconfigure deck scope ── */}
                  {windowsStep === "edit_deckscope" && openPartnerModal && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">edit</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">Edit Deck Scope</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#ababa8]">
                        Update the deck scope. Changes will be reflected in the calendar.
                      </p>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-[#ababa8]">Scope</label>
                        <CustomDropdown
                          value={deckScope}
                          onChange={(val) => setDeckScope(val)}
                          options={DECK_SCOPE_OPTIONS.map(o => ({
                            value: o.value,
                            label: `${o.label} — ${o.days >= 7 ? `${Math.round(o.days / 5)} weeks` : `${o.days} day${o.days !== 1 ? "s" : ""}`}`,
                          }))}
                          placeholder="Select scope..."
                          className="w-full bg-[#242624] border border-[#474846] rounded-lg px-4 py-3 text-[15px] text-[#faf9f5] hover:border-[#f5a623]/50 transition-colors flex justify-between items-center"
                        />
                      </div>

                      {deckScope && (() => {
                        const opt = DECK_SCOPE_OPTIONS.find(o => o.value === deckScope);
                        if (!opt) return null;
                        const durationLabel = opt.days >= 7
                          ? `${Math.round(opt.days / 5)} weeks (${opt.days} working days)`
                          : `${opt.days} day${opt.days !== 1 ? "s" : ""}`;
                        return (
                          <div className="p-4 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-[#f5a623] text-lg" translate="no">calendar_month</span>
                              <div>
                                <p className="text-sm font-bold text-[#faf9f5]">
                                  New Duration: <span className="text-[#f5a623]">{durationLabel}</span>
                                </p>
                                <p className="text-[10px] text-[#ababa8] mt-0.5">{opt.label} scope selected</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setWindowsStep("edit_menu")} className="flex-1 py-2.5 rounded-xl border border-[#474846] text-[#ababa8] text-xs font-bold hover:bg-[#242624] transition-all">Back</button>
                        <button type="button" disabled={!deckScope}
                          onClick={async () => {
                            // Recalculate and update decks assignment in DB
                            const opt = DECK_SCOPE_OPTIONS.find(o => o.value === deckScope);
                            if (!opt) return;
                            const newDays = opt.days;
                            const decksSvc = job?.services?.find((s: any) => s.service_type?.name?.toLowerCase() === "decks");
                            if (decksSvc?.assignments?.[0]) {
                              const assignment = decksSvc.assignments[0];
                              const startDate = assignment.scheduled_start_at ? new Date(assignment.scheduled_start_at) : new Date();
                              const startIso = startDate.toISOString().split("T")[0];
                              // Add working days
                              const d = new Date(startIso + "T12:00:00");
                              let remaining = newDays - 1;
                              while (remaining > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) remaining--; }
                              const endIso = d.toISOString().split("T")[0];
                              const endAt = new Date(endIso + "T12:00:00");
                              endAt.setDate(endAt.getDate() + 1);

                              const { error } = await supabase.from("service_assignments")
                                .update({ scheduled_end_at: endAt.toISOString() })
                                .eq("id", assignment.id);
                              if (error) console.error("[EditDeckScope] update error:", error);
                              else console.log("[EditDeckScope] Updated decks:", startIso, "->", endIso, `(${newDays} days)`);
                            }
                            // Re-fetch job data using the full mapping
                            await fetchJob();
                            setWindowsStep("edit_menu");
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-[#f5a623] text-[#000] text-xs font-black uppercase tracking-wider hover:bg-[#e09015] transition-all disabled:opacity-30 disabled:cursor-not-allowed">Save Changes</button>
                      </div>
                    </div>
                  )}

                </div>
            </div>
         </div>
      )}


      {/* ── Dumpster Photo Lightbox ── */}
      {dumpsterPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setDumpsterPreview(null)}
        >
          <button
            onClick={() => setDumpsterPreview(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-[#1e201e]/80 flex items-center justify-center text-white hover:bg-[#ff7351] transition-colors cursor-pointer z-10"
          >
            <span className="material-symbols-outlined" translate="no">close</span>
          </button>
          <img
            src={dumpsterPreview}
            alt="Dumpster preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </>
  );
}
