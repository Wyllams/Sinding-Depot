"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "../../../components/TopBar";
import { CustomDropdown } from "../../../components/CustomDropdown";
import { supabase } from "../../../lib/supabase";
import { calculateServiceDuration } from "../../../lib/duration-calculator";
import { SCHEDULING_PAUSED } from "../../../lib/scheduling-flag";
import { shiftDate, fromIso, toIso } from "../../../lib/cascade-scheduler";
import CustomDatePicker from "../../../components/CustomDatePicker";

// =============================================
// Create New Job | Iron & Lime
// Rota: /new-project (dentro do grupo (shell) → tem Sidebar)
// =============================================

const GATE_CONFIG: Record<string, { color: string, icon: string, title: string, desc: string }> = {
  NOT_CONTACTED: { color: "#ba1212", icon: "phone_disabled", title: "Action Required", desc: "Nick hasn't called the customer yet to schedule this project." },
  READY: { color: "#1f8742", icon: "check_circle", title: "Cleared for Dispatch", desc: "Project has been contacted and is fully ready to start." },
  WINDOWS: { color: "#165eb3", icon: "window", title: "Waiting on Windows", desc: "Production is blocked pending window delivery." },
  DOORS: { color: "#f09a1a", icon: "door_front", title: "Waiting on Doors", desc: "Production is blocked pending door delivery." },
  FINANCING: { color: "#ebd27a", icon: "account_balance", title: "Pending Financing", desc: "Waiting for funding approval before starting." },
  MATERIALS: { color: "#306870", icon: "inventory_2", title: "Material Shortage", desc: "Awaiting critical material delivery to site." },
  HOA: { color: "#9acbf0", icon: "gavel", title: "HOA Approval", desc: "Pending authorization from neighborhood committee." },
  OTHER_REPAIRS: { color: "#d1a3f0", icon: "carpenter", title: "Other Repairs First", desc: "Blocked by preliminary structural repairs needed." },
  NO_ANSWER: { color: "#f2a074", icon: "voicemail", title: "Customer Unreachable", desc: "Attempted contact but customer hasn't replied yet." },
  PERMIT: { color: "#747673", icon: "contract", title: "Pending Permit", desc: "Waiting on city or county permit clearance." }
};
type GateConfigKey = keyof typeof GATE_CONFIG;

const SELLER_CONFIG = {
  MATHEUS: { label: "Matheus", color: "#22c55e", initial: "M", dbName: "Matheus" },
  ARMANDO: { label: "Armando", color: "#ef4444", initial: "A", dbName: "Armando" },
  RUBY: { label: "Ruby", color: "#a855f7", initial: "R", dbName: "Ruby" },
};
type SellerConfigKey = keyof typeof SELLER_CONFIG;

const services = [
  { id: "siding",   icon: "view_day",       label: "Siding",   color: "#aeee2a", partners: ["SIDING DEPOT", "XICARA", "XICARA 02", "WILMAR", "WILMAR 02", "SULA", "LUIS"] },
  { id: "doors",    icon: "door_front",     label: "Doors",    color: "#f5a623", partners: ["SIDING DEPOT", "SERGIO"] },
  { id: "windows",  icon: "window",         label: "Windows",  color: "#f5a623", partners: ["SIDING DEPOT", "SERGIO"] },
  { id: "decks",    icon: "deck",           label: "Decks",    color: "#f5a623", partners: ["SIDING DEPOT", "SERGIO"] },
  { id: "painting", icon: "format_paint",   label: "Painting", color: "#60b8f5", partners: ["SIDING DEPOT", "OSVIN", "OSVIN 02", "VICTOR", "JUAN"] },
  { id: "roofing",  icon: "roofing",        label: "Roofing",  color: "#ef4444", partners: ["SIDING DEPOT", "JOSUE"] },
  { id: "gutters",  icon: "horizontal_rule", label: "Gutters",  color: "#c084fc", partners: ["SIDING DEPOT", "LEANDRO"] },
  { id: "dumpster", icon: "delete",         label: "Dumpster", color: "#64748b", partners: ["SIDING DEPOT"] },
];

const inputCls =
  "w-full bg-surface-container-highest border border-transparent rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer h-[48px] text-[15px]";

const labelCls = "text-xs uppercase tracking-wider text-on-surface-variant font-bold";

// ---- Carrossel de Serviços ----
type Service = { id: string; icon: string; label: string; color: string; partners?: string[] };

function ServicesCarousel({
  services,
  selected,
  toggle,
  assignedPartners,
  onAssignClick,
  serviceExtras
}: {
  services: Service[];
  selected: string[];
  toggle: (id: string) => void;
  assignedPartners: Record<string, string>;
  onAssignClick: (svc: Service) => void;
  serviceExtras?: Record<string, string>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    // Calcula a largura de um card (min-w-[calc(25%-12px)] ≈ 25% do container)
    const cardWidth = el.clientWidth / 4;
    el.scrollBy({ left: dir === "right" ? cardWidth : -cardWidth, behavior: "smooth" });
  };

  return (
    <div className="relative group/carousel">
      {/* Seta Esquerda */}
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full bg-surface-container-highest border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-lg transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[20px]" translate="no">chevron_left</span>
      </button>

      {/* Faixa de cards — scroll horizontal suave, sem scrollbar visível */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-1 pt-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {services.map((svc) => {
          const on = selected.includes(svc.id);
          const partner = assignedPartners[svc.id];
          const hasPartnersList = svc.partners && svc.partners.length > 0;
          return (
            <div
              key={svc.id}
              onClick={() => {
                if (!on) toggle(svc.id); // Liga a aba
                if (hasPartnersList) {
                  onAssignClick(svc);    // Mostra o pop-up
                } else if (on) {
                  toggle(svc.id);        // Desliga se tiver logado mas n tem pop-up
                }
              }}
              className={`relative flex-shrink-0 w-[calc(25%-12px)] min-w-[140px] px-2 py-5 rounded-xl cursor-pointer transition-[color,background-color,border-color,box-shadow] duration-200 group border-2 ${
                on
                  ? "bg-surface-container-highest"
                  : "bg-surface-container-highest border-transparent hover:bg-primary/10 hover:border-primary/30"
              }`}
              style={on ? { borderColor: svc.color, boxShadow: `0 0 15px ${svc.color}1A` } : {}}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <span
                  className={`material-symbols-outlined text-3xl transition-colors ${
                    !on ? "text-on-surface-variant" : ""
                  }`}
                  style={on ? { color: svc.color } : {}}
                  translate="no"
                >
                  {svc.icon}
                </span>
                <span className="font-bold tracking-tight text-sm text-on-surface">{svc.label}</span>
              </div>
              
              {/* Box de atribuição visual (assign) se o item for selecionado e tiver parceiros */}
              {on && hasPartnersList && (
                <div className="mt-3 flex flex-col items-center w-full gap-1.5">
                   {partner ? (
                       <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider px-2.5 py-1 rounded-md border" style={{ backgroundColor: `${svc.color}33`, borderColor: svc.color }}>{partner}</span>
                   ) : (
                       <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider border px-2.5 py-1 rounded-full transition-colors" style={{ backgroundColor: `${svc.color}1A`, borderColor: `${svc.color}80` }}>Assign Partner</span>
                   )}
                   {serviceExtras?.[svc.id] && (
                     <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-md">{serviceExtras[svc.id]}</span>
                   )}
                </div>
              )}
              
              {/* X para desmarcar o serviço quando ele já está selecionado */}
              {on && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(svc.id);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-surface-container-high border border-error/50 text-error hover:bg-error hover:text-surface-container-low transition-colors shadow-md z-10 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]" translate="no">close</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Seta Direita */}
      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full bg-surface-container-highest border border-outline-variant/40 text-on-surface-variant hover:text-primary hover:border-primary/40 flex items-center justify-center shadow-lg transition-all opacity-0 group-hover/carousel:opacity-100 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[20px]" translate="no">chevron_right</span>
      </button>
    </div>
  );
}

// CustomDatePicker is now imported from @/components/CustomDatePicker


function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="material-symbols-outlined text-primary" translate="no">
        {icon}
      </span>
      <h2 className="text-xl font-bold" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
        {title}
      </h2>
    </div>
  );
}


export default function NewProjectPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [gateStatus, setGateStatus] = useState<GateConfigKey>("NOT_CONTACTED");
  const [spStatus, setSpStatus] = useState<SellerConfigKey>("MATHEUS");
  
  const [openPartnerModal, setOpenPartnerModal] = useState<Service | null>(null);
  const [assignedPartners, setAssignedPartners] = useState<Record<string, string>>({});

  // ── Windows service config ──
  const [windowCount, setWindowCount] = useState("");
  const [windowTrim, setWindowTrim] = useState<"yes" | "no" | "">("");
  const [windowPrice, setWindowPrice] = useState("");
  const [windowsStep, setWindowsStep] = useState<"partner" | "config">("partner");

  // ── Doors service config ──
  const [doorsPrice, setDoorsPrice] = useState("");
  const [doorsStep, setDoorsStep] = useState<"partner" | "config">("partner");

  // ── Decks service config ──
  const DECK_SCOPE_OPTIONS = [
    { value: "rebuild_demo", label: "Deck Rebuild (Demo)", days: 5 },
    { value: "rebuild_porch", label: "Deck Rebuild (W/ Porch)", days: 10 },
    { value: "new_deck_build", label: "New Deck Build", days: 4 },
    { value: "floor_replacement", label: "Floor Replacement", days: 4 },
    { value: "railing", label: "Railing", days: 1 },
  ];
  const [deckScope, setDeckScope] = useState("");
  const [decksPrice, setDecksPrice] = useState("");
  const [decksStep, setDecksStep] = useState<"partner" | "config">("partner");

  // ── Roofing service config ──
  const [roofingSq, setRoofingSq] = useState("");
  const [roofingStep, setRoofingStep] = useState<"partner" | "config">("partner");

  // ── Gutters service config ──
  const [guttersSq, setGuttersSq] = useState("");
  const [guttersStep, setGuttersStep] = useState<"partner" | "config">("partner");

  const handleServiceToggle = (id: string) => {
    setSelected(prev => {
       let next = [...prev];
       if (next.includes(id)) {
          next = next.filter(x => x !== id);
       } else {
          next.push(id);
          if (id === "siding" && !next.includes("painting")) next.push("painting");
          if (id === "gutters" && !next.includes("roofing")) next.push("roofing");
       }
       return next;
    });
  };
  
  // Form States
  const [clientName, setClientName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  
  const [jobTitle, setJobTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  // End Date removed — auto-calculated from cascade
  const [sq, setSq] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [soldDate, setSoldDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !streetAddress || !city || !state || !zipCode || !jobTitle) {
      setErrorObj("Please fill in all required fields (Client Name, Job Title, and Address).");
      return;
    }
    setErrorObj(null);
    setIsSubmitting(true);

    try {
      let customerId = "";
      const { data: extCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email || "unknown@sidingdepot.com")
        .maybeSingle();

      if (extCustomer) {
        customerId = extCustomer.id;
      } else {
        const { data: newCustomer, error: custErr } = await supabase.from("customers").insert({
          full_name: clientName,
          company_name: companyName || null,
          email: email || "unknown@sidingdepot.com",
          phone: phone || "No Phone",
          address_line_1: streetAddress,
          city: city,
          state: state,
          postal_code: zipCode
        }).select("id").single();
        if (custErr) throw custErr;
        customerId = newCustomer.id;
      }

      // ── Auto-create Customer Portal access (auth user + profile + email) ──
      try {
        const portalRes = await fetch("/api/customers/create-portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            fullName: clientName,
            email: email || null,
            phone: phone || null,
          }),
        });
        const portalData = await portalRes.json();
        if (portalData.success) {
          console.log(`🔑 Customer portal: ${portalData.username} (${portalData.alreadyExists ? "existing" : "new"})`);
        } else {
          console.warn("⚠️ Portal creation failed:", portalData.error);
        }
      } catch (portalErr) {
        // Portal failure should NOT block project creation
        console.error("⚠️ Portal creation error (non-blocking):", portalErr);
      }

      // Try fuzzy matching salesperson by first name
      const { data: spMatch } = await supabase
         .from("salespersons")
         .select("id")
         .ilike("full_name", `%${SELLER_CONFIG[spStatus].dbName}%`)
         .maybeSingle();
      const spId = spMatch?.id || null;

      const jobNumber = `JOB-${Math.floor(Math.random() * 900000) + 100000}`;
      const jobStatus = "pending";

      const { data: newJob, error: jobErr } = await supabase.from("jobs").insert({
        customer_id: customerId,
        salesperson_id: spId,
        job_number: jobNumber,
        title: jobTitle,
        status: jobStatus,
        service_address_line_1: streetAddress,
        city: city,
        state: state,
        postal_code: zipCode,
        requested_start_date: startDate || null,
        target_completion_date: null,
        contract_amount: contractAmount ? parseFloat(contractAmount) : null,
        contract_signed_at: soldDate || new Date().toISOString().split("T")[0],
        sq: sq ? parseFloat(sq) : null,
        gate_status: gateStatus,
        description: notes
      }).select("id").single();
      
      if (jobErr) throw jobErr;

      // Ensure painting is selected if siding is selected
      let finalSelected = [...selected];
      
      if (finalSelected.includes("siding") && !finalSelected.includes("painting")) {
         finalSelected.push("painting");
      }
      if (finalSelected.includes("gutters") && !finalSelected.includes("roofing")) {
         finalSelected.push("roofing");
      }

      // Order services sequentially to calculate dates correctly
      const order = ["siding", "windows", "decks", "dumpster", "painting", "gutters", "roofing"];
      finalSelected.sort((a, b) => {
         const idxA = order.indexOf(a);
         const idxB = order.indexOf(b);
         if (idxA === -1) return 1;
         if (idxB === -1) return -1;
         return idxA - idxB;
      });

      // Duration calculator — uses partner-specific SQ tables
      const parsedSq = sq ? parseFloat(sq) : 0;
      const calcDuration = (serviceId: string) => {
         // Get the assigned partner for this service (or fallback to SIDING DEPOT)
         const partnerName = assignedPartners[serviceId] || (serviceId === "painting" ? assignedPartners["siding"] : null) || "SIDING DEPOT";

          // Special case: windows duration by count (kept for backwards compat)
         if (serviceId === "windows") {
           const wCount = parseInt(windowCount) || 0;
           if (wCount > 0) {
             const rate = windowTrim === "yes" ? 12 : 20;
             return Math.max(1, Math.round(wCount / rate));
           }
         }

         // Special case: decks duration by scope selection
         if (serviceId === "decks" && deckScope) {
           const scopeOption = DECK_SCOPE_OPTIONS.find(o => o.value === deckScope);
           if (scopeOption) return scopeOption.days;
         }

         return calculateServiceDuration(partnerName, serviceId, parsedSq);
      };

      // ── Date helpers using centralized shiftDate (timezone-safe, string-only) ──
      // shiftDate(iso, N) advances N working days (skipping Sundays).
      // A service of duration D starting on startIso occupies startIso + (D-1) working days.
      // The last working day (inclusive) = shiftDate(startIso, D - 1)
      // The next available day for successor = shiftDate(startIso, D)
      const getLastDayInclusive = (startIso: string, duration: number): string =>
        shiftDate(startIso, duration - 1);
      const getNextAvailableDay = (startIso: string, duration: number): string =>
        shiftDate(startIso, duration);

      const prevEndpoints: Record<string, string> = {}; 
      const { data: allCrews } = await supabase.from("crews").select("id, name, code");

      const cascadeOrder = ["siding", "windows", "doors", "decks", "dumpster", "painting", "gutters", "roofing"];
      const sortedFinalSelected = [...finalSelected].sort((a, b) => {
         const idxA = cascadeOrder.indexOf(a);
         const idxB = cascadeOrder.indexOf(b);
         if (idxA === -1) return 1;
         if (idxB === -1) return -1;
         return idxA - idxB;
      });

      // Seed Job Services & Assignments
      for (const svcId of sortedFinalSelected) {
        const { data: stData } = await supabase.from("service_types").select("id").ilike("code", svcId).maybeSingle();
        let serviceTypeId = stData?.id;
        
        if (!serviceTypeId) {
           const { data: newSt } = await supabase.from("service_types").insert({
             code: svcId,
             name: services.find((s) => s.id === svcId)?.label || svcId,
             allows_dependencies: false
           }).select("id").single();
           if (newSt) serviceTypeId = newSt.id;
        }

        if (serviceTypeId) {
            let contractedAmount: number | null = null;
            if (svcId === "windows" && windowPrice) contractedAmount = parseFloat(windowPrice);
            if (svcId === "doors" && doorsPrice) contractedAmount = parseFloat(doorsPrice);
            if (svcId === "decks" && decksPrice) contractedAmount = parseFloat(decksPrice);

            const { data: newJs } = await supabase.from("job_services").insert({
              job_id: newJob.id,
              service_type_id: serviceTypeId,
              scope_of_work: "Standard exterior work",
              quantity: svcId === "roofing" && roofingSq && !isNaN(parseFloat(roofingSq)) ? parseFloat(roofingSq) : (svcId === "gutters" && guttersSq && !isNaN(parseFloat(guttersSq)) ? parseFloat(guttersSq) : ((svcId === "siding" || svcId === "painting") && sq && !isNaN(parseFloat(sq)) ? parseFloat(sq) : null)),
              unit_of_measure: (svcId === "siding" || svcId === "painting" || svcId === "roofing" || svcId === "gutters") ? "SQ" : null,
              contracted_amount: contractedAmount
            }).select("id").single();

            if (newJs) {
               let startAt: Date | null = null;
               let endAt: Date | null = null;

               // ALWAYS compute dates — if user didn't pick a start date,
               // default to the next working day from today
               const effectiveStartDate = startDate || (() => {
                  const todayStr = toIso(new Date());
                  // If today is Sunday, skip to Monday
                  return fromIso(todayStr).getDay() === 0
                    ? shiftDate(todayStr, 1)
                    : todayStr;
               })();
               {
                  const duration = calcDuration(svcId);
                  let startIso = effectiveStartDate; // Default: same as job start

                  // ── Cascade Chain ──────────────────────────────────────
                  // Each service starts the NEXT WORKING DAY after its
                  // predecessor ends. Falls back to earlier predecessors
                  // if the immediate one wasn't selected.
                  // Windows/Doors/Decks run in parallel with Siding (no cascade).
                  // Painting waits for the LATEST of Siding AND Decks.
                  const CASCADE_PREDECESSORS: Record<string, string[]> = {
                     painting: ["siding", "decks"],
                     gutters:  ["painting", "siding"],
                     roofing:  ["gutters", "painting", "siding"],
                  };

                   if (svcId === "windows" || svcId === "doors" || svcId === "decks") {
                      // DWD runs in parallel with Siding — no cascade dependency
                      const todayIso = toIso(new Date());
                      if (todayIso > effectiveStartDate) {
                         startIso = todayIso;
                         if (fromIso(startIso).getDay() === 0) {
                            startIso = shiftDate(startIso, 1);
                         }
                         console.log("[Cascade] " + svcId + ": late addition, start=" + startIso);
                      }
                   } else {
                      // ── Find LATEST predecessor end date (MAX across ALL) ──
                      const predecessors = CASCADE_PREDECESSORS[svcId] || [];
                      let latestNextDay = "";
                      for (const pred of predecessors) {
                         if (prevEndpoints[pred]) {
                            const nextDay = shiftDate(prevEndpoints[pred], 1);
                            if (nextDay > latestNextDay) {
                               latestNextDay = nextDay;
                            }
                            console.log("[Cascade] " + svcId + ": pred " + pred + " ends " + prevEndpoints[pred] + " → next=" + nextDay);
                         }
                      }
                      if (latestNextDay) {
                         startIso = latestNextDay;
                         console.log("[Cascade] " + svcId + ": final start=" + startIso);
                      }
                   }

                  // Start at 08:00 (matches schedule page format)
                  startAt = new Date(startIso + "T08:00:00");

                  // Last working day (inclusive) — string-based, timezone-safe
                  const lastDayIso = shiftDate(startIso, duration - 1);
                  prevEndpoints[svcId] = lastDayIso;

                  console.log(
                    `[Cascade] ${svcId}: dur=${duration} start=${startIso} end=${lastDayIso}`
                  );

                  // endAt = inclusive last working day at end of business
                  endAt = new Date(lastDayIso + "T17:00:00");
               }

               const partnerName = assignedPartners[svcId] || (svcId === "painting" ? assignedPartners["siding"] : null) || "Siding Depot";
               const searchCode = partnerName.replace(/ /g, "_").toLowerCase();
               const crew = (allCrews || []).find(c => 
                   c.name?.toLowerCase() === partnerName.toLowerCase() || 
                   c.code?.toLowerCase() === searchCode
               );
               
               let specCode = "siding_installation";
               if (svcId === "painting") specCode = "painting";
               else if (svcId === "decks") specCode = "deck_building";
               else if (svcId === "gutters") specCode = "gutters";
               else if (svcId === "roofing") specCode = "roofing";
               else if (svcId === "windows") specCode = "windows";
               else if (svcId === "doors") specCode = "doors";
               
               const { data: spec } = await supabase.from("specialties").select("id").eq("code", specCode).maybeSingle();

               if (!SCHEDULING_PAUSED) {
                 await supabase.from("service_assignments").insert({
                   job_service_id: newJs.id,
                   crew_id: crew?.id || null,
                   specialty_id: spec?.id || "26652a43-728d-43c1-935a-c39f1dea4d7d",
                   status: startAt ? "scheduled" : "planned",
                   scheduled_start_at: startAt ? startAt.toISOString() : null,
                   scheduled_end_at: endAt ? endAt.toISOString() : null
                 });
               }
            }
        }
      }
      
      // Update Job target completion date from cascade endpoints
      if (Object.values(prevEndpoints).length > 0) {
        // All values are ISO date strings, so we can just sort
        const latestEnd = Object.values(prevEndpoints).sort().pop() || null;
        if (latestEnd) {
          await supabase.from("jobs").update({ target_completion_date: latestEnd }).eq("id", newJob.id);
        }
      }

      // ── Automação 3.5: Criar window_order ao selecionar serviço de Windows ──
      if (selected.includes("windows")) {
        const wQty = parseInt(windowCount) || null;
        await supabase.from("window_orders").insert({
          job_id: newJob.id,
          customer_name: clientName,
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
      }

      // If gateStatus specifies a blocker, insert blocker.
      if (gateStatus && gateStatus !== "READY" && gateStatus !== "NOT_CONTACTED") {
         let blocker_type = "other";
         if (gateStatus === "PERMIT") blocker_type = "permit";
         if (gateStatus === "WINDOWS" || gateStatus === "DOORS" || gateStatus === "MATERIALS") blocker_type = "material";
         if (gateStatus === "FINANCING" || gateStatus === "HOA") blocker_type = "customer";
         
         await supabase.from("blockers").insert({
            job_id: newJob.id,
            type: blocker_type,
            title: `Autogenerated Blocker: ${GATE_CONFIG[gateStatus].title}`,
            description: GATE_CONFIG[gateStatus].desc,
            status: "open"
         });
      }

      // ── Automação: Gerar Payment Milestones (Job Start + COC por serviço) ──
      const contractVal = contractAmount ? parseFloat(contractAmount) : 0;

      // 1) Job Start Certificate — valor total do contrato
      await supabase.from("project_payment_milestones").insert({
        job_id: newJob.id,
        job_service_id: null,
        sort_order: 1,
        document_type: "job_start" as const,
        title: "Job Start Certificate",
        description: "Payment due at job start. Covers initial project mobilization.",
        amount: contractVal,
        status: "draft" as const,
      });

      // 2) Buscar job_services recém-criados para gerar COC individual por serviço
      const { data: createdServices } = await supabase
        .from("job_services")
        .select("id, service_type_id, contracted_amount, service_types (name)")
        .eq("job_id", newJob.id)
        .order("sort_order", { ascending: true });

      if (createdServices && createdServices.length > 0) {
        const cocMilestones = createdServices.map((js: any, idx: number) => ({
          job_id: newJob.id,
          job_service_id: js.id,
          sort_order: idx + 2,
          document_type: "completion_certificate" as const,
          title: `Certificate of Completion — ${js.service_types?.name || "Service"}`,
          description: `Final payment upon completion of ${js.service_types?.name || "service"}.`,
          amount: js.contracted_amount || 0,
          status: "draft" as const,
        }));

        await supabase.from("project_payment_milestones").insert(cocMilestones);
      }

      router.push("/projects");
    } catch (err: any) {
      console.error(err);
      setErrorObj(err.message || "Failed to create project");
      setIsSubmitting(false);
    }
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      let next = [...prev];
      if (next.includes(id)) {
        next = next.filter((s) => s !== id);
      } else {
        next.push(id);
        if (id === "siding" && !next.includes("painting")) next.push("painting");
        if (id === "gutters" && !next.includes("roofing")) next.push("roofing");
      }
      return next;
    });

  return (
    <>
      <TopBar leftSlot={
        <Link href="/projects">
          <div className="flex items-center gap-2 text-primary cursor-pointer">
            <span className="material-symbols-outlined text-sm" translate="no">arrow_back</span>
            <span className="text-sm uppercase tracking-widest font-bold">Back to Jobs</span>
          </div>
        </Link>
      } />

      {/* Content area — pr-[420px] leaves space for the fixed map panel */}
      <main className="pb-24 px-8 pt-8 xl:pr-[440px] overflow-x-hidden">
        <div className="max-w-3xl">

          {/* Page Title */}
          <div className="mb-12">
            <h1
              className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Create New Job
            </h1>
            <p className="text-on-surface-variant text-lg">Define details for a new project</p>
          </div>

          {errorObj && (
            <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/30 text-error font-bold text-sm flex items-center gap-3">
              <span className="material-symbols-outlined" translate="no">error</span>
              {errorObj}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-12">

            {/* Client Information */}
            <section>
              <SectionHeader icon="person_add" title="Client Information" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 rounded-xl bg-surface-container-low border border-outline-variant/15">
                <div className="space-y-2">
                  <label className={labelCls}>Client Name *</label>
                  <input required value={clientName} onChange={(e)=>setClientName(e.target.value)} className={inputCls} placeholder="John Doe" type="text" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Company Name</label>
                  <input value={companyName} onChange={(e)=>setCompanyName(e.target.value)} className={inputCls} placeholder="Acme Construction Co." type="text" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Phone Number</label>
                  <input 
                    value={phone} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d]/g, "");
                      if (val.length < 4) setPhone(val);
                      else if (val.length < 7) setPhone(`(${val.slice(0, 3)}) ${val.slice(3)}`);
                      else setPhone(`(${val.slice(0, 3)}) ${val.slice(3, 6)}-${val.slice(6, 10)}`);
                    }} 
                    className={inputCls} 
                    placeholder="(555) 000-0000" 
                    type="tel" 
                    maxLength={14}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Email</label>
                  <input value={email} onChange={(e)=>setEmail(e.target.value)} className={inputCls} placeholder="john@example.com" type="email" />
                </div>
              </div>
            </section>

            {/* Project Address */}
            <section>
              <SectionHeader icon="location_on" title="Project Address" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-8 rounded-xl bg-surface-container-low border border-outline-variant/15">
                <div className="md:col-span-4 space-y-2">
                  <label className={labelCls}>Street Address *</label>
                  <input required value={streetAddress} onChange={(e)=>setStreetAddress(e.target.value)} className={inputCls} placeholder="123 Industrial Way" type="text" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className={labelCls}>City *</label>
                  <input required value={city} onChange={(e)=>setCity(e.target.value)} className={inputCls} placeholder="New York" type="text" />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>State *</label>
                  <input required value={state} onChange={(e)=>setState(e.target.value)} className={inputCls} placeholder="GA" type="text" maxLength={2} />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>ZIP Code *</label>
                  <input required value={zipCode} onChange={(e)=>setZipCode(e.target.value)} className={inputCls} placeholder="10001" type="text" />
                </div>
              </div>
            </section>

            {/* Job Details */}
            <section>
              <SectionHeader icon="architecture" title="Job Details" />
              <div className="flex flex-col gap-6 p-8 rounded-xl bg-surface-container-low border border-outline-variant/15">
                {/* Row 1: Job Title + Sold Date — 50/50 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={labelCls}>Job Title *</label>
                    <input required value={jobTitle} onChange={(e)=>setJobTitle(e.target.value)} className={inputCls} placeholder="Exterior Renovation" type="text" />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Sold Date</label>
                    <CustomDatePicker value={soldDate} onChange={(v) => setSoldDate(v || "")} placeholder="Set date" />
                  </div>
                </div>
                {/* Row 2: Contract Value / Start Date / SQ — 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className={labelCls}>Contract Value</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-[15px]">$</span>
                      <input value={contractAmount} onChange={(e)=>setContractAmount(e.target.value)} className={`${inputCls} pl-8`} placeholder="0.00" type="number" step="0.01" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Start Date</label>
                    <CustomDatePicker value={startDate} onChange={setStartDate} placeholder="dd/mm/yyyy" />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Siding SQ</label>
                    <input value={sq} onChange={(e)=>setSq(e.target.value)} className={inputCls} placeholder="e.g. 24.5" type="number" step="0.01" />
                  </div>
                </div>
              </div>
            </section>

            {/* Services Requested — Carousel */}
            <section>
              <SectionHeader icon="handyman" title="Services Requested" />
              <ServicesCarousel 
                services={services} 
                selected={selected} 
                toggle={toggle} 
                assignedPartners={assignedPartners}
                serviceExtras={{
                  ...(roofingSq ? { roofing: `${roofingSq} SQ` } : {}),
                  ...(guttersSq ? { gutters: `${guttersSq} SQ` } : {}),
                  ...(windowCount ? { windows: `${windowCount} win${windowTrim === "yes" ? " + trim" : ""}` } : {}),
                }}
                onAssignClick={(svc) => {
                  if (svc.id === "windows") setWindowsStep("partner");
                  if (svc.id === "decks") setDecksStep("partner");
                  if (svc.id === "roofing") setRoofingStep("partner");
                  if (svc.id === "gutters") setGuttersStep("partner");
                  setOpenPartnerModal(svc);
                }}
              />
            </section>

            {/* Operational Status & Sales Person Wrapper */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 pb-4">
              
              {/* Operational Status / Gating */}
              <div className="flex flex-col">
                <SectionHeader icon="traffic" title="Operational Status" />
                <div className="p-4 sm:p-6 lg:p-8 rounded-xl bg-surface-container-low border border-outline-variant/15 h-full">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Initial Project Gate</label>
                    <div className="relative group w-full">
                      <CustomDropdown 
                        value={gateStatus}
                        onChange={(val) => setGateStatus(val as GateConfigKey)}
                        options={[
                          { value: "NOT_CONTACTED", label: "🔴 NOT YET CONTACTED" },
                          { value: "READY", label: "🟢 READY TO START" },
                          { value: "WINDOWS", label: "🔵 WINDOWS" },
                          { value: "DOORS", label: "🟠 DOORS" },
                          { value: "FINANCING", label: "🟡 FINANCING" },
                          { value: "MATERIALS", label: "🪨 MATERIALS" },
                          { value: "HOA", label: "📄 HOA" },
                          { value: "OTHER_REPAIRS", label: "🛠️ OTHER REPAIRS" },
                          { value: "NO_ANSWER", label: "📴 NO ANSWER" },
                          { value: "PERMIT", label: "📋 PERMIT" }
                        ]}
                        className="w-full bg-surface-container border border-outline-variant rounded-xl pl-12 pr-4 py-3.5 text-xs font-black uppercase tracking-widest text-on-surface shadow-inner transition-colors flex justify-between items-center hover:border-primary/50"
                      />
                      
                      {/* Icone Visual Overlay */}
                      <div 
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 pointer-events-none"
                        style={{ 
                          backgroundColor: `${GATE_CONFIG[gateStatus].color}25`,
                          border: `1px solid ${GATE_CONFIG[gateStatus].color}40`,
                        }}
                      >
                         <span className="material-symbols-outlined text-[15px]" style={{ color: GATE_CONFIG[gateStatus].color }} translate="no">
                           {GATE_CONFIG[gateStatus].icon}
                         </span>
                      </div>
                  </div>
                </div>
              </div>
            </div>

              {/* Sales Person (SP) */}
              <div className="flex flex-col">
                <SectionHeader icon="badge" title="Sales Person" />
                <div className="p-4 sm:p-6 lg:p-8 rounded-xl bg-surface-container-low border border-outline-variant/15 h-full">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Assigned Seller</label>
                     <div className="relative group w-full">
                      <CustomDropdown 
                        value={spStatus}
                        onChange={(val) => setSpStatus(val as SellerConfigKey)}
                        options={Object.entries(SELLER_CONFIG).map(([key, config]) => ({ value: key, label: config.label }))}
                        className="w-full bg-surface-container border border-outline-variant rounded-xl pl-16 pr-4 py-3.5 text-xs font-black uppercase tracking-widest text-on-surface shadow-inner transition-colors flex justify-between items-center hover:border-primary/50"
                      />
                      
                      {/* Avatar / Inicial Overlay */}
                      <div 
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 pointer-events-none bg-surface-container-high border border-outline-variant"
                        style={{ color: SELLER_CONFIG[spStatus]?.color || '#4da8da' }}
                      >
                        <span className="font-black text-sm uppercase">
                          {SELLER_CONFIG[spStatus]?.initial || spStatus}
                        </span>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

            {/* Additional Information */}
            <section>
              <SectionHeader icon="description" title="Additional Information" />
              <div className="p-4 sm:p-6 lg:p-8 rounded-xl bg-surface-container-low border border-outline-variant/15">
                <div className="space-y-2">
                  <label className={labelCls}>Project Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e)=>setNotes(e.target.value)}
                    className={inputCls + " h-auto min-h-[160px] resize-none"}
                    placeholder="Provide any additional context or specific requirements for this job..."
                    rows={6}
                  />
                </div>
              </div>
            </section>

            {/* Footer Buttons */}
            <footer className="flex items-center justify-end gap-6 pt-4 pb-12">
              <Link href="/projects">
                <button
                  className="px-4 sm:px-6 lg:px-8 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-bold hover:bg-surface-container-high transition-all cursor-pointer"
                  type="button"
                >
                  Cancel
                </button>
              </Link>
              <button
                className="px-10 py-3 rounded-xl bg-primary text-[#3a5400] font-bold shadow-[0_0_20px_rgba(174,238,42,0.2)] hover:shadow-[0_0_30px_rgba(174,238,42,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                type="submit"
                disabled={isSubmitting}
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {isSubmitting ? "Creating..." : "Create Job"}
              </button>
            </footer>
          </form>
        </div>
      </main>

      {/* ── Map Preview Panel — fixed to right side of viewport (xl+) ── */}
      {(() => {
        const hasAddress = streetAddress.trim() && city.trim() && state.trim();

        // Build Google Maps embed URL (satellite view — shows the house)
        let mapSrc = "";
        if (hasAddress) {
          const q = encodeURIComponent(`${streetAddress}, ${city}, ${state} ${zipCode}`.trim());
          mapSrc = `https://maps.google.com/maps?q=${q}&t=k&z=19&ie=UTF8&iwloc=&output=embed`;
        }

        // Compute form completeness for progress bar
        const fields = [clientName, streetAddress, city, state, zipCode, jobTitle];
        const filledFields = fields.filter(f => f.trim().length > 0).length;
        const progress = Math.round((filledFields / fields.length) * 100);

        const selectedServices = services.filter(s => selected.includes(s.id));

        return (
          <div className="hidden xl:block fixed right-0 top-0 h-full w-[400px] pt-[72px] pb-6 pr-6 pointer-events-none z-30">
            <div className="h-full w-full rounded-3xl border border-outline-variant/20 overflow-hidden relative pointer-events-auto bg-surface-container">

              {/* Map area */}
              <div className="h-[45%] relative overflow-hidden">
                {hasAddress ? (
                  <>
                    <iframe
                      key={mapSrc}
                      title="Project Location"
                      className="w-full h-full border-0"
                      src={mapSrc}
                      style={{ filter: "brightness(0.85) contrast(1.1)" }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      allowFullScreen
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent pointer-events-none" />
                  </>
                ) : (
                  <>
                    <img
                      className="w-full h-full object-cover opacity-20 mix-blend-luminosity"
                      alt="Map placeholder"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1Hp59mrKmha0ODBeyPk5bl8FoQ_-pCzr3y4R0EOkrPC79zO2WLMO2uq9-zX4uwPDUQMP63wBc6jFub_Oy-oc9rkY0j4qRRM0a0fMGdcXQvjAHU--X04u5Y9OncI5Ioc-QR40P-tVWv3gU6u1bFzVPhy8q_rSp4-NbRGC02sjR30w5HYAN0Hf-iko-nfSiGSQvNqRMDAyag8Xj6nITm1FvZR8zDxwml64Tw8fo2hZWu5ARHsPhtXnEdPXliODUriv2h7xdpG43iKg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent" />
                  </>
                )}
              </div>

              {/* Panel content */}
              <div className="relative z-10 px-7 pb-7 pt-2 flex flex-col" style={{ height: "55%" }}>
                <div className="mb-5">
                  <h3
                    className="text-lg font-bold text-primary mb-1"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    Project Preview
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Live preview based on form data
                  </p>
                </div>

                {/* Client + Address */}
                <div className="space-y-3 mb-5 flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                  {/* Client */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[16px]" translate="no">person</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Client</p>
                      <p className="text-sm font-bold text-on-surface truncate">
                        {clientName || <span className="text-on-surface-variant italic font-normal">Not entered</span>}
                      </p>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[16px]" translate="no">location_on</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Address</p>
                      <p className="text-sm font-bold text-on-surface truncate">
                        {hasAddress
                          ? <>{streetAddress}, {city}</>
                          : <span className="text-on-surface-variant italic font-normal">Pending</span>
                        }
                      </p>
                      {hasAddress && (
                        <p className="text-[11px] text-on-surface-variant">{state} {zipCode}</p>
                      )}
                    </div>
                  </div>

                  {/* SQ & Contract */}
                  {(sq || contractAmount) && (
                    <div className="grid grid-cols-2 gap-2">
                      {sq && (
                        <div className="bg-surface-container-high rounded-xl p-3 border border-outline-variant/15">
                          <p className="text-[9px] uppercase tracking-widest text-outline font-bold">SQ</p>
                          <p className="text-base font-black text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>{sq}</p>
                        </div>
                      )}
                      {contractAmount && (
                        <div className="bg-surface-container-high rounded-xl p-3 border border-outline-variant/15">
                          <p className="text-[9px] uppercase tracking-widest text-outline font-bold">Contract</p>
                          <p className="text-base font-black text-primary" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                            ${Number(contractAmount).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Services */}
                  {selectedServices.length > 0 && (
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-outline font-bold mb-2">Services ({selectedServices.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedServices.map(s => {
                          const partner = assignedPartners[s.id];
                          return (
                            <div
                              key={s.id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold"
                              style={{
                                backgroundColor: `${s.color}12`,
                                borderColor: `${s.color}30`,
                                color: s.color,
                              }}
                            >
                              <span className="material-symbols-outlined text-[12px]" translate="no">{s.icon}</span>
                              {s.label}
                              {s.id === "roofing" && roofingSq && (
                                <span className="text-[8px] opacity-80 uppercase ml-0.5">{roofingSq} SQ</span>
                              )}
                              {s.id === "gutters" && guttersSq && (
                                <span className="text-[8px] opacity-80 uppercase ml-0.5">{guttersSq} SQ</span>
                              )}
                              {partner && (
                                <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded-full ml-0.5 uppercase">
                                  {partner}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="bg-surface-container-high/80 backdrop-blur-md p-4 rounded-2xl border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-primary" translate="no">
                        {progress === 100 ? "check_circle" : "pending"}
                      </span>
                      <p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-widest">
                        {progress === 100 ? "Ready to Submit" : "Form Completion"}
                      </p>
                    </div>
                    <span className="text-xs font-black text-primary">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${progress}%`,
                        background: progress === 100
                          ? "linear-gradient(90deg, #aeee2a, #7bc922)"
                          : "linear-gradient(90deg, #aeee2a, #e3eb5d)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════
          MODAL — ASSIGN PARTNER
      ════════════════════════════════════════════════════ */}
      {openPartnerModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setOpenPartnerModal(null)}>
            <div className="bg-surface-container border border-outline-variant/40 rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center border" style={{ backgroundColor: `${openPartnerModal.color}1A`, borderColor: `${openPartnerModal.color}33` }}>
                      <span className="material-symbols-outlined text-[24px]" style={{ color: openPartnerModal.color }} translate="no">
                        {openPartnerModal.icon}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tight">{openPartnerModal.label}</h2>
                      <p className="text-xs text-on-surface-variant mt-1 font-medium">Select a partner for this duty</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenPartnerModal(null)}
                    type="button"
                    className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-[#3a5400] transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm" translate="no">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2" style={{ scrollbarWidth: "none" }}>

                  {/* ── GUTTERS CONFIG STEP ── */}
                  {openPartnerModal.id === "gutters" && guttersStep === "config" && (
                    <div className="space-y-4 fade-in max-h-[50vh] overflow-y-auto pr-2" style={{ scrollbarWidth: "none" }}>
                      <div>
                        <label className="text-xs font-semibold text-[#8b8d98] uppercase tracking-wider mb-1 block">Gutters SQ</label>
                        <input
                          type="number"
                          placeholder="Ex: 25"
                          value={guttersSq}
                          onChange={(e) => setGuttersSq(e.target.value)}
                          className="w-full h-10 bg-[#16181d] border border-[#2a2d36] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
                        />
                        <p className="text-[11px] text-[#8b8d98] mt-1.5 ml-1">
                          Configurado na se�ao "Main Information" no topo da pagina.
                        </p>
                      </div>
                      
                      <div className="pt-2 flex gap-2">
                        <button
                          onClick={() => setGuttersStep("partner")}
                          className="flex-1 h-10 bg-[#16181d] hover:bg-[#1f2229] border border-[#2a2d36] text-white rounded-xl text-sm font-medium transition-all"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={() => setOpenPartnerModal(null)}
                          className="flex-1 h-10 bg-white text-black hover:bg-white/90 rounded-xl text-sm font-medium transition-all"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 1: Select Partner ── */}
                  {(openPartnerModal.id !== "windows" || windowsStep === "partner") && (openPartnerModal.id !== "doors" || doorsStep === "partner") && (openPartnerModal.id !== "decks" || decksStep === "partner") && (openPartnerModal.id !== "roofing" || roofingStep === "partner") && (openPartnerModal.id !== "gutters" || guttersStep === "partner") && (
                    <>
                      {openPartnerModal.partners?.map((partner) => {
                        const isSelected = assignedPartners[openPartnerModal.id] === partner;
                        return (
                          <button
                            key={partner}
                            type="button"
                            onClick={() => {
                              setAssignedPartners((prev) => ({ ...prev, [openPartnerModal.id]: partner }));
                              
                              if (openPartnerModal.id === "siding") {
                                const paintingService = services.find((s) => s.id === "painting");
                                if (paintingService) {
                                  setSelected((prev) => (prev.includes("painting") ? prev : [...prev, "painting"]));
                                  setOpenPartnerModal(paintingService);
                                  return;
                                }
                              }
                              
                              if (openPartnerModal.id === "gutters") {
                                const roofingService = services.find((s) => s.id === "roofing");
                                if (roofingService) {
                                  setSelected((prev) => (prev.includes("roofing") ? prev : [...prev, "roofing"]));
                                  setOpenPartnerModal(roofingService);
                                  return;
                                }
                              }

                              // If Windows → go to config step
                              if (openPartnerModal.id === "windows") {
                                setWindowsStep("config");
                                return;
                              }

                              // If Doors → go to config step
                              if (openPartnerModal.id === "doors") {
                                setDoorsStep("config");
                                return;
                              }

                              // If Decks → go to scope config step
                              if (openPartnerModal.id === "decks") {
                                setDecksStep("config");
                                return;
                              }

                              // If Roofing → go to SQ config step
                              if (openPartnerModal.id === "roofing") {
                                setRoofingStep("config");
                                return;
                              }

                              // If Gutters → go to SQ config step
                              if (openPartnerModal.id === "gutters") {
                                setGuttersStep("config");
                                return;
                              }
                              
                              setOpenPartnerModal(null);
                            }}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                              isSelected 
                                ? '' 
                                : 'bg-surface-container border-outline-variant/40 hover:bg-surface-container-highest hover:border-outline'
                            }`}
                            style={isSelected ? { backgroundColor: `${openPartnerModal.color}1A`, borderColor: openPartnerModal.color, boxShadow: `0 0 15px ${openPartnerModal.color}1A` } : {}}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? '' : 'bg-surface-container-highest text-on-surface-variant'}`}
                                   style={isSelected ? { backgroundColor: openPartnerModal.color, color: '#000000' } : {}}>
                                {partner.charAt(0)}
                              </div>
                              <span className={`text-sm font-bold tracking-wide uppercase ${isSelected ? '' : 'text-on-surface'}`} style={isSelected ? { color: openPartnerModal.color } : {}}>
                                {partner}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined" style={{ color: openPartnerModal.color }} translate="no">
                                check_circle
                              </span>
                            )}
                          </button>
                        );
                      })}
                      
                      {assignedPartners[openPartnerModal.id] && (
                          <button 
                            type="button"
                            onClick={() => {
                              const current = { ...assignedPartners };
                              delete current[openPartnerModal.id];
                              setAssignedPartners(current);
                              if (openPartnerModal.id === "windows") {
                                setWindowCount("");
                                setWindowTrim("");
                                setWindowPrice("");
                                setWindowsStep("partner");
                              }
                              if (openPartnerModal.id === "doors") {
                                setDoorsPrice("");
                                setDoorsStep("partner");
                              }
                              if (openPartnerModal.id === "decks") {
                                setDeckScope("");
                                setDecksPrice("");
                                setDecksStep("partner");
                              }
                              if (openPartnerModal.id === "roofing") {
                                setRoofingSq("");
                                setRoofingStep("partner");
                              }
                              if (openPartnerModal.id === "gutters") {
                                setGuttersSq("");
                                setGuttersStep("partner");
                              }
                              setOpenPartnerModal(null);
                            }}
                            className="mt-4 flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[#ba1212]/30 text-[#ba1212] hover:bg-[#ba1212]/10 transition-colors"
                          >
                            <span className="text-xs font-bold uppercase tracking-wider">Unassign Partner</span>
                          </button>
                      )}
                    </>
                  )}

                  {/* ── STEP 2: Windows Config (quantity + trim) ── */}
                  {openPartnerModal.id === "windows" && windowsStep === "config" && (
                    <div className="space-y-6">
                      {/* Step indicator */}
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">check</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">Partner</span>
                        </div>
                        <div className="w-8 h-px bg-outline-variant"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623]/20 border border-[#f5a623] flex items-center justify-center">
                            <span className="text-[10px] font-black text-[#f5a623]">2</span>
                          </div>
                          <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Windows Config</span>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant">
                        Assigned to <span className="text-[#f5a623] font-bold uppercase">{assignedPartners["windows"]}</span>. Now configure the windows for this project.
                      </p>

                      {/* Window Count & Price */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={windowCount}
                            onChange={(e) => setWindowCount(e.target.value)}
                            placeholder="e.g. 42"
                            className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                            What is the price?
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={windowPrice}
                              onChange={(e) => setWindowPrice(e.target.value)}
                              placeholder="e.g. 4500.00"
                              className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 pl-8 pr-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Trim? */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                          Trim?
                        </label>
                        <CustomDropdown
                          value={windowTrim}
                          onChange={(val) => setWindowTrim(val as "yes" | "no")}
                          options={[
                            { value: "yes", label: "Yes" },
                            { value: "no", label: "No" },
                          ]}
                          placeholder="Select..."
                          className="w-full bg-surface-container-highest border border-outline-variant rounded-lg px-4 py-3 text-[15px] text-on-surface hover:border-[#f5a623]/50 transition-colors flex justify-between items-center"
                        />
                      </div>

                      {/* Duration preview */}
                      {windowCount && windowTrim && (
                        <div className="p-4 rounded-xl bg-[#f5a623]/10 border border-[#f5a623]/20">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#f5a623] text-lg" translate="no">calendar_month</span>
                            <div>
                              <p className="text-sm font-bold text-on-surface">
                                Estimated Duration:{" "}
                                <span className="text-[#f5a623]">
                                  {Math.max(1, Math.round(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20)))} day{Math.max(1, Math.round(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20))) !== 1 ? "s" : ""}
                                </span>
                              </p>
                              <p className="text-[10px] text-on-surface-variant mt-0.5">
                                {parseInt(windowCount)} windows ÷ {windowTrim === "yes" ? "12" : "20"}/day {windowTrim === "yes" ? "(with trim)" : "(no trim)"} = {(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20)).toFixed(1)} → {Math.max(1, Math.round(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20)))} day{Math.max(1, Math.round(parseInt(windowCount) / (windowTrim === "yes" ? 12 : 20))) !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setWindowsStep("partner")}
                          className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-xs font-bold hover:bg-surface-container-highest transition-all"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!windowCount || !windowTrim || !windowPrice}
                          onClick={() => {
                            setWindowsStep("partner");
                            setOpenPartnerModal(null);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-[#f5a623] text-[#000] text-xs font-black uppercase tracking-wider hover:bg-[#4da8e5] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Doors Config (price) ── */}
                  {openPartnerModal.id === "doors" && doorsStep === "config" && (
                    <div className="space-y-6">
                      {/* Step indicator */}
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">check</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">Partner</span>
                        </div>
                        <div className="w-8 h-px bg-outline-variant"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623]/20 border border-[#f5a623] flex items-center justify-center">
                            <span className="text-[10px] font-black text-[#f5a623]">2</span>
                          </div>
                          <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Doors Config</span>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant">
                        Assigned to <span className="text-[#f5a623] font-bold uppercase">{assignedPartners["doors"]}</span>. Now configure the doors for this project.
                      </p>

                      {/* Doors Price */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                          What is the price?
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={doorsPrice}
                            onChange={(e) => setDoorsPrice(e.target.value)}
                            placeholder="e.g. 2500.00"
                            className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 pl-8 pr-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setDoorsStep("partner")}
                          className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-xs font-bold hover:bg-surface-container-highest transition-all"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!doorsPrice}
                          onClick={() => {
                            setDoorsStep("partner");
                            setOpenPartnerModal(null);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-[#f5a623] text-[#000] text-xs font-black uppercase tracking-wider hover:bg-[#4da8e5] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Decks Scope Config ── */}
                  {openPartnerModal.id === "decks" && decksStep === "config" && (
                    <div className="space-y-6">
                      {/* Step indicator */}
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">check</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#f5a623] uppercase tracking-wider">Partner</span>
                        </div>
                        <div className="w-8 h-px bg-outline-variant"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#f5a623]/20 border border-[#f5a623] flex items-center justify-center">
                            <span className="text-[10px] font-black text-[#f5a623]">2</span>
                          </div>
                          <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Deck Scope</span>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant">
                        Assigned to <span className="text-[#f5a623] font-bold uppercase">{assignedPartners["decks"]}</span>. Now select the scope of work for this deck project.
                      </p>

                      {/* Price Field */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                          What is the price?
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={decksPrice}
                            onChange={(e) => setDecksPrice(e.target.value)}
                            placeholder="e.g. 3500.00"
                            className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 pl-8 pr-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all h-[48px] text-[15px]"
                          />
                        </div>
                      </div>

                      {/* Scope Dropdown */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
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
                          className="w-full bg-surface-container-highest border border-outline-variant rounded-lg px-4 py-3 text-[15px] text-on-surface hover:border-[#f5a623]/50 transition-colors flex justify-between items-center"
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
                                <p className="text-sm font-bold text-on-surface">
                                  Estimated Duration:{" "}
                                  <span className="text-[#f5a623]">{durationLabel}</span>
                                </p>
                                <p className="text-[10px] text-on-surface-variant mt-0.5">
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
                          onClick={() => setDecksStep("partner")}
                          className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-xs font-bold hover:bg-surface-container-highest transition-all"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!deckScope || !decksPrice}
                          onClick={() => {
                            setDecksStep("partner");
                            setOpenPartnerModal(null);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-[#f5a623] text-[#000] text-xs font-black uppercase tracking-wider hover:bg-[#d4a106] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Roofing SQ Config ── */}
                  {openPartnerModal.id === "roofing" && roofingStep === "config" && (
                    <div className="space-y-6">
                      {/* Step indicator */}
                      <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#ef4444] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[14px] text-[#000]" translate="no">check</span>
                          </div>
                          <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-wider">Partner</span>
                        </div>
                        <div className="w-8 h-px bg-outline-variant"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 border border-[#ef4444] flex items-center justify-center">
                            <span className="text-[10px] font-black text-[#ef4444]">2</span>
                          </div>
                          <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Roofing Config</span>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant">
                        Assigned to <span className="text-[#ef4444] font-bold uppercase">{assignedPartners["roofing"]}</span>. How many squares for this roofing project?
                      </p>

                      {/* SQ Input */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                          How many SQ?
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={roofingSq}
                          onChange={(e) => setRoofingSq(e.target.value)}
                          placeholder="e.g. 30"
                          className="w-full bg-surface-container-highest border border-transparent rounded-lg py-3 px-4 text-on-surface placeholder:text-outline focus:outline-none focus:border-[#ef4444] focus:ring-1 focus:ring-[#ef4444] transition-all h-[48px] text-[15px]"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setRoofingStep("partner")}
                          className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant text-xs font-bold hover:bg-surface-container-highest transition-all"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!roofingSq}
                          onClick={() => {
                            setRoofingStep("partner");
                            setOpenPartnerModal(null);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-[#ef4444] text-white text-xs font-black uppercase tracking-wider hover:bg-[#dc2626] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}

                </div>
            </div>
         </div>
      )}
    </>
  );
}
