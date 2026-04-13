"use client";

import { useState } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";

// =============================================
// Cash Payments / Material EXTRA
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

const DEFAULT_STORES = ["HD", "Master", "SW", "CRS", "PPG", "LANSING"];

const DEFAULT_PARTNERS = ["Victor", "Sergio", "Osvin", "Josue", "XICARA"];

const MOCK_PAYMENTS: CashPayment[] = [
  { id: "CP-001", date: "2026-04-06", jobName: "Eric Lefebvre", store: "HD", amount: 850, pickedBy: "Victor", notes: "Extra caulk and fasteners" },
  { id: "CP-002", date: "2026-04-06", jobName: "Joe Castano", store: "Master", amount: 485, pickedBy: "Sergio", notes: "" },
  { id: "CP-003", date: "2026-04-05", jobName: "Max Edei", store: "PPG", amount: 1200, pickedBy: "Osvin", notes: "Paint for accent trim" },
  { id: "CP-004", date: "2026-04-04", jobName: "Eric Lefebvre", store: "LANSING", amount: 320, pickedBy: "Josue", notes: "" },
  { id: "CP-005", date: "2026-04-03", jobName: "Brandon White", store: "CRS", amount: 760, pickedBy: "Victor", notes: "Corner beads and Z-flashing" },
  { id: "CP-006", date: "2026-04-02", jobName: "Sarah Jenkins", store: "SW", amount: 195, pickedBy: "XICARA", notes: "Touch-up paint cans" },
];

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

export default function CashPaymentsPage() {
  // ── State ────────────────────────────────────────
  const [payments, setPayments] = useState<CashPayment[]>(MOCK_PAYMENTS);
  const [stores, setStores] = useState<string[]>(DEFAULT_STORES);

  // Filters
  const [filterStore, setFilterStore] = useState("ALL");
  const [filterPickedBy, setFilterPickedBy] = useState("ALL");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // New Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    date: "",
    jobName: "",
    store: DEFAULT_STORES[0],
    amount: "",
    pickedBy: DEFAULT_PARTNERS[0],
    notes: "",
  });

  // Add Store Popup
  const [isStorePopupOpen, setIsStorePopupOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");

  // Edit Payment Modal
  const [editingPayment, setEditingPayment] = useState<CashPayment | null>(null);
  const [editForm, setEditForm] = useState<CashPayment | null>(null);

  const openEdit = (p: CashPayment) => {
    setEditingPayment(p);
    setEditForm({ ...p });
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    setPayments((prev) => prev.map((p) => (p.id === editForm.id ? { ...editForm } : p)));
    setEditingPayment(null);
    setEditForm(null);
  };

  // ── Derived ──────────────────────────────────────
  const filtered = payments.filter((p) => {
    if (filterStore !== "ALL" && p.store !== filterStore) return false;
    if (filterPickedBy !== "ALL" && p.pickedBy !== filterPickedBy) return false;
    if (filterStart && p.date < filterStart) return false;
    if (filterEnd && p.date > filterEnd) return false;
    return true;
  });

  const total = filtered.reduce((s, p) => s + p.amount, 0);

  // ── Handlers ─────────────────────────────────────
  const handleAddStore = () => {
    const name = newStoreName.trim().toUpperCase();
    if (!name || stores.includes(name)) return;
    setStores((prev) => [...prev, name]);
    setNewStoreName("");
    setIsStorePopupOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPayment: CashPayment = {
      id: `CP-${String(payments.length + 1).padStart(3, "0")}`,
      date: form.date,
      jobName: form.jobName,
      store: form.store,
      amount: parseFloat(form.amount.replace(/[^0-9.]/g, "")) || 0,
      pickedBy: form.pickedBy,
      notes: form.notes,
    };
    setPayments((prev) => [newPayment, ...prev]);
    setIsModalOpen(false);
    setForm({ date: "", jobName: "", store: stores[0], amount: "", pickedBy: DEFAULT_PARTNERS[0], notes: "" });
  };

  // ── Render ───────────────────────────────────────
  return (
    <>
      <TopBar title="Cash Payments" />

      <main className="px-4 sm:px-6 lg:px-8 pb-20 pt-8 min-h-screen">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-xl sm:text-3xl font-extrabold text-[#faf9f5] tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Cash Payments & Material Extra
            </h1>
            <p className="text-[#ababa8] text-sm mt-1">Track cash purchases and extra materials per job.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsStorePopupOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1e201e] rounded-xl text-sm font-bold text-[#faf9f5] border border-[#474846]/30 hover:border-[#aeee2a]/40 hover:text-[#aeee2a] hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]" translate="no">store</span>
              Manage Stores
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#aeee2a] rounded-xl text-sm font-bold text-[#3a5400] shadow-[0_0_15px_rgba(174,238,42,0.15)] hover:shadow-[0_0_25px_rgba(174,238,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]" translate="no">add</span>
              Add Payment
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Filtered", value: fmt(total), icon: "payments", color: "#aeee2a" },
            { label: "Records", value: String(filtered.length), icon: "receipt_long", color: "#aeee2a" },
            { label: "Stores Used", value: String(new Set(filtered.map((p) => p.store)).size), icon: "store", color: "#e3eb5d" },
            { label: "Partners", value: String(new Set(filtered.map((p) => p.pickedBy)).size), icon: "groups", color: "#e3eb5d" },
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
          {/* Store filter */}
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="bg-[#1e201e] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2.5 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
          >
            <option value="ALL">All Stores</option>
            {stores.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Picked By filter */}
          <select
            value={filterPickedBy}
            onChange={(e) => setFilterPickedBy(e.target.value)}
            className="bg-[#1e201e] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2.5 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
          >
            <option value="ALL">All Partners</option>
            {DEFAULT_PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <CustomDatePicker
              value={filterStart}
              onChange={setFilterStart}
              placeholder="Start date"
              disableSundays={false}
              className="w-44"
            />
            <span className="text-[#ababa8] text-[10px] font-black uppercase tracking-widest">→</span>
            <CustomDatePicker
              value={filterEnd}
              onChange={setFilterEnd}
              placeholder="End date"
              disableSundays={false}
              className="w-44"
              alignRight={true}
            />
          </div>

          {(filterStore !== "ALL" || filterPickedBy !== "ALL" || filterStart || filterEnd) && (
            <button
              onClick={() => { setFilterStore("ALL"); setFilterPickedBy("ALL"); setFilterStart(""); setFilterEnd(""); }}
              className="text-xs text-[#ababa8] hover:text-[#aeee2a] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm" translate="no">close</span>
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ background: "rgba(18,20,18,0.8)", borderColor: "rgba(71,72,70,0.2)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(71,72,70,0.2)" }}>
                  {["Date", "Job Name", "Store", "Amount", "Picked By", "Notes", ""].map((h) => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-[#ababa8] text-sm">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-30" translate="no">payments</span>
                      No records found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, i) => (
                    <tr
                      key={p.id}
                      className="hover:bg-[#1e201e]/50 transition-colors group"
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(71,72,70,0.1)" : "none" }}
                    >
                      <td className="px-6 py-4 text-sm text-[#ababa8] whitespace-nowrap">{fmtDate(p.date)}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-[#faf9f5]">{p.jobName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#242624] text-[#e3eb5d] border border-[#474846]/20">
                          {p.store}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base font-black text-[#aeee2a]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                          {fmt(p.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[#faf9f5]">{p.pickedBy}</td>
                      <td className="px-6 py-4 text-sm text-[#ababa8] max-w-[200px] truncate">{p.notes || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEdit(p)}
                          title="Edit record"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#474846] hover:text-[#aeee2a] hover:bg-[#aeee2a]/10 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]" translate="no">edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Total Row */}
              {filtered.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "1px solid rgba(174,238,42,0.15)", background: "rgba(174,238,42,0.03)" }}>
                    <td colSpan={3} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#ababa8]">
                      Total ({filtered.length} records)
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-black text-[#aeee2a]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                        {fmt(total)}
                      </span>
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
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
          <div
            className="w-full max-w-lg rounded-2xl p-8 relative"
            style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.15)" }}
          >
            {/* Close */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-[#ababa8] hover:text-[#faf9f5] transition-colors"
            >
              <span className="material-symbols-outlined" translate="no">close</span>
            </button>

            <h2
              className="text-xl font-extrabold text-[#faf9f5] mb-6"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Add Cash Payment
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Date + Job Name */}
              <div className="grid grid-cols-2 gap-4">
                <CustomDatePicker
                  label="Date"
                  value={form.date}
                  onChange={(val) => setForm({ ...form, date: val })}
                  disableSundays={false}
                  placeholder="Select date"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Job Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Eric Lefebvre"
                    value={form.jobName}
                    onChange={(e) => setForm({ ...form, jobName: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]"
                  />
                </div>
              </div>

              {/* Store + Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Store</label>
                  <div className="flex gap-2">
                    <select
                      required
                      value={form.store}
                      onChange={(e) => setForm({ ...form, store: e.target.value })}
                      className="flex-1 bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                    >
                      {stores.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsStorePopupOpen(true)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#242624] text-[#ababa8] hover:text-[#aeee2a] hover:bg-[#2c2e2c] transition-colors border border-[#474846]/20 shrink-0"
                      title="Add new store"
                    >
                      <span className="material-symbols-outlined text-[18px]" translate="no">add</span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aeee2a] font-black text-sm">$</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]"
                    />
                  </div>
                </div>
              </div>

              {/* Picked By */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Picked By</label>
                <select
                  required
                  value={form.pickedBy}
                  onChange={(e) => setForm({ ...form, pickedBy: e.target.value })}
                  className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                >
                  {DEFAULT_PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Notes <span className="normal-case text-[#474846] font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Any additional notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846] resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(174,238,42,0.2)] mt-2"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Save Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ADD STORE POPUP
      ══════════════════════════════════════════════ */}
      {isStorePopupOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsStorePopupOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#1e201e", border: "1px solid rgba(174,238,42,0.2)" }}
          >
            <h3
              className="text-lg font-extrabold text-[#faf9f5] mb-4"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Add New Store
            </h3>
            <div className="flex gap-3">
              <input
                autoFocus
                type="text"
                placeholder="Store name (e.g. LOWES)"
                value={newStoreName}
                onChange={(e) => setNewStoreName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddStore(); }}
                className="flex-1 bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]"
              />
              <button
                onClick={handleAddStore}
                className="px-5 py-2.5 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-sm"
              >
                Add
              </button>
            </div>
            {stores.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8] mb-2">Current Stores</p>
                <div className="flex flex-wrap gap-2">
                  {stores.map((s) => (
                    <span key={s} className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-[#242624] text-[#e3eb5d] border border-[#474846]/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
          <div
            className="w-full max-w-lg rounded-2xl p-8 relative"
            style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.15)" }}
          >
            {/* Close */}
            <button
              onClick={() => { setEditingPayment(null); setEditForm(null); }}
              className="absolute top-5 right-5 text-[#ababa8] hover:text-[#faf9f5] transition-colors"
            >
              <span className="material-symbols-outlined" translate="no">close</span>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[#aeee2a]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#aeee2a] text-[18px]" translate="no">edit</span>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#faf9f5]" style={{ fontFamily: "Manrope, system-ui, sans-serif" }}>
                  Edit Payment
                </h2>
                <p className="text-[10px] text-[#ababa8] font-bold uppercase tracking-widest">{editForm.id}</p>
              </div>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4">

              {/* Date + Job Name */}
              <div className="grid grid-cols-2 gap-4">
                <CustomDatePicker
                  label="Date"
                  value={editForm.date}
                  onChange={(val) => setEditForm({ ...editForm, date: val })}
                  disableSundays={false}
                  placeholder="Select date"
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Job Name</label>
                  <input
                    required
                    type="text"
                    value={editForm.jobName}
                    onChange={(e) => setEditForm({ ...editForm, jobName: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]"
                  />
                </div>
              </div>

              {/* Store + Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Store</label>
                  <select
                    required
                    value={editForm.store}
                    onChange={(e) => setEditForm({ ...editForm, store: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                  >
                    {stores.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aeee2a] font-black text-sm">$</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Picked By */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Picked By</label>
                <select
                  required
                  value={editForm.pickedBy}
                  onChange={(e) => setEditForm({ ...editForm, pickedBy: e.target.value })}
                  className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                >
                  {DEFAULT_PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Notes <span className="normal-case text-[#474846] font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Any additional notes..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingPayment(null); setEditForm(null); }}
                  className="flex-1 py-3 bg-[#1e201e] text-[#faf9f5] font-bold rounded-xl border border-[#474846]/20 hover:bg-[#242624] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(174,238,42,0.2)]"
                  style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
