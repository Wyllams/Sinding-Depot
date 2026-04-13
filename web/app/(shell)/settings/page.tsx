"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";

export default function SettingsPage() {
  return (
    <>
      <TopBar title="Settings" />

      <main className="px-4 sm:px-6 lg:px-8 pb-20 pt-8 min-h-screen bg-[#0d0f0d]">
        <div className="max-w-7xl mx-auto space-y-10">
          
          {/* General & Profile Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="text-xl font-headline font-bold text-white">Organization Profile</h3>
              <p className="text-[#ababa8] text-sm mt-2 leading-relaxed">Update your company's core identity, branding, and operational timezone.</p>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#121412] p-8 rounded-2xl space-y-6 border border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Legal Name</label>
                    <input 
                      className="w-full bg-[#181a18] border-none rounded-xl py-3 px-4 text-[#faf9f5] font-medium focus:ring-1 focus:ring-[#aeee2a] outline-none transition-all" 
                      type="text" 
                      defaultValue="Acme Corporation"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Tax ID</label>
                    <input 
                      className="w-full bg-[#181a18] border-none rounded-xl py-3 px-4 text-[#faf9f5] font-medium focus:ring-1 focus:ring-[#aeee2a] outline-none transition-all" 
                      type="text" 
                      defaultValue="12-3456789"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Timezone</label>
                  <select className="w-full bg-[#181a18] border-none rounded-xl py-3 px-4 text-[#faf9f5] font-medium appearance-none focus:ring-1 focus:ring-[#aeee2a] outline-none transition-all">
                    <option>GMT-8:00 Pacific Time</option>
                    <option>GMT-5:00 Eastern Time</option>
                    <option>GMT+0:00 Universal Time</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Branding Logo</label>
                  <div className="flex items-center gap-8 p-6 border-2 border-dashed border-[#474846]/30 rounded-2xl bg-[#0d0f0d]/50 group hover:border-[#aeee2a] transition-colors cursor-pointer">
                    <div className="w-16 h-16 bg-[#242624] rounded-xl flex items-center justify-center overflow-hidden border border-[#474846]/20 group-hover:text-[#aeee2a] transition-all">
                      <span className="material-symbols-outlined text-3xl opacity-20 group-hover:opacity-100" translate="no">image</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#faf9f5]">Upload company logo</p>
                      <p className="text-xs text-[#ababa8] mt-1">Recommended size 512x512px. PNG, JPG or SVG.</p>
                    </div>
                    <button className="px-5 py-2 bg-[#242624] text-[#faf9f5] text-sm font-semibold rounded-xl hover:bg-[#1e201e] transition-colors border border-[#474846]/20">
                        Choose File
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Team & Roles Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="text-xl font-headline font-bold text-white">Team & Permissions</h3>
              <p className="text-[#ababa8] text-sm mt-2 leading-relaxed">Manage your project crew and their Role-Based Access Control (RBAC) levels.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-[#242624] text-[#aeee2a] text-[10px] font-bold uppercase tracking-widest rounded-full">4 Members</span>
                <span className="px-3 py-1 bg-[#242624] text-[#eedc47] text-[10px] font-bold uppercase tracking-widest rounded-full">Admin Override Active</span>
              </div>
              <div className="mt-6">
                 <Link href="/settings/role/new" className="w-full flex items-center justify-center gap-2 py-3 bg-[#181a18] text-[#faf9f5] text-sm font-semibold rounded-xl border border-dashed border-[#474846]/50 hover:border-[#aeee2a] hover:text-[#aeee2a] bg-opacity-50 transition-all group">
                    <span className="material-symbols-outlined text-lg opacity-70 group-hover:opacity-100" translate="no">add</span>
                    Create Role
                 </Link>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <div className="bg-[#121412] rounded-2xl overflow-hidden overflow-x-auto border border-white/5">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#474846]/10">
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.1em] text-[#ababa8]">Team Member</th>
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.1em] text-[#ababa8]">Role</th>
                      <th className="px-6 py-5 text-xs font-bold uppercase tracking-[0.1em] text-[#ababa8] text-right">RBAC Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#474846]/5">
                    {/* Member 1 */}
                    <tr className="hover:bg-[#181a18] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img className="w-10 h-10 rounded-full object-cover" alt="Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_hXkDr_iDcHfVCzm8tyL01EZLHdLxTOH0n4orrUe0BXxAirOzejkxlF7LBxLIZrQz-v2tdvFEAK5mHsn94vf0tcx01w5JAgKd8WTF3-dEo3AMFd2dcPZ441SiXmvkSzbYoA9d8VCO1K6vHRNwK_ODPzIfWVYIGzWRox5P49TtS5HdzE1pJP4t0Keer8QPG8JY9M2ymVf9oIho31g2mf5fZDAxkSNLgjkWzzUTS0cj2uFmmLzRKfUljcdEwN-wLiauc9GxWP140h4"/>
                          <div>
                            <p className="text-sm font-semibold text-[#faf9f5]">Sarah Johnson</p>
                            <p className="text-xs text-[#ababa8]">s.johnson@acmecorp.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select className="bg-[#242624] border-none rounded-lg py-1.5 px-3 text-xs font-medium text-[#faf9f5] focus:ring-1 focus:ring-[#aeee2a] outline-none">
                          <option defaultValue="Admin">Admin</option>
                          <option>Manager</option>
                          <option>Analyst</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input defaultChecked className="sr-only peer" type="checkbox" value=""/>
                          <div className="w-11 h-6 bg-[#242624] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#aeee2a] shadow-[0_0_15px_-3px_rgba(174,238,42,0.4)]"></div>
                        </label>
                      </td>
                    </tr>
                    
                    {/* Member 2 */}
                    <tr className="hover:bg-[#181a18] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img className="w-10 h-10 rounded-full object-cover" alt="Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmb-BxrBKsn6g4rJSylSAVb6pMEdSNxb7vtW3ZeJD5jLKehe_oI3BOKGviy7fuaP8elfoToAr9Pemg871V-CuMzR9nhtwCTvMWD3fRQvd4Io91QCQcLP5zZLF9Trixy2_NKR6vVVTYKgV1z4RomK7bqWJve_5KJ6Fsqy_IP74zGDoofGgUvgD794-J3zPfhojYZDXiL1dIvzDtV8ji-wVjd0B0ckXZZ1V1JXLm7y7HrHNlifMyrM8Dvss8BwXZsuyUguRwub4kHgg"/>
                          <div>
                            <p className="text-sm font-semibold text-[#faf9f5]">Mike Rodriguez</p>
                            <p className="text-xs text-[#ababa8]">m.rodriguez@acmecorp.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select className="bg-[#242624] border-none rounded-lg py-1.5 px-3 text-xs font-medium text-[#faf9f5] focus:ring-1 focus:ring-[#aeee2a] outline-none">
                          <option>Admin</option>
                          <option defaultValue="Project Manager">Project Manager</option>
                          <option>Analyst</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input defaultChecked className="sr-only peer" type="checkbox" value=""/>
                          <div className="w-11 h-6 bg-[#242624] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#aeee2a] shadow-[0_0_15px_-3px_rgba(174,238,42,0.4)]"></div>
                        </label>
                      </td>
                    </tr>
                    
                    {/* Member 3 */}
                    <tr className="hover:bg-[#181a18] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img className="w-10 h-10 rounded-full object-cover" alt="Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwOfhheAYhMrJTOqiEdSJcReZLWcRFs-XxNzCtXC_n0zdkRjQbR9Dw6sEgP0AspMuXOV3OpOd84-U4RDx7u0a9aAV3-jVeB4sxBL4aN-Q0DDIYbyR3hfR6CPpm_JjNHJZuUUlFdU5VdCtLFMR8U210Qz7HMCNPRr358HWah1ZrvEJFDRl_EUD6SJ7VR1DTNcZmAXXpO53n450ns21ZUV1X07AAO-3XypJBAV2GjFxXV8LCVUNA0sAGSkkw5phV2cQFQUGJLUv-rmI"/>
                          <div>
                            <p className="text-sm font-semibold text-[#faf9f5]">Sania Hanson</p>
                            <p className="text-xs text-[#ababa8]">s.hanson@acmecorp.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select className="bg-[#242624] border-none rounded-lg py-1.5 px-3 text-xs font-medium text-[#faf9f5] focus:ring-1 focus:ring-[#aeee2a] outline-none">
                          <option defaultValue="Admin">Admin</option>
                          <option>Manager</option>
                          <option>Analyst</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input defaultChecked className="sr-only peer" type="checkbox" value=""/>
                          <div className="w-11 h-6 bg-[#242624] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#aeee2a] shadow-[0_0_15px_-3px_rgba(174,238,42,0.4)]"></div>
                        </label>
                      </td>
                    </tr>
                    
                    {/* Member 4 */}
                    <tr className="hover:bg-[#181a18] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img className="w-10 h-10 rounded-full object-cover" alt="Avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuADF8fv9A0xS5Vqeuw2O3wLSHvur94wFELV1UAE2PZITLI2a3KFFxIoYQdi0p5uz2O1GkonszhVIJVJ5rFhaezGStcyoqnpWeobSJnNI_YIgQ3gbiiulX2zjpFfPumQha33-oJiKxKq_kYr-doLVlq8IY5HevSTVd-4bW5fFptZ_Bfq9Z6LZkAnre0aJ7eXgW1wgpySr9NJsmS7beSbrRlWs0BI_qrunlq1gWQxQpyn-PYm8V2IHSLdPPKKzzwKiHDewFHz65wYCkA"/>
                          <div>
                            <p className="text-sm font-semibold text-[#faf9f5]">Jostin Smith</p>
                            <p className="text-xs text-[#ababa8]">j.smith@acmecorp.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select className="bg-[#242624] border-none rounded-lg py-1.5 px-3 text-xs font-medium text-[#faf9f5] focus:ring-1 focus:ring-[#aeee2a] outline-none">
                          <option defaultValue="Admin">Admin</option>
                          <option>Manager</option>
                          <option>Analyst</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input defaultChecked className="sr-only peer" type="checkbox" value=""/>
                          <div className="w-11 h-6 bg-[#242624] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#aeee2a] shadow-[0_0_15px_-3px_rgba(174,238,42,0.4)]"></div>
                        </label>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Bottom Floating Action */}
          <div className="flex justify-end gap-4 pt-10 border-t border-[#474846]/10">
            <button className="px-4 sm:px-6 lg:px-8 py-3 bg-[#181a18] text-[#faf9f5] font-semibold rounded-xl hover:bg-[#242624] transition-all border border-white/5">
                Discard Changes
            </button>
            <button className="px-4 sm:px-6 lg:px-8 py-3 bg-[#aeee2a] text-[#3a5400] font-bold rounded-xl shadow-[0_8px_30px_rgb(174,238,42,0.2)] hover:scale-[1.02] active:scale-95 transition-all">
                Save Configurations
            </button>
          </div>

        </div>
      </main>
    </>
  );
}
