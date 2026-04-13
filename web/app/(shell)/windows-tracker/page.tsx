"use client";

import { useState } from "react";
import { TopBar } from "../../../components/TopBar";
import CustomDatePicker from "../../../components/CustomDatePicker";

// =============================================
// Windows / Doors Tracker
// Rota: /windows-tracker
// =============================================

type MoneyCollected = "YES" | "NO" | "PENDING";
type OrderStatus = "Ordered" | "In Production" | "Shipped" | "Delivered" | "Cancelled";

interface WindowOrder {
  id: string;
  jobName: string;
  order: string;
  quote: number;
  deposit: number;
  orderedOn: string;
  expected: string;
  quantity: number;
  supplier: string;
  updates: string;
  status: OrderStatus;
  moneyCollected: MoneyCollected;
}

const SUPPLIERS = ["Andersen", "Pella", "Marvin", "Milgard", "PGT", "Windsor", "Other"];

const MOCK_ORDERS: WindowOrder[] = [
  {
    id: "WIN-001",
    jobName: "Eric Lefebvre",
    order: "ORD-8821",
    quote: 12500,
    deposit: 6250,
    orderedOn: "2026-03-15",
    expected: "2026-04-28",
    quantity: 8,
    supplier: "Andersen",
    updates: "In production — on schedule",
    status: "In Production",
    moneyCollected: "YES",
  },
  {
    id: "WIN-002",
    jobName: "Brandon White",
    order: "ORD-8845",
    quote: 7800,
    deposit: 3900,
    orderedOn: "2026-03-22",
    expected: "2026-05-05",
    quantity: 5,
    supplier: "Pella",
    updates: "Awaiting production start",
    status: "Ordered",
    moneyCollected: "YES",
  },
  {
    id: "WIN-003",
    jobName: "Sarah Jenkins",
    order: "—",
    quote: 9200,
    deposit: 0,
    orderedOn: "",
    expected: "",
    quantity: 6,
    supplier: "Marvin",
    updates: "Waiting for deposit confirmation",
    status: "Cancelled",
    moneyCollected: "NO",
  },
  {
    id: "WIN-004",
    jobName: "Joe Castano",
    order: "ORD-8902",
    quote: 4500,
    deposit: 4500,
    orderedOn: "2026-04-01",
    expected: "2026-04-20",
    quantity: 3,
    supplier: "Milgard",
    updates: "Shipped — arriving within 5 days",
    status: "Shipped",
    moneyCollected: "YES",
  },
  {
    id: "WIN-005",
    jobName: "Max Edei",
    order: "—",
    quote: 15000,
    deposit: 7500,
    orderedOn: "",
    expected: "",
    quantity: 12,
    supplier: "PGT",
    updates: "Deposit received, awaiting order placement",
    status: "Ordered",
    moneyCollected: "PENDING",
  },
];

const fmt = (v: number) =>
  v === 0 ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const fmtDate = (d: string) =>
  !d ? "—" : new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

const MoneyBadge = ({ value }: { value: MoneyCollected }) => {
  const config = {
    YES: { bg: "bg-[#aeee2a]/15", text: "text-[#aeee2a]", label: "YES ✓" },
    NO: { bg: "bg-red-500/15", text: "text-red-400", label: "NO ✗" },
    PENDING: { bg: "bg-[#e3eb5d]/10", text: "text-[#e3eb5d]", label: "PENDING" },
  }[value];
  return (
    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const StatusBadge = ({ value }: { value: OrderStatus }) => {
  const config: Record<OrderStatus, { bg: string; text: string }> = {
    Ordered: { bg: "bg-blue-500/10", text: "text-blue-400" },
    "In Production": { bg: "bg-[#e3eb5d]/10", text: "text-[#e3eb5d]" },
    Shipped: { bg: "bg-purple-500/10", text: "text-purple-400" },
    Delivered: { bg: "bg-[#aeee2a]/15", text: "text-[#aeee2a]" },
    Cancelled: { bg: "bg-red-500/10", text: "text-red-400" },
  };
  const c = config[value];
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.bg} ${c.text}`}>
      {value}
    </span>
  );
};

export default function WindowsTrackerPage() {
  const [orders, setOrders] = useState<WindowOrder[]>(MOCK_ORDERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterMoney, setFilterMoney] = useState<string>("ALL");

  const [form, setForm] = useState({
    jobName: "",
    order: "",
    quote: "",
    deposit: "",
    orderedOn: "",
    expected: "",
    quantity: "",
    supplier: SUPPLIERS[0],
    updates: "",
    status: "Ordered" as OrderStatus,
    moneyCollected: "NO" as MoneyCollected,
  });

  const filtered = orders.filter((o) => {
    if (filterStatus !== "ALL" && o.status !== filterStatus) return false;
    if (filterMoney !== "ALL" && o.moneyCollected !== filterMoney) return false;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrder: WindowOrder = {
      id: `WIN-${String(orders.length + 1).padStart(3, "0")}`,
      jobName: form.jobName,
      order: form.order || "—",
      quote: parseFloat(form.quote) || 0,
      deposit: parseFloat(form.deposit) || 0,
      orderedOn: form.orderedOn,
      expected: form.expected,
      quantity: parseInt(form.quantity) || 0,
      supplier: form.supplier,
      updates: form.updates,
      status: form.status,
      moneyCollected: form.moneyCollected,
    };
    setOrders((prev) => [newOrder, ...prev]);
    setIsModalOpen(false);
    setForm({
      jobName: "", order: "", quote: "", deposit: "", orderedOn: "", expected: "",
      quantity: "", supplier: SUPPLIERS[0], updates: "", status: "Ordered", moneyCollected: "NO",
    });
  };

  const canOrder = (o: WindowOrder) => o.moneyCollected === "YES";

  return (
    <>
      <TopBar title="Windows Tracker" />

      <main className="px-8 pb-20 pt-8 min-h-screen">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              className="text-3xl font-extrabold text-[#faf9f5] tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Windows & Doors Tracker
            </h1>
            <p className="text-[#ababa8] text-sm mt-1">
              Track window orders by job.&nbsp;
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
            { label: "Ready to Order", value: String(orders.filter((o) => o.moneyCollected === "YES" && o.status === "Ordered").length), icon: "check_circle", color: "#aeee2a" },
            { label: "Blocked (No $)", value: String(orders.filter((o) => o.moneyCollected === "NO").length), icon: "block", color: "#ef4444" },
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1e201e] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2.5 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {["Ordered", "In Production", "Shipped", "Delivered", "Cancelled"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterMoney}
            onChange={(e) => setFilterMoney(e.target.value)}
            className="bg-[#1e201e] text-[#faf9f5] text-sm font-bold rounded-xl px-4 py-2.5 border border-[#474846]/20 outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
          >
            <option value="ALL">Money Collected: All</option>
            <option value="YES">YES — Ready to Order</option>
            <option value="NO">NO — Blocked</option>
            <option value="PENDING">Pending</option>
          </select>
          {(filterStatus !== "ALL" || filterMoney !== "ALL") && (
            <button
              onClick={() => { setFilterStatus("ALL"); setFilterMoney("ALL"); }}
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
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(71,72,70,0.2)" }}>
                  {["Job Name", "Order #", "Quote", "Deposit", "Ordered On", "Expected", "Qty", "Supplier", "Status", "Updates", "Money Collected"].map((h) => (
                    <th key={h} className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-[#ababa8] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center text-[#ababa8] text-sm">
                      <span className="material-symbols-outlined text-4xl block mb-2 opacity-30" translate="no">window</span>
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filtered.map((o, i) => (
                    <tr
                      key={o.id}
                      className="hover:bg-[#1e201e]/50 transition-colors"
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(71,72,70,0.1)" : "none" }}
                    >
                      <td className="px-4 py-3.5 font-bold text-[#faf9f5] whitespace-nowrap">{o.jobName}</td>
                      <td className="px-4 py-3.5 text-[#ababa8] font-mono text-xs">{o.order}</td>
                      <td className="px-4 py-3.5 font-bold text-[#aeee2a]">{fmt(o.quote)}</td>
                      <td className="px-4 py-3.5 text-[#faf9f5]">{fmt(o.deposit)}</td>
                      <td className="px-4 py-3.5 text-[#ababa8] whitespace-nowrap">{fmtDate(o.orderedOn)}</td>
                      <td className="px-4 py-3.5 text-[#ababa8] whitespace-nowrap">{fmtDate(o.expected)}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-[#faf9f5]">{o.quantity}</td>
                      <td className="px-4 py-3.5 text-[#ababa8]">{o.supplier}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap"><StatusBadge value={o.status} /></td>
                      <td className="px-4 py-3.5 text-[#ababa8] max-w-[160px] truncate text-xs">{o.updates || "—"}</td>
                      <td className="px-4 py-3.5"><MoneyBadge value={o.moneyCollected} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

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
            style={{ background: "#1a1c1a", border: "1px solid rgba(174,238,42,0.15)" }}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-[#ababa8] hover:text-[#faf9f5] transition-colors"
            >
              <span className="material-symbols-outlined" translate="no">close</span>
            </button>

            <h2
              className="text-xl font-extrabold text-[#faf9f5] mb-2"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              New Window Order
            </h2>
            <p className="text-xs text-red-400 font-bold mb-6">
              ⚠ Can only be placed when Money Collected = YES
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Row 1: Job Name + Supplier */}
              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Supplier</label>
                  <select
                    value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                  >
                    {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: Order # + Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Order # <span className="normal-case text-[#474846] font-normal">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="e.g. ORD-8821"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Quantity</label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]"
                  />
                </div>
              </div>

              {/* Row 3: Quote + Deposit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Quote ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aeee2a] font-black text-sm">$</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.quote}
                      onChange={(e) => setForm({ ...form, quote: e.target.value })}
                      className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Deposit ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aeee2a] font-black text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={form.deposit}
                      onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                      className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl pl-8 pr-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846]"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Ordered On + Expected */}
              <div className="grid grid-cols-2 gap-4">
                <CustomDatePicker
                  label="Ordered On"
                  value={form.orderedOn}
                  onChange={(val) => setForm({ ...form, orderedOn: val })}
                  disableSundays={false}
                  placeholder="Select date"
                />
                <CustomDatePicker
                  label="Expected Delivery"
                  value={form.expected}
                  onChange={(val) => setForm({ ...form, expected: val })}
                  disableSundays={false}
                  placeholder="Select date"
                />
              </div>

              {/* Row 5: Status + Money Collected */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                  >
                    {["Ordered", "In Production", "Shipped", "Delivered", "Cancelled"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">
                    Money Collected &nbsp;
                    <span className="text-red-400">⚠ Required for order</span>
                  </label>
                  <select
                    value={form.moneyCollected}
                    onChange={(e) => setForm({ ...form, moneyCollected: e.target.value as MoneyCollected })}
                    className="bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#aeee2a] transition-colors appearance-none cursor-pointer"
                  >
                    <option value="NO">NO</option>
                    <option value="PENDING">PENDING</option>
                    <option value="YES">YES</option>
                  </select>
                </div>
              </div>

              {/* Updates / Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Updates / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Any updates or notes..."
                  value={form.updates}
                  onChange={(e) => setForm({ ...form, updates: e.target.value })}
                  className="w-full bg-[#121412] border border-[#474846]/20 text-[#faf9f5] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#aeee2a] transition-colors placeholder:text-[#474846] resize-none"
                />
              </div>

              {/* Money Collected warning */}
              {form.moneyCollected !== "YES" && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="material-symbols-outlined text-red-400 text-lg" translate="no">warning</span>
                  <p className="text-xs text-red-400 font-bold">
                    Money not collected — this order <span className="underline">cannot</span> be placed until payment is confirmed.
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#aeee2a] text-[#3a5400] font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(174,238,42,0.2)] mt-2"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Save Order
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
