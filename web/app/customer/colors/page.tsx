"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

interface ColorEntry {
  surface_area: string;
  brand: string;
  color_name: string;
  color_code: string;
  status: string;
}

const SURFACES = [
  { key: "main_siding",  label: "Main Siding Area",              dotClass: "bg-[#f8f6f0] border border-[#d1d0c9]" },
  { key: "trim_fascia",  label: "Trim & Fascia",                 dotClass: "bg-[#2a2b2a] border border-[#1a1b1a]" },
  { key: "front_door",   label: "Front Door / Accent (Optional)", dotClass: "bg-gradient-to-br from-red-500 to-orange-500" },
];

export default function CustomerColors() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, { brand: string; color_name: string; color_code: string }>>({
    main_siding: { brand: "", color_name: "", color_code: "" },
    trim_fascia: { brand: "", color_name: "", color_code: "" },
    front_door:  { brand: "", color_name: "", color_code: "" },
  });
  const [savedStatus, setSavedStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isApproved = Object.values(savedStatus).some((s) => s === "approved");

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("profile_id", user.id)
          .single();
        if (!customer) return;

        const { data: job } = await supabase
          .from("jobs")
          .select("id")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (!job) return;

        setJobId(job.id);

        // Load existing color selections
        const { data: existing } = await supabase
          .from("job_color_selections")
          .select("surface_area, brand, color_name, color_code, status")
          .eq("job_id", job.id);

        if (existing && existing.length > 0) {
          const newColors = { ...colors };
          const newStatus: Record<string, string> = {};
          existing.forEach((c: ColorEntry) => {
            if (newColors[c.surface_area]) {
              newColors[c.surface_area] = {
                brand: c.brand || "",
                color_name: c.color_name || "",
                color_code: c.color_code || "",
              };
              newStatus[c.surface_area] = c.status;
            }
          });
          setColors(newColors);
          setSavedStatus(newStatus);
          // If all are submitted, show success
          const allSubmitted = SURFACES.every((s) => newStatus[s.key] === "submitted" || newStatus[s.key] === "approved");
          if (allSubmitted) setSuccess(true);
        }
      } catch (err) {
        console.error("[CustomerColors]", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!jobId) return;

    setSubmitting(true);
    try {
      // Upsert each surface color
      for (const surface of SURFACES) {
        const c = colors[surface.key];
        // Skip empty optional surface (front_door)
        if (surface.key === "front_door" && !c.brand && !c.color_name && !c.color_code) continue;

        // Check if exists
        const { data: existing } = await supabase
          .from("job_color_selections")
          .select("id")
          .eq("job_id", jobId)
          .eq("surface_area", surface.key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("job_color_selections")
            .update({
              brand: c.brand,
              color_name: c.color_name,
              color_code: c.color_code,
              status: "submitted",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("job_color_selections")
            .insert({
              job_id: jobId,
              surface_area: surface.key,
              brand: c.brand,
              color_name: c.color_name,
              color_code: c.color_code,
              status: "submitted",
            });
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error("[CustomerColors] submit error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-8 h-8 border-3 border-[#e5e5e3] border-t-[#121412] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/customer" className="inline-flex items-center text-[#a1a19d] hover:text-[#121412] text-sm font-bold transition-colors mb-4">
          <span className="material-symbols-outlined text-[18px] mr-1" translate="no">arrow_back</span>
          Back to Dashboard
        </Link>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[#121412]">Color Selection</h1>
        <p className="text-[#474846] mt-2">Define the paint colors for your project.</p>
      </div>

      {success ? (
        <div className="bg-[#f0fae1] border border-[#aeee2a]/40 p-8 rounded-3xl text-center">
          <div className="w-20 h-20 bg-[#aeee2a] text-[#121412] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_10px_30px_rgba(174,238,42,0.4)]">
            <span className="material-symbols-outlined text-[40px]" translate="no">check</span>
          </div>
          <h2 className="font-headline text-2xl font-bold text-[#121412]">
            {isApproved ? "Colors Approved!" : "Colors Submitted!"}
          </h2>
          <p className="text-[#474846] mt-2 max-w-md mx-auto">
            {isApproved
              ? "Your color selections have been approved by our team. Materials are being ordered."
              : "Your selection has been saved. Our purchasing team will review and order your materials."}
          </p>
          
          {/* Show submitted colors summary */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
            {SURFACES.map((surface) => {
              const c = colors[surface.key];
              if (!c.brand && !c.color_name) return null;
              return (
                <div key={surface.key} className="bg-white/60 rounded-2xl p-4 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#a1a19d] mb-1">{surface.label.split("(")[0].trim()}</p>
                  <p className="text-sm font-bold text-[#121412]">{c.color_name}</p>
                  <p className="text-xs text-[#474846]">{c.brand} · {c.color_code}</p>
                </div>
              );
            })}
          </div>

          {!isApproved && (
            <button 
              onClick={() => setSuccess(false)}
              className="mt-8 text-sm font-bold text-[#121412] underline underline-offset-4 hover:text-[#474846] transition-colors"
            >
              Edit Selection
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-[#e5e5e3] rounded-3xl p-8 shadow-sm">
          <div className="space-y-8">
            {SURFACES.map((surface, idx) => (
              <div key={surface.key} className={idx < SURFACES.length - 1 ? "border-b border-[#e5e5e3] pb-8" : ""}>
                <h3 className="font-headline font-bold text-lg text-[#121412] flex items-center gap-2 mb-4">
                  <span className={`w-3 h-3 rounded-full ${surface.dotClass}`} />
                  {surface.label}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Paint Brand</label>
                    <input
                      type="text"
                      value={colors[surface.key].brand}
                      onChange={(e) => setColors({ ...colors, [surface.key]: { ...colors[surface.key], brand: e.target.value } })}
                      className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] focus:ring-1 focus:ring-[#121412] outline-none transition-all"
                      placeholder={surface.key === "front_door" ? "Leave blank if N/A" : "e.g. Sherwin Williams"}
                      required={surface.key !== "front_door"}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Color Name</label>
                    <input
                      type="text"
                      value={colors[surface.key].color_name}
                      onChange={(e) => setColors({ ...colors, [surface.key]: { ...colors[surface.key], color_name: e.target.value } })}
                      className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none"
                      placeholder={surface.key === "front_door" ? "Leave blank if N/A" : "e.g. Alabaster"}
                      required={surface.key !== "front_door"}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#a1a19d] uppercase tracking-widest mb-2">Color/SKU Code</label>
                    <input
                      type="text"
                      value={colors[surface.key].color_code}
                      onChange={(e) => setColors({ ...colors, [surface.key]: { ...colors[surface.key], color_code: e.target.value } })}
                      className="w-full h-12 bg-[#faf9f5] border border-[#e5e5e3] rounded-xl px-4 text-sm font-medium focus:border-[#121412] outline-none"
                      placeholder={surface.key === "front_door" ? "Leave blank if N/A" : "e.g. SW 7008"}
                      required={surface.key !== "front_door"}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center justify-end border-t border-[#e5e5e3] pt-6">
            <button 
              type="submit"
              disabled={submitting}
              className="h-14 px-8 bg-[#121412] text-[#faf9f5] rounded-full font-bold shadow-[0_10px_20px_rgba(18,20,18,0.15)] hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Submit Selection
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
