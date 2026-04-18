"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import CustomDatePicker from "./CustomDatePicker";

interface Job { id: string; job_number: string; title: string; }
interface Crew { id: string; name: string; }

interface NewServiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewServiceCallModal({ isOpen, onClose, onSuccess }: NewServiceCallModalProps) {
  const [jobs, setJobs]   = useState<Job[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    job_id:    "",
    type:      "",
    crew_id:   "",
    reported_at: new Date().toISOString().split("T")[0],
    title:     "",
    description: "",
  });

  const [files,     setFiles]     = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<string[]>(["XICARA", "WILMAR", "SULA", "LUIS", "OSVIN", "VICTOR", "LEANDRO", "JOSUE"]);

  useEffect(() => {
    if (isOpen) {
      fetchDependencies();
      // Load custom filters if configured in the Manage Employees modal
      const stored = localStorage.getItem("serviceCrewFilter");
      if (stored) {
        try {
          let parsed = JSON.parse(stored) as string[];
          parsed = parsed.filter(n => n !== "CHICARA" && n !== "VITOR");
          setActiveFilter(parsed);
          localStorage.setItem("serviceCrewFilter", JSON.stringify(parsed));
        } catch(e) {}
      }
      
      // Reset form on open
      setFormData({ job_id: "", type: "", crew_id: "", reported_at: new Date().toISOString().split("T")[0], title: "", description: "" });
      setFiles([]);
      setError(null);
    }
  }, [isOpen]);

  const fetchDependencies = async () => {
    const [{ data: jobsData }, { data: crewsData }] = await Promise.all([
      supabase.from("jobs").select("id, job_number, title").order("job_number", { ascending: false }),
      supabase.from("crews").select("id, name").eq("active", true).order("name"),
    ]);
    if (jobsData) setJobs(jobsData);
    if (crewsData) setCrews(crewsData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const uploadFiles = async (blockerId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const ext  = file.name.split(".").pop();
      const path = `service-calls/${blockerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, file);
      if (upErr) { console.error("Upload error:", upErr); continue; }
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data: blocker, error: insertError } = await supabase
        .from("blockers")
        .insert({
          job_id:     formData.job_id,
          type:       formData.type,
          title:      formData.title,
          description: formData.description,
          reported_at: new Date(formData.reported_at).toISOString(),
          resolved_by_profile_id: null,
          reported_by_profile_id: userData.user?.id,
          status: "open",
          crew_id: formData.crew_id || null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Upload attachments
      if (blocker && files.length > 0) {
        const urls = await uploadFiles(blocker.id);
        if (urls.length > 0) {
          // Store attachment URLs in a separate table or as JSON array
          await supabase.from("blocker_attachments").insert(
            urls.map(url => ({ blocker_id: blocker.id, url, uploaded_at: new Date().toISOString() }))
          );
        }
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create Service Call.");
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "videocam";
    if (file.type.includes("pdf"))      return "picture_as_pdf";
    return "attach_file";
  };

  const formatBytes = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121412] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#181a18]">
          <div>
            <h3 className="text-xl font-extrabold text-[#faf9f5]">New Service Call</h3>
            <p className="text-sm text-[#ababa8] mt-1">Open a new service request or block.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#242624] rounded-full text-[#ababa8] transition-colors">
            <span className="material-symbols-outlined" translate="no">close</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {error && (
            <div className="mb-6 p-4 bg-[#b92902]/20 border border-[#b92902] text-[#ff7351] rounded-xl text-sm font-semibold">
              {error}
            </div>
          )}

          <form id="new-service-form" onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Project Select */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#ababa8] uppercase tracking-widest">
                  Project <span className="text-[#aeee2a]">*</span>
                </label>
                <select
                  required
                  value={formData.job_id}
                  onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                  className="w-full bg-[#181a18] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a] transition-colors"
                >
                  <option value="">Select Project</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>{job.job_number} - {job.title}</option>
                  ))}
                </select>
              </div>

              {/* Service Type */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#ababa8] uppercase tracking-widest">
                  Discipline / Type <span className="text-[#aeee2a]">*</span>
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-[#181a18] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a] transition-colors"
                >
                  <option value="" disabled>--</option>
                  <option value="siding">Siding</option>
                  <option value="doors">Doors</option>
                  <option value="windows">Windows</option>
                  <option value="paint">Paint</option>
                  <option value="gutters">Gutters</option>
                  <option value="roofing">Roofing</option>
                </select>
              </div>

              {/* Service Date */}
              <CustomDatePicker
                label="Service Request Date *"
                value={formData.reported_at}
                onChange={(val) => setFormData({ ...formData, reported_at: val })}
              />

              {/* Assigned Crew */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#ababa8] uppercase tracking-widest">
                  Assigned Crew
                </label>
                <div className="relative">
                  <select
                    value={formData.crew_id}
                    onChange={(e) => setFormData({ ...formData, crew_id: e.target.value })}
                    className="w-full bg-[#181a18] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a] transition-colors appearance-none"
                  >
                    <option value="">Unassigned</option>
                    {(() => {
                      const matched = crews.filter(c => activeFilter.some(prefix => c.name.toUpperCase().includes(prefix)) && !c.name.includes("02"));
                      const displayCrews = [...matched];
                      activeFilter.forEach(filterName => {
                        if (!displayCrews.some(c => c.name.toUpperCase().includes(filterName))) {
                          displayCrews.push({ id: filterName, name: filterName });
                        }
                      });
                      return displayCrews.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ));
                    })()}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#ababa8] pointer-events-none text-[18px]" translate="no">expand_more</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#ababa8] uppercase tracking-widest">
                Title <span className="text-[#aeee2a]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Brief title of the issue"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-[#181a18] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a] transition-colors"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#ababa8] uppercase tracking-widest">
                Notes &amp; Description
              </label>
              <textarea
                rows={3}
                placeholder="Detailed explanation of the required service..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#181a18] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a] transition-colors resize-none"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-[#ababa8] uppercase tracking-widest">
                Attachments — Images, Videos, Docs
              </label>

              {/* Drop zone */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-5 rounded-xl border-2 border-dashed border-[#474846] bg-[#0d0f0d] hover:border-[#aeee2a]/50 hover:bg-[#aeee2a]/3 transition-all flex flex-col items-center gap-2 text-[#ababa8] group"
              >
                <span className="material-symbols-outlined text-3xl group-hover:text-[#aeee2a] transition-colors" translate="no">cloud_upload</span>
                <span className="text-sm font-semibold group-hover:text-[#faf9f5] transition-colors">Click to add files</span>
                <span className="text-[11px]">Images • Videos • PDFs • Documents</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-[#181a18] border border-white/10 rounded-xl px-4 py-2.5">
                      <span className="material-symbols-outlined text-[#aeee2a] text-lg" translate="no">{getFileIcon(file)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#faf9f5] font-medium truncate">{file.name}</p>
                        <p className="text-[10px] text-[#ababa8]">{formatBytes(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-[#ababa8] hover:text-[#ff7351] transition-colors flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-lg" translate="no">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-[#181a18] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#faf9f5] hover:bg-[#242624] transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-service-form"
            disabled={isLoading}
            className="px-6 py-2.5 bg-[#aeee2a] text-[#3a5400] text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading && <span className="material-symbols-outlined animate-spin text-sm" translate="no">sync</span>}
            {files.length > 0 ? `Save & Upload ${files.length} file${files.length > 1 ? "s" : ""}` : "Save Service Call"}
          </button>
        </div>
      </div>
    </div>
  );
}
