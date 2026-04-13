"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";

const modules = [
  { name: "Dashboard", icon: "dashboard", state: "view" },
  { name: "Projects", icon: "engineering", state: "edit" },
  { name: "Services", icon: "construction", state: "edit" },
  { name: "Crews", icon: "groups", state: "view" },
  { name: "Change Orders", icon: "request_quote", state: "edit" },
  { name: "Issues", icon: "report_problem", state: "view" },
  { name: "Schedule", icon: "calendar_today", state: "edit" },
  { name: "Documents", icon: "description", state: "view" },
  { name: "Reports", icon: "assessment", state: "hide" },
];

export default function CreateRolePage() {
  return (
    <>
      <TopBar title="Roles & Permissions" />

      {/* Canvas Content */}
      <main className="px-12 pb-12 pt-8 max-w-6xl mx-auto min-h-screen">
        <div className="mb-10">
          <Link href="/settings" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-sm font-medium">
            <span className="material-symbols-outlined text-sm" translate="no">arrow_back</span>
            Back to Settings
          </Link>
          <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-[#faf9f5] mb-2">Create Role</h1>
          <p className="text-[#ababa8] max-w-2xl">Define a new architectural permission set for your organization. Assign granular access to features and data modules.</p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* Role Identity (Left Side) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="p-6 rounded-2xl bg-[#121412] border border-white/5">
              <label className="block text-xs font-bold uppercase tracking-widest text-[#aeee2a] mb-4">Role Identity</label>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-[#ababa8] uppercase mb-1.5 block font-medium">Role Name</label>
                  <input 
                    className="w-full bg-[#1e201e] border-none rounded-xl py-3 px-4 text-[#faf9f5] placeholder:text-[#ababa8] focus:ring-2 focus:ring-[#aeee2a]/20 transition-all outline-none" 
                    placeholder="e.g. Senior Project Architect" 
                    type="text"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#ababa8] uppercase mb-1.5 block font-medium">Description</label>
                  <textarea 
                    className="w-full bg-[#1e201e] border-none rounded-xl py-3 px-4 text-[#faf9f5] placeholder:text-[#ababa8] focus:ring-2 focus:ring-[#aeee2a]/20 transition-all outline-none" 
                    placeholder="Define the scope of this role..." 
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#242624]/40 backdrop-blur-3xl border border-white/10 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#aeee2a]/10 blur-3xl rounded-full group-hover:bg-[#aeee2a]/20 transition-all"></div>
              <h4 className="text-sm font-bold text-[#faf9f5] mb-2">Inherit Permissions</h4>
              <p className="text-xs text-[#ababa8] mb-4">Start with a template based on an existing role to save time.</p>
              <button className="w-full py-2.5 px-4 rounded-xl border border-[#474846] text-[#faf9f5] text-xs font-bold hover:bg-[#242624] transition-colors outline-none cursor-pointer">
                Select Template
              </button>
            </div>
          </div>

          {/* Feature Permissions (Main Table Area) */}
          <div className="col-span-12 lg:col-span-8">
            <div className="rounded-2xl bg-[#121412] border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1e201e]/50">
                <div>
                  <h3 className="font-headline text-lg font-bold text-[#faf9f5]">Feature Permissions</h3>
                  <p className="text-xs text-[#ababa8] mt-1">Grant specific interaction levels for each module.</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 rounded-lg bg-[#242624] text-[#ababa8] hover:text-[#faf9f5] transition-colors">
                    <span className="material-symbols-outlined text-sm" translate="no">filter_list</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#121412]">
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-[#ababa8]">Feature</th>
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-[#ababa8] text-center">View</th>
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-[#ababa8] text-center">Edit</th>
                      <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-wider text-[#ababa8] text-center">Hide</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {modules.map((module) => (
                      <tr key={module.name} className="hover:bg-[#1e201e]/40 transition-colors">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#aeee2a] text-xl" translate="no">{module.icon}</span>
                            <span className="font-medium text-sm text-[#faf9f5]">{module.name}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                          {module.state === "view" ? (
                            <div className="w-6 h-6 rounded-full bg-[#aeee2a] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(174,238,42,0.2)] cursor-pointer">
                              <span className="material-symbols-outlined text-[#3a5400] text-xs font-bold" translate="no">check</span>
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-[#474846] mx-auto cursor-pointer hover:border-[#aeee2a]/50"></div>
                          )}
                        </td>
                        <td className="py-5 px-6 text-center">
                          {module.state === "edit" ? (
                            <div className="w-6 h-6 rounded-full bg-[#aeee2a] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(174,238,42,0.2)] cursor-pointer">
                              <span className="material-symbols-outlined text-[#3a5400] text-xs font-bold" translate="no">check</span>
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-[#474846] mx-auto cursor-pointer hover:border-[#aeee2a]/50"></div>
                          )}
                        </td>
                        <td className="py-5 px-6 text-center">
                          {module.state === "hide" ? (
                            <div className="w-6 h-6 rounded-full bg-[#ff7351] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(255,115,81,0.25)] cursor-pointer">
                              <span className="material-symbols-outlined text-[#450900] text-xs font-bold" style={{fontVariationSettings: "'FILL' 1"}} translate="no">visibility_off</span>
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-[#474846] mx-auto cursor-pointer hover:border-[#ff7351]/50"></div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex justify-end items-center gap-4">
              <Link href="/settings" className="px-8 py-3 rounded-full font-bold text-[#ababa8] hover:text-[#faf9f5] transition-colors">
                Cancel
              </Link>
              <button className="px-10 py-3 bg-[#aeee2a] text-[#3a5400] rounded-full font-bold shadow-[0_0_20px_rgba(174,238,42,0.2)] hover:scale-[1.02] active:scale-95 transition-all">
                Create Role
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
