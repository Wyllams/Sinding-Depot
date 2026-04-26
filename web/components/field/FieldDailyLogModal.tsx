"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Compresses an image file to reduce size before upload.
 * Mobile camera photos are typically 3-10MB+ which exceeds platform limits.
 * This resizes to max 1920px and compresses to 80% JPEG quality (~200-500KB).
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  // Skip compression for small files (<1MB) or non-image files
  if (file.size < 1024 * 1024 || !file.type.startsWith("image/")) {
    return file;
  }

  return new Promise<File>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file); // Fallback: return original
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // Fallback: return original
            return;
          }
          // Derive a safe filename with .jpg extension
          const baseName = file.name?.replace(/\.[^.]+$/, "") || `photo_${Date.now()}`;
          const compressedFile = new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback: return original on error
    };

    img.src = url;
  });
}

export function FieldDailyLogModal({
  jobId,
  serviceId,
  dayNumber,
  initialFiles = [],
  existingUrls = [],
  onClose,
  onSaved,
}: {
  jobId: string;
  serviceId: string;
  dayNumber: number;
  initialFiles?: File[];
  existingUrls?: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>(existingUrls);
  const [newFiles, setNewFiles] = useState<File[]>(initialFiles);
  const [newFileUrls, setNewFileUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setNewFileUrls(initialFiles.map(f => URL.createObjectURL(f)));
    }
  }, [initialFiles]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setNewFiles((prev) => [...prev, ...filesArray]);
      const urls = filesArray.map((f) => URL.createObjectURL(f));
      setNewFileUrls((prev) => [...prev, ...urls]);
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewFileUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (existingImages.length === 0 && newFiles.length === 0) {
      alert("Please add at least one photo.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: crew } = await supabase
        .from("crews")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (!crew) throw new Error("Crew not found for this user");

      // 1. Compress & Upload New Images
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        // Compress image before uploading (mobile photos can be 3-10MB+)
        const compressedFile = await compressImage(file);
        console.log(`Upload: original=${file.size}b compressed=${compressedFile.size}b name="${compressedFile.name}" type="${compressedFile.type}"`);

        const formData = new FormData();
        formData.append("file", compressedFile);
        formData.append("folder", `daily_logs/${jobId}/day_${dayNumber}`);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          let serverMessage = `HTTP ${res.status}`;
          try {
            const errorData = await res.json();
            serverMessage = errorData.error || serverMessage;
          } catch {
            const text = await res.text().catch(() => "");
            if (text) serverMessage = text.substring(0, 200);
          }
          console.error("Upload failed:", res.status, serverMessage);
          throw new Error(`Failed to upload image: ${serverMessage}`);
        }

        const data = await res.json();
        if (data.url) {
          uploadedUrls.push(data.url);
        }
      }

      // 2. Insert/Update daily_log
      const finalImages = [...existingImages, ...uploadedUrls];

      const { error } = await supabase.from("daily_logs").upsert(
        {
          job_id: jobId,
          job_service_id: serviceId,
          crew_id: crew.id,
          day_number: dayNumber,
          notes: null,
          images: finalImages,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'job_service_id, day_number' }
      );

      if (error) throw new Error(error.message);

      onSaved();
    } catch (e: any) {
      alert("Error saving daily log: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPhotos = existingImages.length + newFiles.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-surface-container-low border-t border-white/10 rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-center mb-5">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" translate="no">photo_camera</span>
            </div>
            <div>
              <h3 className="text-on-surface font-bold text-lg">Daily Log - Day {dayNumber}</h3>
              <p className="text-zinc-500 text-xs">Save progress for the office</p>
            </div>
          </div>
          <button onClick={onClose} className="text-outline-variant active:text-on-surface-variant">
             <span className="material-symbols-outlined text-xl" translate="no">close</span>
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Image Upload */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3 pl-1">
              Photos ({totalPhotos})
            </label>
            
            <div className="flex flex-wrap gap-3">
              {/* Existing Images */}
              {existingImages.map((url, i) => (
                <div key={`existing-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group shadow-sm">
                  <img src={url} alt={`Existing ${i}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeExistingImage(i)}
                    className="absolute top-1 right-1 bg-black/60 w-7 h-7 rounded-full flex items-center justify-center text-white backdrop-blur-sm active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[16px]" translate="no">delete</span>
                  </button>
                </div>
              ))}

              {/* New File Previews */}
              {newFileUrls.map((url, i) => (
                <div key={`new-${i}`} className="relative w-24 h-24 rounded-xl overflow-hidden border border-primary/30 group shadow-sm">
                  <img src={url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeNewImage(i)}
                    className="absolute top-1 right-1 bg-black/60 w-7 h-7 rounded-full flex items-center justify-center text-white backdrop-blur-sm active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[16px]" translate="no">close</span>
                  </button>
                </div>
              ))}
              
              {/* Add More Button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest active:scale-95 active:border-primary active:text-primary transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-3xl mb-1" translate="no">add_photo_alternate</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Add</span>
              </button>
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              capture="environment"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || totalPhotos === 0}
            className="w-full mt-4 bg-primary text-[#1a1a00] rounded-xl py-4 font-black uppercase tracking-widest text-xs disabled:opacity-50 transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-[#1a1a00]/30 border-t-[#1a1a00] rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-lg" translate="no">cloud_upload</span>
                Save Daily Log
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
