"use client";

import { TopBar } from "../../../components/TopBar";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabase";

import { CustomDropdown } from "../../../components/CustomDropdown";

interface Template { id: string; code: string; title: string; }
interface Section { id: string; title: string; sort_order: number; items: TemplateItem[]; }
interface TemplateItem { id: string; label: string; sub_label: string | null; default_qty: number | null; default_unit: string | null; sort_order: number; }
interface JobOption { id: string; title: string; job_number: string; customer_name?: string; }
interface CrewOption { id: string; name: string; }
interface SalespersonOption { id: string; full_name: string; }
interface LaborBill { id: string; job_id: string; template_id: string; crew_id: string | null; installer_name: string | null; status: string; total: number; created_at: string; completion_date: string | null; observations: string | null; jobs?: any; crews?: any; labor_bill_templates?: any; }

type ItemValues = Record<string, { qty: string; unit: string; rate: string; qty_office: string; qty_crew: string }>;
type CustomLine = { tempId: string; label: string; qty_office: string; qty_crew: string; unit: string; rate: string };

export default function LaborBillsPage() {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [itemValues, setItemValues] = useState<ItemValues>({});
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [crews, setCrews] = useState<CrewOption[]>([]);
  const [filteredCrews, setFilteredCrews] = useState<CrewOption[]>([]);
  const [salespersons, setSalespersons] = useState<SalespersonOption[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedCrew, setSelectedCrew] = useState("");
  const [installerName, setInstallerName] = useState("");
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [bills, setBills] = useState<LaborBill[]>([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [jobSearch, setJobSearch] = useState("");
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [billStatus, setBillStatus] = useState("draft");
  const [itemSearch, setItemSearch] = useState("");
  const [customLines, setCustomLines] = useState<Record<string, CustomLine[]>>({});

  // Load templates + jobs + crews + salespersons
  useEffect(() => {
    (async () => {
      const [t, j, c, s] = await Promise.all([
        supabase.from("labor_bill_templates").select("id, code, title"),
        supabase.from("jobs").select("id, title, job_number, customer:customers(full_name)").order("created_at", { ascending: false }),
        supabase.from("crews").select("id, name").eq("active", true).order("name"),
        supabase.from("profiles").select("id, full_name").eq("role", "salesperson").order("full_name")
      ]);
      setTemplates(t.data || []);
      setJobs((j.data || []).map((x: any) => ({ id: x.id, title: x.title, job_number: x.job_number, customer_name: Array.isArray(x.customer) ? x.customer[0]?.full_name : x.customer?.full_name })));
      setCrews(c.data || []);
      setFilteredCrews(c.data || []);
      setSalespersons(s.data || []);
    })();
  }, []);

  // Load labor bills list
  const fetchBills = useCallback(async () => {
    setBillsLoading(true);
    const { data } = await supabase.from("job_labor_bills").select("id, job_id, template_id, crew_id, installer_name, status, total, created_at, completion_date, observations, jobs(title, job_number), crews(name), labor_bill_templates:labor_bill_templates!job_labor_bills_template_id_fkey(title, code)").order("created_at", { ascending: false });
    setBills((data || []) as unknown as LaborBill[]);
    setBillsLoading(false);
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  // Load template sections when template selected
  const loadTemplate = async (tmpl: Template) => {
    setSelectedTemplate(tmpl);
    setSelectedCrew("");
    const { data: secs } = await supabase.from("labor_bill_template_sections").select("id, title, sort_order").eq("template_id", tmpl.id).order("sort_order");
    if (!secs) return;
    const sectionsWithItems: Section[] = [];
    for (const sec of secs) {
      const { data: items } = await supabase.from("labor_bill_template_items").select("id, label, sub_label, default_qty, default_unit, sort_order").eq("section_id", sec.id).order("sort_order");
      sectionsWithItems.push({ ...sec, items: items || [] });
    }
    setSections(sectionsWithItems);
    setExpandedSections(new Set());
    // Init values from defaults
    const vals: ItemValues = {};
    sectionsWithItems.forEach(s => s.items.forEach(it => {
      vals[it.id] = { qty: it.default_qty?.toString() || "", unit: it.default_unit || "", rate: "", qty_office: it.default_qty?.toString() || "", qty_crew: "" };
    }));
    setItemValues(vals);
    setCustomLines({});
    setItemSearch("");

    // Filter crews by template discipline
    const TEMPLATE_TO_SPEC: Record<string, string[]> = {
      siding: ["siding_installation"],
      painting: ["painting"],
      gutters: ["gutters"],
      roofing: ["roofing"],
      doors: ["doors"],
      windows: ["windows"],
      decks: ["deck_building"],
    };
    const tmplCode = tmpl.code.toLowerCase();
    const specCodes = Object.entries(TEMPLATE_TO_SPEC).find(([key]) => tmplCode.includes(key))?.[1];

    if (specCodes && specCodes.length > 0) {
      try {
        // Get specialty IDs matching the template discipline
        const { data: matchedSpecs } = await supabase
          .from("specialties")
          .select("id")
          .in("code", specCodes);

        if (matchedSpecs && matchedSpecs.length > 0) {
          const specIds = matchedSpecs.map(s => s.id);

          // Get crew IDs that have this specialty
          const { data: csRows } = await supabase
            .from("crew_specialties")
            .select("crew_id")
            .in("specialty_id", specIds);

          if (csRows && csRows.length > 0) {
            const matchedCrewIds = new Set(csRows.map((r: any) => r.crew_id));
            const filtered = crews.filter(c => matchedCrewIds.has(c.id));
            setFilteredCrews(filtered.length > 0 ? filtered : crews);
          } else {
            setFilteredCrews(crews);
          }
        } else {
          setFilteredCrews(crews);
        }
      } catch (err) {
        console.error("[LaborBills] crew filter error:", err);
        setFilteredCrews(crews);
      }
    } else {
      setFilteredCrews(crews);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const updateItem = (itemId: string, field: "qty" | "unit" | "rate" | "qty_office" | "qty_crew", value: string) => {
    setItemValues(prev => {
      const cur = prev[itemId];
      const updated = { ...cur, [field]: value };
      // Keep legacy qty in sync with effective quantity for backward compat
      if (field === "qty_office" || field === "qty_crew") {
        updated.qty = (field === "qty_crew" && value) ? value : (field === "qty_office" ? value : cur.qty_office || "");
      }
      return { ...prev, [itemId]: updated };
    });
  };

  const calcLineTotal = (v: { qty_office: string; qty_crew: string; rate: string }): number => {
    const effectiveQty = parseFloat(v.qty_crew) || parseFloat(v.qty_office) || 0;
    return effectiveQty * (parseFloat(v.rate) || 0);
  };

  const grandTotal = (() => {
    let total = Object.values(itemValues).reduce((sum, v) => sum + calcLineTotal(v), 0);
    // Add custom lines
    Object.values(customLines).flat().forEach(cl => {
      const effectiveQty = parseFloat(cl.qty_crew) || parseFloat(cl.qty_office) || 0;
      total += effectiveQty * (parseFloat(cl.rate) || 0);
    });
    return total;
  })();

  const addCustomLine = (sectionId: string) => {
    setCustomLines(prev => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), { tempId: crypto.randomUUID(), label: "", qty_office: "", qty_crew: "", unit: "", rate: "" }]
    }));
  };

  const updateCustomLine = (sectionId: string, tempId: string, field: keyof CustomLine, value: string) => {
    setCustomLines(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || []).map(cl => cl.tempId === tempId ? { ...cl, [field]: value } : cl)
    }));
  };

  const removeCustomLine = (sectionId: string, tempId: string) => {
    setCustomLines(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || []).filter(cl => cl.tempId !== tempId)
    }));
  };

  const handleEdit = async (bill: LaborBill) => {
    setEditingBillId(bill.id);
    setBillStatus(bill.status || "draft");
    setSelectedJob(bill.job_id);
    setSelectedCrew(bill.crew_id || "");
    setInstallerName(bill.installer_name || "");
    setObservations(bill.observations || "");

    const tmpl = templates.find(t => t.id === bill.template_id);
    if (!tmpl) return;

    setSelectedTemplate(tmpl);
    const { data: secs } = await supabase.from("labor_bill_template_sections").select("id, title, sort_order").eq("template_id", tmpl.id).order("sort_order");
    if (!secs) return;
    const sectionsWithItems: Section[] = [];
    for (const sec of secs) {
      const { data: items } = await supabase.from("labor_bill_template_items").select("id, label, sub_label, default_qty, default_unit, sort_order").eq("section_id", sec.id).order("sort_order");
      sectionsWithItems.push({ ...sec, items: items || [] });
    }
    setSections(sectionsWithItems);
    setExpandedSections(new Set());

    // Fetch existing values
    const { data: existingItems } = await supabase.from("job_labor_bill_items").select("*").eq("labor_bill_id", bill.id);
    
    const vals: ItemValues = {};
    const loadedCustom: Record<string, CustomLine[]> = {};
    sectionsWithItems.forEach(s => s.items.forEach(it => {
      const existing = existingItems?.find(ei => ei.template_item_id === it.id);
      vals[it.id] = { 
        qty: existing?.quantity?.toString() || "", 
        unit: existing?.unit || it.default_unit || "", 
        rate: existing?.rate?.toString() || "",
        qty_office: existing?.qty_office?.toString() || existing?.quantity?.toString() || "",
        qty_crew: existing?.qty_crew?.toString() || ""
      };
    }));
    // Load custom lines (items with custom_label, no template_item_id)
    const customItems = existingItems?.filter(ei => ei.custom_label && !ei.template_item_id) || [];
    // Group by sort_order pattern (we store section id in a deterministic way) — just put them all in first section
    if (customItems.length > 0 && sectionsWithItems.length > 0) {
      const sectionId = sectionsWithItems[0].id;
      loadedCustom[sectionId] = customItems.map(ci => ({
        tempId: ci.id,
        label: ci.custom_label || "",
        qty_office: ci.qty_office?.toString() || ci.quantity?.toString() || "",
        qty_crew: ci.qty_crew?.toString() || "",
        unit: ci.unit || "",
        rate: ci.rate?.toString() || ""
      }));
    }
    setItemValues(vals);
    setCustomLines(loadedCustom);
    setItemSearch("");
    setTab("create");

    // Filter crews by template discipline
    const TEMPLATE_TO_SPEC: Record<string, string[]> = {
      siding: ["siding_installation"],
      painting: ["painting"],
      gutters: ["gutters"],
      roofing: ["roofing"],
      doors: ["doors"],
      windows: ["windows"],
      decks: ["deck_building"],
    };
    const tmplCode = tmpl.code.toLowerCase();
    const specCodes = Object.entries(TEMPLATE_TO_SPEC).find(([key]) => tmplCode.includes(key))?.[1];

    if (specCodes && specCodes.length > 0) {
      try {
        const { data: matchedSpecs } = await supabase.from("specialties").select("id").in("code", specCodes);
        if (matchedSpecs && matchedSpecs.length > 0) {
          const specIds = matchedSpecs.map(s => s.id);
          const { data: csRows } = await supabase.from("crew_specialties").select("crew_id").in("specialty_id", specIds);
          if (csRows && csRows.length > 0) {
            const matchedCrewIds = new Set(csRows.map((r: any) => r.crew_id));
            const filtered = crews.filter(c => matchedCrewIds.has(c.id));
            setFilteredCrews(filtered.length > 0 ? filtered : crews);
          } else {
            setFilteredCrews(crews);
          }
        } else {
          setFilteredCrews(crews);
        }
      } catch (err) {
        setFilteredCrews(crews);
      }
    } else {
      setFilteredCrews(crews);
    }
  };

  const handleSave = async () => {
    if (!selectedTemplate || !selectedJob) return;
    setSaving(true);
    try {
      const filledItems = Object.entries(itemValues).filter(([, v]) => {
        const effectiveQty = parseFloat(v.qty_crew) || parseFloat(v.qty_office) || 0;
        return effectiveQty > 0 || parseFloat(v.rate) > 0;
      });
      let billId = editingBillId;

      if (editingBillId) {
        // Update existing
        const { error } = await supabase.from("job_labor_bills").update({
          job_id: selectedJob, crew_id: selectedCrew || null,
          installer_name: installerName || null, observations: observations || null,
          status: billStatus, total: grandTotal,
        }).eq("id", editingBillId);
        if (error) { console.error(error); setSaving(false); return; }

        // Delete existing items to recreate
        await supabase.from("job_labor_bill_items").delete().eq("labor_bill_id", editingBillId);
      } else {
        // Create new
        const { data: bill, error } = await supabase.from("job_labor_bills").insert({
          job_id: selectedJob, template_id: selectedTemplate.id, crew_id: selectedCrew || null,
          installer_name: installerName || null, observations: observations || null,
          status: billStatus, total: grandTotal,
        }).select("id").single();
        if (error || !bill) { console.error(error); setSaving(false); return; }
        billId = bill.id;
      }

      if (billId) {
        const rows: any[] = [];
        // Template items
        filledItems.forEach(([itemId, v], idx) => {
          const effectiveQty = parseFloat(v.qty_crew) || parseFloat(v.qty_office) || 0;
          rows.push({
            labor_bill_id: billId, template_item_id: itemId,
            quantity: effectiveQty, unit: v.unit, rate: parseFloat(v.rate) || 0,
            qty_office: parseFloat(v.qty_office) || null,
            qty_crew: parseFloat(v.qty_crew) || null,
            line_total: calcLineTotal(v),
            sort_order: idx,
          });
        });
        // Custom lines
        Object.values(customLines).flat().forEach((cl, idx) => {
          const effectiveQty = parseFloat(cl.qty_crew) || parseFloat(cl.qty_office) || 0;
          if (effectiveQty > 0 || parseFloat(cl.rate) > 0 || cl.label) {
            rows.push({
              labor_bill_id: billId, template_item_id: null,
              custom_label: cl.label || "Custom Line",
              quantity: effectiveQty, unit: cl.unit, rate: parseFloat(cl.rate) || 0,
              qty_office: parseFloat(cl.qty_office) || null,
              qty_crew: parseFloat(cl.qty_crew) || null,
              line_total: effectiveQty * (parseFloat(cl.rate) || 0),
              sort_order: filledItems.length + idx,
            });
          }
        });
        if (rows.length > 0) {
          await supabase.from("job_labor_bill_items").insert(rows);
        }
      }
      
      // Reset
      setTab("list"); setSelectedTemplate(null); setSections([]); setItemValues({});
      setSelectedJob(""); setSelectedCrew(""); setInstallerName(""); setObservations("");
      setEditingBillId(null); setCustomLines({}); setItemSearch("");
      setBillStatus("draft");
      fetchBills();
    } finally { setSaving(false); }
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-[#22c55e]/15 text-[#22c55e]";
    if (s === "submitted") return "bg-[#60b8f5]/15 text-[#60b8f5]";
    return "bg-surface-container-highest text-on-surface-variant";
  };

  const filteredJobs = jobSearch ? jobs.filter(j => {
    const q = jobSearch.toLowerCase();
    return j.title?.toLowerCase().includes(q) || j.job_number?.toLowerCase().includes(q) || j.customer_name?.toLowerCase().includes(q);
  }) : jobs;

  return (
    <>
      <TopBar />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tighter" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Labor Bills</h2>
            <p className="text-on-surface-variant mt-1 text-sm">
              <span className="text-primary font-bold">{bills.length}</span> labor bills created
            </p>
          </div>
          <button onClick={() => {
            if (tab === "list") {
              setEditingBillId(null);
              setBillStatus("draft");
              setSelectedTemplate(null); setSections([]); setItemValues({});
              setSelectedJob(""); setSelectedCrew(""); setInstallerName(""); setObservations("");
              setTab("create");
            } else {
              setTab("list");
            }
          }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-sm"
            style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
            <span className="material-symbols-outlined text-[18px]" translate="no">{tab === "list" ? "add" : "arrow_back"}</span>
            {tab === "list" ? "New Labor Bill" : "Back to List"}
          </button>
        </div>

        {/* ═══ CREATE TAB ═══ */}
        {tab === "create" && (
          <div className="space-y-6">
            {/* Step 1: Template selection */}
            {!selectedTemplate ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.map(t => (
                  <button key={t.id} onClick={() => loadTemplate(t)}
                    className="p-6 rounded-2xl bg-surface-container-low border border-outline-variant/15 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all text-left group">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <span className="material-symbols-outlined text-primary text-2xl" translate="no">{t.code.includes("siding") ? "home_repair_service" : "format_paint"}</span>
                      </div>
                      <div>
                        <p className="text-lg font-extrabold text-on-surface">{t.title}</p>
                        <p className="text-xs text-on-surface-variant uppercase tracking-widest font-bold mt-1">{t.code}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Template header + job/crew fields */}
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant/15 p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-lg" translate="no">receipt_long</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-extrabold text-on-surface">{selectedTemplate.title}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">{selectedTemplate.code}</p>
                    </div>
                    <button onClick={() => { setSelectedTemplate(null); setSections([]); }}
                      className="text-on-surface-variant hover:text-on-surface transition-colors">
                      <span className="material-symbols-outlined" translate="no">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Project with search */}
                    <div className="flex flex-col gap-1.5 z-50">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Project *</label>
                      <CustomDropdown
                        value={selectedJob}
                        onChange={(val: string) => setSelectedJob(val)}
                        options={jobs.map(j => ({ value: j.id, label: j.customer_name || j.title || j.job_number }))}
                        placeholder="Select project..."
                        searchable
                        className="bg-surface-container border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3 text-sm flex justify-between items-center transition-colors hover:border-primary w-full"
                      />
                    </div>
                    
                    {/* Crew */}
                    <div className="flex flex-col gap-1.5 z-40">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Crew</label>
                      <CustomDropdown
                        value={selectedCrew}
                        onChange={(val: string) => setSelectedCrew(val)}
                        options={filteredCrews.map(c => ({ value: c.id, label: c.name }))}
                        placeholder="Select crew..."
                        className="bg-surface-container border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3 text-sm flex justify-between items-center transition-colors hover:border-primary w-full"
                      />
                    </div>
                    
                    {/* Salesperson (Replacing Installer Name) */}
                    <div className="flex flex-col gap-1.5 z-30">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Salesperson</label>
                      <CustomDropdown
                        value={installerName}
                        onChange={(val: string) => setInstallerName(val)}
                        options={salespersons.map(s => ({ value: s.full_name, label: s.full_name }))}
                        placeholder="Select salesperson..."
                        searchable
                        className="bg-surface-container border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3 text-sm flex justify-between items-center transition-colors hover:border-primary w-full"
                      />
                    </div>
                    
                    {/* Status */}
                    <div className="flex flex-col gap-1.5 z-20">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</label>
                      <select 
                        value={billStatus} 
                        onChange={(e) => setBillStatus(e.target.value)}
                        className="bg-surface-container border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors w-full"
                      >
                        <option value="draft">Draft</option>
                        <option value="submitted">Submitted</option>
                        <option value="approved">Approved</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant/15 p-4">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" translate="no">search</span>
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Search items by name..."
                      className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                    />
                    {itemSearch && (
                      <button onClick={() => setItemSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                        <span className="material-symbols-outlined text-sm" translate="no">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Accordion Sections */}
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant/15 overflow-hidden">
                  {sections.map((sec, si) => {
                    const isOpen = expandedSections.has(sec.id);
                    const sectionCustomLines = customLines[sec.id] || [];
                    // Filter items by search
                    const searchLower = itemSearch.toLowerCase();
                    const visibleItems = itemSearch
                      ? sec.items.filter(it => it.label.toLowerCase().includes(searchLower) || it.sub_label?.toLowerCase().includes(searchLower))
                      : sec.items;
                    // Section total (template items + custom lines)
                    const sectionTotal = sec.items.reduce((s, it) => {
                      const v = itemValues[it.id];
                      return v ? s + calcLineTotal(v) : s;
                    }, 0) + sectionCustomLines.reduce((s, cl) => {
                      const effectiveQty = parseFloat(cl.qty_crew) || parseFloat(cl.qty_office) || 0;
                      return s + effectiveQty * (parseFloat(cl.rate) || 0);
                    }, 0);
                    const filledCount = sec.items.filter(it => {
                      const v = itemValues[it.id];
                      if (!v) return false;
                      const effectiveQty = parseFloat(v.qty_crew) || parseFloat(v.qty_office) || 0;
                      return effectiveQty > 0 && parseFloat(v.rate) > 0;
                    }).length + sectionCustomLines.filter(cl => {
                      const effectiveQty = parseFloat(cl.qty_crew) || parseFloat(cl.qty_office) || 0;
                      return effectiveQty > 0 && parseFloat(cl.rate) > 0;
                    }).length;

                    // Auto-expand if searching and there are visible results
                    const effectiveOpen = isOpen || (itemSearch.length > 0 && visibleItems.length > 0);

                    return (
                      <div key={sec.id}>
                        {si > 0 && <div className="border-t border-outline-variant/10" />}
                        <button onClick={() => toggleSection(sec.id)}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-container transition-colors">
                          <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined text-lg transition-transform ${effectiveOpen ? "rotate-180" : ""}`} translate="no">expand_more</span>
                            <span className="text-sm font-bold text-on-surface text-left">{sec.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {filledCount > 0 && <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-black">{filledCount}</span>}
                            {sectionTotal > 0 && <span className="text-xs font-bold text-primary">${sectionTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>}
                            <span className="text-[10px] text-on-surface-variant font-bold">{sec.items.length + sectionCustomLines.length} items</span>
                          </div>
                        </button>
                        {effectiveOpen && (
                          <div className="px-4 pb-4 space-y-2">
                            {/* Column headers */}
                            <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_60px_80px] gap-2 px-3 pb-1">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Item</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Qty (Office)</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Qty (Crew)</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Rate ($)</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Uni</span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant text-right">Total</span>
                            </div>

                            {/* Template items */}
                            {visibleItems.map(item => {
                              const v = itemValues[item.id] || { qty: "", unit: "", rate: "", qty_office: "", qty_crew: "" };
                              const lineTotal = calcLineTotal(v);
                              return (
                                <div key={item.id} className="bg-surface-container rounded-xl p-3 border border-outline-variant/10">
                                  {/* Mobile: stacked layout */}
                                  <div className="sm:hidden space-y-2">
                                    <p className="text-sm font-semibold text-on-surface">{item.label}</p>
                                    {item.sub_label && <p className="text-[11px] text-on-surface-variant">{item.sub_label}</p>}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Qty (Office)</label>
                                        <input type="number" step="any" value={v.qty_office} onChange={e => updateItem(item.id, "qty_office", e.target.value)}
                                          className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition-colors" />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Qty (Crew)</label>
                                        <input type="number" step="any" value={v.qty_crew} onChange={e => updateItem(item.id, "qty_crew", e.target.value)}
                                          className="w-full bg-background border border-[#60b8f5]/30 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#60b8f5] transition-colors" />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Rate ($)</label>
                                        <input type="number" step="0.01" value={v.rate} onChange={e => updateItem(item.id, "rate", e.target.value)}
                                          className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition-colors" />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">Uni</label>
                                        <input type="text" value={v.unit} onChange={e => updateItem(item.id, "unit", e.target.value)}
                                          className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition-colors" />
                                      </div>
                                    </div>
                                    {lineTotal > 0 && <div className="text-right"><span className="text-xs font-bold text-primary">${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>}
                                  </div>
                                  {/* Desktop: single row */}
                                  <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_60px_80px] gap-2 items-center">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-on-surface truncate">{item.label}</p>
                                      {item.sub_label && <p className="text-[10px] text-on-surface-variant truncate">{item.sub_label}</p>}
                                    </div>
                                    <input type="number" step="any" value={v.qty_office} onChange={e => updateItem(item.id, "qty_office", e.target.value)}
                                      className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary transition-colors text-center" />
                                    <input type="number" step="any" value={v.qty_crew} onChange={e => updateItem(item.id, "qty_crew", e.target.value)}
                                      className="w-full bg-background border border-[#60b8f5]/30 text-on-surface rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#60b8f5] transition-colors text-center"
                                      placeholder="—" />
                                    <input type="number" step="0.01" value={v.rate} onChange={e => updateItem(item.id, "rate", e.target.value)}
                                      className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary transition-colors text-center" />
                                    <input type="text" value={v.unit} onChange={e => updateItem(item.id, "unit", e.target.value)}
                                      className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary transition-colors text-center" />
                                    <span className={`text-sm font-bold text-right ${lineTotal > 0 ? "text-primary" : "text-on-surface-variant/40"}`}>
                                      ${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Custom lines */}
                            {sectionCustomLines.map(cl => {
                              const clTotal = (parseFloat(cl.qty_crew) || parseFloat(cl.qty_office) || 0) * (parseFloat(cl.rate) || 0);
                              return (
                                <div key={cl.tempId} className="bg-surface-container rounded-xl p-3 border border-dashed border-primary/30 relative">
                                  <button onClick={() => removeCustomLine(sec.id, cl.tempId)}
                                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-error/10 text-error hover:bg-error/20 flex items-center justify-center transition-colors">
                                    <span className="material-symbols-outlined text-[12px]" translate="no">close</span>
                                  </button>
                                  {/* Desktop row */}
                                  <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_60px_80px] gap-2 items-center">
                                    <input type="text" value={cl.label} onChange={e => updateCustomLine(sec.id, cl.tempId, "label", e.target.value)}
                                      placeholder="Item name..."
                                      className="w-full bg-background border border-primary/20 text-on-surface rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary transition-colors" />
                                    <input type="number" step="any" value={cl.qty_office} onChange={e => updateCustomLine(sec.id, cl.tempId, "qty_office", e.target.value)}
                                      className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary transition-colors text-center" />
                                    <input type="number" step="any" value={cl.qty_crew} onChange={e => updateCustomLine(sec.id, cl.tempId, "qty_crew", e.target.value)}
                                      className="w-full bg-background border border-[#60b8f5]/30 text-on-surface rounded-lg px-2 py-1.5 text-sm outline-none focus:border-[#60b8f5] transition-colors text-center"
                                      placeholder="—" />
                                    <input type="number" step="0.01" value={cl.rate} onChange={e => updateCustomLine(sec.id, cl.tempId, "rate", e.target.value)}
                                      className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary transition-colors text-center" />
                                    <input type="text" value={cl.unit} onChange={e => updateCustomLine(sec.id, cl.tempId, "unit", e.target.value)}
                                      className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-2 py-1.5 text-sm outline-none focus:border-primary transition-colors text-center" />
                                    <span className={`text-sm font-bold text-right ${clTotal > 0 ? "text-primary" : "text-on-surface-variant/40"}`}>
                                      ${clTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  {/* Mobile stacked */}
                                  <div className="sm:hidden space-y-2 pr-6">
                                    <input type="text" value={cl.label} onChange={e => updateCustomLine(sec.id, cl.tempId, "label", e.target.value)}
                                      placeholder="Item name..." className="w-full bg-background border border-primary/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary" />
                                    <div className="grid grid-cols-2 gap-2">
                                      <div><label className="text-[9px] font-bold uppercase text-on-surface-variant">Qty (Office)</label>
                                        <input type="number" step="any" value={cl.qty_office} onChange={e => updateCustomLine(sec.id, cl.tempId, "qty_office", e.target.value)} className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary" /></div>
                                      <div><label className="text-[9px] font-bold uppercase text-on-surface-variant">Qty (Crew)</label>
                                        <input type="number" step="any" value={cl.qty_crew} onChange={e => updateCustomLine(sec.id, cl.tempId, "qty_crew", e.target.value)} className="w-full bg-background border border-[#60b8f5]/30 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#60b8f5]" /></div>
                                      <div><label className="text-[9px] font-bold uppercase text-on-surface-variant">Rate ($)</label>
                                        <input type="number" step="0.01" value={cl.rate} onChange={e => updateCustomLine(sec.id, cl.tempId, "rate", e.target.value)} className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary" /></div>
                                      <div><label className="text-[9px] font-bold uppercase text-on-surface-variant">Uni</label>
                                        <input type="text" value={cl.unit} onChange={e => updateCustomLine(sec.id, cl.tempId, "unit", e.target.value)} className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary" /></div>
                                    </div>
                                    {clTotal > 0 && <div className="text-right"><span className="text-xs font-bold text-primary">${clTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Add Line button */}
                            <button
                              type="button"
                              onClick={() => addCustomLine(sec.id)}
                              className="w-full py-2.5 rounded-xl border border-dashed border-primary/30 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/5 hover:border-primary/50 transition-all flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-sm" translate="no">add</span>
                              Add Line
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Observations */}
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant/15 p-5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                    Observations
                  </label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Add notes, instructions, or observations about this labor bill..."
                    rows={4}
                    className="w-full bg-background border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors resize-y min-h-[80px]"
                  />
                </div>

                {/* Footer: Total + Save */}
                <div className="bg-surface-container-low rounded-2xl border border-outline-variant/15 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Grand Total</p>
                    <p className="text-2xl font-black text-primary tracking-tight">${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <button onClick={handleSave} disabled={saving || !selectedJob}
                    className="px-8 py-3 bg-primary text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                    {saving && <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" />}
                    {saving ? "Saving..." : editingBillId ? "Update Labor Bill" : "Create Labor Bill"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ LIST TAB ═══ */}
        {tab === "list" && (
          <div className="bg-surface-container-low rounded-xl shadow-2xl border border-outline-variant/10">
            {billsLoading ? (
              <div className="flex justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl" translate="no">sync</span>
              </div>
            ) : bills.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
                <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-primary" translate="no">receipt_long</span>
                </div>
                <p className="text-sm font-bold text-on-surface">No labor bills yet</p>
                <p className="text-xs">Click &quot;New Labor Bill&quot; to create one.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-surface-container-high/50">
                      {["Date", "Template", "Project", "Crew / Sales", "Status", "Total", ""].map(col => (
                        <th key={col} className={`px-5 py-4 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest ${col === "Total" || col === "Status" ? "text-center" : ""}`}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(bill => {
                      const d = new Date(bill.created_at);
                      const dateStr = `${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getDate().toString().padStart(2,"0")}/${d.getFullYear()}`;
                      const jobData = Array.isArray(bill.jobs) ? bill.jobs[0] : bill.jobs;
                      const crewData = Array.isArray(bill.crews) ? bill.crews[0] : bill.crews;
                      const tmplData = Array.isArray(bill.labor_bill_templates) ? bill.labor_bill_templates[0] : bill.labor_bill_templates;
                      return (
                        <tr key={bill.id} className="border-t border-outline-variant/10 hover:bg-surface-container transition-colors">
                          <td className="px-5 py-3 text-sm text-on-surface">{dateStr}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${tmplData?.code?.includes("siding") ? "bg-[#ff7351]/15 text-[#ff7351]" : "bg-[#60b8f5]/15 text-[#60b8f5]"}`}>
                              {tmplData?.code?.includes("siding") ? "Siding" : "Paint"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-sm font-semibold text-on-surface">{jobData?.title || "—"}</p>
                            <p className="text-[10px] text-primary font-bold">{jobData?.job_number || ""}</p>
                          </td>
                          <td className="px-5 py-3 text-sm text-on-surface">{crewData?.name || bill.installer_name || "—"}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusColor(bill.status)}`}>{bill.status}</span>
                          </td>
                          <td className="px-5 py-3 text-center text-sm font-bold text-primary">${Number(bill.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => handleEdit(bill)} className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/20 hover:bg-white/10 text-on-surface-variant hover:text-white flex items-center justify-center transition-colors">
                              <span className="material-symbols-outlined text-[16px]" translate="no">edit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
