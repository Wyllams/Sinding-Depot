"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface ServiceCall {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  reported_at: string;
  jobs?: {
    job_number: string;
    title: string;
  };
  blocker_attachments?: { url: string }[];
}

export default function FieldServicesPage() {
  const [services, setServices] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded accordion state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Lightbox for full-screen image/video preview
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadServices() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find the crew linked to this user
      const { data: crew } = await supabase
        .from("crews")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (!crew) {
        setLoading(false);
        return;
      }

      // Get services (blockers) assigned to this crew
      const { data, error } = await supabase
        .from("blockers")
        .select(`
          id, title, description, status, type, reported_at,
          jobs ( job_number, title ),
          blocker_attachments ( url )
        `)
        .eq("crew_id", crew.id)
        .order("reported_at", { ascending: false });

      if (!error && data) {
        setServices(data as any);
      }
      setLoading(false);
    }
    loadServices();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="bg-mobile-frame min-h-[100dvh] flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-mobile-frame/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <Link href="/field" className="w-10 h-10 rounded-full bg-surface-container-high border border-white/5 flex items-center justify-center text-on-surface active:scale-95 transition-transform">
            <span className="material-symbols-outlined" translate="no">arrow_back</span>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-black text-on-surface tracking-tight">Services</h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{services.length} items</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
             <span className="material-symbols-outlined text-primary" translate="no">warning</span>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4">
               <span className="material-symbols-outlined text-3xl text-zinc-600" translate="no">assignment_turned_in</span>
            </div>
            <p className="text-white font-bold text-lg mb-1">No Services Assigned</p>
            <p className="text-zinc-500 text-xs">You are all caught up.</p>
          </div>
        ) : (
          services.map(service => {
            const isExpanded = expandedId === service.id;

            return (
              <div 
                key={service.id} 
                className="bg-surface-container-low border border-white/5 rounded-3xl overflow-hidden shadow-lg transition-all"
              >
                {/* ALWAYS VISIBLE HEADER (CLICKABLE) */}
                <div 
                  className="p-5 flex flex-col gap-3 cursor-pointer active:bg-white/5 transition-colors relative"
                  onClick={() => setExpandedId(isExpanded ? null : service.id)}
                >
                  {/* Chevron indicator */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30">
                     <span className={`material-symbols-outlined transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} translate="no">
                       expand_more
                     </span>
                  </div>

                  {/* Row 1: Customer Name and Date */}
                  <div className="flex justify-between items-start pr-6">
                    <h3 className="text-on-surface font-black text-sm">
                      {service.jobs?.title?.split(" - ").pop()?.trim() || "Unknown Customer"}
                    </h3>
                    <p className="text-zinc-400 text-xs font-bold">{formatDate(service.reported_at)}</p>
                  </div>
                  
                  {/* Row 2: Status and Discipline */}
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-on-surface-variant bg-surface-container-highest">
                      {service.type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase text-white" style={{
                      backgroundColor: service.status === "open" ? "#ff735120" : service.status === "resolved" ? "#22c55e20" : "#aeee2a20",
                      color: service.status === "open" ? "#ff7351" : service.status === "resolved" ? "#22c55e" : "#aeee2a",
                    }}>
                      {service.status}
                    </span>
                  </div>
                </div>

                {/* EXPANDABLE DETAILS */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/5 animate-in slide-in-from-top-2 duration-200">
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Project ID</p>
                      <p className="text-zinc-400 text-xs">
                        {service.jobs?.job_number ? `#${service.jobs.job_number}` : "N/A"}
                      </p>
                    </div>

                    <h4 className="text-white font-bold text-base">{service.title}</h4>
                    <p className="text-zinc-400 text-sm mt-1 leading-relaxed mb-4">{service.description}</p>

                    {/* Attachments */}
                    {service.blocker_attachments && service.blocker_attachments.length > 0 && (
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Attachments</p>
                        <div className="grid grid-cols-3 gap-2">
                          {service.blocker_attachments.map((att, idx) => {
                            const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(att.url);
                            const isVideo = /\.(mp4|mov|webm|avi|mkv|m4v)/i.test(att.url);
                            
                            return (
                              <div key={idx} className="aspect-square bg-surface-container-high rounded-xl overflow-hidden relative">
                                 {isImage ? (
                                   <img 
                                     src={att.url} 
                                     alt="Attachment" 
                                     className="w-full h-full object-cover cursor-pointer" 
                                     onClick={() => setLightboxUrl(att.url)}
                                   />
                                 ) : isVideo ? (
                                   <video 
                                     src={att.url} 
                                     className="w-full h-full object-cover" 
                                     controls 
                                   />
                                 ) : (
                                   <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white transition-colors">
                                     <span className="material-symbols-outlined text-2xl" translate="no">description</span>
                                     <span className="text-[9px] truncate w-full px-2 text-center">Doc</span>
                                   </a>
                                 )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* LIGHTBOX */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button 
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"
            onClick={() => setLightboxUrl(null)}
          >
             <span className="material-symbols-outlined" translate="no">close</span>
          </button>
          <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}

    </div>
  );
}
