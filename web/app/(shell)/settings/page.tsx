"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { CustomDropdown } from "@/components/CustomDropdown";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────
interface MyProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
}

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
export default function SettingsPage() {
  // ── My Profile ───────────────────────────────────
  const [myProfile, setMyProfile]         = useState<MyProfile | null>(null);
  const [editName, setEditName]           = useState("");
  const [editPhone, setEditPhone]         = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
      const p = data as MyProfile;
      setMyProfile(p);
      setEditName(p.full_name || "");
      setEditPhone(p.phone || "");
    }
  }, []);

  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  // ── Avatar Upload ──────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !myProfile) return;

    // Reset the input so the same file can be re-selected if needed
    e.target.value = "";

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `avatars/${myProfile.id}`);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload to R2");
      }

      const { url } = await res.json();

      // Add cache-buster so browser doesn't serve stale image
      const avatarUrl = `${url}?t=${Date.now()}`;

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
      <TopBar />

      <main className="px-4 sm:px-6 lg:px-8 pb-20 pt-8 min-h-screen bg-background">
        <div className="max-w-7xl mx-auto space-y-12">

          {/* ══════════════════════════════════════
              MY PROFILE
          ══════════════════════════════════════ */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="text-xl font-headline font-bold text-on-surface">My Profile</h3>
              <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
                Update your personal information and profile photo. Changes are reflected across the entire platform.
              </p>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-surface-container-low p-8 rounded-2xl space-y-6 border border-outline-variant/20">

                {/* Avatar section */}
                <div className="flex items-center gap-6">
                  <div className="relative shrink-0">
                    {/* Avatar display */}
                    {myProfile?.avatar_url ? (
                      <img
                        src={myProfile.avatar_url}
                        alt={editName}
                        className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/40 flex items-center justify-center">
                        <span className="text-primary text-2xl font-black">{initials}</span>
                      </div>
                    )}

                    {/* Upload overlay button */}
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
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
                    <p className="text-sm font-bold text-on-surface">{editName || "Your Name"}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{ROLE_LABELS[myProfile?.role || ""] || myProfile?.role}</p>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="mt-2 text-xs font-bold text-primary hover:underline"
                    >
                      Change photo
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface font-medium focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Phone</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface font-medium focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Email</label>
                    <input
                      type="email"
                      value={myProfile?.email || ""}
                      readOnly
                      className="w-full bg-background border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface-variant font-medium outline-none cursor-not-allowed"
                    />
                    <p className="text-[10px] text-outline-variant">Email cannot be changed here</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Role</label>
                    <div className="w-full bg-background border border-outline-variant/20 rounded-xl py-3 px-4 flex items-center gap-2 cursor-not-allowed">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(myProfile?.role || "")}`}>
                        {ROLE_LABELS[myProfile?.role || ""] || myProfile?.role || "—"}
                      </span>
                    </div>
                    <p className="text-[10px] text-outline-variant">Contact an admin to change your role</p>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-[#1a2e00] text-sm font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[0_4px_20px_rgb(174,238,42,0.15)] disabled:opacity-60"
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
              <h3 className="text-xl font-headline font-bold text-on-surface">Organization Profile</h3>
              <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">Update your company's core identity, branding, and operational timezone.</p>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface-container-low p-8 rounded-2xl space-y-6 border border-outline-variant/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Legal Name</label>
                    <input
                      className="w-full bg-surface-container border-none rounded-xl py-3 px-4 text-on-surface font-medium focus:ring-1 focus:ring-primary outline-none transition-all"
                      type="text"
                      defaultValue="Siding Depot"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Tax ID</label>
                    <input
                      className="w-full bg-surface-container border-none rounded-xl py-3 px-4 text-on-surface font-medium focus:ring-1 focus:ring-primary outline-none transition-all"
                      type="text"
                      defaultValue="12-3456789"
                    />
                  </div>
                </div>
                <div className="space-y-2 relative z-50">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Timezone</label>
                  <CustomDropdown
                    value="GMT-6:00 Central Time (Dallas)"
                    onChange={() => {}}
                    options={[
                      "GMT-6:00 Central Time (Dallas)",
                      "GMT-8:00 Pacific Time",
                      "GMT-5:00 Eastern Time"
                    ]}
                    className="w-full bg-surface-container border-none rounded-xl py-3 px-4 text-on-surface font-medium hover:ring-1 hover:ring-primary outline-none transition-all flex justify-between items-center"
                  />
                </div>
              </div>
            </div>
          </section>


        </div>
      </main>
    </>
  );
}
