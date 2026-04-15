"use client";

import { TopBar } from "../../../components/TopBar";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { NewServiceCallModal } from "../../../components/NewServiceCallModal";
import { ServiceReportPanel } from "../../../components/ServiceReportPanel";

interface JobRef {
  job_number: string;
  title: string;
}

interface ProfileRef {
  full_name: string;
}

interface ServiceCall {
  id: string;
  title: string;
  description: string;
  status: string;
  type: string;
  reported_at: string;
  jobs?: JobRef[] | null;
  profiles?: ProfileRef[] | null;
}

export default function ServicesPage() {
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceCall | null>(null);

  useEffect(() => {
    fetchServiceCalls();
  }, []);

  const fetchServiceCalls = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("blockers")
      .select(`
        id,
        title,
        description,
        status,
        type,
        reported_at,
        jobs ( job_number, title ),
        profiles!blockers_resolved_by_profile_id_fkey ( full_name )
      `)
      .order("reported_at", { ascending: false });

    if (error) {
      console.error("Error fetching service calls:", error);
    } else if (data) {
      setServiceCalls(data as ServiceCall[]);
    }
    setIsLoading(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "open":
        return "bg-[#b92902] text-[#ffd2c8]"; // Blocked/Open look
      case "resolved":
        return "bg-[#242624] text-[#ababa8]";
      case "cancelled":
        return "bg-[#474846]/20 text-[#ababa8]";
      default:
        return "bg-[#aeee2a]/20 text-[#aeee2a]";
    }
  };

  const formatId = (id: string) => "#" + id.substring(0, 4).toUpperCase();

  const handleSuccess = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    fetchServiceCalls();
  };

  return (
    <>
      <TopBar
        title="Services"
        leftSlot={
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#ababa8]"
              translate="no"
            >
              search
            </span>
            <input
              className="bg-[#121412] border-none rounded-full pl-10 pr-4 py-2 text-sm text-[#faf9f5] w-80 focus:ring-1 focus:ring-[#aeee2a]/30 outline-none placeholder:text-[#ababa8]/50"
              placeholder="Search blockers, permits, or team members..."
              type="text"
            />
          </div>
        }
      />

      <NewServiceCallModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleSuccess} 
      />

      <ServiceReportPanel
        isOpen={!!selectedService}
        service={selectedService}
        onClose={() => setSelectedService(null)}
        onSuccess={handleSuccess}
      />

      {/* Content Canvas */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 min-h-screen">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-extrabold text-[#faf9f5] tracking-tighter"
              style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
            >
              Services
            </h2>
            <p className="text-[#ababa8] mt-2 text-sm">
              Managing{" "}
              <span className="text-[#aeee2a] font-bold">
                {serviceCalls.filter(s => s.status === 'open').length} active service calls
              </span>{" "}
              across operations
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#1e201e] hover:bg-[#242624] text-[#faf9f5] font-semibold rounded-xl flex items-center gap-2 transition-all text-sm">
              <span className="material-symbols-outlined text-sm" translate="no">download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#aeee2a] text-[#3a5400] font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-[#aeee2a]/10 active:scale-95 transition-all text-sm"
            >
              <span className="material-symbols-outlined text-sm" translate="no">add</span>
              <span className="hidden sm:inline">New Service Call</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-6 justify-between">
          {/* Status — LEFT */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest px-1">
              Status
            </label>
            <div className="flex bg-[#121412] p-1 rounded-full w-fit max-w-full overflow-x-auto">
              <button className="px-6 py-1.5 rounded-full text-xs font-bold bg-[#aeee2a] text-[#3a5400] transition-all">
                All
              </button>
              <button className="px-6 py-1.5 rounded-full text-xs font-medium text-[#ababa8] hover:text-[#faf9f5] transition-all">
                Open
              </button>
              <button className="px-6 py-1.5 rounded-full text-xs font-medium text-[#ababa8] hover:text-[#faf9f5] transition-all">
                Resolved
              </button>
            </div>
          </div>

          {/* Issue Type — RIGHT */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#ababa8] uppercase tracking-widest px-1">
              Discipline / Type
            </label>
            <div className="flex bg-[#121412] p-1 rounded-full overflow-x-auto w-fit max-w-full">
              {["Material", "Permit", "Windows", "Doors", "Customer", "Other"].map((t) => (
                <button
                  key={t}
                  className="px-4 py-1.5 rounded-full text-xs font-medium text-[#ababa8] whitespace-nowrap hover:text-[#faf9f5] transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#121412] rounded-xl overflow-hidden shadow-2xl border border-[#474846]/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#1e201e]/50">
                  {["ID", "Title", "Project", "Status", "Assigned To", "Service Date"].map(
                    (col, i) => (
                      <th
                        key={col}
                        className={`px-6 py-4 text-[10px] font-extrabold text-[#ababa8] uppercase tracking-widest ${
                          i === 5 ? "text-right" : ""
                        }`}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#474846]/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#ababa8]">
                      Loading service calls...
                    </td>
                  </tr>
                ) : serviceCalls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#ababa8]">
                      No active service calls found.
                    </td>
                  </tr>
                ) : (
                  serviceCalls.map((issue) => (
                    <tr
                      key={issue.id}
                      onClick={() => setSelectedService(issue)}
                      className="group hover:bg-[#242624]/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-5 text-sm font-mono text-[#ababa8]">{formatId(issue.id)}</td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[#faf9f5] font-semibold text-sm">{issue.title}</span>
                          <span className="text-xs text-[#ababa8] truncate max-w-[200px]">{issue.description}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-[#faf9f5]">
                        <span className="font-bold">{issue.jobs?.[0]?.job_number}</span> - {issue.jobs?.[0]?.title}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tight ${getStatusStyle(issue.status)}`}
                        >
                          {issue.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#242624] flex items-center justify-center text-[10px] font-bold border border-[#474846] text-[#faf9f5] uppercase">
                            {issue.profiles?.[0]?.full_name ? issue.profiles[0].full_name.substring(0, 2) : "UN"}
                          </div>
                          <span className="text-xs text-[#faf9f5]">{issue.profiles?.[0]?.full_name || "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right text-xs font-bold text-[#faf9f5]">
                        {new Date(issue.reported_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-[#474846]/10 flex flex-wrap items-center justify-between gap-4 text-[11px] font-bold tracking-widest uppercase text-[#ababa8]">
            <div className="flex items-center gap-4">
              <span className="cursor-pointer hover:text-[#aeee2a] transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-sm" translate="no">swap_vert</span>
                Table Sorting
              </span>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <button className="opacity-30 cursor-not-allowed">
                  <span className="material-symbols-outlined text-base" translate="no">chevron_left</span>
                </button>
                <span className="text-[#faf9f5]">
                  <span className="text-[#aeee2a]">1-{serviceCalls.length}</span> of {serviceCalls.length}
                </span>
                <button className="hover:text-[#aeee2a] transition-colors">
                  <span className="material-symbols-outlined text-base" translate="no">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
