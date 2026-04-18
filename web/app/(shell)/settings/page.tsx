"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
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
  created_at: string;
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
    case "admin":       return "text-[#aeee2a] bg-[#aeee2a]/10 border-[#aeee2a]/30";
    case "salesperson": return "text-[#38bdf8] bg-[#38bdf8]/10 border-[#38bdf8]/30";
    case "partner":     return "text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/30";
    default:            return "text-[#faf9f5] bg-[#242624] border-white/10";
  }
};

// ─── Main Page ────────────────────────────────────────
export default function SettingsPage() {
  // ── All Users (team management) ──────────────────
  const [profiles, setProfiles]           = useState<Profile[]>([]);
  const [loading, setLoading]             = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);

  // ── My Profile ───────────────────────────────────
  const [myProfile, setMyProfile]         = useState<Profile | null>(null);
  const [editName, setEditName]           = useState("");
  const [editPhone, setEditPhone]         = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch all profiles ────────────────────────────
  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setProfiles(data as Profile[]);
    setLoading(false);
  }, []);

  // ── Fetch MY profile ──────────────────────────────
  const fetchMyProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      const p = data as Profile;
      setMyProfile(p);
      setEditName(p.full_name || "");
      setEditPhone(p.phone || "");
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchMyProfile();
  }, [fetchProfiles, fetchMyProfile]);

  // ── Avatar Upload ──────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myProfile) return;

    // Reset the input so the same file can be re-selected if needed
    e.target.value = "";

    setUploadingAvatar(true);
    try {
      const ext      = file.name.split(".").pop();
      const filePath = `${myProfile.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Add cache-buster so browser doesn't serve stale image
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", myProfile.id);

      if (updateErr) throw updateErr;

      setMyProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);

      // Notify TopBar to refresh the profile avatar immediately
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      alert(`Failed to upload avatar: ${err?.message || "Please try again."}`);
    } finally {
      setUploadingAvatar(false);
    }
  };


  // ── Save Profile ─────────────────────────────────
  const handleSaveProfile = async () => {
    if (!myProfile) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName.trim(), phone: editPhone.trim() })
        .eq("id", myProfile.id);

      if (error) throw error;
      setMyProfile(prev => prev ? { ...prev, full_name: editName.trim(), phone: editPhone.trim() } : null);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);

      // Notify TopBar so the name updates immediately in the header
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err: any) {
      console.error("Save profile error:", err);
      alert(`Failed to save profile: ${err?.message || "Please try again."}`);
    } finally {
      setSavingProfile(false);
    }
  };


  // ── Role change (team) ────────────────────────────
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

  // ── My Profile initials ────────────────────────────
  const initials = editName
    .split(" ")
    .map(w => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "SD";

  // ─────────────────────────────────────────────────────
  return (
    <>
      <TopBar title="Settings" />

      <main className="px-4 sm:px-6 lg:px-8 pb-20 pt-8 min-h-screen bg-[#0d0f0d]">
        <div className="max-w-7xl mx-auto space-y-12">

          {/* ══════════════════════════════════════
              MY PROFILE
          ══════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="text-xl font-headline font-bold text-white">My Profile</h3>
              <p className="text-[#ababa8] text-sm mt-2 leading-relaxed">
                Update your personal information and profile photo. Changes are reflected across the entire platform.
              </p>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-[#121412] p-8 rounded-2xl space-y-6 border border-white/5">

                {/* Avatar section */}
                <div className="flex items-center gap-6">
                  <div className="relative shrink-0">
                    {/* Avatar display */}
                    {myProfile?.avatar_url ? (
                      <img
                        src={myProfile.avatar_url}
                        alt={editName}
                        className="w-20 h-20 rounded-full object-cover border-2 border-[#aeee2a]"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-[#aeee2a]/15 border-2 border-[#aeee2a]/40 flex items-center justify-center">
                        <span className="text-[#aeee2a] text-2xl font-black">{initials}</span>
                      </div>
                    )}

                    {/* Upload overlay button */}
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#aeee2a] flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                      title="Upload photo"
                    >
                      {uploadingAvatar ? (
                        <div className="w-3 h-3 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-[#3a5400] text-[13px]" translate="no">photo_camera</span>
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-[#faf9f5]">{editName || "Your Name"}</p>
                    <p className="text-xs text-[#ababa8] mt-1">{ROLE_LABELS[myProfile?.role || ""] || myProfile?.role}</p>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="mt-2 text-xs font-bold text-[#aeee2a] hover:underline"
                    >
                      Change photo
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-[#181a18] border border-white/5 rounded-xl py-3 px-4 text-[#faf9f5] font-medium focus:ring-1 focus:ring-[#aeee2a] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Phone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-[#181a18] border border-white/5 rounded-xl py-3 px-4 text-[#faf9f5] font-medium focus:ring-1 focus:ring-[#aeee2a] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Email</label>
                    <input
                      type="email"
                      value={myProfile?.email || ""}
                      readOnly
                      className="w-full bg-[#0d0f0d] border border-white/5 rounded-xl py-3 px-4 text-[#ababa8] font-medium outline-none cursor-not-allowed"
                    />
                    <p className="text-[10px] text-[#474846]">Email cannot be changed here</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Role</label>
                    <div className="w-full bg-[#0d0f0d] border border-white/5 rounded-xl py-3 px-4 flex items-center gap-2 cursor-not-allowed">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(myProfile?.role || "")}`}>
                        {ROLE_LABELS[myProfile?.role || ""] || myProfile?.role || "—"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#474846]">Contact an admin to change your role</p>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#aeee2a] text-[#1a2e00] text-sm font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_4px_20px_rgb(174,238,42,0.15)] disabled:opacity-60"
                    style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
                  >
                    {savingProfile ? (
                      <div className="w-4 h-4 border-2 border-[#3a5400]/30 border-t-[#3a5400] rounded-full animate-spin" />
                    ) : profileSaved ? (
                      <><span className="material-symbols-outlined text-sm" translate="no">check_circle</span> Saved!</>
                    ) : (
                      <><span className="material-symbols-outlined text-sm" translate="no">save</span> Save Profile</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              ORGANIZATION PROFILE
          ══════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="text-xl font-headline font-bold text-white">Organization Profile</h3>
              <p className="text-[#ababa8] text-sm mt-2 leading-relaxed">Update your company's core identity, branding, and operational timezone.</p>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#121412] p-8 rounded-2xl space-y-6 border border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Legal Name</label>
                    <input
                      className="w-full bg-[#181a18] border-none rounded-xl py-3 px-4 text-[#faf9f5] font-medium focus:ring-1 focus:ring-[#aeee2a] outline-none transition-all"
                      type="text"
                      defaultValue="Siding Depot"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Tax ID</label>
                    <input
                      className="w-full bg-[#181a18] border-none rounded-xl py-3 px-4 text-[#faf9f5] font-medium focus:ring-1 focus:ring-[#aeee2a] outline-none transition-all"
                      type="text"
                      defaultValue="12-3456789"
                    />
                  </div>
                </div>
                <div className="space-y-2 relative z-50">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Timezone</label>
                  <CustomDropdown
                    value="GMT-6:00 Central Time (Dallas)" // Mock value for static showcase
                    onChange={() => {}}
                    options={[
                      "GMT-6:00 Central Time (Dallas)",
                      "GMT-8:00 Pacific Time",
                      "GMT-5:00 Eastern Time"
                    ]}
                    className="w-full bg-[#181a18] border-none rounded-xl py-3 px-4 text-[#faf9f5] font-medium hover:ring-1 hover:ring-[#aeee2a] outline-none transition-all flex justify-between items-center"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════
              USERS & PERMISSIONS
          ══════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="text-xl font-headline font-bold text-white">Users & Permissions</h3>
              <p className="text-[#ababa8] text-sm mt-2 leading-relaxed">Manage your team, invite users, and control their Role-Based Access Control (RBAC) levels.</p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-[#242624] text-[#aeee2a] text-[10px] font-bold uppercase tracking-widest rounded-full">
                  {profiles.length} Members
                </span>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#aeee2a] text-[#1a2e00] text-sm font-bold rounded-xl hover:scale-[1.02] shadow-[0_4px_20px_rgb(174,238,42,0.15)] transition-all"
                >
                  <span className="material-symbols-outlined text-lg" translate="no">person_add</span>
                  Invite User
                </button>
                <Link
                  href="/settings/role/new"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#181a18] text-[#ababa8] text-sm font-semibold rounded-xl border border-dashed border-[#474846]/50 hover:border-[#faf9f5] transition-all"
                >
                  <span className="material-symbols-outlined text-lg" translate="no">admin_panel_settings</span>
                  Role Matrix
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-[#121412] rounded-2xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#474846]/10">
                        <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">User Details</th>
                        <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Assigned Role</th>
                        <th className="px-6 py-5 text-[10px] font-bold uppercase tracking-widest text-[#ababa8] text-right">Access Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#474846]/5">
                      {loading ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-[#ababa8]">
                            <div className="animate-spin w-8 h-8 border-2 border-[#aeee2a]/30 border-t-[#aeee2a] rounded-full mx-auto mb-4" />
                            Loading users...
                          </td>
                        </tr>
                      ) : profiles.map((user) => (
                        <tr key={user.id} className="hover:bg-[#181a18]/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#242624] flex items-center justify-center border border-white/5 text-[#faf9f5] font-bold text-xs uppercase">
                                  {user.full_name?.substring(0, 2) || "U"}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-semibold text-[#faf9f5]">{user.full_name}</p>
                                <p className="text-[11px] text-[#ababa8] mt-0.5">{user.email}</p>
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
                                className={`bg-[#242624] border border-transparent rounded-lg py-1.5 px-3 text-xs font-semibold hover:ring-1 hover:ring-[#aeee2a] outline-none transition-all cursor-pointer ${updatingId === user.id ? "opacity-50 pointer-events-none" : ""}`}
                              />
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(user.role)}`}>
                                {user.role}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" defaultChecked />
                              <div className="w-10 h-5 bg-[#242624] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#aeee2a] shadow-[0_0_15px_-3px_rgba(174,238,42,0.4)]"></div>
                            </label>
                            <p className="text-[9px] text-[#ababa8] mt-1 pr-1 font-medium">Active</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ─── Invite Modal ──────────────────────────── */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121412] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#faf9f5]">Invite New User</h2>
                <p className="text-[#ababa8] text-xs mt-1">Send an invitation to join Siding Depot.</p>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#242624] text-[#ababa8] transition-colors"
              >
                <span className="material-symbols-outlined text-lg" translate="no">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Full Name</label>
                <input type="text" placeholder="e.g. John Doe" className="w-full bg-[#181a18] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#aeee2a] transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Email Address</label>
                <input type="email" placeholder="john@example.com" className="w-full bg-[#181a18] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#aeee2a] transition-colors" />
              </div>
              <div className="space-y-1.5 relative z-40">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#ababa8]">Role</label>
                <CustomDropdown
                  value="admin" // Mock
                  onChange={() => {}}
                  options={[
                    { value: "admin", label: "Admin" },
                    { value: "salesperson", label: "Salesperson" },
                    { value: "partner", label: "Partner / Crew" },
                    { value: "customer", label: "Customer" }
                  ]}
                  className="w-full bg-[#181a18] border border-white/5 rounded-xl px-4 py-3 text-sm text-white hover:border-[#aeee2a] transition-colors flex justify-between items-center"
                />
              </div>
            </div>

            <div className="p-4 bg-[#181a18] border-t border-white/5 flex gap-3 justify-end">
              <button onClick={() => setInviteModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#faf9f5] hover:bg-[#242624] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { alert("User invitation sent! (Mocked)"); setInviteModalOpen(false); }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#aeee2a] text-[#1a2e00] hover:scale-105 transition-transform"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
