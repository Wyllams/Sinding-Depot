"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface FieldLaborBillModalProps {
  billId: string;
  templateId: string;
  billTitle: string;
  billTotal: number;
  billStatus: string;
  isSiding: boolean;
  onClose: () => void;
}

interface SectionData {
  id: string;
  title: string;
  sort_order: number;
  items: FilledItem[];
}

interface FilledItem {
  id: string; // template item id or custom line id
  isCustom?: boolean;
  label: string;
  sub_label: string | null;
  sort_order: number;
  qty_office: number | null;
  qty_crew: number | null;
  unit: string;
  rate: number;
  lineTotal: number;
}

export function FieldLaborBillModal({
  billId,
  templateId,
  billTitle,
  billTotal,
  billStatus,
  isSiding,
  onClose,
}: FieldLaborBillModalProps) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [itemSearch, setItemSearch] = useState("");
  const [addingLine, setAddingLine] = useState<{ sectionId: string; label: string; qty: string; unit: string } | null>(null);
  const [savingLine, setSavingLine] = useState(false);
  const [itemValues, setItemValues] = useState<Record<string, { qty_office: string; qty_crew: string; rate: string; unit: string; isCustom: boolean; custom_label?: string; sub_label?: string; sort_order: number }>>({});
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      try {
        // 1. Fetch all sections for this template
        const { data: secsData } = await supabase
          .from("labor_bill_template_sections")
          .select("id, title, sort_order")
          .eq("template_id", templateId)
          .order("sort_order");

        if (!secsData || secsData.length === 0) {
          setLoading(false);
          return;
        }

        const sectionIds = secsData.map((s) => s.id);

        // 2. Fetch all template items for those sections
        const { data: tmplItems } = await supabase
          .from("labor_bill_template_items")
          .select("id, section_id, label, sub_label, sort_order")
          .in("section_id", sectionIds);

        // 3. Fetch filled items for this bill
        const { data: billItems } = await supabase
          .from("job_labor_bill_items")
          .select("*")
          .eq("labor_bill_id", billId);

        const filledBillItems = billItems || [];
        const expanded = new Set<string>();

        const grouped: SectionData[] = secsData.map((sec, idx) => {
          const secItems = (tmplItems || []).filter((ti) => ti.section_id === sec.id);
          
          let hasFilled = false;
          
          const items: FilledItem[] = secItems.map((ti) => {
            const billed = filledBillItems.find((bi) => bi.template_item_id === ti.id);
            const qOff = billed?.quantity !== undefined && billed?.quantity !== null ? billed.quantity : null;
            const qCrew = billed?.qty_crew !== undefined && billed?.qty_crew !== null ? billed.qty_crew : null;
            const rate = billed?.rate || 0;
            
            if ((qOff !== null && qOff > 0) || (qCrew !== null && qCrew > 0)) hasFilled = true;
            
            return {
              id: ti.id,
              isCustom: false,
              label: ti.label,
              sub_label: ti.sub_label,
              sort_order: ti.sort_order,
              qty_office: qOff,
              qty_crew: qCrew,
              unit: billed?.unit || "",
              rate: rate,
              lineTotal: (qCrew !== null ? qCrew : (qOff || 0)) * rate,
            };
          }).sort((a, b) => a.sort_order - b.sort_order);

          // Add custom lines to the first section
          if (idx === 0) {
            const customLines = filledBillItems.filter(bi => !bi.template_item_id);
            customLines.forEach((cl) => {
              hasFilled = true;
              items.push({
                id: cl.id,
                isCustom: true,
                label: cl.custom_label || "Custom Line",
                sub_label: "Added by Crew",
                sort_order: 9999 + (cl.sort_order || 0),
                qty_office: cl.quantity !== undefined && cl.quantity !== null ? cl.quantity : null,
                qty_crew: cl.qty_crew !== undefined && cl.qty_crew !== null ? cl.qty_crew : null,
                unit: cl.unit || "",
                rate: cl.rate || 0,
                lineTotal: ((cl.qty_crew !== null ? cl.qty_crew : (cl.quantity || 0)) * (cl.rate || 0)),
              });
            });
          }

          if (hasFilled) expanded.add(sec.id);

          return {
            id: sec.id,
            title: sec.title,
            sort_order: sec.sort_order,
            items: items,
          };
        }).sort((a, b) => a.sort_order - b.sort_order);

        setSections(grouped);
        setExpandedSections(expanded);

        // Populate itemValues
        const vals: typeof itemValues = {};
        grouped.forEach(sec => {
          sec.items.forEach(it => {
            vals[it.id] = {
              qty_office: it.qty_office !== null ? String(it.qty_office) : "",
              qty_crew: it.qty_crew !== null ? String(it.qty_crew) : "",
              rate: String(it.rate),
              unit: it.unit,
              isCustom: !!it.isCustom,
              custom_label: it.isCustom ? it.label : undefined,
              sub_label: it.isCustom && it.sub_label ? it.sub_label : undefined,
              sort_order: it.sort_order
            };
          });
        });
        setItemValues(vals);
      } catch (e) {
        console.error("Failed to load labor bill details:", e);
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, [billId, templateId]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const statusStyles: Record<string, { bg: string; text: string }> = {
    draft: { bg: "bg-surface-container-highest", text: "text-on-surface-variant" },
    submitted: { bg: "bg-[#60b8f5]/15", text: "text-[#60b8f5]" },
    approved: { bg: "bg-[#22c55e]/15", text: "text-[#22c55e]" },
  };
  const st = statusStyles[billStatus.toLowerCase()] || statusStyles.draft;

  const handleSaveCustomLine = async () => {
    if (!addingLine || !addingLine.label.trim() || !addingLine.qty) return;
    setSavingLine(true);
    try {
      const { error } = await supabase.from("job_labor_bill_items").insert({
        labor_bill_id: billId,
        custom_label: addingLine.label.trim(),
        quantity: parseFloat(addingLine.qty),
        qty_crew: parseFloat(addingLine.qty),
        unit: addingLine.unit.trim(),
        rate: 0,
        line_total: 0,
        sort_order: 999
      });
      if (error) throw error;
      setAddingLine(null);
      // We should ideally reload the items, but for now we'll just trigger a component remount or let the parent handle it
      // I'll simulate a quick reload by fetching just the custom line or re-running loadDetails
      // We can just rely on the effect dependency if we had a trigger, but let's just close and user can reopen
      // Actually, better to reload inline:
      const { data: billItems } = await supabase.from("job_labor_bill_items").select("*").eq("labor_bill_id", billId);
      if (billItems) {
        setItemValues(prev => {
          const newVals = { ...prev };
          const customLines = billItems.filter(bi => !bi.template_item_id);
          customLines.forEach(cl => {
            newVals[cl.id] = {
              qty_office: cl.quantity !== null ? String(cl.quantity) : "",
              qty_crew: cl.qty_crew !== null ? String(cl.qty_crew) : "",
              rate: String(cl.rate || 0),
              unit: cl.unit || "",
              isCustom: true,
              custom_label: cl.custom_label || "Custom Line",
              sub_label: "Added by Crew",
              sort_order: cl.sort_order || 999
            };
          });
          return newVals;
        });

        setSections(prev => {
          const newSecs = [...prev];
          const firstSec = newSecs[0];
          if (firstSec) {
            const customLines = billItems.filter(bi => !bi.template_item_id);
            // remove existing custom lines from firstSec
            firstSec.items = firstSec.items.filter(it => !it.isCustom);
            customLines.forEach((cl) => {
              firstSec.items.push({
                id: cl.id,
                isCustom: true,
                label: cl.custom_label || "Custom Line",
                sub_label: "Added by Crew",
                sort_order: 9999 + (cl.sort_order || 0),
                qty_office: cl.quantity !== undefined && cl.quantity !== null ? cl.quantity : null,
                qty_crew: cl.qty_crew !== undefined && cl.qty_crew !== null ? cl.qty_crew : null,
                unit: cl.unit || "",
                rate: cl.rate || 0,
                lineTotal: ((cl.qty_crew !== null ? cl.qty_crew : (cl.quantity || 0)) * (cl.rate || 0)),
              });
            });
          }
          return newSecs;
        });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save line");
    } finally {
      setSavingLine(false);
    }
  };

  const updateItem = (id: string, field: "qty_crew" | "rate", value: string) => {
    setItemValues((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      // Like the desktop, we drop the existing items and recreate them to sync perfectly.
      const { error: delError } = await supabase.from("job_labor_bill_items").delete().eq("labor_bill_id", billId);
      if (delError) throw delError;

      const inserts: any[] = [];
      
      Object.entries(itemValues).forEach(([id, v]) => {
        const qOff = parseFloat(v.qty_office);
        const qCrew = parseFloat(v.qty_crew);
        const rate = parseFloat(v.rate) || 0;
        
        // If it's not custom and has no qty, we can skip it, but keeping it if either qty exists
        if (!v.isCustom && isNaN(qOff) && isNaN(qCrew)) return;
        
        // Custom lines might have no qty, but we still keep them
        if (v.isCustom && isNaN(qOff) && isNaN(qCrew)) return;

        const effectiveQty = !isNaN(qCrew) ? qCrew : (!isNaN(qOff) ? qOff : 0);

        inserts.push({
          labor_bill_id: billId,
          template_item_id: v.isCustom ? null : id,
          quantity: !isNaN(qOff) ? qOff : null,
          qty_crew: !isNaN(qCrew) ? qCrew : null,
          rate: rate,
          unit: v.unit,
          line_total: effectiveQty * rate,
          custom_label: v.isCustom ? v.custom_label : null,
          sort_order: v.sort_order
        });
      });

      if (inserts.length > 0) {
        const { error: insError } = await supabase.from("job_labor_bill_items").insert(inserts);
        if (insError) throw insError;
      }

      onClose(); // Close modal on success
    } catch (e) {
      console.error(e);
      alert("Failed to save updates.");
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background border-t border-surface-container-highest rounded-t-3xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom duration-300 max-h-[92dvh] overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSiding ? "bg-[#ff7351]/10" : "bg-[#60b8f5]/10"}`}>
              <span className={`material-symbols-outlined text-lg ${isSiding ? "text-[#ff7351]" : "text-[#60b8f5]"}`} translate="no">
                {isSiding ? "home_repair_service" : "format_paint"}
              </span>
            </div>
            <div>
              <h2 className="text-on-surface font-bold text-lg leading-tight">
                {billTitle}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${st.bg} ${st.text}`}>
                  {billStatus}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center text-on-surface-variant active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-lg" translate="no">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 pb-12">
          {/* Search Bar */}
          <div className="mb-4 bg-surface-container-low rounded-2xl border border-white/5 p-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" translate="no">search</span>
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search items by name..."
                className="w-full bg-background border border-white/10 text-on-surface rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/50"
              />
              {itemSearch && (
                <button onClick={() => setItemSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined text-sm" translate="no">close</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl" translate="no">sync</span>
            </div>
          ) : sections.length === 0 ? (
            <div className="flex justify-center py-10 bg-surface-container-high rounded-2xl border border-white/5">
              <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-2xl" translate="no">receipt_long</span>
                <p className="text-xs font-medium">No items found for this bill.</p>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden">
              {sections.map((sec, si) => {
                const searchLower = itemSearch.toLowerCase();
                const visibleItems = itemSearch
                  ? sec.items.filter(it => it.label.toLowerCase().includes(searchLower) || it.sub_label?.toLowerCase().includes(searchLower))
                  : sec.items;

                const isOpen = expandedSections.has(sec.id) || (itemSearch.length > 0 && visibleItems.length > 0);
                const sectionTotal = sec.items.reduce((s, it) => s + it.lineTotal, 0);

                if (visibleItems.length === 0 && !addingLine && itemSearch) return null;

                return (
                  <div key={sec.id}>
                    {si > 0 && <div className="border-t border-white/5" />}
                    <button
                      onClick={() => toggleSection(sec.id)}
                      className="w-full flex items-center justify-between px-4 py-4 hover:bg-surface-container-high transition-colors active:bg-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-lg text-outline-variant transition-transform ${isOpen ? "rotate-180" : ""}`} translate="no">expand_more</span>
                        <span className="text-[12px] font-extrabold uppercase text-on-surface tracking-tight text-left leading-tight">{sec.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Section total calc */}
                        <span className="text-xs font-black text-primary">
                          ${sec.items.reduce((s, it) => {
                            const v = itemValues[it.id];
                            if (!v) return s;
                            const qOffStr = v.qty_office?.toString().trim();
                            const qCrewStr = v.qty_crew?.toString().trim();
                            const qOff = qOffStr !== "" && qOffStr !== undefined ? parseFloat(qOffStr) : NaN;
                            const qCrew = qCrewStr !== "" && qCrewStr !== undefined ? parseFloat(qCrewStr) : NaN;
                            const rate = parseFloat(v.rate) || 0;
                            const eff = !isNaN(qCrew) ? qCrew : (!isNaN(qOff) ? qOff : 0);
                            return s + (eff * rate);
                          }, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold hidden sm:inline">{sec.items.length} items</span>
                      </div>
                    </button>
                    
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        {visibleItems.map((item) => {
                          const v = itemValues[item.id] || { qty_office: "", qty_crew: "", rate: "0", unit: "" };
                          const qOffStr = v.qty_office?.toString().trim();
                          const qCrewStr = v.qty_crew?.toString().trim();
                          const qOff = qOffStr !== "" && qOffStr !== undefined ? parseFloat(qOffStr) : NaN;
                          const qCrew = qCrewStr !== "" && qCrewStr !== undefined ? parseFloat(qCrewStr) : NaN;
                          const r = parseFloat(v.rate) || 0;
                          const effectiveQty = !isNaN(qCrew) ? qCrew : (!isNaN(qOff) ? qOff : 0);
                          const isFilled = effectiveQty > 0 || item.isCustom;
                          const lineTotal = effectiveQty * r;

                          return (
                            <div key={item.id} className={`rounded-xl p-3 border transition-colors ${isFilled ? "bg-primary/5 border-primary/30" : "bg-surface-container-high border-white/5 opacity-50"}`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className={`text-sm font-bold leading-tight mb-1 ${isFilled ? "text-primary" : "text-on-surface"}`}>{item.label}</p>
                                  {item.sub_label && <p className="text-[10px] text-on-surface-variant leading-tight mb-2">{item.sub_label}</p>}
                                </div>
                                {isFilled && (
                                  <span className="material-symbols-outlined text-primary text-[18px]" translate="no">check_circle</span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Qty (Office)</p>
                                  <p className={`text-sm font-bold ${isFilled ? "text-on-surface" : "text-on-surface-variant"} px-2 py-1 bg-surface-container rounded-lg border border-white/5`}>{!isNaN(qOff) ? qOff : "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#60b8f5] mb-1">Qty (Crew)</p>
                                  <input type="number" step="any" value={v.qty_crew} onChange={e => updateItem(item.id, "qty_crew", e.target.value)}
                                    className="w-full bg-background border border-[#60b8f5]/30 text-on-surface rounded-lg px-2 py-1 text-sm outline-none focus:border-[#60b8f5] transition-colors placeholder:text-on-surface-variant/30"
                                    placeholder="Enter qty..." />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Rate ($)</p>
                                  <input type="number" step="any" value={v.rate} onChange={e => updateItem(item.id, "rate", e.target.value)}
                                    className="w-full bg-background border border-white/10 text-on-surface rounded-lg px-2 py-1 text-sm outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/30"
                                    placeholder="Rate" />
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Uni</p>
                                  <p className={`text-sm font-bold ${isFilled ? "text-on-surface" : "text-on-surface-variant"} px-2 py-1`}>{v.unit || "—"}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total</p>
                                  <p className="text-sm font-black text-primary px-2 py-1">${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {addingLine?.sectionId === sec.id ? (
                          <div className="bg-surface-container rounded-xl p-3 border border-dashed border-primary/30 space-y-2 mt-2">
                            <input type="text" value={addingLine.label} onChange={e => setAddingLine({ ...addingLine, label: e.target.value })}
                              placeholder="Item name..." className="w-full bg-background border border-primary/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary" />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold uppercase text-on-surface-variant block mb-1">Qty</label>
                                <input type="number" step="any" value={addingLine.qty} onChange={e => setAddingLine({ ...addingLine, qty: e.target.value })} className="w-full bg-background border border-primary/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary" />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold uppercase text-on-surface-variant block mb-1">Unit</label>
                                <input type="text" value={addingLine.unit} onChange={e => setAddingLine({ ...addingLine, unit: e.target.value })} className="w-full bg-background border border-primary/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary" />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <button onClick={() => setAddingLine(null)} className="px-3 py-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface">Cancel</button>
                              <button onClick={handleSaveCustomLine} disabled={savingLine} className="px-3 py-1.5 bg-primary text-[#1a2e00] rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                                {savingLine ? "Saving..." : "Save Line"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAddingLine({ sectionId: sec.id, label: "", qty: "", unit: "" })}
                            className="w-full py-2.5 mt-2 rounded-xl border border-dashed border-primary/30 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/5 hover:border-primary/50 transition-all flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm" translate="no">add</span>
                            Add Line
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Footer (Total + Save Button) */}
          {!loading && sections.length > 0 && (
            <div className="mt-6 sticky bottom-4 bg-surface-container-low border border-white/10 p-4 rounded-2xl shadow-xl z-10 flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                 <span className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Grand Total</span>
                 <span className="text-2xl font-black text-primary">
                    ${Object.values(itemValues).reduce((acc, v) => {
                      const qOffStr = v.qty_office?.toString().trim();
                      const qCrewStr = v.qty_crew?.toString().trim();
                      const qOff = qOffStr !== "" && qOffStr !== undefined ? parseFloat(qOffStr) : NaN;
                      const qCrew = qCrewStr !== "" && qCrewStr !== undefined ? parseFloat(qCrewStr) : NaN;
                      const rate = parseFloat(v.rate) || 0;
                      const eff = !isNaN(qCrew) ? qCrew : (!isNaN(qOff) ? qOff : 0);
                      return acc + (eff * rate);
                    }, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                 </span>
              </div>
              <button
                onClick={handleSaveAll}
                disabled={savingAll}
                className="w-full bg-primary text-[#1a2e00] font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {savingAll ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" translate="no">sync</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" translate="no">save</span>
                    Save Updates
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
