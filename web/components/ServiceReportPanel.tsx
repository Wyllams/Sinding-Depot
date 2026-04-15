"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

interface ServiceReportPanelProps {
  isOpen: boolean;
  service: any; // The ServiceCall object passed from the page
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceReportPanel({ isOpen, service, onClose, onSuccess }: ServiceReportPanelProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !service) return null;

  const handleResolve = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from("blockers")
        .update({
          status: "resolved",
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
          resolved_by_profile_id: userData.user?.id || service.resolved_by_profile_id,
        })
        .eq("id", service.id);

      if (updateError) throw updateError;
      
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to resolve service call.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Side Panel sliding from right */}
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[500px] bg-[#121412] shadow-2xl border-l border-white/5 flex flex-col transform transition-transform duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 bg-[#181a18] flex justify-between items-center shrink-0">
          <div>
            <div className="flex gap-3 items-center">
              <h3 className="text-xl font-extrabold text-[#faf9f5]">Service Report</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${service.status === 'open' ? 'bg-[#b92902] text-[#ffd2c8]' : 'bg-[#242624] text-[#ababa8]'}`}>
                {service.status}
              </span>
            </div>
            <p className="text-sm text-[#ababa8] mt-1 font-mono">#{service.id.substring(0,8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#242624] rounded-full text-[#ababa8] transition-colors">
            <span className="material-symbols-outlined" translate="no">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {error && (
            <div className="p-4 bg-[#b92902]/20 border border-[#b92902] text-[#ff7351] rounded-xl text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Details Section */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-[#faf9f5] border-b border-white/5 pb-2">Issue Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">Project</label>
                <p className="text-sm text-[#faf9f5] mt-1 font-semibold">{service.jobs?.job_number || "N/A"}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">Discipline</label>
                <p className="text-sm text-[#faf9f5] mt-1 capitalize">{service.type}</p>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">Title</label>
                <p className="text-sm text-[#faf9f5] mt-1">{service.title}</p>
              </div>
              <div className="col-span-2 hidden">
                <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">Initial Notes</label>
                <p className="text-sm text-[#ababa8] mt-1 bg-[#181a18] p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
                  {service.description || "No descriptions provided."}
                </p>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest">Initial Notes</label>
              <p className="text-sm text-[#ababa8] mt-1 bg-[#181a18] p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
                {service.description || "No descriptions provided."}
              </p>
            </div>
          </section>

          {/* Media Section placeholder */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-[#faf9f5] border-b border-white/5 pb-2">Attached Media</h4>
            <div className="p-4 rounded-xl border border-dashed border-[#474846] bg-[#181a18] text-center text-[#ababa8]">
              <p className="text-xs">No media attached to this service call.</p>
            </div>
          </section>

          {/* Resolution Form (only if Open) */}
          {service.status === "open" && (
            <section className="space-y-4 pt-4">
              <h4 className="text-sm font-bold text-[#aeee2a] border-b border-white/5 pb-2">Resolution</h4>
              
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#ababa8] uppercase tracking-widest">
                  Resolution Notes <span className="text-[#aeee2a]">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="How was this service call resolved?"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full bg-[#181a18] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#faf9f5] focus:outline-none focus:border-[#aeee2a] transition-colors resize-none"
                ></textarea>
              </div>

            </section>
          )}

          {/* Resolution Read-Only View */}
          {service.status === "resolved" && (
            <section className="space-y-4 pt-4 border-t border-[#aeee2a]/20">
              <h4 className="text-sm font-bold text-[#aeee2a]">Resolved details</h4>
              <div className="bg-[#181a18] p-4 rounded-xl border border-[#aeee2a]/20">
                <p className="text-sm text-[#faf9f5] whitespace-pre-wrap">{service.resolution_notes || "Resolved without notes."}</p>
                <p className="text-xs text-[#ababa8] mt-4 pt-3 border-t border-white/5">
                  Resolved on {new Date(service.resolved_at).toLocaleString()}
                </p>
              </div>
            </section>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/5 bg-[#181a18] flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#faf9f5] hover:bg-[#242624] transition-colors"
          >
            {service.status === 'open' ? 'Cancel' : 'Close'}
          </button>
          
          {service.status === "open" && (
            <button
              onClick={handleResolve}
              disabled={isLoading || !resolutionNotes.trim()}
              className="px-6 py-2.5 bg-[#aeee2a] text-[#3a5400] text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading && <span className="material-symbols-outlined animate-spin text-sm" translate="no">sync</span>}
              Mark as Resolved
            </button>
          )}
        </div>

      </div>
    </>
  );
}
