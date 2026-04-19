"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface FieldChangeOrderModalProps {
  jobId: string;
  serviceId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

export function FieldChangeOrderModal({
  jobId,
  serviceId,
  onClose,
  onSaved,
}: FieldChangeOrderModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---------- Upload attachments ----------
  async function uploadFiles(coId: string): Promise<void> {
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `change-orders/${coId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(path, file);

      if (upErr) {
        console.error("[FieldCO] upload error:", upErr);
        continue;
      }

      const { data } = supabase.storage.from("attachments").getPublicUrl(path);

      await supabase.from("change_order_attachments").insert({
        change_order_id: coId,
        file_name: file.name,
        url: data.publicUrl,
        mime_type: file.type,
        size_bytes: file.size,
      });
    }
  }

  // ---------- Submit ----------
  async function handleSubmit(): Promise<void> {
    if (!title.trim() || !description.trim()) return;

    setSaving(true);
    setError(null);

    try {
      // Resolve profile_id do parceiro logado
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { data: co, error: insertErr } = await supabase
        .from("change_orders")
        .insert({
          job_id: jobId,
          job_service_id: serviceId || null,
          title: title.trim(),
          description: description.trim(),
          proposed_amount: null, // Parceiro NUNCA coloca preço
          status: "draft",
          requested_by_profile_id: user.id,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      if (co && files.length > 0) {
        await uploadFiles(co.id);
      }

      onSaved();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create change order";
      console.error("[FieldCO] save error:", err);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  // ---------- File helpers ----------
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    // Reset input so the same file can be picked again if removed
    e.target.value = "";
  }

  function removeFile(index: number): void {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function getFileIcon(file: File): string {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "videocam";
    if (file.type.includes("pdf")) return "picture_as_pdf";
    return "attach_file";
  }

  function formatBytes(b: number): string {
    return b < 1024 * 1024
      ? `${(b / 1024).toFixed(0)} KB`
      : `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0f0d] border-t border-[#242624] rounded-t-3xl shadow-2xl w-full max-w-md animate-in slide-in-from-bottom duration-300 max-h-[92dvh] overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile sheet affordance) */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#474846]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ff7351]/10 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[#ff7351]"
                translate="no"
              >
                inventory_2
              </span>
            </div>
            <div>
              <h2 className="text-[#faf9f5] font-bold text-lg leading-tight">
                Request Change Order
              </h2>
              <p className="text-[#ababa8] text-[10px] uppercase font-bold tracking-widest mt-0.5">
                No pricing • Draft only
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#1e201e] border border-white/5 flex items-center justify-center text-[#ababa8] active:scale-95 transition-transform"
          >
            <span
              className="material-symbols-outlined text-lg"
              translate="no"
            >
              close
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-[#1a2e00] border border-[#aeee2a]/15 rounded-2xl p-4">
            <span
              className="material-symbols-outlined text-[#aeee2a] shrink-0 mt-0.5 text-lg"
              translate="no"
            >
              info
            </span>
            <p className="text-xs text-[#ababa8] leading-relaxed">
              Describe what you found on site. The{" "}
              <span className="text-[#aeee2a] font-bold">
                Home Office
              </span>{" "}
              will add pricing and send to the customer for approval.
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">
              What needs to change? *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1e201e] border border-white/5 focus:border-[#aeee2a] rounded-2xl py-4 px-4 text-[#faf9f5] outline-none placeholder:text-[#474846] font-bold text-[15px] transition-colors"
              placeholder="e.g. Rotten wood behind fascia"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">
              Describe in detail *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#1e201e] border border-white/5 focus:border-[#aeee2a] rounded-2xl py-4 px-4 text-[#faf9f5] outline-none placeholder:text-[#474846] font-medium text-sm resize-none transition-colors"
              placeholder="Describe the issue, what materials are needed, and estimated scope..."
              rows={4}
              maxLength={1000}
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">
              Photos from site
            </label>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center bg-[#121412] active:bg-white/5 transition-colors"
            >
              <span
                className="material-symbols-outlined text-3xl text-[#474846] mb-2"
                translate="no"
              >
                add_a_photo
              </span>
              <p className="text-sm font-bold text-[#faf9f5]">
                Take or Choose Photos
              </p>
              <p className="text-[10px] font-medium text-[#474846] mt-1 uppercase tracking-wider">
                JPG, PNG, PDF up to 20MB
              </p>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-[#1e201e] border border-white/5 rounded-2xl px-4 py-3"
                  >
                    <span
                      className="material-symbols-outlined text-[#aeee2a] text-lg"
                      translate="no"
                    >
                      {getFileIcon(file)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#faf9f5] font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-[#ababa8]">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-[#ababa8] active:text-[#ff7351] transition-colors"
                    >
                      <span
                        className="material-symbols-outlined text-lg"
                        translate="no"
                      >
                        close
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-[#ff7351]/10 border border-[#ff7351]/20 rounded-2xl p-4">
              <span
                className="material-symbols-outlined text-[#ff7351] text-lg shrink-0"
                translate="no"
              >
                error
              </span>
              <p className="text-xs text-[#ff7351] font-medium">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className="w-full h-14 bg-[#aeee2a] text-[#1a2e00] font-bold text-base rounded-full shadow-[0_10px_40px_rgba(174,238,42,0.25)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-[#1a2e00]/20 border-t-[#1a2e00] rounded-full animate-spin" />
            ) : (
              <>
                <span
                  className="material-symbols-outlined text-xl"
                  translate="no"
                >
                  send
                </span>
                {files.length > 0
                  ? `Submit with ${files.length} Photo${files.length > 1 ? "s" : ""}`
                  : "Submit Change Order"}
              </>
            )}
          </button>

          <p className="text-center text-[#474846] text-[10px] uppercase tracking-widest font-bold">
            Sent to Home Office for pricing & approval
          </p>
        </div>
      </div>
    </div>
  );
}
