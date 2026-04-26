"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compressImage";
import { CustomDropdown } from "@/components/CustomDropdown";

/* ────────────────────────────────────── Types ── */

interface FieldChangeOrderModalProps {
  jobId: string;
  serviceId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

interface COItem {
  location: string;
  material: string;
  notes: string;
  files: File[];
  previewUrls: string[];
}

/* ────────────────────────────────────── Component ── */

export function FieldChangeOrderModal({
  jobId,
  serviceId,
  onClose,
  onSaved,
}: FieldChangeOrderModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Items list (like Extra Material pattern)
  const [items, setItems] = useState<COItem[]>([
    { location: "", material: "", notes: "", files: [], previewUrls: [] },
  ]);

  // Service dropdown
  const [jobServices, setJobServices] = useState<{ id: string; name: string }[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(serviceId || "");

  // Hidden file inputs per item
  const cameraRefs = useRef<(HTMLInputElement | null)[]>([]);
  const galleryRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ─── Load services ───────────────────────────── */
  useEffect(() => {
    if (!jobId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: crew } = await supabase
        .from("crews")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      const { data } = await supabase
        .from("job_services")
        .select("id, service_type:service_types(name)")
        .eq("job_id", jobId);

      const allServices = (data || []).map((s: any) => ({
        id: s.id,
        name: s.service_type?.name ?? "Unknown",
      }));

      if (crew) {
        const { data: assignments } = await supabase
          .from("service_assignments")
          .select("job_service_id")
          .eq("crew_id", crew.id);

        const assignedIds = new Set((assignments || []).map((a: any) => a.job_service_id));
        const filtered = allServices.filter((s: { id: string }) => assignedIds.has(s.id));
        setJobServices(filtered);

        if (serviceId && filtered.some((s: { id: string }) => s.id === serviceId)) {
          setSelectedServiceId(serviceId);
        } else if (filtered.length === 1) {
          setSelectedServiceId(filtered[0].id);
        }
      } else {
        setJobServices(allServices);
        if (serviceId && allServices.some((s: { id: string }) => s.id === serviceId)) {
          setSelectedServiceId(serviceId);
        } else if (allServices.length === 1) {
          setSelectedServiceId(allServices[0].id);
        }
      }
    })();
  }, [jobId, serviceId]);

  /* ─── Item CRUD ───────────────────────────────── */
  const addItem = (): void => {
    setItems([...items, { location: "", material: "", notes: "", files: [], previewUrls: [] }]);
  };

  const removeItem = (index: number): void => {
    // Revoke blob URLs to free memory
    items[index].previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof Pick<COItem, "location" | "material" | "notes">, value: string): void => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  /* ─── File helpers per item ───────────────────── */
  const handleItemFiles = (index: number, fileList: FileList | null): void => {
    if (!fileList || fileList.length === 0) return;
    const newFiles = Array.from(fileList);
    const newPreviews = newFiles
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => URL.createObjectURL(f));

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        files: [...updated[index].files, ...newFiles],
        previewUrls: [...updated[index].previewUrls, ...newPreviews],
      };
      return updated;
    });
  };

  const removeItemFile = (itemIdx: number, fileIdx: number): void => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[itemIdx] };
      if (item.previewUrls[fileIdx]) URL.revokeObjectURL(item.previewUrls[fileIdx]);
      item.files = item.files.filter((_, i) => i !== fileIdx);
      item.previewUrls = item.previewUrls.filter((_, i) => i !== fileIdx);
      updated[itemIdx] = item;
      return updated;
    });
  };

  /* ─── Submit ──────────────────────────────────── */
  async function handleSubmit(): Promise<void> {
    const validItems = items.filter((item) => item.material.trim() !== "");
    if (validItems.length === 0) {
      setError("Please enter at least one material.");
      return;
    }

    const missingLocation = validItems.some((item) => !item.location);
    if (missingLocation) {
      setError("Please select a location for every item.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Build the CO title from items
      const itemNames = validItems.map((i) => i.material.trim());
      const coTitle = itemNames.length <= 2
        ? itemNames.join(" + ")
        : `${itemNames[0]} + ${itemNames.length - 1} more`;

      const locations = [...new Set(validItems.map((i) => i.location))];
      const coDescription = `Location: ${locations.join(", ")}`;

      // 1. Create the change_orders record
      const { data: co, error: coErr } = await supabase
        .from("change_orders")
        .insert({
          job_id: jobId,
          job_service_id: selectedServiceId || null,
          title: coTitle,
          description: coDescription,
          proposed_amount: null,
          status: "draft",
          requested_by_profile_id: user.id,
        })
        .select("id")
        .single();

      if (coErr) throw coErr;
      if (!co) throw new Error("Failed to create change order");

      // 2. Create change_order_items for each valid item
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const { data: coItem, error: itemErr } = await supabase
          .from("change_order_items")
          .insert({
            change_order_id: co.id,
            description: item.notes.trim()
              ? `[${item.location}] ${item.material.trim()}\n${item.notes.trim()}`
              : `[${item.location}] ${item.material.trim()}`,
            amount: null,
            sort_order: i,
          })
          .select("id")
          .single();

        if (itemErr) {
          console.error("[FieldCO] item insert error:", itemErr);
          continue;
        }

        // 3. Upload photos for this item
        if (coItem && item.files.length > 0) {
          for (const rawFile of item.files) {
            const file = await compressImage(rawFile);
            const ext = file.name.split(".").pop();
            const path = `change-orders/${co.id}/${coItem.id}/${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}.${ext}`;

            const { error: upErr } = await supabase.storage
              .from("attachments")
              .upload(path, file);

            if (upErr) {
              console.error("[FieldCO] upload error:", upErr);
              continue;
            }

            const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(path);

            await supabase.from("change_order_attachments").insert({
              change_order_id: co.id,
              change_order_item_id: coItem.id,
              file_name: file.name,
              url: urlData.publicUrl,
              mime_type: file.type,
              size_bytes: file.size,
            });
          }
        }
      }

      // 4. Push notification to admins + salesperson
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
            title: "📋 Change Order Request",
            body: `${profile?.full_name ?? "Partner"} submitted: ${coTitle}`,
            url: `/mobile/sales/orders/${co.id}`,
            tag: "change-order-request",
            notificationType: "change_order_request",
            relatedEntityId: jobId,
          }),
        });
      } catch {
        /* non-blocking */
      }

      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create change order";
      console.error("[FieldCO] save error:", err);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const validCount = items.filter((i) => i.material.trim()).length;
  const totalPhotos = items.reduce((sum, i) => sum + i.files.length, 0);
  const canSubmit = validCount > 0 && items.filter((i) => i.material.trim()).every((i) => i.location !== "");

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
            <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-error" translate="no">inventory_2</span>
            </div>
            <div>
              <h2 className="text-on-surface font-bold text-lg leading-tight">
                Request Change Order
              </h2>
              <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mt-0.5">
                No pricing • Draft only
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
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-[#1a2e00] border border-primary/15 rounded-2xl p-4">
            <span className="material-symbols-outlined text-primary shrink-0 mt-0.5 text-lg" translate="no">info</span>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Describe what you found on site. Add multiple items if needed. The{" "}
              <span className="text-primary font-bold">Home Office</span>{" "}
              will add pricing and send to the customer for approval.
            </p>
          </div>



          {/* Service */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Service *
            </label>
            <CustomDropdown
              value={selectedServiceId}
              onChange={setSelectedServiceId}
              options={jobServices.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Select a service..."
              className="w-full bg-surface-container-high border border-white/5 hover:border-primary/50 rounded-2xl py-4 px-4 text-on-surface font-bold text-[15px] transition-colors flex justify-between items-center"
            />
          </div>

          {/* Items List */}
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-surface-container-high border border-white/5 rounded-2xl p-4 relative space-y-4"
              >
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]" translate="no">delete</span>
                  </button>
                )}

                {/* Location per item */}
                <div className={items.length > 1 ? "pr-8" : ""}>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
                    Location on House {items.length > 1 ? `#${idx + 1}` : ""} *
                  </label>
                  <CustomDropdown
                    value={item.location}
                    onChange={(val: string) => updateItem(idx, "location", val)}
                    options={["Front", "Back", "Right", "Left", "Deck", "Porch"]}
                    placeholder="Select a location..."
                    className="w-full bg-[#0a0a0a] border border-surface-container-highest hover:border-error/30 rounded-xl py-3 px-4 text-on-surface font-bold text-sm transition-colors flex justify-between items-center"
                  />
                </div>

                {/* Material Name */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
                    Material
                  </label>
                  <input
                    type="text"
                    value={item.material}
                    onChange={(e) => updateItem(idx, "material", e.target.value)}
                    placeholder="e.g. Rotten wood behind fascia"
                    maxLength={100}
                    className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl px-4 py-3 text-sm font-bold text-on-surface placeholder-outline-variant focus:outline-none focus:border-error/50 transition-all"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2 pl-1">
                    Description / Notes
                  </label>
                  <textarea
                    value={item.notes}
                    onChange={(e) => updateItem(idx, "notes", e.target.value)}
                    placeholder="Describe the issue, materials needed..."
                    rows={2}
                    maxLength={500}
                    className="w-full bg-[#0a0a0a] border border-surface-container-highest rounded-xl px-4 py-3 text-sm font-medium text-on-surface placeholder-outline-variant focus:outline-none focus:border-error/50 transition-all resize-none"
                  />
                </div>

                {/* Photos for this item */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant pl-1">
                    Photos {item.files.length > 0 && `(${item.files.length})`}
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => cameraRefs.current[idx]?.click()}
                      className="flex-1 border border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center bg-surface-container-low active:bg-white/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl text-outline-variant mb-0.5" translate="no">photo_camera</span>
                      <p className="text-[10px] font-bold text-on-surface">Camera</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryRefs.current[idx]?.click()}
                      className="flex-1 border border-dashed border-white/10 rounded-xl p-3 flex flex-col items-center justify-center bg-surface-container-low active:bg-white/5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl text-outline-variant mb-0.5" translate="no">photo_library</span>
                      <p className="text-[10px] font-bold text-on-surface">Gallery</p>
                    </button>
                  </div>

                  {/* Hidden file inputs */}
                  <input
                    ref={(el) => { cameraRefs.current[idx] = el; }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      handleItemFiles(idx, e.target.files);
                      setTimeout(() => { e.target.value = ""; }, 300);
                    }}
                  />
                  <input
                    ref={(el) => { galleryRefs.current[idx] = el; }}
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleItemFiles(idx, e.target.files);
                      setTimeout(() => { e.target.value = ""; }, 300);
                    }}
                  />

                  {/* Thumbnails */}
                  {item.previewUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {item.previewUrls.map((url, fIdx) => (
                        <div key={fIdx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-primary/30 group">
                          <img src={url} alt={`Preview ${fIdx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeItemFile(idx, fIdx)}
                            className="absolute top-0.5 right-0.5 bg-black/70 w-5 h-5 rounded-full flex items-center justify-center text-white backdrop-blur-sm active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-[12px]" translate="no">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add More Button */}
            <button
              onClick={addItem}
              className="w-full bg-[#0a0a0a] border border-dashed border-error/30 text-error rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 hover:bg-error/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]" translate="no">add</span>
              Add Another Item
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-2xl p-4">
              <span className="material-symbols-outlined text-error text-lg shrink-0" translate="no">error</span>
              <p className="text-xs text-error font-medium">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className="w-full h-14 bg-primary text-[#1a2e00] font-bold text-base rounded-full shadow-[0_10px_40px_rgba(174,238,42,0.25)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-[#1a2e00]/20 border-t-[#1a2e00] rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-xl" translate="no">send</span>
                {totalPhotos > 0
                  ? `Submit ${validCount} Item${validCount > 1 ? "s" : ""} with ${totalPhotos} Photo${totalPhotos > 1 ? "s" : ""}`
                  : `Submit ${validCount} Item${validCount > 1 ? "s" : ""}`}
              </>
            )}
          </button>

          <p className="text-center text-outline-variant text-[10px] uppercase tracking-widest font-bold">
            Sent to Home Office for pricing & approval
          </p>
        </div>
      </div>
    </div>
  );
}
