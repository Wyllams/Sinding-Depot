"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { CustomDropdown } from "../../../components/CustomDropdown";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { TopBar } from "@/components/TopBar";
import { supabase } from "../../../lib/supabase";

// =============================================
// Cash Payments
// Rota: /cash-payments
// =============================================

interface CashPayment {
  id: string;
  date: string;
  jobName: string;
  store: string;
  amount: number;
  pickedBy: string;
  notes: string;
}

interface Store {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

// Constant removed as we will fetch from DB

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];



const fmt = (v: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const fmtDate = (d: string): string => {
  const dt = new Date(d + "T12:00:00");
  if (isNaN(dt.getTime())) return "—";
  return `${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear()}`;
};

const ActionMenu = ({ p, onEdit, onDelete }: { p: CashPayment, onEdit: () => void, onDelete: () => void }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
          (!menuRef.current || !menuRef.current.contains(e.target as Node))) {
        setOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClick);
      window.addEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.right - 128 });
    }
    setOpen(!open);
  };

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        title="Quick Actions"
        className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all ml-auto relative z-10"
      >
        <span className="material-symbols-outlined text-[16px]" translate="no">edit</span>
      </button>

      {open && typeof window !== "undefined" && createPortal(
        <div 
          ref={menuRef}
          className="fixed z-[99999] w-32 bg-surface-container border border-primary/20 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-left overflow-hidden" 
          style={{ top: coords.top, left: coords.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-primary" translate="no">edit</span>
            Edit
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-error hover:bg-error/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]" translate="no">delete</span>
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

export default function CashPaymentsPage() {
  const now = new Date();

  // ── State ────────────────────────────────────────
  const [payments, setPayments] = useState<CashPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  // Filters
  const [filterStore, setFilterStore] = useState("ALL");
  const [filterPickedBy, setFilterPickedBy] = useState("ALL");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState("");

  // New Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    date: "",
    jobName: "",
    store: "",
    amount: "",
    pickedBy: "",
    notes: "",
  });

  // Customer autocomplete — Add Modal
  const [customerSuggestions, setCustomerSuggestions] = useState<{ id: string; full_name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addSuggestionsRef = useRef<HTMLDivElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Customer autocomplete — Edit Modal
  const [editCustomerSuggestions, setEditCustomerSuggestions] = useState<{ id: string; full_name: string }[]>([]);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const editSuggestionsRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manage Employees Modal
  const [cashEmployees, setCashEmployees] = useState<{ id: string; name: string }[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");

  // Manage Stores Modal
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreColor, setNewStoreColor] = useState("#ffffff");
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editStoreName, setEditStoreName] = useState("");
  const [editStoreColor, setEditStoreColor] = useState("");

  // Delete Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Edit Payment Modal
  const [editingPayment, setEditingPayment] = useState<CashPayment | null>(null);
  const [editForm, setEditForm] = useState<CashPayment | null>(null);

  // ── Customer search helper (shared) ──────────────
  const searchCustomers = useCallback(async (query: string): Promise<{ id: string; full_name: string }[]> => {
    if (query.trim().length < 1) return [];
    const { data, error } = await supabase
      .from("customers")
      .select("id, full_name")
      .ilike("full_name", `%${query.trim()}%`)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) { console.error("[CashPayments] customer search error:", error); return []; }
    return data ?? [];
  }, []);

  // ── Close autocomplete on outside click ──────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addSuggestionsRef.current && !addSuggestionsRef.current.contains(e.target as Node) &&
          addInputRef.current && !addInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (editSuggestionsRef.current && !editSuggestionsRef.current.contains(e.target as Node) &&
          editInputRef.current && !editInputRef.current.contains(e.target as Node)) {
        setShowEditSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Load stores from Supabase ────────────────────
  useEffect(() => {
    loadStores();
    loadCashEmployees();
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setPaymentsLoading(true);
    const { data, error } = await supabase
      .from("cash_payments")
      .select("id, date, job_name, store, amount, picked_by, notes")
      .order("created_at", { ascending: false });
    
    if (data) {
      setPayments(data.map(d => ({
        id: d.id,
        date: d.date,
        jobName: d.job_name,
        store: d.store,
        amount: Number(d.amount),
        pickedBy: d.picked_by,
        notes: d.notes || ""
      })));
    } else if (error) {
       console.error("Error loading payments:", error);
    }
    setPaymentsLoading(false);
  };

  const loadCashEmployees = async () => {
    setEmployeesLoading(true);
    const { data, error } = await supabase.from("cash_employees").select("id, name").eq("active", true).order("name");
    if (data) {
       setCashEmployees(data);
       if (data.length > 0 && form.pickedBy === "") {
         setForm((prev) => ({ ...prev, pickedBy: data[0].name }));
       }
    }
    setEmployeesLoading(false);
  };

  const loadStores = async (): Promise<void> => {
    setStoresLoading(true);
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, color, active")
      .eq("active", true)
      .order("name");

    if (error) {
      console.error("Error loading stores:", error);
    } else if (data) {
      setStores(data);
      if (data.length > 0 && !form.store) {
        setForm((prev) => ({ ...prev, store: data[0].name }));
      }
    }
    setStoresLoading(false);
  };

  const getStoreColor = (storeName: string): string => {
    const store = stores.find((s) => s.name === storeName);
    return store?.color || "#e3eb5d";
  };

  // ── Store management ─────────────────────────────
  const handleAddStore = async (): Promise<void> => {
    const name = newStoreName.trim().toUpperCase();
    if (!name) return;

    const { error } = await supabase.from("stores").insert({ name, color: newStoreColor });
    if (error) {
      if (error.code === "23505") alert("Store already exists!");
      else console.error("Error adding store:", error);
      return;
    }

    setNewStoreName("");
    setNewStoreColor("#ffffff");
    await loadStores();
  };

  const handleUpdateStore = async (): Promise<void> => {
    if (!editingStore) return;
    const { error } = await supabase
      .from("stores")
      .update({ name: editStoreName.trim().toUpperCase(), color: editStoreColor })
      .eq("id", editingStore.id);

    if (error) {
      console.error("Error updating store:", error);
      return;
    }

    setEditingStore(null);
    await loadStores();
  };

  const handleDeleteStore = (storeId: string): void => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Store",
      message: "Are you sure you want to delete this store?",
      onConfirm: async () => {
        const { error } = await supabase.from("stores").update({ active: false }).eq("id", storeId);
        if (error) {
          console.error("Error deleting store:", error);
          return;
        }
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await loadStores();
      },
    });
  };

  // ── Employee management ──────────────────────────
  const handleAddEmployee = async () => {
    const name = newEmployeeName.trim().toUpperCase();
    if (!name) return;
    const { error } = await supabase.from("cash_employees").insert({ name });
    if (error) {
       console.error("Error adding employee:", error);
       if (error.code === "23505") alert("Employee already exists.");
       return;
    }
    setNewEmployeeName("");
    await loadCashEmployees();
  };

  const handleRemoveEmployee = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove from Filter",
      message: `Are you sure you want to remove ${name} from this filter?`,
      onConfirm: async () => {
        await supabase.from("cash_employees").update({ active: false }).eq("id", id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await loadCashEmployees();
      },
    });
  };

  // ── Payment handlers ─────────────────────────────
  const openEdit = (p: CashPayment): void => {
    setEditingPayment(p);
    setEditForm({ ...p });
  };

  const handleEditSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editForm) return;

    const { error } = await supabase
      .from('cash_payments')
      .update({
        date: editForm.date,
        job_name: editForm.jobName,
        store: editForm.store,
        amount: editForm.amount,
        picked_by: editForm.pickedBy,
        notes: editForm.notes
      })
      .eq('id', editForm.id);

    if (error) {
      console.error("Error updating payment", error);
      alert("Error updating payment");
      return;
    }

    setPayments((prev) => prev.map((p) => (p.id === editForm.id ? { ...editForm } : p)));
    setEditingPayment(null);
    setEditForm(null);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    const { data, error } = await supabase.from('cash_payments').insert({
      date: form.date,
      job_name: form.jobName,
      store: form.store,
      amount: parseFloat(form.amount.replace(/[^0-9.]/g, "")) || 0,
      picked_by: form.pickedBy,
      notes: form.notes,
    }).select().single();

    if (error) {
      console.error("Error inserting payment", error);
      alert("Error inserting payment");
      return;
    }

    const newPayment: CashPayment = {
      id: data.id,
      date: data.date,
      jobName: data.job_name,
      store: data.store,
      amount: Number(data.amount),
      pickedBy: data.picked_by,
      notes: data.notes || ""
    };

    setPayments((prev) => [newPayment, ...prev]);
    setIsModalOpen(false);
    setForm({ date: "", jobName: "", store: stores[0]?.name || "", amount: "", pickedBy: cashEmployees[0]?.name || "", notes: "" });
  };

  // ── Derived (filtered + searched) ────────────────
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      // Store filter
      if (filterStore !== "ALL" && p.store !== filterStore) return false;
      // Employee filter
      if (filterPickedBy !== "ALL" && p.pickedBy !== filterPickedBy) return false;
      // Monthly filter
      const pDate = new Date(p.date + "T12:00:00");
      if (pDate.getMonth() !== selectedMonth || pDate.getFullYear() !== selectedYear) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().replace(/[$,]/g, "");
        const amountStr = p.amount.toFixed(2);
        const amountWhole = String(p.amount);
        const matches =
          p.jobName.toLowerCase().includes(q) ||
          p.store.toLowerCase().includes(q) ||
          p.pickedBy.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q) ||
          amountStr.includes(q) ||
          amountWhole.includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [payments, filterStore, filterPickedBy, selectedMonth, selectedYear, searchQuery]);

  const total = filtered.reduce((s, p) => s + p.amount, 0);

  // ── Pagination ──────────────────────────────────
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStore, filterPickedBy, selectedMonth, selectedYear, searchQuery]);

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // ── Month navigation ────────────────────────────
  const goToPrevMonth = (): void => {
    if (selectedMonth === 0) { setSelectedYear(selectedYear - 1); setSelectedMonth(11); }
    else setSelectedMonth(selectedMonth - 1);
  };
  const goToNextMonth = (): void => {
    if (selectedMonth === 11) { setSelectedYear(selectedYear + 1); setSelectedMonth(0); }
    else setSelectedMonth(selectedMonth + 1);
  };

  // ── Render ───────────────────────────────────────
  return (
    <>
      <TopBar />

      <main className="px-4 sm:px-6 lg:px-8 pt-8 flex flex-col overflow-hidden" style={{ height: "calc(100dvh - 56px)" }}>

        {/* ── Fixed section (header + KPIs + filters) ── */}
        <div className="shrink-0">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-xl sm:text-3xl font-extrabold text-on-surface tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Cash Payments
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">Track cash purchases and extra materials per job.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsStoreModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high rounded-xl text-sm font-bold text-on-surface border border-outline-variant/30 hover:border-primary/40 hover:text-primary hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]" translate="no">store</span>
              Manage Stores
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary rounded-xl text-sm font-bold text-[#3a5400] shadow-[0_0_15px_rgba(174,238,42,0.15)] hover:shadow-[0_0_25px_rgba(174,238,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]" translate="no">add</span>
              Add Payment
            </button>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Filtered", value: fmt(total), icon: "payments", color: "#aeee2a" },
            { label: "Records", value: String(filtered.length), icon: "receipt_long", color: "#aeee2a" },
            { label: "Stores Used", value: String(new Set(filtered.map((p) => p.store)).size), icon: "store", color: "#e3eb5d" },
            { label: "Employees", value: String(new Set(filtered.map((p) => p.pickedBy)).size), icon: "groups", color: "#e3eb5d" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="p-5 rounded-2xl flex items-center gap-4 bg-surface-container-low border border-outline-variant/20 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                <span className="material-symbols-outlined text-[20px]" style={{ color: kpi.color }} translate="no">{kpi.icon}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{kpi.label}</p>
                <p className="text-xl font-black text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" translate="no">search</span>
            <input
              type="text"
              placeholder="Search jobs, stores, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-high text-on-surface text-sm rounded-xl pl-10 pr-4 py-2.5 border border-outline-variant/20 outline-none focus:border-primary transition-colors placeholder:text-outline-variant w-64"
            />
          </div>

          {/* Store filter */}
          <div className="w-40 relative z-40">
            <CustomDropdown
              value={filterStore}
              onChange={(val) => setFilterStore(val)}
              options={[{ value: "ALL", label: "All Stores" }, ...stores.map(s => ({ value: s.name, label: s.name }))]}
              placeholder="All Stores"
              className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors hover:border-primary"
            />
          </div>

          {/* Employee filter */}
          <div className="flex items-center gap-1 z-30">
            <div className="w-44">
              <CustomDropdown
                value={filterPickedBy}
                onChange={(val) => setFilterPickedBy(val)}
                options={[{ value: "ALL", label: "All Employees" }, ...cashEmployees.map((p) => ({ value: p.name, label: p.name }))]}
                placeholder="All Employees"
                className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors hover:border-primary"
              />
            </div>
            <button
               onClick={() => setIsEmployeeModalOpen(true)}
               className="w-10 h-10 flex items-center justify-center bg-surface-container-high rounded-xl text-on-surface-variant hover:text-primary hover:border-primary/40 border border-outline-variant/20 transition-all"
               title="Manage Employees Filter"
            >
               <span className="material-symbols-outlined text-[18px]" translate="no">edit</span>
            </button>
          </div>

          {/* Monthly Picker */}
          <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl border border-outline-variant/20">
            <button onClick={goToPrevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-sm" translate="no">chevron_left</span>
            </button>
            <div className="flex items-center gap-1 px-2 z-20">
              <div className="w-24">
                <CustomDropdown
                  value={selectedMonth.toString()}
                  onChange={(val) => setSelectedMonth(Number(val))}
                  options={MONTH_NAMES.map((name, idx) => ({ value: idx.toString(), label: name }))}
                  inline={true}
                  className="w-full bg-transparent text-on-surface text-[13px] font-bold outline-none flex justify-center items-center hover:text-primary transition-colors gap-1"
                />
              </div>
              <div className="w-16">
                <CustomDropdown
                  value={selectedYear.toString()}
                  onChange={(val) => setSelectedYear(Number(val))}
                  options={[2024, 2025, 2026, 2027].map(y => ({ value: y.toString(), label: y.toString() }))}
                  inline={true}
                  className="w-full bg-transparent text-on-surface-variant text-[13px] font-bold outline-none flex justify-center items-center hover:text-primary transition-colors gap-1"
                />
              </div>
            </div>
            <button onClick={goToNextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all">
              <span className="material-symbols-outlined text-sm" translate="no">chevron_right</span>
            </button>
          </div>

          {(filterStore !== "ALL" || filterPickedBy !== "ALL" || searchQuery) && (
            <button
              onClick={() => { setFilterStore("ALL"); setFilterPickedBy("ALL"); setSearchQuery(""); }}
              className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm" translate="no">close</span>
              Clear filters
            </button>
          )}
        </div>
        </div>{/* end shrink-0 */}

        {/* ── Scrollable table section ── */}
        <div
          className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-outline-variant/20 flex flex-col mb-4 bg-surface-container-low shadow-sm"
        >
          <div className="flex-1 min-h-0 overflow-auto" style={{ scrollbarWidth: "thin" }}>
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-10 bg-surface-container border-b border-outline-variant/20">
                <tr>
                  {["Date", "Job Name", "Store", "Amount", "Employee", "Notes", ""].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-on-surface-variant text-sm">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span className="material-symbols-outlined text-4xl opacity-30" translate="no">payments</span>
                        <span>No records found for {MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-surface-container-high/50 transition-colors group ${i < paginatedPayments.length - 1 ? 'border-b border-outline-variant/10' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm text-on-surface-variant whitespace-nowrap">{fmtDate(p.date)}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-on-surface">{p.jobName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                          style={{
                            backgroundColor: `${getStoreColor(p.store)}15`,
                            color: getStoreColor(p.store),
                            borderColor: `${getStoreColor(p.store)}30`,
                          }}
                        >
                          {p.store}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base font-black text-primary" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                          {fmt(p.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-on-surface">{p.pickedBy}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant max-w-[200px] truncate">{p.notes || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <ActionMenu 
                          p={p} 
                          onEdit={() => openEdit(p)}
                          onDelete={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: "Delete Payment",
                              message: `Are you sure you want to delete the payment for ${p.jobName}?`,
                              onConfirm: async () => {
                                const { error } = await supabase.from('cash_payments').delete().eq('id', p.id);
                                if (!error) {
                                  setPayments(prev => prev.filter(item => item.id !== p.id));
                                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                } else {
                                  console.error("Error deleting payment", error);
                                  alert("Error deleting payment");
                                }
                              }
                            });
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: "1px solid rgba(71,72,70,0.15)" }}
            >
              <p className="text-xs text-on-surface-variant">
                Showing{" "}
                <span className="font-bold text-on-surface">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                {" "}–{" "}
                <span className="font-bold text-on-surface">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span>
                {" "}of{" "}
                <span className="font-bold text-on-surface">{filtered.length}</span>{" "}records
              </p>
              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-sm" translate="no">chevron_left</span>
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | "...")[]>((acc, page, idx, arr) => {
                    if (idx > 0) {
                      const prev = arr[idx - 1];
                      if (page - prev > 1) acc.push("...");
                    }
                    acc.push(page);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-outline-variant text-xs">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          currentPage === item
                            ? "bg-primary text-[#3a5400]"
                            : "text-on-surface-variant hover:text-primary hover:bg-surface-container-highest"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-sm" translate="no">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ══════════════════════════════════════════════
          ADD PAYMENT MODAL
      ══════════════════════════════════════════════ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-2xl p-8 relative bg-surface-container-low border border-outline-variant/20 shadow-xl">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined" translate="no">close</span>
            </button>
            <h2 className="text-xl font-extrabold text-on-surface mb-6" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
              Add Cash Payment
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <CustomDatePicker
                    label="Date"
                    value={form.date}
                    onChange={(iso) => setForm({ ...form, date: iso })}
                    disableSundays={false}
                  />
                </div>
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Job Name</label>
                  <input
                    ref={addInputRef}
                    required
                    type="text"
                    placeholder="Search client name..."
                    value={form.jobName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({ ...form, jobName: val });
                      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                      if (val.trim().length < 1) { setCustomerSuggestions([]); setShowSuggestions(false); return; }
                      debounceTimerRef.current = setTimeout(async () => {
                        const results = await searchCustomers(val);
                        setCustomerSuggestions(results);
                        setShowSuggestions(results.length > 0);
                      }, 300);
                    }}
                    onFocus={() => { if (customerSuggestions.length > 0) setShowSuggestions(true); }}
                    autoComplete="off"
                    className="bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-outline-variant"
                  />
                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div
                      ref={addSuggestionsRef}
                      className="absolute top-full left-0 right-0 mt-1 bg-surface-container border border-primary/20 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-h-[200px] overflow-y-auto z-50"
                      style={{ scrollbarWidth: "thin" }}
                    >
                      {customerSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, jobName: c.full_name });
                            setShowSuggestions(false);
                            setCustomerSuggestions([]);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant" translate="no">person</span>
                          {c.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 z-40">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Store</label>
                  <CustomDropdown
                    value={form.store}
                    onChange={(val) => setForm({ ...form, store: val })}
                    options={stores.map(s => ({ value: s.name, label: s.name }))}
                    placeholder="Select Store..."
                    className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors hover:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-sm">$</span>
                    <input required type="number" step="0.01" min="0" placeholder="0.00" value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none focus:border-primary transition-colors placeholder:text-outline-variant" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 z-30">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Employee</label>
                <CustomDropdown
                  value={form.pickedBy}
                  onChange={(val) => setForm({ ...form, pickedBy: val })}
                  options={cashEmployees.map(p => ({ value: p.name, label: p.name }))}
                  placeholder="Select Employee..."
                  className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors hover:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Notes <span className="normal-case text-outline-variant font-normal">(optional)</span></label>
                <textarea rows={3} placeholder="Any additional notes..." value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-outline-variant resize-none" />
              </div>
              <button type="submit"
                className="w-full py-3 bg-primary text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(174,238,42,0.2)] mt-2"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                Save Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MANAGE STORES MODAL (enhanced with edit/delete/color)
      ══════════════════════════════════════════════ */}
      {isStoreModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsStoreModalOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg" translate="no">store</span>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Manage Stores</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Add, edit or remove stores</p>
                </div>
              </div>
              <button onClick={() => setIsStoreModalOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            {/* Add new store */}
            <div className="p-6 border-b border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Add New Store</p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Store name (e.g. LOWES)"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddStore(); }}
                  className="flex-1 bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-outline-variant"
                />
                <input
                  type="color"
                  value={newStoreColor}
                  onChange={(e) => setNewStoreColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-outline-variant/20 cursor-pointer bg-transparent"
                  title="Pick a color"
                />
                <button
                  onClick={handleAddStore}
                  className="px-5 py-2.5 bg-primary text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Store list */}
            <div className="p-6 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Current Stores ({stores.length})</p>
              {storesLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm text-on-surface-variant">Loading...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {stores.map((store) => (
                    <div key={store.id}>
                      {editingStore?.id === store.id ? (
                        /* Edit mode */
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-background border border-primary/20">
                          <input
                            type="text"
                            value={editStoreName}
                            onChange={(e) => setEditStoreName(e.target.value)}
                            className="flex-1 bg-transparent border border-outline-variant/20 text-on-surface rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
                          />
                          <input
                            type="color"
                            value={editStoreColor}
                            onChange={(e) => setEditStoreColor(e.target.value)}
                            className="w-8 h-8 rounded-lg border border-outline-variant/20 cursor-pointer bg-transparent"
                          />
                          <button onClick={handleUpdateStore} className="text-primary hover:text-on-surface transition-colors">
                            <span className="material-symbols-outlined text-[18px]" translate="no">check</span>
                          </button>
                          <button onClick={() => setEditingStore(null)} className="text-on-surface-variant hover:text-error transition-colors">
                            <span className="material-symbols-outlined text-[18px]" translate="no">close</span>
                          </button>
                        </div>
                      ) : (
                        /* Display mode */
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-high/50 transition-colors group">
                          <div className="w-5 h-5 rounded-full border-2 shrink-0" style={{ backgroundColor: store.color, borderColor: `${store.color}60` }} />
                          <span className="text-sm font-bold text-on-surface flex-1">{store.name}</span>
                          <span className="text-[10px] text-outline-variant font-mono">{store.color}</span>
                          <button
                            onClick={() => { setEditingStore(store); setEditStoreName(store.name); setEditStoreColor(store.color); }}
                            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-primary transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]" translate="no">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteStore(store.id)}
                            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]" translate="no">delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          EDIT PAYMENT MODAL
      ══════════════════════════════════════════════ */}
      {editingPayment && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setEditingPayment(null); setEditForm(null); } }}
        >
          <div className="w-full max-w-lg rounded-2xl p-8 relative bg-surface-container-low border border-outline-variant/20 shadow-xl">
            <button onClick={() => { setEditingPayment(null); setEditForm(null); }} className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined" translate="no">close</span>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[18px]" translate="no">edit</span>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Edit Payment</h2>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">{editForm.id}</p>
              </div>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <CustomDatePicker
                    label="Date"
                    value={editForm.date}
                    onChange={(iso) => setEditForm({ ...editForm, date: iso })}
                    disableSundays={false}
                  />
                </div>
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Job Name</label>
                  <input
                    ref={editInputRef}
                    required
                    type="text"
                    placeholder="Search client name..."
                    value={editForm.jobName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditForm({ ...editForm, jobName: val });
                      if (editDebounceTimerRef.current) clearTimeout(editDebounceTimerRef.current);
                      if (val.trim().length < 1) { setEditCustomerSuggestions([]); setShowEditSuggestions(false); return; }
                      editDebounceTimerRef.current = setTimeout(async () => {
                        const results = await searchCustomers(val);
                        setEditCustomerSuggestions(results);
                        setShowEditSuggestions(results.length > 0);
                      }, 300);
                    }}
                    onFocus={() => { if (editCustomerSuggestions.length > 0) setShowEditSuggestions(true); }}
                    autoComplete="off"
                    className="bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-outline-variant"
                  />
                  {showEditSuggestions && editCustomerSuggestions.length > 0 && (
                    <div
                      ref={editSuggestionsRef}
                      className="absolute top-full left-0 right-0 mt-1 bg-surface-container border border-primary/20 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-h-[200px] overflow-y-auto z-50"
                      style={{ scrollbarWidth: "thin" }}
                    >
                      {editCustomerSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setEditForm({ ...editForm, jobName: c.full_name });
                            setShowEditSuggestions(false);
                            setEditCustomerSuggestions([]);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[14px] text-on-surface-variant" translate="no">person</span>
                          {c.full_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 z-40">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Store</label>
                  <CustomDropdown
                    value={editForm.store}
                    onChange={(val) => setEditForm({ ...editForm, store: val })}
                    options={stores.map(s => ({ value: s.name, label: s.name }))}
                    placeholder="Select Store..."
                    className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors hover:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-sm">$</span>
                    <input required type="number" step="0.01" min="0" value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none focus:border-primary transition-colors" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 z-30">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Employee</label>
                <CustomDropdown
                  value={editForm.pickedBy}
                  onChange={(val) => setEditForm({ ...editForm, pickedBy: val })}
                  options={cashEmployees.map(p => ({ value: p.name, label: p.name }))}
                  placeholder="Select Employee..."
                  className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm font-bold flex justify-between items-center transition-colors hover:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface">Notes <span className="normal-case text-outline-variant font-normal">(optional)</span></label>
                <textarea rows={3} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-outline-variant resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setEditingPayment(null); setEditForm(null); }}
                  className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl border border-outline-variant/20 hover:bg-surface-container-highest transition-all">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-3 bg-primary text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(174,238,42,0.2)]"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MANAGE EMPLOYEES MODAL
      ══════════════════════════════════════════════ */}
      {isEmployeeModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsEmployeeModalOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg" translate="no">badge</span>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-on-surface" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Manage Employees</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Add or Remove from Cash Filter</p>
                </div>
              </div>
              <button onClick={() => setIsEmployeeModalOpen(false)} className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined" translate="no">close</span>
              </button>
            </div>

            {/* Add new employee */}
            <div className="p-6 border-b border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Add Custom Employee</p>
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Employee name (e.g. WILL)"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddEmployee(); }}
                  className="flex-1 bg-surface-container-high border border-outline-variant/20 text-on-surface rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-outline-variant"
                />
                <button
                  onClick={handleAddEmployee}
                  className="px-5 py-2.5 bg-primary text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-sm"
                >
                  Add
                </button>
              </div>
            </div>

            {/* List */}
            <div className="p-6 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Filter Employees ({cashEmployees.length})</p>
              {employeesLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-sm text-on-surface-variant">Loading...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {cashEmployees.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-high/50 transition-colors group">
                      <span className="text-sm font-bold text-on-surface">{emp.name}</span>
                      <button
                        onClick={() => handleRemoveEmployee(emp.id, emp.name)}
                        className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-all"
                        title="Remove from this filter"
                      >
                       <span className="material-symbols-outlined text-[16px]" translate="no">person_remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════
          CONFIRM DELETE MODAL
      ══════════════════════════════════════════════ */}
      {confirmModal.isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 relative overflow-hidden bg-surface-container-low border border-error/20 shadow-2xl"
          >
            {/* Top Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-error rounded-b-full shadow-[0_0_20px_#ff7351]" />

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,115,81,0.1)", border: "1px solid rgba(255,115,81,0.2)" }}>
                <span className="material-symbols-outlined text-[32px] text-error" translate="no">warning</span>
              </div>
              <h3 className="text-xl font-extrabold text-on-surface mb-2" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                {confirmModal.title}
              </h3>
              <p className="text-sm text-on-surface-variant mb-8 px-2 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-on-surface bg-surface-container-highest border border-outline-variant/30 hover:bg-[#303330] hover:text-white transition-all outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-black text-white bg-error hover:bg-[#ff5a33] active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(255,115,81,0.3)] outline-none"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
