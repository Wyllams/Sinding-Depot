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
  id: string; // template item id
  label: string;
  sub_label: string | null;
  sort_order: number;
  quantity: number;
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

        // 4. Group items by section
        const grouped: SectionData[] = secsData.map((sec) => {
          const secItems = (tmplItems || []).filter((ti) => ti.section_id === sec.id);
          
          let hasFilled = false;
          
          const items: FilledItem[] = secItems.map((ti) => {
            const billed = filledBillItems.find((bi) => bi.template_item_id === ti.id);
            const qty = billed?.quantity || 0;
            const rate = billed?.rate || 0;
            
            if (qty > 0) hasFilled = true;
            
            return {
              id: ti.id,
              label: ti.label,
              sub_label: ti.sub_label,
              sort_order: ti.sort_order,
              quantity: qty,
              unit: billed?.unit || "",
              rate: rate,
              lineTotal: qty * rate,
            };
          }).sort((a, b) => a.sort_order - b.sort_order);

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
                <span className="text-primary font-black text-sm">
                  ${billTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                const isOpen = expandedSections.has(sec.id);
                const sectionTotal = sec.items.reduce((s, it) => s + it.lineTotal, 0);

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
                        {sectionTotal > 0 && <span className="text-xs font-black text-primary">${sectionTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>}
                        <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold hidden sm:inline">{sec.items.length} items</span>
                      </div>
                    </button>
                    
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        {sec.items.map((item) => {
                          const isFilled = item.quantity > 0;
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
                              
                              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/5">
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Qty</p>
                                  <p className={`text-sm font-bold ${isFilled ? "text-on-surface" : "text-on-surface-variant"}`}>{item.quantity || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Unit</p>
                                  <p className={`text-sm font-bold ${isFilled ? "text-on-surface" : "text-on-surface-variant"}`}>{item.unit || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Rate</p>
                                  <p className={`text-sm font-bold ${isFilled ? "text-on-surface" : "text-on-surface-variant"}`}>${item.rate.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                                </div>
                              </div>
                              
                              {item.lineTotal > 0 && (
                                <div className="mt-2 text-right">
                                  <span className="text-xs font-black text-primary">${item.lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
