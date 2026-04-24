"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useTranslations, useLocale } from "next-intl";
import { setUserLocale } from "@/app/actions/i18n";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

// =============================================
// FieldProfile — Perfil do Parceiro
// Padrão unificado: Avatar upload, dados reais, Material Symbols
// =============================================

export default function FieldProfile() {
  const locale = useLocale();
  const t = useTranslations("MobileNav");
  const tCommon = useTranslations("Common");
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; email: string; avatar_url: string | null; initials: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      const name = data?.full_name || user.email?.split("@")[0] || "Crew";
      const initials = name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();
      setProfile({
        full_name: name,
        email: user.email ?? "",
        avatar_url: data?.avatar_url ?? null,
        initials,
      });
    };
    load();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const filePath = `avatars/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("attachments")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : prev);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      alert("Failed to upload photo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-5 space-y-8 bg-mobile-frame min-h-full">
      {/* Profile Header */}
      <section className="flex flex-col items-center pt-4">
        {/* Avatar with Upload */}
        <div className="relative group mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary shadow-[0_0_20px_rgba(174,238,42,0.15)] transition-transform active:scale-95"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[48px] text-on-surface" translate="no">engineering</span>
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-white text-[24px]" translate="no">photo_camera</span>
            </div>
          </button>

          {/* Upload spinner */}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* Camera badge */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-mobile-frame">
            <span className="material-symbols-outlined text-[14px] text-[#0a0a0a]" translate="no">photo_camera</span>
          </div>
        </div>

        <h2 className="text-on-surface font-headline text-2xl font-bold tracking-tight">
          {profile?.full_name ?? "..."}
        </h2>
        <p className="text-primary text-xs font-bold uppercase tracking-widest mt-1">Partner / Field Crew</p>
        <p className="text-on-surface-variant text-xs mt-0.5">{profile?.email ?? ""}</p>
      </section>

      {/* Menu Options */}
      <div className="space-y-3">
        <div className="bg-surface-container border border-outline-variant/20 rounded-2xl overflow-hidden">
          <button className="w-full px-5 py-4 flex items-center gap-4 hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant" translate="no">person</span>
            <span className="text-on-surface font-bold text-sm flex-1 text-left">{t("editProfile")}</span>
            <span className="material-symbols-outlined text-outline-variant text-lg" translate="no">chevron_right</span>
          </button>
          
          <div className="h-px bg-white/5" />
          
          {/* Theme Switcher */}
          <div className="w-full px-5 py-2 flex items-center justify-between">
            <span className="text-on-surface font-bold text-sm flex-1 text-left">{tCommon("theme")}</span>
            <ThemeSwitcher />
          </div>

          <div className="h-px bg-white/5" />
          
          {/* Language Switcher */}
          <div className="w-full relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant" translate="no">language</span>
              <span className="text-on-surface font-bold text-sm flex-1 text-left">{tCommon("language")}</span>
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                {locale === 'en' ? '🇺🇸 EN' : locale === 'es' ? '🇪🇸 ES' : '🇧🇷 PT'}
                <span className="material-symbols-outlined text-outline-variant text-lg" translate="no">
                  {isLangOpen ? 'expand_less' : 'expand_more'}
                </span>
              </span>
            </button>

            {isLangOpen && (
              <div className="w-full bg-surface-container-low border-t border-outline-variant/20 flex flex-col animate-in slide-in-from-top-2 duration-200">
                <button
                  onClick={async () => {
                    await setUserLocale('en');
                    window.location.reload();
                  }}
                  className={`w-full px-12 py-4 flex items-center gap-4 hover:bg-surface-container-highest transition-colors ${locale === 'en' ? 'bg-surface-container-high' : ''}`}
                >
                  <span className="text-xl">🇺🇸</span>
                  <span className={`text-sm font-bold flex-1 text-left ${locale === 'en' ? 'text-primary' : 'text-on-surface-variant'}`}>{tCommon("english")}</span>
                  {locale === 'en' && <span className="material-symbols-outlined text-primary text-lg" translate="no">check</span>}
                </button>
                <div className="h-px bg-white/5 ml-12" />
                <button
                  onClick={async () => {
                    await setUserLocale('es');
                    window.location.reload();
                  }}
                  className={`w-full px-12 py-4 flex items-center gap-4 hover:bg-surface-container-highest transition-colors ${locale === 'es' ? 'bg-surface-container-high' : ''}`}
                >
                  <span className="text-xl">🇪🇸</span>
                  <span className={`text-sm font-bold flex-1 text-left ${locale === 'es' ? 'text-primary' : 'text-on-surface-variant'}`}>{tCommon("spanish")}</span>
                  {locale === 'es' && <span className="material-symbols-outlined text-primary text-lg" translate="no">check</span>}
                </button>
                <div className="h-px bg-white/5 ml-12" />
                <button
                  onClick={async () => {
                    await setUserLocale('pt');
                    window.location.reload();
                  }}
                  className={`w-full px-12 py-4 flex items-center gap-4 hover:bg-surface-container-highest transition-colors ${locale === 'pt' ? 'bg-surface-container-high' : ''}`}
                >
                  <span className="text-xl">🇧🇷</span>
                  <span className={`text-sm font-bold flex-1 text-left ${locale === 'pt' ? 'text-primary' : 'text-on-surface-variant'}`}>{tCommon("portuguese")}</span>
                  {locale === 'pt' && <span className="material-symbols-outlined text-primary text-lg" translate="no">check</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* App version */}
      <p className="text-center text-outline-variant text-[10px] font-bold uppercase tracking-widest">
        Siding Depot v1.0 • {t("fieldEdition")}
      </p>
    </div>
  );
}
