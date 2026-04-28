"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

// ─── Shared UserProfile type ─────────────────────────────────────
export interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  initials: string;
}

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  /** Force re-fetch from Supabase (e.g. after settings save) */
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        const name = data.full_name || user.email?.split("@")[0] || "User";
        const initials = name
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();

        setProfile({
          id: user.id,
          full_name: name,
          role: data.role || "admin",
          avatar_url: data.avatar_url || null,
          initials,
        });
      }
    } catch (e) {
      console.error("[ProfileContext] Failed to load profile:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Listen to "profile-updated" custom events (fired by settings page)
  useEffect(() => {
    const handler = () => fetchProfile();
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [fetchProfile]);

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh: fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────
export function useProfile(): ProfileContextType {
  const ctx = useContext(ProfileContext);
  if (ctx === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return ctx;
}
