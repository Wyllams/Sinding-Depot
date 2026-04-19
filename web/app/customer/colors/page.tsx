"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../../lib/supabase";

// ─── Types ───────────────────────────────────────────────────────
interface SavedColor {
  surface_area: string;
  brand: string;
  color_name: string;
  color_code: string;
  status: string;
}

interface DoorEntry {
  id: string;
  location: string;
  color_code: string;
  same_as_trim: boolean;
}

interface CustomArea {
  id: string;
  name: string;
  color_code: string;
  notes: string;
}

// ─── Surface Config ──────────────────────────────────────────────
const TRIM_SURFACES = [
  { key: "window_trim",   label: "Window Trim",   sameAs: "siding" },
  { key: "door_trim",     label: "Door Trim",     sameAs: "window_trim" },
  { key: "corner_boards", label: "Corner Boards",  sameAs: "siding" },
  { key: "soffit",        label: "Soffit",          sameAs: "siding" },
  { key: "fascia",        label: "Fascia",          sameAs: "soffit" },
];

const ACCENT_SURFACES = [
  { key: "shutters",      label: "Shutters",        sameAs: "trim" },
  { key: "garage_door",   label: "Garage Door",     sameAs: "trim" },
  { key: "columns_posts", label: "Columns / Posts", sameAs: "trim" },
  { key: "porch_ceiling", label: "Porch Ceiling",   sameAs: "siding" },
  { key: "railings",      label: "Railings",        sameAs: "trim" },
];

const DOOR_LOCATIONS = [
  "Front", "Back", "Left Side", "Right Side", "Garage Entry", "Basement", "Deck", "Other",
];

const SURFACE_TYPES = ["Brick", "Stucco", "Foundation"];

// ─── Component ───────────────────────────────────────────────────
export default function CustomerColors() {
  // Auth / Job data
  const [jobId, setJobId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requestingEdit, setRequestingEdit] = useState(false);
  const [editRequested, setEditRequested] = useState(false);

  // Lock state
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [hasOverride, setHasOverride] = useState(false);
  const [overrideMinutes, setOverrideMinutes] = useState(0);

  // ─── Form State ────────────────────────────────────────────────
  const [brand, setBrand] = useState("Sherwin-Williams");
  const [customBrand, setCustomBrand] = useState("");

  // Siding
  const [sidingCode, setSidingCode] = useState("");
  const [sidingApplyTo, setSidingApplyTo] = useState("entire");
  const [sidingApplyOther, setSidingApplyOther] = useState("");

  // Trim
  const [useOneTrimColor, setUseOneTrimColor] = useState(false);
  const [oneTrimCode, setOneTrimCode] = useState("");
  const [trimCodes, setTrimCodes] = useState<Record<string, string>>({});
  const [trimSameAs, setTrimSameAs] = useState<Record<string, boolean>>({});

  // Doors
  const [frontDoorCode, setFrontDoorCode] = useState("");
  const [frontDoorSameAsTrim, setFrontDoorSameAsTrim] = useState(false);
  const [extraDoors, setExtraDoors] = useState<DoorEntry[]>([]);

  // Gutters
  const [gutterOption, setGutterOption] = useState<"not_painted" | "same_as_trim" | "custom">("not_painted");
  const [gutterCode, setGutterCode] = useState("");
  const [downspoutSameAsGutter, setDownspoutSameAsGutter] = useState(true);
  const [downspoutCode, setDownspoutCode] = useState("");

  // Accents
  const [accentCodes, setAccentCodes] = useState<Record<string, string>>({});
  const [accentSameAs, setAccentSameAs] = useState<Record<string, boolean>>({});
  const [deckNotPainted, setDeckNotPainted] = useState(true);
  const [deckCode, setDeckCode] = useState("");

  // Brick / Stucco / Foundation
  const [selectedSurfaces, setSelectedSurfaces] = useState<string[]>([]);
  const [surfaceAction, setSurfaceAction] = useState<"do_not_paint" | "paint">("do_not_paint");
  const [useOneSurfaceColor, setUseOneSurfaceColor] = useState(true);
  const [oneSurfaceCode, setOneSurfaceCode] = useState("");
  const [surfaceCodes, setSurfaceCodes] = useState<Record<string, string>>({});
  const [surfaceFinish, setSurfaceFinish] = useState("Flat");

  // Custom Areas
  const [customAreas, setCustomAreas] = useState<CustomArea[]>([]);

  // Confirmation
  const [confirmed, setConfirmed] = useState(false);

  // ─── Existing saved data ───────────────────────────────────────
  const [savedColors, setSavedColors] = useState<SavedColor[]>([]);

  // ─── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: customer } = await supabase
          .from("customers")
          .select("id, full_name")
          .eq("profile_id", user.id)
          .single();
        if (!customer) return;
        setCustomerName(customer.full_name);

        const { data: job } = await supabase
          .from("jobs")
          .select("id, service_address_line_1, color_edit_override_until")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (!job) return;

        setJobId(job.id);
        setAddress(job.service_address_line_1 || "");

        // Check 24h lock
        const { data: paintSvc } = await supabase
          .from("job_services")
          .select("id, service_type:service_types!inner(name)")
          .eq("job_id", job.id)
          .eq("service_type.name", "Painting")
          .maybeSingle();

        if (paintSvc) {
          const { data: assignment } = await supabase
            .from("service_assignments")
            .select("scheduled_start_at")
            .eq("job_service_id", paintSvc.id)
            .maybeSingle();

          if (assignment?.scheduled_start_at) {
            const paintStart = new Date(assignment.scheduled_start_at);
            const lockTime = new Date(paintStart.getTime() - 24 * 60 * 60 * 1000);
            const now = new Date();

            const overrideUntil = job.color_edit_override_until ? new Date(job.color_edit_override_until) : null;
            const hasOvr = overrideUntil !== null && overrideUntil > now;

            if (now >= lockTime) {
              if (hasOvr) {
                setHasOverride(true);
                setOverrideMinutes(Math.round((overrideUntil!.getTime() - now.getTime()) / 60000));
              } else {
                setIsLocked(true);
                setLockMessage(`Editing is locked — painting is scheduled for ${paintStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (within 24 hours).`);
              }
            }
          }
        }

        // Load existing colors
        const { data: existing } = await supabase
          .from("job_color_selections")
          .select("surface_area, brand, color_name, color_code, status")
          .eq("job_id", job.id);

        if (existing && existing.length > 0) {
          setSavedColors(existing);
          populateFormFromSaved(existing);
          const allSubmitted = existing.every((c) => c.status === "pending" || c.status === "approved");
          if (allSubmitted) setSuccess(true);
        }
      } catch (err) {
        console.error("[CustomerColors]", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function populateFormFromSaved(colors: SavedColor[]): void {
    const map: Record<string, SavedColor> = {};
    colors.forEach((c) => { map[c.surface_area] = c; });

    if (map.siding) {
      setBrand(map.siding.brand || "Sherwin-Williams");
      setSidingCode(map.siding.color_code);
    }

    TRIM_SURFACES.forEach((t) => {
      if (map[t.key]) {
        setTrimCodes((prev) => ({ ...prev, [t.key]: map[t.key].color_code }));
      }
    });

    if (map.front_door) setFrontDoorCode(map.front_door.color_code);
    if (map.gutters) {
      if (map.gutters.color_code === "NOT_PAINTED") setGutterOption("not_painted");
      else if (map.gutters.color_code === "SAME_AS_TRIM") setGutterOption("same_as_trim");
      else { setGutterOption("custom"); setGutterCode(map.gutters.color_code); }
    }
    if (map.downspouts) {
      if (map.downspouts.color_code === map.gutters?.color_code) setDownspoutSameAsGutter(true);
      else { setDownspoutSameAsGutter(false); setDownspoutCode(map.downspouts.color_code); }
    }

    ACCENT_SURFACES.forEach((a) => {
      if (map[a.key]) {
        setAccentCodes((prev) => ({ ...prev, [a.key]: map[a.key].color_code }));
      }
    });

    if (map.deck) {
      if (map.deck.color_code === "NOT_PAINTED") setDeckNotPainted(true);
      else { setDeckNotPainted(false); setDeckCode(map.deck.color_code); }
    }
  }

  // ─── Build selections for submit ──────────────────────────────
  function buildSelections(): { surface_area: string; brand: string; color_name: string; color_code: string }[] {
    const effectiveBrand = brand === "Other" ? customBrand : brand;
    const selections: { surface_area: string; brand: string; color_name: string; color_code: string }[] = [];

    // Siding
    if (sidingCode) {
      selections.push({ surface_area: "siding", brand: effectiveBrand, color_name: sidingCode, color_code: sidingCode });
    }

    // Trim
    if (useOneTrimColor && oneTrimCode) {
      TRIM_SURFACES.forEach((t) => {
        selections.push({ surface_area: t.key, brand: effectiveBrand, color_name: oneTrimCode, color_code: oneTrimCode });
      });
    } else {
      TRIM_SURFACES.forEach((t) => {
        const code = trimSameAs[t.key] ? getResolvedCode(t.sameAs) : (trimCodes[t.key] || "");
        if (code) selections.push({ surface_area: t.key, brand: effectiveBrand, color_name: code, color_code: code });
      });
    }

    // Front Door
    if (frontDoorSameAsTrim) {
      const trimCode = useOneTrimColor ? oneTrimCode : (trimCodes.window_trim || "");
      if (trimCode) selections.push({ surface_area: "front_door", brand: effectiveBrand, color_name: trimCode, color_code: trimCode });
    } else if (frontDoorCode) {
      selections.push({ surface_area: "front_door", brand: effectiveBrand, color_name: frontDoorCode, color_code: frontDoorCode });
    }

    // Extra doors
    extraDoors.forEach((d) => {
      const code = d.same_as_trim ? (useOneTrimColor ? oneTrimCode : trimCodes.window_trim || "") : d.color_code;
      if (code) selections.push({ surface_area: `door_${d.location.toLowerCase().replace(/\s/g, '_')}`, brand: effectiveBrand, color_name: code, color_code: code });
    });

    // Gutters
    if (gutterOption === "not_painted") {
      selections.push({ surface_area: "gutters", brand: effectiveBrand, color_name: "Not Painted", color_code: "NOT_PAINTED" });
    } else if (gutterOption === "same_as_trim") {
      const trimCode = useOneTrimColor ? oneTrimCode : (trimCodes.window_trim || "");
      selections.push({ surface_area: "gutters", brand: effectiveBrand, color_name: trimCode, color_code: trimCode || "SAME_AS_TRIM" });
    } else if (gutterCode) {
      selections.push({ surface_area: "gutters", brand: effectiveBrand, color_name: gutterCode, color_code: gutterCode });
    }

    // Downspouts
    if (downspoutSameAsGutter) {
      const gc = gutterOption === "custom" ? gutterCode : gutterOption === "same_as_trim" ? "SAME_AS_TRIM" : "NOT_PAINTED";
      selections.push({ surface_area: "downspouts", brand: effectiveBrand, color_name: gc, color_code: gc });
    } else if (downspoutCode) {
      selections.push({ surface_area: "downspouts", brand: effectiveBrand, color_name: downspoutCode, color_code: downspoutCode });
    }

    // Accents
    ACCENT_SURFACES.forEach((a) => {
      const code = accentSameAs[a.key]
        ? getResolvedCode(a.sameAs)
        : (accentCodes[a.key] || "");
      if (code) selections.push({ surface_area: a.key, brand: effectiveBrand, color_name: code, color_code: code });
    });

    // Deck
    if (deckNotPainted) {
      selections.push({ surface_area: "deck", brand: effectiveBrand, color_name: "Not Painted", color_code: "NOT_PAINTED" });
    } else if (deckCode) {
      selections.push({ surface_area: "deck", brand: effectiveBrand, color_name: deckCode, color_code: deckCode });
    }

    // Brick/Stucco/Foundation
    if (selectedSurfaces.length > 0 && surfaceAction === "paint") {
      selectedSurfaces.forEach((s) => {
        const code = useOneSurfaceColor ? oneSurfaceCode : (surfaceCodes[s] || "");
        if (code) selections.push({ surface_area: s.toLowerCase(), brand: effectiveBrand, color_name: code, color_code: code });
      });
    }

    // Custom areas
    customAreas.forEach((ca) => {
      if (ca.name && ca.color_code) {
        selections.push({ surface_area: `custom_${ca.name.toLowerCase().replace(/\s/g, '_')}`, brand: effectiveBrand, color_name: ca.color_code, color_code: ca.color_code });
      }
    });

    return selections;
  }

  function getResolvedCode(ref: string): string {
    if (ref === "siding") return sidingCode;
    if (ref === "trim") return useOneTrimColor ? oneTrimCode : (trimCodes.window_trim || "");
    if (ref === "soffit") return trimSameAs.soffit ? sidingCode : (trimCodes.soffit || "");
    if (ref === "window_trim") return trimCodes.window_trim || "";
    return "";
  }

  // ─── Submit ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!jobId || !confirmed) return;

    const selections = buildSelections();
    if (selections.length === 0) {
      alert("Please fill in at least the siding color.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/colors/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, selections }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Error: ${data.error || "Failed to submit"}`);
        return;
      }

      setSavedColors(selections.map((s) => ({ ...s, status: "pending" })));
      setSuccess(true);
    } catch (err) {
      console.error("[CustomerColors] submit error:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Request Edit Permission ───────────────────────────────────
  async function handleRequestEdit(): Promise<void> {
    if (!jobId) return;
    setRequestingEdit(true);
    try {
      const res = await fetch("/api/colors/request-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) setEditRequested(true);
    } catch (err) {
      console.error("[Colors] request edit error:", err);
    } finally {
      setRequestingEdit(false);
    }
  }

  // ─── Summary for review ────────────────────────────────────────
  const reviewSelections = useMemo(() => buildSelections(), [
    sidingCode, trimCodes, trimSameAs, useOneTrimColor, oneTrimCode,
    frontDoorCode, frontDoorSameAsTrim, extraDoors,
    gutterOption, gutterCode, downspoutSameAsGutter, downspoutCode,
    accentCodes, accentSameAs, deckNotPainted, deckCode,
    selectedSurfaces, surfaceAction, surfaceCodes, oneSurfaceCode,
    customAreas, brand, customBrand,
  ]);

  // ─── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-3 border-[#e5e5e3] border-t-[#121412] rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Locked State ──────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="space-y-8 max-w-3xl">
        <div>
          <Link href="/customer" className="inline-flex items-center text-[#a1a19d] hover:text-[#121412] text-sm font-bold transition-colors mb-4">
            <span className="material-symbols-outlined text-[18px] mr-1" translate="no">arrow_back</span>
            Back to Dashboard
          </Link>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-[#121412]">Color Selection</h1>
        </div>

        <div className="bg-[#fff1ec] border border-[#ff7351]/30 p-6 rounded-2xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#ff7351] text-white rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl" translate="no">lock</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-lg text-[#121412]">Editing Locked</h2>
              <p className="text-[#474846] mt-1 text-sm">{lockMessage}</p>
              <p className="text-[#474846] mt-2 text-sm">
                If you need to make changes, you can request permission from our office.
              </p>
              <button
                onClick={handleRequestEdit}
                disabled={requestingEdit || editRequested}
                className="mt-4 px-6 py-3 bg-[#121412] text-white rounded-xl font-bold text-sm hover:bg-[#2a2b2a] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {editRequested ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] text-[#aeee2a]" translate="no">check</span>
                    Request Sent
                  </>
                ) : requestingEdit ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]" translate="no">mail</span>
                    Request Edit Permission
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Show saved colors read-only */}
        {savedColors.length > 0 && (
          <div className="bg-white border border-[#e5e5e3] rounded-2xl p-6">
            <h3 className="font-headline font-bold text-lg text-[#121412] mb-4">Your Submitted Colors</h3>
            <div className="space-y-2">
              {savedColors.filter((c) => c.color_code !== "NOT_PAINTED").map((c) => (
                <div key={c.surface_area} className="flex justify-between items-center py-2 border-b border-[#e5e5e3] last:border-0">
                  <span className="text-sm font-medium text-[#474846] capitalize">{c.surface_area.replace(/_/g, " ")}</span>
                  <span className="text-sm font-bold text-[#121412] font-mono">{c.color_code}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Input helper ──────────────────────────────────────────────
  const inputClass = "w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] focus:ring-1 focus:ring-[#121412] outline-none transition-all";
  const labelClass = "block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2";
  const sectionClass = "bg-white border border-[#e5e5e3] rounded-2xl p-6 shadow-sm";
  const checkboxClass = "w-4 h-4 rounded border-[#e5e5e3] text-[#121412] focus:ring-[#121412] cursor-pointer accent-[#121412]";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/customer" className="inline-flex items-center text-[#a1a19d] hover:text-[#121412] text-sm font-bold transition-colors mb-4">
          <span className="material-symbols-outlined text-[18px] mr-1" translate="no">arrow_back</span>
          Back to Dashboard
        </Link>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[#121412]">Color Selection</h1>
        <p className="text-[#474846] mt-2">Submit your paint color choices for <strong>{address}</strong>.</p>
      </div>

      {/* Override banner */}
      {hasOverride && (
        <div className="bg-[#fff7cf] border border-[#f5a623]/30 p-4 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-[#f5a623]" translate="no">edit</span>
          <p className="text-sm font-medium text-[#121412]">
            Edit temporarily allowed — you have <strong>{overrideMinutes} minutes</strong> remaining.
          </p>
        </div>
      )}

      {success ? (
        /* ─── SUCCESS VIEW ───────────────────────────────────────── */
        <div className="bg-[#f0fae1] border border-[#aeee2a]/40 p-8 rounded-3xl text-center">
          <div className="w-20 h-20 bg-[#aeee2a] text-[#121412] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_10px_30px_rgba(174,238,42,0.4)]">
            <span className="material-symbols-outlined text-[40px]" translate="no">check</span>
          </div>
          <h2 className="font-headline text-2xl font-bold text-[#121412]">Colors Submitted!</h2>
          <p className="text-[#474846] mt-2 max-w-md mx-auto">
            Our team has been notified. They will review and prepare your materials.
          </p>

          {/* Summary */}
          <div className="mt-6 bg-white/60 rounded-2xl p-6 text-left max-w-lg mx-auto">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#a1a19d] mb-3">Your Selections</h3>
            <div className="space-y-1.5">
              {savedColors.filter((c) => c.color_code !== "NOT_PAINTED").map((c) => (
                <div key={c.surface_area} className="flex justify-between py-1.5 border-b border-[#e5e5e3]/50 last:border-0">
                  <span className="text-sm text-[#474846] capitalize">{c.surface_area.replace(/_/g, " ")}</span>
                  <span className="text-sm font-bold text-[#121412] font-mono">{c.color_code}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setSuccess(false)}
            className="mt-8 text-sm font-bold text-[#121412] underline underline-offset-4 hover:text-[#474846] transition-colors"
          >
            Edit Selection
          </button>
        </div>
      ) : (
        /* ─── FORM ───────────────────────────────────────────────── */
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SECTION 1: Paint Brand */}
          <div className={sectionClass}>
            <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
              <span className="w-6 h-6 bg-[#121412] text-white text-[10px] font-bold rounded-full flex items-center justify-center">1</span>
              Paint Brand
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Brand</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={inputClass}
                >
                  <option value="Sherwin-Williams">Sherwin-Williams</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {brand === "Other" && (
                <div>
                  <label className={labelClass}>Brand Name</label>
                  <input type="text" value={customBrand} onChange={(e) => setCustomBrand(e.target.value)} className={inputClass} placeholder="Enter brand name" required />
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: Main Body (Siding) */}
          <div className={sectionClass}>
            <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
              <span className="w-6 h-6 bg-[#121412] text-white text-[10px] font-bold rounded-full flex items-center justify-center">2</span>
              Main Body (Siding)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>SW Code *</label>
                <input type="text" value={sidingCode} onChange={(e) => setSidingCode(e.target.value.toUpperCase())} className={inputClass} placeholder="SW 0000" required />
              </div>
              <div>
                <label className={labelClass}>Apply To</label>
                <div className="flex flex-col gap-2 mt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="sidingApply" value="entire" checked={sidingApplyTo === "entire"} onChange={() => setSidingApplyTo("entire")} className={checkboxClass} />
                    Entire siding
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="sidingApply" value="other" checked={sidingApplyTo === "other"} onChange={() => setSidingApplyTo("other")} className={checkboxClass} />
                    Other
                  </label>
                  {sidingApplyTo === "other" && (
                    <input type="text" value={sidingApplyOther} onChange={(e) => setSidingApplyOther(e.target.value)} className={`${inputClass} mt-1`} placeholder="Specify areas..." />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Trim & Roofline */}
          <div className={sectionClass}>
            <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
              <span className="w-6 h-6 bg-[#f5a623] text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
              Trim & Roofline
            </h3>
            <label className="flex items-center gap-3 mb-6 cursor-pointer bg-[#faf9f5] px-4 py-3 rounded-xl border border-[#e5e5e3]">
              <input type="checkbox" checked={useOneTrimColor} onChange={(e) => setUseOneTrimColor(e.target.checked)} className={checkboxClass} />
              <span className="text-sm font-bold text-[#121412]">Use one color for all trim</span>
            </label>

            {useOneTrimColor ? (
              <div className="max-w-xs">
                <label className={labelClass}>Trim Color (SW Code)</label>
                <input type="text" value={oneTrimCode} onChange={(e) => setOneTrimCode(e.target.value.toUpperCase())} className={inputClass} placeholder="SW 0000" required />
              </div>
            ) : (
              <div className="space-y-4">
                {TRIM_SURFACES.map((t) => (
                  <div key={t.key} className="flex flex-col sm:flex-row sm:items-end gap-3 pb-4 border-b border-[#e5e5e3] last:border-0 last:pb-0">
                    <div className="flex-1">
                      <label className={labelClass}>{t.label}</label>
                      <input
                        type="text"
                        value={trimSameAs[t.key] ? `Same as ${t.sameAs.replace(/_/g, " ")}` : (trimCodes[t.key] || "")}
                        onChange={(e) => setTrimCodes((prev) => ({ ...prev, [t.key]: e.target.value.toUpperCase() }))}
                        className={inputClass}
                        placeholder="SW 0000"
                        disabled={trimSameAs[t.key]}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-[#a1a19d] cursor-pointer pb-1 whitespace-nowrap">
                      <input type="checkbox" checked={!!trimSameAs[t.key]} onChange={(e) => setTrimSameAs((prev) => ({ ...prev, [t.key]: e.target.checked }))} className={checkboxClass} />
                      Same as {t.sameAs.replace(/_/g, " ")}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: Doors */}
          <div className={sectionClass}>
            <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
              <span className="w-6 h-6 bg-[#ff7351] text-white text-[10px] font-bold rounded-full flex items-center justify-center">4</span>
              Doors
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
              <div className="flex-1">
                <label className={labelClass}>Front Door — SW Code</label>
                <input type="text" value={frontDoorSameAsTrim ? "Same as trim" : frontDoorCode} onChange={(e) => setFrontDoorCode(e.target.value.toUpperCase())} className={inputClass} placeholder="SW 0000" disabled={frontDoorSameAsTrim} />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#a1a19d] cursor-pointer pb-1">
                <input type="checkbox" checked={frontDoorSameAsTrim} onChange={(e) => setFrontDoorSameAsTrim(e.target.checked)} className={checkboxClass} />
                Same as trim
              </label>
            </div>

            {extraDoors.map((door, i) => (
              <div key={door.id} className="flex flex-col sm:flex-row sm:items-end gap-3 mb-3 pb-3 border-t border-[#e5e5e3] pt-3">
                <div className="w-36">
                  <label className={labelClass}>Location</label>
                  <select value={door.location} onChange={(e) => { const upd = [...extraDoors]; upd[i].location = e.target.value; setExtraDoors(upd); }} className={inputClass}>
                    {DOOR_LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className={labelClass}>SW Code</label>
                  <input type="text" value={door.same_as_trim ? "Same as trim" : door.color_code} onChange={(e) => { const upd = [...extraDoors]; upd[i].color_code = e.target.value.toUpperCase(); setExtraDoors(upd); }} className={inputClass} placeholder="SW 0000" disabled={door.same_as_trim} />
                </div>
                <label className="flex items-center gap-2 text-xs text-[#a1a19d] cursor-pointer pb-1 whitespace-nowrap">
                  <input type="checkbox" checked={door.same_as_trim} onChange={(e) => { const upd = [...extraDoors]; upd[i].same_as_trim = e.target.checked; setExtraDoors(upd); }} className={checkboxClass} />
                  Same as trim
                </label>
                <button type="button" onClick={() => setExtraDoors(extraDoors.filter((_, j) => j !== i))} className="text-[#ff7351] hover:bg-[#ff7351]/10 rounded-lg p-2">
                  <span className="material-symbols-outlined text-[18px]" translate="no">delete</span>
                </button>
              </div>
            ))}

            <button type="button" onClick={() => setExtraDoors([...extraDoors, { id: crypto.randomUUID(), location: "Back", color_code: "", same_as_trim: false }])} className="mt-2 text-sm font-bold text-[#121412] flex items-center gap-1 hover:text-[#474846] transition-colors">
              <span className="material-symbols-outlined text-[16px]" translate="no">add</span>
              Add Door
            </button>
          </div>

          {/* SECTION 5: Gutters & Drainage */}
          <div className={sectionClass}>
            <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
              <span className="w-6 h-6 bg-[#60b8f5] text-white text-[10px] font-bold rounded-full flex items-center justify-center">5</span>
              Gutters & Drainage
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Gutters</label>
                <div className="flex flex-col gap-2">
                  {[
                    { v: "not_painted" as const, l: "Not painted" },
                    { v: "same_as_trim" as const, l: "Same as trim" },
                    { v: "custom" as const, l: "Custom color" },
                  ].map((opt) => (
                    <label key={opt.v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="gutter" value={opt.v} checked={gutterOption === opt.v} onChange={() => setGutterOption(opt.v)} className={checkboxClass} />
                      {opt.l}
                    </label>
                  ))}
                  {gutterOption === "custom" && (
                    <input type="text" value={gutterCode} onChange={(e) => setGutterCode(e.target.value.toUpperCase())} className={`${inputClass} mt-1`} placeholder="SW 0000" />
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>Downspouts</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={downspoutSameAsGutter} onChange={(e) => setDownspoutSameAsGutter(e.target.checked)} className={checkboxClass} />
                    Same as gutters
                  </label>
                  {!downspoutSameAsGutter && (
                    <input type="text" value={downspoutCode} onChange={(e) => setDownspoutCode(e.target.value.toUpperCase())} className={`${inputClass} mt-1`} placeholder="SW 0000" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: Accents */}
          <div className={sectionClass}>
            <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
              <span className="w-6 h-6 bg-[#c084fc] text-white text-[10px] font-bold rounded-full flex items-center justify-center">6</span>
              Accents
            </h3>
            <div className="space-y-4">
              {ACCENT_SURFACES.map((a) => (
                <div key={a.key} className="flex flex-col sm:flex-row sm:items-end gap-3 pb-4 border-b border-[#e5e5e3] last:border-0 last:pb-0">
                  <div className="flex-1">
                    <label className={labelClass}>{a.label}</label>
                    <input type="text" value={accentSameAs[a.key] ? `Same as ${a.sameAs}` : (accentCodes[a.key] || "")} onChange={(e) => setAccentCodes((prev) => ({ ...prev, [a.key]: e.target.value.toUpperCase() }))} className={inputClass} placeholder="SW 0000" disabled={accentSameAs[a.key]} />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#a1a19d] cursor-pointer pb-1 whitespace-nowrap">
                    <input type="checkbox" checked={!!accentSameAs[a.key]} onChange={(e) => setAccentSameAs((prev) => ({ ...prev, [a.key]: e.target.checked }))} className={checkboxClass} />
                    Same as {a.sameAs}
                  </label>
                </div>
              ))}

              {/* Deck */}
              <div className="pt-4 border-t border-[#e5e5e3]">
                <label className={labelClass}>Deck</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={deckNotPainted} onChange={(e) => setDeckNotPainted(e.target.checked)} className={checkboxClass} />
                    Not painted
                  </label>
                  {!deckNotPainted && (
                    <input type="text" value={deckCode} onChange={(e) => setDeckCode(e.target.value.toUpperCase())} className={inputClass} placeholder="SW 0000" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: Brick / Stucco / Foundation */}
          <div className={sectionClass}>
            <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
              <span className="w-6 h-6 bg-[#a1724e] text-white text-[10px] font-bold rounded-full flex items-center justify-center">7</span>
              Brick / Stucco / Foundation
            </h3>
            <div className="mb-4">
              <label className={labelClass}>Surface Types</label>
              <div className="flex flex-wrap gap-3">
                {SURFACE_TYPES.map((st) => (
                  <label key={st} className="flex items-center gap-2 text-sm cursor-pointer bg-[#faf9f5] px-3 py-2 rounded-lg border border-[#e5e5e3]">
                    <input
                      type="checkbox"
                      checked={selectedSurfaces.includes(st)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSurfaces([...selectedSurfaces, st]);
                        else setSelectedSurfaces(selectedSurfaces.filter((s) => s !== st));
                      }}
                      className={checkboxClass}
                    />
                    {st}
                  </label>
                ))}
              </div>
            </div>

            {selectedSurfaces.length > 0 && (
              <>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="surfaceAction" value="do_not_paint" checked={surfaceAction === "do_not_paint"} onChange={() => setSurfaceAction("do_not_paint")} className={checkboxClass} />
                    Do not paint
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" name="surfaceAction" value="paint" checked={surfaceAction === "paint"} onChange={() => setSurfaceAction("paint")} className={checkboxClass} />
                    Paint
                  </label>
                </div>

                {surfaceAction === "paint" && (
                  <>
                    <label className="flex items-center gap-3 mb-4 cursor-pointer bg-[#faf9f5] px-4 py-3 rounded-xl border border-[#e5e5e3]">
                      <input type="checkbox" checked={useOneSurfaceColor} onChange={(e) => setUseOneSurfaceColor(e.target.checked)} className={checkboxClass} />
                      <span className="text-sm font-bold text-[#121412]">Use one color for all selected surfaces</span>
                    </label>
                    {useOneSurfaceColor ? (
                      <div className="max-w-xs">
                        <label className={labelClass}>SW Code</label>
                        <input type="text" value={oneSurfaceCode} onChange={(e) => setOneSurfaceCode(e.target.value.toUpperCase())} className={inputClass} placeholder="SW 0000" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedSurfaces.map((s) => (
                          <div key={s}>
                            <label className={labelClass}>{s}</label>
                            <input type="text" value={surfaceCodes[s] || ""} onChange={(e) => setSurfaceCodes((prev) => ({ ...prev, [s]: e.target.value.toUpperCase() }))} className={inputClass} placeholder="SW 0000" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4">
                      <label className={labelClass}>Finish</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="finish" value="Flat" checked={surfaceFinish === "Flat"} onChange={() => setSurfaceFinish("Flat")} className={checkboxClass} />
                          Flat
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="radio" name="finish" value="Satin" checked={surfaceFinish === "Satin"} onChange={() => setSurfaceFinish("Satin")} className={checkboxClass} />
                          Satin
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* SECTION 8: Custom Areas */}
          <div className={sectionClass}>
            <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
              <span className="w-6 h-6 bg-[#474846] text-white text-[10px] font-bold rounded-full flex items-center justify-center">8</span>
              Custom Areas
            </h3>
            {customAreas.map((ca, i) => (
              <div key={ca.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3 pb-3 border-b border-[#e5e5e3]">
                <input type="text" value={ca.name} onChange={(e) => { const upd = [...customAreas]; upd[i].name = e.target.value; setCustomAreas(upd); }} className={inputClass} placeholder="Area name" />
                <input type="text" value={ca.color_code} onChange={(e) => { const upd = [...customAreas]; upd[i].color_code = e.target.value.toUpperCase(); setCustomAreas(upd); }} className={inputClass} placeholder="SW 0000" />
                <div className="flex gap-2">
                  <input type="text" value={ca.notes} onChange={(e) => { const upd = [...customAreas]; upd[i].notes = e.target.value; setCustomAreas(upd); }} className={`${inputClass} flex-1`} placeholder="Notes (optional)" />
                  <button type="button" onClick={() => setCustomAreas(customAreas.filter((_, j) => j !== i))} className="text-[#ff7351] hover:bg-[#ff7351]/10 rounded-lg p-2">
                    <span className="material-symbols-outlined text-[18px]" translate="no">delete</span>
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setCustomAreas([...customAreas, { id: crypto.randomUUID(), name: "", color_code: "", notes: "" }])} className="text-sm font-bold text-[#121412] flex items-center gap-1 hover:text-[#474846] transition-colors">
              <span className="material-symbols-outlined text-[16px]" translate="no">add</span>
              Add Custom Area
            </button>
          </div>

          {/* SECTION 9: Final Review */}
          {reviewSelections.length > 0 && (
            <div className="bg-[#faf9f5] border border-[#e5e5e3] rounded-2xl p-6">
              <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[#121412]" translate="no">checklist</span>
                Final Review
              </h3>
              <div className="bg-white rounded-xl p-4 font-mono text-sm space-y-1">
                {reviewSelections.map((s) => (
                  <div key={s.surface_area} className="flex justify-between py-1 border-b border-[#e5e5e3]/50 last:border-0">
                    <span className="text-[#474846] capitalize">{s.surface_area.replace(/_/g, " ")}</span>
                    <span className="font-bold text-[#121412]">{s.color_code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 10: Confirmation */}
          <div className="bg-white border-2 border-[#e5e5e3] rounded-2xl p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-[#121412] text-[#121412] accent-[#121412] cursor-pointer" />
              <span className="text-sm font-bold text-[#121412] leading-relaxed">
                I confirm all paint selections are correct and final. I understand that changes may not be possible within 24 hours of the scheduled paint date.
              </span>
            </label>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !confirmed}
              className="h-14 px-10 bg-[#121412] text-[#faf9f5] rounded-full font-bold shadow-[0_10px_20px_rgba(18,20,18,0.15)] hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Submit Paint Selections
                  <span className="material-symbols-outlined text-[18px]" translate="no">verified</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
