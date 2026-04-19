"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
}

export default function SalesMobileProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchMyProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        const p = data as Profile;
        // Merge auth email if missing
        if (!p.email && user.email) p.email = user.email;
        setProfile(p);
        setEditName(p.full_name || "");
        setEditPhone(p.phone || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyProfile();
  }, [fetchMyProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    e.target.value = "";
    
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${profile.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", profile.id);

      if (updateErr) throw updateErr;

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      alert(`Failed to upload avatar: ${err?.message || "Please try again."}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName.trim(), phone: editPhone.trim() })
        .eq("id", profile.id);

      if (error) throw error;
      setProfile(prev => prev ? { ...prev, full_name: editName.trim(), phone: editPhone.trim() } : null);
      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error("Save profile error:", err);
      alert(`Failed to save profile: ${err?.message || "Please try again."}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogOut = async () => {
    // Calling server-side logout
    window.location.href = '/api/logout';
  };

  const initials = editName
    .split(" ")
    .map(w => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "SD";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0d0f0d] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#aeee2a]/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/4"></div>

      <div className="px-4 pt-14 pb-4">
        <h1 className="text-2xl font-black text-[#faf9f5]">My Profile</h1>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
             <span className="material-symbols-outlined text-[#aeee2a] text-3xl animate-spin">progress_activity</span>
             <p className="text-[#ababa8] text-sm font-medium">Loading profile...</p>
          </div>
        ) : profile ? (
          <div className="flex flex-col gap-6">
            
            {/* Avatar Section */}
            <div className="bg-[#121412] rounded-3xl p-6 flex flex-col items-center gap-4 shadow-xl border border-[#474846]/20 relative overflow-hidden">
               <div className="relative">
                 {profile?.avatar_url ? (
                   <img
                     src={profile.avatar_url}
                     alt={editName}
                     className="w-24 h-24 rounded-full object-cover border-4 border-[#aeee2a] shadow-[0_0_20px_rgba(174,238,42,0.3)]"
                   />
                 ) : (
                   <div className="w-24 h-24 rounded-full bg-[#1e201e] border-4 border-[#aeee2a] shadow-[0_0_20px_rgba(174,238,42,0.3)] flex items-center justify-center">
                     <span className="text-[#aeee2a] text-3xl font-black">{initials}</span>
                   </div>
                 )}
                 <button
                   onClick={() => avatarInputRef.current?.click()}
                   disabled={uploadingAvatar}
                   className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#faf9f5] flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50"
                 >
                   {uploadingAvatar ? (
                     <div className="w-4 h-4 border-2 border-[#121412]/30 border-t-[#121412] rounded-full animate-spin" />
                   ) : (
                     <span className="material-symbols-outlined text-[#121412] text-[16px]">photo_camera</span>
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
               
               <div className="text-center">
                 <h2 className="text-[#faf9f5] font-black text-lg">{profile.full_name || "Sales Rep"}</h2>
                 <p className="text-[#aeee2a] font-bold text-[10px] uppercase tracking-widest mt-0.5 px-2 py-0.5 bg-[#aeee2a]/10 rounded-full inline-block border border-[#aeee2a]/20">
                    {profile.role.toUpperCase()}
                 </p>
               </div>
            </div>

            {/* Profile Forms Section */}
            <div className="flex flex-col gap-4">
               <h3 className="text-[#ababa8] font-bold text-xs uppercase tracking-widest px-2">Personal Info</h3>
               
               <div className="bg-[#121412] rounded-3xl p-5 border border-[#474846]/20 flex flex-col gap-5 shadow-lg">
                  <div className="flex flex-col flex-1">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-1.5 ml-1">Full Name</label>
                     <div className="flex items-center bg-[#1e201e] border border-[#474846]/30 rounded-2xl px-4 py-3 focus-within:border-[#aeee2a]/50 transition-colors">
                        <span className="material-symbols-outlined text-[#ababa8] text-[18px] mr-3">person</span>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-transparent text-[#faf9f5] text-sm outline-none font-medium placeholder-[#474846]"
                          placeholder="Your full name"
                        />
                     </div>
                  </div>

                  <div className="flex flex-col flex-1">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-1.5 ml-1">Phone</label>
                     <div className="flex items-center bg-[#1e201e] border border-[#474846]/30 rounded-2xl px-4 py-3 focus-within:border-[#aeee2a]/50 transition-colors">
                        <span className="material-symbols-outlined text-[#ababa8] text-[18px] mr-3">phone</span>
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-transparent text-[#faf9f5] text-sm outline-none font-medium placeholder-[#474846]"
                          placeholder="(XXX) XXX-XXXX"
                        />
                     </div>
                  </div>

                  <div className="flex flex-col flex-1">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-[#7B7B78] mb-1.5 ml-1">Email <span className="text-[#474846] normal-case tracking-normal ml-1">(Read-only)</span></label>
                     <div className="flex items-center bg-[#0d0f0d] border border-transparent rounded-2xl px-4 py-3 opacity-60">
                        <span className="material-symbols-outlined text-[#7B7B78] text-[18px] mr-3">mail</span>
                        <input
                          type="text"
                          value={profile.email}
                          readOnly
                          className="w-full bg-transparent text-[#ababa8] text-sm outline-none font-medium pointer-events-none"
                        />
                     </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="mt-2 w-full flex items-center justify-center py-3.5 rounded-2xl bg-[#aeee2a] text-[#1a2e00] font-black text-sm active:scale-[0.98] transition-transform disabled:opacity-50 shadow-[0_0_20px_rgba(174,238,42,0.15)]"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
               </div>
            </div>

            {/* Danger Zone */}
            <div className="flex flex-col gap-4 mt-2">
               <h3 className="text-[#ababa8] font-bold text-xs uppercase tracking-widest px-2">Account Actions</h3>
               <button
                 onClick={handleLogOut}
                 className="flex items-center justify-center gap-2 bg-[#ff7351]/10 text-[#ff7351] font-bold text-sm py-4 rounded-3xl border border-[#ff7351]/20 active:scale-[0.98] transition-all"
               >
                 <span className="material-symbols-outlined">logout</span>
                 Sign Out
               </button>
            </div>
            
          </div>
        ) : (
          <div className="text-[#ababa8] text-center mt-20">Could not load profile.</div>
        )}
      </main>

      {/* Reused Mobile NAV */}
      <MobileBottomNav items={[
        { icon: "dashboard", label: "Dashboard", href: "/mobile/sales" },
        { icon: "home_work", label: "Projects", href: "/mobile/sales/projects" },
        { icon: "request_quote", label: "Orders", href: "/mobile/sales/orders" },
        { icon: "calendar_today", label: "Calendar", href: "/mobile/sales/calendar" },
      ]} />
    </div>
  );
}
