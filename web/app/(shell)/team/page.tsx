"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { CustomDropdown } from "@/components/CustomDropdown";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────
interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  // Customer portal fields (enriched from customers table)
  username?: string | null;
  portal_email?: string | null;
  portal_password?: string | null;
}

// ─── Helpers ──────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  admin:       "Admin",
  salesperson: "Salesperson",
  partner:     "Partner / Crew",
  customer:    "Customer",
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":       return "text-primary bg-primary/10 border-primary/30";
    case "salesperson": return "text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/30";
    case "partner":     return "text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/30";
    default:            return "text-on-surface bg-surface-container-highest border-white/10";
  }
};

// ─── Main Page ────────────────────────────────────────
export default function TeamPage() {
  const router = useRouter();
  const [profiles, setProfiles]           = useState<Profile[]>([]);
  const [loading, setLoading]             = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const [isAdmin, setIsAdmin]             = useState<boolean | null>(null); // null = checking

  // ── Invite form state ──────────────────────────
  const [inviteName, setInviteName]       = useState("");
  const [inviteEmail, setInviteEmail]     = useState("");
  const [inviteRole, setInviteRole]       = useState("admin");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError]     = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // ── Delete confirmation modal ──────────────────
  const [deleteTarget, setDeleteTarget]   = useState<Profile | null>(null);
  const [deleting, setDeleting]           = useState(false);

  // ── Current user ID (to prevent self-actions) ──
  const [myId, setMyId] = useState<string | null>(null);

  // ── Action dropdown ────────────────────────────────
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // ── Edit credentials modal ─────────────────────────
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Send access ────────────────────────────────────
  const [sendingAccessId, setSendingAccessId] = useState<string | null>(null);

  // ── Pagination ─────────────────────────────────────
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // ── Filters ───────────────────────────────────────
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProfiles = profiles.filter(p => {
    if (filterRole !== "all" && p.role !== filterRole) return false;
    if (filterStatus === "active" && !p.is_active) return false;
    if (filterStatus === "inactive" && p.is_active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = p.full_name?.toLowerCase().includes(q);
      const matchEmail = p.email?.toLowerCase().includes(q);
      const matchUsername = p.username?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchUsername) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / ITEMS_PER_PAGE));
  const paginatedProfiles = filteredProfiles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // ── Fetch all profiles + portal credentials ────────
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Build a credentials map per profile_id
      type Creds = { username: string | null; portal_email: string | null; portal_password: string | null };
      const credsMap: Record<string, Creds> = {};

      // ── Customers ──
      const customerIds = data.filter(p => p.role === "customer").map(p => p.id);
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from("customers")
          .select("profile_id, username, portal_email, portal_password")
          .in("profile_id", customerIds);
        if (customers) {
          for (const c of customers) {
            if (c.profile_id) credsMap[c.profile_id] = { username: c.username, portal_email: c.portal_email, portal_password: c.portal_password };
          }
        }
      }

      // ── Salespersons ──
      const spIds = data.filter(p => p.role === "salesperson").map(p => p.id);
      if (spIds.length > 0) {
        const { data: sps } = await supabase
          .from("salespersons")
          .select("profile_id, full_name, email, portal_password")
          .in("profile_id", spIds);
        if (sps) {
          for (const s of sps) {
            if (s.profile_id) credsMap[s.profile_id] = { username: s.email, portal_email: s.email, portal_password: s.portal_password };
          }
        }
      }

      // ── Partners / Crews ──
      const partnerIds = data.filter(p => p.role === "partner").map(p => p.id);
      if (partnerIds.length > 0) {
        const { data: crews } = await supabase
          .from("crews")
          .select("profile_id, name, portal_password")
          .in("profile_id", partnerIds);
        if (crews) {
          for (const c of crews) {
            if (c.profile_id) {
              const profile = data.find(p => p.id === c.profile_id);
              credsMap[c.profile_id] = { username: profile?.email || null, portal_email: profile?.email || null, portal_password: c.portal_password };
            }
          }
        }
      }

      const enriched: Profile[] = data.map(p => ({
        ...p,
        username: credsMap[p.id]?.username ?? p.email,
        portal_email: credsMap[p.id]?.portal_email ?? p.email,
        portal_password: credsMap[p.id]?.portal_password ?? null,
      }));

      setProfiles(enriched);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setMyId(user.id);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') { router.replace('/projects'); return; }
      setIsAdmin(true);
      fetchProfiles();
    })();
  }, [fetchProfiles, router]);

  // ── Role change ────────────────────────────────────
  const handleRoleChange = async (id: string, newRole: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id);

    if (!error) {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, role: newRole } : p));
    } else {
      alert("Error updating role");
    }
    setUpdatingId(null);
  };

  // ── Toggle Active ──────────────────────────────────
  const handleToggleActive = async (user: Profile) => {
    if (user.id === myId) return;
    const newStatus = !user.is_active;
    setUpdatingId(user.id);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, is_active: newStatus } : p));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Delete user ────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Error: ${msg}`);
    } finally {
      setDeleting(false);
    }
  };

  // ─────────────────────────────────────────────────────
  // ── Admin guard ──
  if (isAdmin === null) {
    return (
      <>
        <TopBar />
        <main className="flex items-center justify-center h-[calc(100vh-4rem)] bg-background">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />

      <main className="flex flex-col h-[calc(100vh-4rem)] bg-background">

        {/* ═══ FIXED ZONE ═══ */}
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 pt-8 pb-4 space-y-6">

          {/* ── Page Header ── */}
          <div className="flex items-start justify-between max-w-7xl mx-auto w-full">
            <div>
              <h1
                className="text-2xl sm:text-4xl font-extrabold tracking-tight text-on-surface"
                style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
              >
                Users & Permissions
              </h1>
              <p className="text-on-surface-variant text-sm mt-2">
                Manage your team, invite users, and control their Role-Based Access Control (RBAC) levels.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/settings/role/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high rounded-xl text-sm font-bold text-on-surface border border-outline-variant/30 hover:border-primary/40 hover:text-primary hover:scale-[1.02] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]" translate="no">admin_panel_settings</span>
                Role Matrix
              </Link>
              <button
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary rounded-xl text-sm font-bold text-[#3a5400] shadow-[0_0_15px_rgba(174,238,42,0.15)] hover:shadow-[0_0_25px_rgba(174,238,42,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]" translate="no">person_add</span>
                Invite User
              </button>
            </div>
          </div>

          {/* ── KPI ── */}
          <div className="flex gap-4 max-w-7xl mx-auto w-full">
            {[
              { label: "Total Members", value: String(profiles.length), icon: "groups", color: "#aeee2a" },
              { label: "Active", value: String(profiles.filter(p => p.is_active).length), icon: "check_circle", color: "#22c55e" },
              { label: "Inactive", value: String(profiles.filter(p => !p.is_active).length), icon: "block", color: "#ff7351" },
              { label: "Admins", value: String(profiles.filter(p => p.role === "admin").length), icon: "shield_person", color: "#e3eb5d" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="flex-1 p-5 rounded-2xl flex items-center gap-4"
                style={{ background: "rgba(36,38,36,0.4)", backdropFilter: "blur(24px)", border: "1px solid rgba(174,238,42,0.08)" }}
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

          {/* ── Filters + Search ── */}
          <div className="flex items-center gap-3 max-w-7xl mx-auto w-full">
            {/* Assigned Role Filter */}
            <div className="relative">
              <select
                value={filterRole}
                onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-surface-container-high border border-outline-variant/30 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-on-surface hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="salesperson">Salesperson</option>
                <option value="partner">Partner / Crew</option>
                <option value="customer">Customer</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant pointer-events-none" translate="no">expand_more</span>
            </div>

            {/* Access Status Filter */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="appearance-none bg-surface-container-high border border-outline-variant/30 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-on-surface hover:border-primary/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant pointer-events-none" translate="no">expand_more</span>
            </div>

            {(filterRole !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => { setFilterRole("all"); setFilterStatus("all"); setCurrentPage(1); }}
                className="text-[11px] font-bold text-error hover:underline transition-colors"
              >
                Clear filters
              </button>
            )}

            {/* Search */}
            <div className="relative ml-auto w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-outline-variant" translate="no">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search users..."
                className="w-full bg-surface-container border border-outline-variant/20 rounded-xl pl-9 pr-8 py-2 text-xs text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-surface-container-highest text-outline-variant hover:text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]" translate="no">close</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* ═══ SCROLL ZONE ═══ */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-7xl mx-auto bg-surface-container-low rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse">
              <colgroup>
                <col style={{ width: '45%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-surface-container-low">
                <tr className="border-b border-outline-variant/10">
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">User Details</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Assigned Role</th>
                  <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center">Access Status</th>
                  <th className="px-4 py-5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">
                      <div className="animate-spin w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full mx-auto mb-4" />
                      Loading users...
                    </td>
                  </tr>
                ) : paginatedProfiles.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/5 text-on-surface font-bold text-xs uppercase">
                            {user.full_name?.substring(0, 2) || "U"}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{user.full_name}</p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CustomDropdown
                          value={user.role || ""}
                          onChange={(val) => handleRoleChange(user.id, val)}
                          options={[
                            { value: "admin", label: "Admin" },
                            { value: "salesperson", label: "Salesperson" },
                            { value: "partner", label: "Partner / Crew" },
                            { value: "customer", label: "Customer" }
                          ]}
                          inline={true}
                          className={`bg-surface-container-highest border border-transparent rounded-lg py-1.5 px-3 text-xs font-semibold hover:ring-1 hover:ring-primary outline-none transition-all cursor-pointer ${updatingId === user.id ? "opacity-50 pointer-events-none" : ""}`}
                        />
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={updatingId === user.id || user.id === myId}
                          className={`relative inline-flex h-5 w-10 shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                            user.is_active ? 'bg-primary shadow-[0_0_15px_-3px_rgba(174,238,42,0.4)]' : 'bg-[#3a3a3a]'
                          }`}
                          title={user.id === myId ? 'Cannot deactivate yourself' : (user.is_active ? 'Deactivate user' : 'Activate user')}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform duration-200 ${user.is_active ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`}
                          />
                        </button>
                        <p className={`text-[9px] mt-1 font-medium ${user.is_active ? 'text-primary' : 'text-error'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {user.id !== myId ? (
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuId(actionMenuId === user.id ? null : user.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 text-outline-variant hover:text-primary transition-all mx-auto"
                            title="Actions"
                          >
                            <span className="material-symbols-outlined text-[18px]" translate="no">edit</span>
                          </button>

                          {actionMenuId === user.id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={() => setActionMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-surface-container-high border border-outline-variant/30 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                <button
                                  onClick={() => {
                                    setEditTarget(user);
                                    setEditUsername(user.username || "");
                                    setEditPassword(user.portal_password || "");
                                    setActionMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-on-surface hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px]" translate="no">manage_accounts</span>
                                  Edit Credentials
                                </button>
                                <button
                                  onClick={async () => {
                                    setActionMenuId(null);
                                    setSendingAccessId(user.id);
                                    try {
                                      const res = await fetch('/api/users/send-access', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: user.id, email: user.email, name: user.full_name }),
                                      });
                                      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
                                      alert(`Access sent to ${user.email}`);
                                    } catch (err: unknown) {
                                      const msg = err instanceof Error ? err.message : 'Unknown error';
                                      alert(`Error: ${msg}`);
                                    } finally {
                                      setSendingAccessId(null);
                                    }
                                  }}
                                  disabled={sendingAccessId === user.id}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-on-surface hover:bg-[#38bdf8]/10 hover:text-[#38bdf8] transition-colors disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[16px]" translate="no">send</span>
                                  Send Access
                                </button>
                                <div className="border-t border-outline-variant/20" />
                                <button
                                  onClick={() => { setDeleteTarget(user); setActionMenuId(null); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold text-error hover:bg-error/10 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px]" translate="no">delete_forever</span>
                                  Delete User
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] text-outline-variant">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Pagination Controls ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/10">
                <p className="text-xs text-on-surface-variant">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredProfiles.length)} of {filteredProfiles.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]" translate="no">chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        page === currentPage
                          ? 'bg-primary text-[#1a2e00]'
                          : 'text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]" translate="no">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* ─── Edit Credentials Modal ──────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-low w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Edit Credentials</h2>
                <p className="text-on-surface-variant text-xs mt-1">Update login details for {editTarget.full_name}</p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                disabled={savingEdit}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-container-highest text-on-surface-variant transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg" translate="no">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-surface-container rounded-xl p-3">
                {editTarget.avatar_url ? (
                  <img src={editTarget.avatar_url} alt={editTarget.full_name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/5 text-on-surface font-bold text-xs uppercase">
                    {editTarget.full_name?.substring(0, 2) || "U"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-on-surface">{editTarget.full_name}</p>
                  <p className="text-[11px] text-on-surface-variant">{editTarget.portal_email || editTarget.email}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {editTarget.role === "customer" ? "Username" : "Email (Login)"}
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  disabled={savingEdit || editTarget.role !== "customer"}
                  className="w-full bg-surface-container border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                {editTarget.role !== "customer" && (
                  <p className="text-[9px] text-outline-variant">Email login cannot be changed here</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Password</label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  disabled={savingEdit}
                  className="w-full bg-surface-container border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div className="p-4 bg-surface-container border-t border-white/5 flex gap-3 justify-end">
              <button
                onClick={() => setEditTarget(null)}
                disabled={savingEdit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!editTarget) return;
                  const usernameChanged = editUsername.trim() !== (editTarget.username || "");
                  const passwordChanged = editPassword.trim() !== (editTarget.portal_password || "");

                  if (!usernameChanged && !passwordChanged) {
                    setEditTarget(null);
                    return;
                  }

                  setSavingEdit(true);
                  try {
                    const res = await fetch(`/api/users/${editTarget.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        username: usernameChanged ? editUsername.trim() : undefined,
                        password: passwordChanged ? editPassword.trim() : undefined,
                      }),
                    });
                    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to update'); }
                    // Update local state
                    setProfiles(prev => prev.map(p => {
                      if (p.id !== editTarget.id) return p;
                      const updated = { ...p };
                      if (usernameChanged) {
                        updated.username = editUsername.trim();
                        updated.portal_email = `${editUsername.trim().toLowerCase()}@customer.sidingdepot.app`;
                        updated.email = updated.portal_email;
                      }
                      if (passwordChanged) {
                        updated.portal_password = editPassword.trim();
                      }
                      return updated;
                    }));
                    setEditTarget(null);
                    alert('Credentials updated successfully!');
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Unknown error';
                    alert(`Error: ${msg}`);
                  } finally {
                    setSavingEdit(false);
                  }
                }}
                disabled={savingEdit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-[#1a2e00] hover:scale-105 transition-transform disabled:opacity-60 flex items-center gap-2"
              >
                {savingEdit ? (
                  <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm" translate="no">save</span>
                )}
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Invite Modal ──────────────────────────── */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-low w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Invite New User</h2>
                <p className="text-on-surface-variant text-xs mt-1">Send an invitation to join Siding Depot.</p>
              </div>
              <button
                onClick={() => { setInviteModalOpen(false); setInviteError(null); setInviteSuccess(false); }}
                disabled={sendingInvite}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-container-highest text-on-surface-variant transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg" translate="no">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {inviteSuccess && (
                <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl p-3">
                  <span className="material-symbols-outlined text-primary text-lg" translate="no">check_circle</span>
                  <p className="text-xs text-primary font-medium">Invitation sent successfully!</p>
                </div>
              )}
              {inviteError && (
                <div className="flex items-center gap-3 bg-error/10 border border-error/30 rounded-xl p-3">
                  <span className="material-symbols-outlined text-error text-lg" translate="no">error</span>
                  <p className="text-xs text-error font-medium">{inviteError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Full Name</label>
                <input type="text" placeholder="e.g. John Doe" value={inviteName} onChange={e => setInviteName(e.target.value)} disabled={sendingInvite} className="w-full bg-surface-container border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Email Address</label>
                <input type="email" placeholder="john@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} disabled={sendingInvite} className="w-full bg-surface-container border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors disabled:opacity-50" />
              </div>
              <div className="space-y-1.5 relative z-40">
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Role</label>
                <CustomDropdown
                  value={inviteRole}
                  onChange={(val) => setInviteRole(val)}
                  options={[
                    { value: "admin", label: "Admin" },
                    { value: "salesperson", label: "Salesperson" },
                    { value: "partner", label: "Partner / Crew" },
                    { value: "customer", label: "Customer" }
                  ]}
                  className="w-full bg-surface-container border border-white/5 rounded-xl px-4 py-3 text-sm text-white hover:border-primary transition-colors flex justify-between items-center"
                />
              </div>
            </div>

            <div className="p-4 bg-surface-container border-t border-white/5 flex gap-3 justify-end">
              <button
                onClick={() => { setInviteModalOpen(false); setInviteError(null); setInviteSuccess(false); }}
                disabled={sendingInvite}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setInviteError(null);
                  setInviteSuccess(false);
                  if (!inviteName.trim()) { setInviteError('Please enter the full name.'); return; }
                  if (!inviteEmail.trim()) { setInviteError('Please enter the email address.'); return; }
                  setSendingInvite(true);
                  try {
                    const res = await fetch('/api/users/invite', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: inviteEmail.trim(), full_name: inviteName.trim(), role: inviteRole }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to send invitation');
                    setInviteSuccess(true);
                    setInviteName('');
                    setInviteEmail('');
                    setInviteRole('admin');
                    setTimeout(() => { fetchProfiles(); setInviteModalOpen(false); setInviteSuccess(false); }, 2000);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Unknown error';
                    setInviteError(msg);
                  } finally {
                    setSendingInvite(false);
                  }
                }}
                disabled={sendingInvite || inviteSuccess}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-[#1a2e00] hover:scale-105 transition-transform disabled:opacity-60 flex items-center gap-2"
              >
                {sendingInvite ? (
                  <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" />
                ) : inviteSuccess ? (
                  <span className="material-symbols-outlined text-sm" translate="no">check_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-sm" translate="no">send</span>
                )}
                {sendingInvite ? 'Sending...' : inviteSuccess ? 'Sent!' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirm Delete Modal ──────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-low w-full max-w-md rounded-2xl border border-error/20 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-error text-xl" translate="no">warning</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Delete User</h2>
                  <p className="text-on-surface-variant text-xs mt-0.5">This action cannot be undone</p>
                </div>
              </div>

              <div className="bg-surface-container rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {deleteTarget.avatar_url ? (
                    <img src={deleteTarget.avatar_url} alt={deleteTarget.full_name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border border-white/5 text-on-surface font-bold text-xs uppercase">
                      {deleteTarget.full_name?.substring(0, 2) || "U"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{deleteTarget.full_name}</p>
                    <p className="text-[11px] text-on-surface-variant">{deleteTarget.email}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-error/5 border border-error/15 rounded-xl p-3">
                <p className="text-xs text-error leading-relaxed">
                  <strong>Warning:</strong> This will permanently delete this user account, remove their login access, and clean up all associated data.
                </p>
              </div>
            </div>

            <div className="p-4 bg-surface-container border-t border-white/5 flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-5 py-2.5 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-error text-white hover:bg-[#e5623f] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm" translate="no">delete_forever</span>
                )}
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
