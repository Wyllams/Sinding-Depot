"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { supabase } from "@/lib/supabase";

// ─── Module definitions ─────────────────────────────
type Permission = "view" | "edit" | "hide";

interface Module {
  key: string;
  name: string;
  icon: string;
  description: string;
}

const MODULES: Module[] = [
  { key: "dashboard",      name: "Dashboard",       icon: "dashboard",           description: "Overview metrics and KPIs" },
  { key: "projects",       name: "Projects",         icon: "engineering",          description: "Job management and tracking" },
  { key: "crews",          name: "Crews",            icon: "groups",               description: "Partner and crew directory" },
  { key: "change_orders",  name: "Change Orders",    icon: "request_quote",        description: "Contract amendments" },
  { key: "cash_payments",  name: "Cash Payments",    icon: "payments",             description: "Payment records and receipts" },
  { key: "windows_tracker",name: "Windows Tracker",  icon: "sensor_window",        description: "Window installation tracking" },
  { key: "services",       name: "Services",         icon: "construction",         description: "Service calls and requests" },
  { key: "schedule",       name: "Schedule",         icon: "calendar_today",       description: "Operational and sales calendars" },
  { key: "reports",        name: "Sales",          icon: "assessment",           description: "Sales and performance reports" },
];

const PERMISSION_CONFIG: Record<Permission, { label: string; color: string; icon: string; activeColor: string }> = {
  view: { label: "View",   icon: "visibility",     color: "#38bdf8", activeColor: "#38bdf8" },
  edit: { label: "Edit",   icon: "edit",           color: "#aeee2a", activeColor: "#aeee2a" },
  hide: { label: "Hide",   icon: "visibility_off", color: "#ff7351", activeColor: "#ff7351" },
};

// ─── Templates ──────────────────────────────────────
const TEMPLATES: Record<string, Record<string, Permission>> = {
  "Salesperson": {
    dashboard: "view", projects: "view", crews: "hide",
    change_orders: "view", cash_payments: "hide", windows_tracker: "hide",
    services: "view", schedule: "view", reports: "view",
  },
  "Partner / Crew": {
    dashboard: "hide", projects: "view", crews: "hide",
    change_orders: "hide", cash_payments: "hide", windows_tracker: "view",
    services: "view", schedule: "view", reports: "hide",
  },
  "Admin (Full)": {
    dashboard: "edit", projects: "edit", crews: "edit",
    change_orders: "edit", cash_payments: "edit", windows_tracker: "edit",
    services: "edit", schedule: "edit", reports: "edit",
  },
};

// ─── Default permissions ─────────────────────────────
const DEFAULT_PERMISSIONS: Record<string, Permission> = Object.fromEntries(
  MODULES.map(m => [m.key, "view" as Permission])
);

// ─── Main Component ──────────────────────────────────
export default function CreateRolePage() {
  const router = useRouter();

  const [roleName, setRoleName]           = useState("");
  const [description, setDescription]    = useState("");
  const [permissions, setPermissions]     = useState<Record<string, Permission>>(DEFAULT_PERMISSIONS);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [templateOpen, setTemplateOpen]   = useState(false);

  // ── Set permission for a module ──────────────────
  const setModulePermission = (moduleKey: string, perm: Permission) => {
    setPermissions(prev => ({ ...prev, [moduleKey]: perm }));
  };

  // ── Apply template ────────────────────────────────
  const applyTemplate = (templateName: string) => {
    const tpl = TEMPLATES[templateName];
    if (tpl) setPermissions(prev => ({ ...prev, ...tpl }));
    setTemplateOpen(false);
  };

  // ── Set all modules at once ───────────────────────
  const setAll = (perm: Permission) => {
    setPermissions(Object.fromEntries(MODULES.map(m => [m.key, perm])));
  };

  // ── Save to Supabase ─────────────────────────────
  const handleSave = async () => {
    setError(null);
    if (!roleName.trim()) {
      setError("Role name is required.");
      return;
    }
    setSaving(true);
    try {
      // Insert role
      const { data: roleData, error: roleErr } = await supabase
        .from("roles")
        .insert({ name: roleName.trim(), description: description.trim() || null })
        .select("id")
        .single();

      if (roleErr) throw roleErr;

      // Insert permissions
      const permRows = MODULES.map(m => ({
        role_id:    roleData.id,
        module:     m.key,
        permission: permissions[m.key],
      }));

      const { error: permErr } = await supabase
        .from("role_permissions")
        .insert(permRows);

      if (permErr) throw permErr;

      router.push("/settings");
    } catch (err: any) {
      console.error("Error creating role:", err);
      setError(err.message || "Failed to create role. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Stats ─────────────────────────────────────────
  const counts = {
    view: Object.values(permissions).filter(p => p === "view").length,
    edit: Object.values(permissions).filter(p => p === "edit").length,
    hide: Object.values(permissions).filter(p => p === "hide").length,
  };

  return (
    <>
      <TopBar title="Roles & Permissions" />

      <main className="px-6 lg:px-12 pb-12 pt-8 max-w-6xl mx-auto min-h-screen">
        {/* ── Breadcrumb ── */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-[#ababa8] hover:text-white transition-colors mb-4 text-sm font-medium"
          >
            <span className="material-symbols-outlined text-sm" translate="no">arrow_back</span>
            Back to Settings
          </Link>
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-[#faf9f5] mb-2">
            Create Role
          </h1>
          <p className="text-[#ababa8] max-w-2xl">
            Define a new permission set for your organization. Assign granular access levels for each module.
          </p>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#ff7351]/10 border border-[#ff7351]/30 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#ff7351] text-lg" translate="no">error</span>
            <p className="text-sm text-[#ff7351] font-bold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">

          {/* ── Left: Identity + Stats ── */}
          <div className="col-span-12 lg:col-span-4 space-y-6">

            {/* Role Identity */}
            <div className="p-6 rounded-2xl bg-[#121412] border border-white/5">
              <label className="block text-xs font-bold uppercase tracking-widest text-[#aeee2a] mb-5">
                Role Identity
              </label>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-[#ababa8] uppercase mb-1.5 block font-bold">
                    Role Name <span className="text-[#ff7351]">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={e => setRoleName(e.target.value)}
                    className="w-full bg-[#1e201e] border border-white/5 rounded-xl py-3 px-4 text-[#faf9f5] placeholder:text-[#474846] focus:ring-1 focus:ring-[#aeee2a] focus:border-transparent transition-all outline-none"
                    placeholder="e.g. Field Supervisor"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#ababa8] uppercase mb-1.5 block font-bold">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-[#1e201e] border border-white/5 rounded-xl py-3 px-4 text-[#faf9f5] placeholder:text-[#474846] focus:ring-1 focus:ring-[#aeee2a] focus:border-transparent transition-all outline-none resize-none"
                    placeholder="Define the scope of this role..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Template Picker */}
            <div className="p-6 rounded-2xl bg-[#181a18] border border-white/5 relative">
              <h4 className="text-sm font-bold text-[#faf9f5] mb-1">Start from Template</h4>
              <p className="text-xs text-[#ababa8] mb-4">Apply a preset to speed up configuration.</p>
              <div className="space-y-2">
                {Object.keys(TEMPLATES).map(name => (
                  <button
                    key={name}
                    onClick={() => applyTemplate(name)}
                    className="w-full py-2 px-4 rounded-xl border border-[#474846]/50 text-[#ababa8] text-xs font-bold hover:bg-[#242624] hover:border-[#aeee2a]/30 hover:text-[#faf9f5] transition-all text-left flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[14px] text-[#aeee2a]" translate="no">auto_awesome</span>
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Permission stats */}
            <div className="p-6 rounded-2xl bg-[#121412] border border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#ababa8] mb-4">Summary</h4>
              <div className="space-y-3">
                {(["view", "edit", "hide"] as Permission[]).map(p => (
                  <div key={p} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-[14px]"
                        style={{ color: PERMISSION_CONFIG[p].color }}
                        translate="no"
                      >
                        {PERMISSION_CONFIG[p].icon}
                      </span>
                      <span className="text-xs text-[#ababa8] font-bold uppercase tracking-wider">
                        {PERMISSION_CONFIG[p].label}
                      </span>
                    </div>
                    <span
                      className="text-lg font-black"
                      style={{ color: counts[p] > 0 ? PERMISSION_CONFIG[p].color : "#474846" }}
                    >
                      {counts[p]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick set all */}
            <div className="p-4 rounded-2xl bg-[#181a18] border border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8] mb-3">Quick Set All</p>
              <div className="flex gap-2">
                {(["view", "edit", "hide"] as Permission[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setAll(p)}
                    className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all hover:opacity-90"
                    style={{
                      color:            PERMISSION_CONFIG[p].color,
                      borderColor:      `${PERMISSION_CONFIG[p].color}30`,
                      backgroundColor:  `${PERMISSION_CONFIG[p].color}10`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Permission Table ── */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rounded-2xl bg-[#121412] border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1e201e]/50">
                <div>
                  <h3 className="font-headline text-lg font-bold text-[#faf9f5]">Feature Permissions</h3>
                  <p className="text-xs text-[#ababa8] mt-1">Click a cell to toggle the access level for each module.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#121412]">
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-[#ababa8]">Module</th>
                      {(["view", "edit", "hide"] as Permission[]).map(p => (
                        <th key={p} className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: PERMISSION_CONFIG[p].color }}>
                          <div className="flex flex-col items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]" translate="no">{PERMISSION_CONFIG[p].icon}</span>
                            {p}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {MODULES.map(module => {
                      const current = permissions[module.key];
                      return (
                        <tr key={module.key} className="hover:bg-[#1e201e]/40 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <span
                                className="material-symbols-outlined text-xl"
                                style={{ color: PERMISSION_CONFIG[current].color }}
                                translate="no"
                              >
                                {module.icon}
                              </span>
                              <div>
                                <span className="font-bold text-sm text-[#faf9f5]">{module.name}</span>
                                <p className="text-[10px] text-[#474846] mt-0.5">{module.description}</p>
                              </div>
                            </div>
                          </td>
                          {(["view", "edit", "hide"] as Permission[]).map(p => {
                            const isActive = current === p;
                            const cfg = PERMISSION_CONFIG[p];
                            return (
                              <td key={p} className="py-4 px-4 text-center">
                                <button
                                  onClick={() => setModulePermission(module.key, p)}
                                  className="mx-auto flex items-center justify-center rounded-full transition-all hover:scale-110"
                                  style={{
                                    width: isActive ? "28px" : "22px",
                                    height: isActive ? "28px" : "22px",
                                    backgroundColor: isActive ? cfg.color : "transparent",
                                    border: isActive ? "none" : `2px solid rgba(71,72,70,0.6)`,
                                    boxShadow: isActive ? `0 0 16px ${cfg.color}40` : "none",
                                  }}
                                  title={`Set to ${p}`}
                                >
                                  {isActive && (
                                    <span
                                      className="material-symbols-outlined text-[12px] font-black"
                                      style={{ color: p === "hide" ? "#450900" : "#1a2e00" }}
                                      translate="no"
                                    >
                                      check
                                    </span>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end items-center gap-4">
              <Link
                href="/settings"
                className="px-8 py-3 rounded-full font-bold text-[#ababa8] hover:text-[#faf9f5] transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving || !roleName.trim()}
                className="px-10 py-3 bg-[#aeee2a] text-[#3a5400] rounded-full font-black shadow-[0_0_20px_rgba(174,238,42,0.2)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" /> Creating...</>
                ) : (
                  <><span className="material-symbols-outlined text-sm" translate="no">admin_panel_settings</span> Create Role</>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
