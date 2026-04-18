"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";
import { CustomDropdown } from "../../../components/CustomDropdown";
import { ManageListModal } from "../../../components/ManageListModal";
import { supabase } from "../../../lib/supabase";

// =============================================
// Windows / Doors Tracker — v2 (Supabase-backed)
// Rota: /windows-tracker
// =============================================

type MoneyCollected = "YES" | "NO" | "FINANCING";
type OrderStatus = "Measurement" | "Ordered" | "In Production" | "Shipped" | "Delivered" | "Cancelled";

interface WindowOrder {
  id: string;
  job_id: string;
  customer_name: string;
  order_number: string;
  quote: number;
  deposit: string;
  ordered_on: string;
  expected_delivery: string;
  quantity: number;
  supplier: string;
  notes: string;
  status: OrderStatus;
  money_collected: MoneyCollected;
  created_at: string;
}

const ALL_STATUSES: OrderStatus[] = ["Measurement", "Ordered", "In Production", "Shipped", "Delivered", "Cancelled"];
const ALL_MONEY: MoneyCollected[] = ["YES", "NO", "FINANCING"];

interface Store {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  Measurement:     "#f97316",
  "In Production": "#aeee2a",
  Ordered:         "#e3eb5d",
  Shipped:         "#a855f7",
  Delivered:       "#22c55e",
  Cancelled:       "#ff7351",
};

const MONEY_COLORS: Record<MoneyCollected, string> = {
  YES:       "#22c55e",
  NO:        "#ff7351",
  FINANCING: "#e3eb5d",
};

const fmt = (v: number): string =>
  v === 0 ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const fmtDate = (d: string): string => {
  if (!d || String(d) === "0" || String(d) === "null") return "—";
  const date = new Date(d + "T12:00:00");
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

export default function WindowsTrackerPage() {
  const [orders, setOrders] = useState<WindowOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterMoney, setFilterMoney] = useState<string>("ALL");

  const [supplierFilter, setSupplierFilter] = useState<string[]>(["HD", "MASTER", "LANSING", "ABC"]);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const currentDate = new Date();
  const currentMonthStr = `MONTH-${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const currentYearStr = `YEAR-${currentDate.getFullYear()}`;

  const [filterMode, setFilterMode] = useState<"ALL" | "MONTH" | "YEAR">("ALL");
  const [filterMonth, setFilterMonth] = useState<string>(currentMonthStr);
  const [filterYear, setFilterYear] = useState<string>(currentYearStr);

  const [searchQuery, setSearchQuery] = useState("");

  const [stores, setStores] = useState<Store[]>([]);

  // New Order Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "", order_number: "", quote: "", deposit: "",
    ordered_on: "", expected_delivery: "", quantity: "",
    supplier: "", notes: "",
    status: "Measurement" as OrderStatus,
    money_collected: "NO" as MoneyCollected,
    job_id: "", // UUID of linked job
  });

  // Edit Modal
  const [editOrder, setEditOrder] = useState<WindowOrder | null>(null);
  const [editForm, setEditForm] = useState<WindowOrder | null>(null);
  const [activeMenu, setActiveMenu] = useState<{ id: string; top: number; right: number; o: WindowOrder } | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<WindowOrder | null>(null);

  // ── Fetch orders from Supabase ──────────────────
  const fetchOrders = useCallback(async (): Promise<void> => {
    setLoading(true);
    const { data, error } = await supabase
      .from("window_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading window orders:", error);
    } else {
      setOrders((data || []) as WindowOrder[]);
    }
    setLoading(false);
  }, []);

  const loadStores = useCallback(async (): Promise<void> => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, color, active")
      .eq("active", true)
      .order("name");

    if (data) {
      setStores(data);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    loadStores();
    
    // Load saved custom suppliers list
    const savedSuppliers = localStorage.getItem("siding_windows_suppliers");
    if (savedSuppliers) {
      try {
        setSupplierFilter(JSON.parse(savedSuppliers));
      } catch(e) {}
    }
  }, [fetchOrders, loadStores]);

  const getStoreColor = (storeName: string): string => {
    const store = stores.find((s) => s.name === storeName);
    return store?.color || "#ababa8";
  };

  // ── Inline status/money update ──────────────────
  const updateField = async (id: string, field: string, value: string): Promise<void> => {
    const { error } = await supabase
      .from("window_orders")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error(`Error updating ${field}:`, error);
      return;
    }

    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  };

  // ── Create order ────────────────────────────────
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("window_orders").insert({
      job_id: form.job_id || null,
      customer_name: form.customer_name,
      order_number: form.order_number || null,
      quote: parseFloat(form.quote) || 0,
      deposit: form.deposit || null,
      ordered_on: form.ordered_on || null,
      expected_delivery: form.expected_delivery || null,
      quantity: parseInt(form.quantity) || 0,
      supplier: form.supplier,
      notes: form.notes,
      status: form.status,
      money_collected: form.money_collected,
    });

    if (error) {
      console.error("Error creating order:", error);
    } else {
      setIsModalOpen(false);
      setForm({
        customer_name: "", order_number: "", quote: "", deposit: "",
        ordered_on: "", expected_delivery: "", quantity: "",
        supplier: "", notes: "", status: "Measurement",
        money_collected: "NO", job_id: "",
      });
      await fetchOrders();
    }
    setSaving(false);
  };

  // ── Edit order ──────────────────────────────────
  const openEdit = (o: WindowOrder): void => {
    setEditOrder(o);
    setEditForm({ ...o });
  };

  const handleEditSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editForm) return;
    setSaving(true);

    const { error } = await supabase
      .from("window_orders")
      .update({
        customer_name:    editForm.customer_name,
        order_number:     editForm.order_number,
        quote:            editForm.quote,
        deposit:          editForm.deposit || null,
        ordered_on:       editForm.ordered_on || null,
        expected_delivery:editForm.expected_delivery || null,
        quantity:         editForm.quantity,
        supplier:         editForm.supplier,
        notes:            editForm.notes,
        status:           editForm.status,
        money_collected:  editForm.money_collected,
        updated_at:       new Date().toISOString(),
      })
      .eq("id", editForm.id);

    if (error) {
      console.error("Error updating order:", error);
    } else {
      setEditOrder(null);
      setEditForm(null);
      await fetchOrders();
    }
    setSaving(false);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deletePrompt) return;
    setSaving(true);
    const { error } = await supabase.from("window_orders").delete().eq("id", deletePrompt.id);
    if (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order.");
    } else {
      await fetchOrders();
      setDeletePrompt(null);
    }
    setSaving(false);
  };

  // ── Filter ──────────────────────────────────────
  const filtered = orders.filter((o) => {
    if (filterStatus !== "ALL" && o.status !== filterStatus) return false;
    if (filterMoney !== "ALL" && o.money_collected !== filterMoney) return false;
    
    if (filterMode === "MONTH" && o.created_at) {
      const d = new Date(o.created_at);
      const [, yStr, mStr] = filterMonth.split("-");
      if (d.getFullYear() !== parseInt(yStr) || (d.getMonth() + 1) !== parseInt(mStr)) return false;
    }
    
    if (filterMode === "YEAR" && o.created_at) {
      const d = new Date(o.created_at);
      const [, yStr] = filterYear.split("-");
      if (d.getFullYear() !== parseInt(yStr)) return false;
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchCustomer = o.customer_name?.toLowerCase().includes(q);
      const matchOrder = o.order_number?.toLowerCase().includes(q);
      if (!matchCustomer && !matchOrder) return false;
    }
    
    return true;
  });

  return (
    <>
      <TopBar title="Windows Tracker" />

      <main className="px-4 sm:px-6 lg:px-8 pb-20 pt-8 min-h-screen">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-xl sm:text-3xl font-extrabold text-[#faf9f5] tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Windows & Doors Tracker
            </h1>
            <p className="text-[#ababa8] text-sm mt-1">
              Track window/door orders by job.&nbsp;
              <span className="text-red-400 font-bold">Can only order when Money Collected = YES!</span>
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#aeee2a] rounded-xl text-sm font-bold text-[#3a5400] shadow-[0_0_15px_rgba(174,238,42,0.15)] hover:shadow-[0_0_25px_rgba(174,238,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]" translate="no">add</span>
            New Order
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Orders", value: String(orders.length), icon: "window", color: "#aeee2a" },
            { label: "In Production", value: String(orders.filter((o) => o.status === "In Production").length), icon: "precision_manufacturing", color: "#e3eb5d" },
            { label: "Measurement", value: String(orders.filter((o) => o.status === "Measurement").length), icon: "straighten", color: "#60b8f5" },
            { label: "Blocked (No $)", value: String(orders.filter((o) => o.money_collected === "NO").length), icon: "block", color: "#ef4444" },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="p-5 rounded-2xl flex items-center gap-4"
              style={{ background: "rgba(36,38,36,0.4)", backdropFilter: "blur(24px)", border: "1px solid rgba(174,238,42,0.08)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                <span className="material-symbols-outlined text-[20px]" style={{ color: kpi.color }} translate="no">{kpi.icon}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">{kpi.label}</p>
                <p className="text-xl font-black text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1e201e] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2.5 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterMoney} onChange={(e) => setFilterMoney(e.target.value)}
            className="bg-[#1e201e] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2.5 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
          >
            <option value="ALL">Money Collected: All</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
            <option value="FINANCING">Financing</option>
          </select>
          <select
            value={filterMode} onChange={(e) => setFilterMode(e.target.value as any)}
            className="bg-[#1e201e] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2.5 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
          >
            <option value="ALL">Date: All Time</option>
            <option value="MONTH">By Month</option>
            <option value="YEAR">By Year</option>
          </select>

          {filterMode === "MONTH" && (
            <select
              value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="bg-[#1e201e] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2.5 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const val = `MONTH-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                return <option key={val} value={val}>{label}</option>;
              })}
            </select>
          )}

          {filterMode === "YEAR" && (
            <select
              value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
              className="bg-[#1e201e] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2.5 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
            >
              {[0, 1, 2].map((offset) => {
                const y = new Date().getFullYear() - offset;
                return <option key={`y-${y}`} value={`YEAR-${y}`}>{y}</option>;
              })}
            </select>
          )}

          {(filterStatus !== "ALL" || filterMoney !== "ALL" || filterMode !== "ALL" || searchQuery) && (
            <button
              onClick={() => { setFilterStatus("ALL"); setFilterMoney("ALL"); setFilterMode("ALL"); setSearchQuery(""); }}
              className="text-xs text-[#ababa8] hover:text-[#aeee2a] transition-colors flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-sm" translate="no">close</span>
              Clear
            </button>
          )}

          {/* Search Box on the right */}
          <div className="ml-auto relative w-full sm:w-64 max-w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#ababa8] text-[18px]" translate="no">search</span>
            <input 
              type="text" 
              placeholder="Search customers or orders..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e201e] text-[#faf9f5] rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846] placeholder:font-normal"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#aeee2a]/30 border-t-[#aeee2a] rounded-full animate-spin" />
          </div>
        )}

        {/* Table — Reordered: Quote + Money Collected adjacent */}
        {!loading && (
          <div className="rounded-2xl overflow-hidden border" style={{ background: "rgba(18,20,18,0.8)", borderColor: "rgba(71,72,70,0.2)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(71,72,70,0.2)" }}>
                    {[
                      { label: "Customer", align: "text-left", width: "w-[12%]" },
                      { label: "Order #", align: "text-left", width: "w-[7%]" },
                      { label: "Quote", align: "text-left", width: "w-[7%]" },
                      { label: "Money Collected", align: "text-center", width: "w-[12%]" },
                      { label: "Deposit Date", align: "text-left", width: "w-[9%]" },
                      { label: "Ordered On", align: "text-left", width: "w-[9%]" },
                      { label: "Expected", align: "text-left", width: "w-[9%]" },
                      { label: "Qty", align: "text-center", width: "w-[5%]" },
                      { label: "Supplier", align: "text-center", width: "w-[8%]" },
                      { label: "Status", align: "text-center", width: "w-[10%]" },
                      { label: "Notes", align: "text-left", width: "w-auto" },
                      { label: "", align: "text-center", width: "w-[5%]" },
                    ].map((col) => (
                      col.label === "Supplier" ? (
                        <th 
                          key={col.label} 
                          className={`px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-[#ababa8] whitespace-nowrap ${col.align} ${col.width}`}
                        >
                          <div className="flex items-center justify-center gap-2 cursor-default">
                            {col.label}
                            <button
                              onClick={(e) => { e.stopPropagation(); setIsSupplierModalOpen(true); }}
                              className="w-7 h-7 rounded-lg bg-[#aeee2a]/10 flex items-center justify-center hover:bg-[#aeee2a]/20 transition-all ml-1"
                              title="Manage Suppliers"
                            >
                              <span className="material-symbols-outlined text-[#aeee2a] text-[15px]" translate="no">edit</span>
                            </button>
                          </div>
                        </th>
                      ) : (
                        <th 
                          key={col.label} 
                          className={`px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-[#ababa8] whitespace-nowrap ${col.align} ${col.width}`}
                        >
                          {col.label}
                        </th>
                      )
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-16 text-center text-[#ababa8] text-sm">
                        <span className="material-symbols-outlined text-4xl block mb-2 opacity-30" translate="no">window</span>
                        {orders.length === 0 ? "No orders yet. Create one to get started." : "No orders match current filters."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o, i) => (
                      <tr
                        key={o.id}
                        className="hover:bg-[#1e201e]/50 transition-colors group"
                        style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(71,72,70,0.1)" : "none" }}
                      >
                        <td 
                          className="px-4 py-3.5 font-bold text-[#faf9f5] whitespace-nowrap cursor-pointer hover:text-[#aeee2a] transition-colors"
                          onClick={() => openEdit(o)}
                        >
                          {o.customer_name}
                        </td>
                        <td className="px-4 py-3.5 text-[#ababa8] font-mono text-xs">{o.order_number || "—"}</td>
                        <td className="px-4 py-3.5 font-bold text-[#aeee2a]">{o.quote ? fmt(o.quote) : "—"}</td>

                        {/* Money Collected — inline colored dropdown */}
                        <td className="px-4 py-3.5">
                          <select
                            value={o.money_collected}
                            onChange={(e) => updateField(o.id, "money_collected", e.target.value)}
                            className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border outline-none cursor-pointer appearance-none text-center"
                            style={{
                              backgroundColor: `${MONEY_COLORS[o.money_collected]}15`,
                              color: MONEY_COLORS[o.money_collected],
                              borderColor: `${MONEY_COLORS[o.money_collected]}30`,
                              minWidth: "85px",
                            }}
                          >
                            {ALL_MONEY.map((m) => (
                              <option key={m} value={m} className="bg-[#121412] text-[#faf9f5]">{m}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <CustomDatePicker
                            variant="ghost"
                            value={o.deposit || ""}
                            onChange={(val) => updateField(o.id, "deposit", val)}
                          />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <CustomDatePicker
                            variant="ghost"
                            value={o.ordered_on || ""}
                            onChange={(val) => updateField(o.id, "ordered_on", val)}
                          />
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <CustomDatePicker
                            variant="ghost"
                            value={o.expected_delivery || ""}
                            onChange={(val) => updateField(o.id, "expected_delivery", val)}
                          />
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-[#faf9f5]">{o.quantity || "—"}</td>
                        <td className="px-4 py-3.5 relative">
                          <CustomDropdown
                            options={supplierFilter}
                            value={o.supplier}
                            onChange={(val: string) => updateField(o.id, "supplier", val)}
                            inline={true}
                            className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border outline-none cursor-pointer transition-colors w-full min-w-[85px] ${
                              o.supplier
                                ? "bg-transparent text-[#faf9f5] border-[#474846]/40 hover:border-[#aeee2a]"
                                : "bg-transparent text-[#ababa8] border-[rgba(171,171,168,0.3)] hover:border-[#aeee2a]"
                            }`}
                          />
                        </td>

                        {/* Status — inline colored dropdown */}
                        <td className="px-4 py-3.5">
                          <select
                            value={o.status}
                            onChange={(e) => updateField(o.id, "status", e.target.value)}
                            className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border outline-none cursor-pointer appearance-none text-center"
                            style={{
                              backgroundColor: `${STATUS_COLORS[o.status]}15`,
                              color: STATUS_COLORS[o.status],
                              borderColor: `${STATUS_COLORS[o.status]}30`,
                              minWidth: "100px",
                            }}
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-[#121412] text-[#faf9f5]">{s}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-3.5 text-[#ababa8] max-w-[160px] truncate text-xs">{o.notes || "—"}</td>

                        {/* Edit & Delete Action Menu */}
                        <td className="px-4 py-3.5 relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeMenu?.id === o.id) {
                                setActiveMenu(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setActiveMenu({
                                  id: o.id,
                                  top: rect.bottom + window.scrollY + 8,
                                  right: window.innerWidth - rect.right,
                                  o
                                });
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#aeee2a] bg-[#aeee2a]/10 hover:bg-[#aeee2a]/20 transition-all font-bold"
                          >
                            <span className="material-symbols-outlined text-[16px]" translate="no">edit</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════
          ACTION MENU PORTAL
      ══════════════════════════════════════════════ */}
      {activeMenu && typeof window !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setActiveMenu(null)}></div>
          <div
            className="absolute bg-[#1a1c1a] border border-[#474846]/30 rounded-xl shadow-2xl z-[101] flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: activeMenu.top,
              right: activeMenu.right,
              minWidth: "120px"
            }}
          >
            <button
              onClick={() => { setActiveMenu(null); openEdit(activeMenu.o); }}
              className="px-4 py-2.5 text-left text-xs font-bold text-[#faf9f5] hover:bg-[#242624] transition-colors flex items-center gap-2 rounded-t-xl"
            >
              <span className="material-symbols-outlined text-[16px]" translate="no">edit</span>
              Edit
            </button>
            <button
              onClick={() => { setDeletePrompt(activeMenu.o); setActiveMenu(null); }}
              className="px-4 py-2.5 text-left text-xs font-bold text-[#ef4444] hover:bg-red-500/10 transition-colors flex items-center gap-2 rounded-b-xl"
            >
              <span className="material-symbols-outlined text-[16px]" translate="no">delete</span>
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {/* ══════════════════════════════════════════════
          DELETE PROMPT MODAL
      ══════════════════════════════════════════════ */}
      {deletePrompt && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 relative"
            style={{ background: "#1a1c1a", border: "1px solid rgba(239, 68, 68, 0.2)" }}
          >
            <h2 className="text-xl font-extrabold text-[#faf9f5] mb-2" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Confirm Deletion</h2>
            <p className="text-sm text-[#ababa8] mb-6">
              Are you sure you want to delete <strong className="text-[#faf9f5]">{deletePrompt.customer_name}</strong>'s order{deletePrompt.order_number ? ` (${deletePrompt.order_number})` : ''}?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletePrompt(null)}
                className="flex-1 py-3 bg-[#1e201e] text-[#faf9f5] font-bold rounded-xl border border-[#474846]/20 hover:bg-[#242624] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 font-black rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          NEW ORDER MODAL
      ══════════════════════════════════════════════ */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl p-8 relative max-h-[90vh] overflow-y-auto"
            style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.15)", scrollbarWidth: "none" }}
          >
            <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 text-[#ababa8] hover:text-[#faf9f5] transition-colors">
              <span className="material-symbols-outlined" translate="no">close</span>
            </button>

            <h2 className="text-xl font-extrabold text-[#faf9f5] mb-2" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
              New Window Order
            </h2>
            <p className="text-xs text-red-400 font-bold mb-6">
              ⚠ Can only be placed when Money Collected = YES
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Customer Name</label>
                  <input required type="text" placeholder="e.g. Eric Lefebvre" value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Supplier</label>
                  <CustomDropdown
                    options={supplierFilter}
                    value={form.supplier}
                    onChange={(val: string) => setForm({ ...form, supplier: val })}
                    placeholder="Select Supplier"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Order # <span className="normal-case text-[#474846] font-normal">(optional)</span></label>
                  <input type="text" placeholder="e.g. ORD-8821" value={form.order_number}
                    onChange={(e) => setForm({ ...form, order_number: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Quantity</label>
                  <input required type="number" min="1" placeholder="0" value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Quote ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aeee2a] font-black text-sm">$</span>
                    <input required type="number" step="0.01" min="0" placeholder="0.00" value={form.quote}
                      onChange={(e) => setForm({ ...form, quote: e.target.value })}
                      className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 relative z-[60]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Deposit Date</label>
                  <CustomDatePicker
                    value={form.deposit || ""}
                    onChange={(val) => setForm({ ...form, deposit: val })}
                    alignRight
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 relative z-[60]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Ordered On</label>
                  <CustomDatePicker
                    value={form.ordered_on || ""}
                    onChange={(val) => setForm({ ...form, ordered_on: val })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 relative z-[60]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Expected Delivery</label>
                  <CustomDatePicker
                    value={form.expected_delivery || ""}
                    onChange={(val) => setForm({ ...form, expected_delivery: val })}
                    alignRight
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer">
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">
                    Money Collected &nbsp;<span className="text-red-400">⚠ Required</span>
                  </label>
                  <select value={form.money_collected} onChange={(e) => setForm({ ...form, money_collected: e.target.value as MoneyCollected })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer">
                    {ALL_MONEY.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Notes</label>
                <textarea rows={2} placeholder="Any notes..." value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846] resize-none" />
              </div>

              {form.money_collected !== "YES" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="material-symbols-outlined text-red-400 text-lg" translate="no">warning</span>
                  <p className="text-xs text-red-400 font-bold">
                    Money not collected — this order <span className="underline">cannot</span> be placed until payment is confirmed.
                  </p>
                </div>
              )}

              <button type="submit" disabled={saving}
                className="w-full py-3 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(174,238,42,0.2)] mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                {saving ? <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" /> : "Save Order"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          EDIT ORDER MODAL (pencil icon)
      ══════════════════════════════════════════════ */}
      {editOrder && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setEditOrder(null); setEditForm(null); } }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl p-8 relative max-h-[90vh] overflow-y-auto"
            style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.15)", scrollbarWidth: "none" }}
          >
            <button onClick={() => { setEditOrder(null); setEditForm(null); }} className="absolute top-5 right-5 text-[#ababa8] hover:text-[#faf9f5] transition-colors">
              <span className="material-symbols-outlined" translate="no">close</span>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#aeee2a] text-[18px]" translate="no">edit</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>Edit Order</h2>
                <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest">{editForm.customer_name}</p>
              </div>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Customer Name</label>
                  <input required type="text" value={editForm.customer_name || ""}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Order #</label>
                  <input type="text" value={editForm.order_number || ""}
                    onChange={(e) => setEditForm({ ...editForm, order_number: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Quote</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aeee2a] font-black text-xs">$</span>
                    <input type="number" step="0.01" value={editForm.quote ?? ""}
                      onChange={(e) => setEditForm({ ...editForm, quote: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 relative z-[60]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Deposit Date</label>
                  <CustomDatePicker
                    value={editForm.deposit || ""}
                    onChange={(val) => setEditForm({ ...editForm, deposit: val })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Qty</label>
                  <input type="number" min="0" value={editForm.quantity ?? ""}
                    onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Supplier</label>
                  <CustomDropdown
                    options={supplierFilter}
                    value={editForm.supplier || ""}
                    onChange={(val: string) => setEditForm({ ...editForm, supplier: val })}
                    placeholder="Select Supplier"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Status</label>
                  <select value={editForm.status || "Measurement"} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as OrderStatus })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer">
                    {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 relative z-[60]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Ordered On</label>
                  <CustomDatePicker
                    value={editForm.ordered_on || ""}
                    onChange={(val) => setEditForm({ ...editForm, ordered_on: val })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 relative z-[60]">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Expected</label>
                  <CustomDatePicker
                    value={editForm.expected_delivery || ""}
                    onChange={(val) => setEditForm({ ...editForm, expected_delivery: val })}
                    alignRight
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Money Collected</label>
                <select value={editForm.money_collected || "NO"} onChange={(e) => setEditForm({ ...editForm, money_collected: e.target.value as MoneyCollected })}
                  className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer">
                  {ALL_MONEY.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Notes</label>
                <textarea rows={2} value={editForm.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setEditOrder(null); setEditForm(null); }}
                  className="flex-1 py-3 bg-[#1e201e] text-[#faf9f5] font-bold rounded-xl border border-[#474846]/20 hover:bg-[#242624] transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  {saving ? <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════
          MANAGE SUPPLIERS MODAL
      ══════════════════════════════════════════════ */}
      <ManageListModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        title="Manage Suppliers"
        subtitle="Add or Remove from Select Options"
        items={supplierFilter}
        onAdd={(item) => {
          if (!supplierFilter.includes(item)) {
            const newList = [...supplierFilter, item].sort();
            setSupplierFilter(newList);
            localStorage.setItem("siding_windows_suppliers", JSON.stringify(newList));
          }
        }}
        onRemove={(item) => {
          const newList = supplierFilter.filter(c => c !== item);
          setSupplierFilter(newList);
          localStorage.setItem("siding_windows_suppliers", JSON.stringify(newList));
        }}
        inputPlaceholder="Supplier name (e.g. HOME DEPOT)"
        addLabel="Add Custom Supplier"
        listTitle="Current Suppliers"
        icon="store"
      />

    </>
  );
}
