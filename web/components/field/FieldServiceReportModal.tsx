"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compressImage";
import { useTranslations } from "next-intl";

interface PhotoWithAnnotation {
  file: File;
  previewUrl: string;
  annotation: string;
}

interface FieldServiceReportModalProps {
  blockerId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function FieldServiceReportModal({
  blockerId,
  onClose,
  onSaved,
}: FieldServiceReportModalProps) {
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoWithAnnotation[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("FieldServiceReport");

  // ── Add photos ──
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos: PhotoWithAnnotation[] = Array.from(e.target.files).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        annotation: "",
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
    setTimeout(() => { e.target.value = ""; }, 300);
  }

  function handleCameraCapture(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setPhotos((prev) => [
        ...prev,
        { file, previewUrl: URL.createObjectURL(file), annotation: "" },
      ]);
    }
    setTimeout(() => { e.target.value = ""; }, 300);
  }

  function removePhoto(idx: number): void {
    URL.revokeObjectURL(photos[idx].previewUrl);
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  }

  function updateAnnotation(idx: number, text: string): void {
    setPhotos((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, annotation: text } : p))
    );
  }

  // ── Submit ──
  async function handleSubmit(): Promise<void> {
    if (!notes.trim() && photos.length === 0) {
      setError(t("addNotesOrPhotos"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get crew_id
      const { data: crew } = await supabase
        .from("crews")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!crew) throw new Error("No crew profile linked");

      // Create the report
      const { data: report, error: insertErr } = await supabase
        .from("service_reports")
        .insert({
          blocker_id: blockerId,
          crew_id: crew.id,
          reporter_id: user.id,
          notes: notes.trim() || null,
          is_our_fault: false,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;
      if (!report) throw new Error("Failed to create report");

      // Upload photos and create records
      for (const photo of photos) {
        const compressed = await compressImage(photo.file);
        const ext = compressed.name.split(".").pop();
        const path = `service-reports/${report.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        // Upload to R2 via API
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("folder", `service-reports/${report.id}`);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          console.error("[ServiceReport] upload failed");
          continue;
        }

        const { url } = await uploadRes.json();

        // Insert photo record with annotation
        await supabase.from("service_report_photos").insert({
          report_id: report.id,
          url,
          annotation: photo.annotation.trim() || null,
        });
      }

      // Push notification to admins
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        await fetch("/api/push/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "📋 Service Report Submitted",
            body: `${profile?.full_name ?? "Partner"} submitted a service report with ${photos.length} photo(s).`,
            url: "/services",
            tag: "service-report",
            notificationType: "service_report",
            relatedEntityId: blockerId,
          }),
        });
      } catch { /* non-blocking */ }

      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to submit report";
      console.error("[ServiceReport] save error:", err);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-background border-t border-surface-container-highest rounded-t-3xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom duration-300 max-h-[92dvh] overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#3b82f6]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#3b82f6]" translate="no">
                assignment
              </span>
            </div>
            <div>
              <h2 className="text-on-surface font-bold text-lg leading-tight">
                {t("serviceReport")}
              </h2>
              <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mt-0.5">
                {t("photosAnnotations")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center text-on-surface-variant active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-lg" translate="no">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          {/* Notes */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              {t("reportNotes")}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-container-high border border-white/5 focus:border-primary rounded-2xl py-4 px-4 text-on-surface outline-none placeholder:text-outline-variant font-medium text-sm resize-none transition-colors"
              placeholder={t("notesPlaceholder")}
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              {t("photos")} {photos.length > 0 && `(${photos.length})`}
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center bg-surface-container-low active:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-2xl text-outline-variant mb-1" translate="no">photo_camera</span>
                <p className="text-xs font-bold text-on-surface">{t("takePhoto")}</p>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center bg-surface-container-low active:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-2xl text-outline-variant mb-1" translate="no">photo_library</span>
                <p className="text-xs font-bold text-on-surface">{t("chooseFiles")}</p>
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Photo grid with annotations */}
            {photos.length > 0 && (
              <div className="space-y-3">
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="bg-surface-container-high border border-white/5 rounded-2xl overflow-hidden"
                  >
                    {/* Photo preview */}
                    <div className="relative">
                      <img
                        src={photo.previewUrl}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-40 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-2 right-2 bg-black/70 w-7 h-7 rounded-full flex items-center justify-center text-white backdrop-blur-sm active:scale-95 transition-transform"
                      >
                        <span className="material-symbols-outlined text-[14px]" translate="no">close</span>
                      </button>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded-full backdrop-blur-sm">
                        <span className="text-[10px] font-bold text-white">{t("photo")} {idx + 1}</span>
                      </div>
                    </div>

                    {/* Annotation input */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[14px] text-[#3b82f6]" translate="no">edit_note</span>
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                          {t("annotation")}
                        </label>
                      </div>
                      <input
                        type="text"
                        value={photo.annotation}
                        onChange={(e) => updateAnnotation(idx, e.target.value)}
                        placeholder={t("annotationPlaceholder")}
                        className="w-full bg-background border border-white/5 focus:border-[#3b82f6] rounded-xl py-2.5 px-3 text-on-surface text-xs outline-none placeholder:text-outline-variant transition-colors"
                        maxLength={500}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-2xl p-4">
              <span className="material-symbols-outlined text-error text-lg shrink-0" translate="no">error</span>
              <p className="text-xs text-error font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || (!notes.trim() && photos.length === 0)}
            className="w-full h-14 bg-[#3b82f6] text-white font-bold text-base rounded-full shadow-[0_10px_40px_rgba(59,130,246,0.25)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-xl" translate="no">send</span>
                {photos.length > 1
                  ? t("submitReportWithPhotos", { count: photos.length })
                  : photos.length === 1
                    ? t("submitReportWithPhoto")
                    : t("submitReport")}
              </>
            )}
          </button>

          <p className="text-center text-outline-variant text-[10px] uppercase tracking-widest font-bold">
            {t("sentToOffice")}
          </p>
        </div>
      </div>
    </div>
  );
}
