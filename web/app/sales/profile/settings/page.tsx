"use client";

import { ArrowLeft, Key, Lock, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SalesSettings() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  return (
    <div className="p-4 space-y-6 pb-24">
      
      {/* Header */}
      <header className="flex items-center gap-3">
        <Link href="/sales/profile" className="text-[var(--color-siding-green)] hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold font-headline tracking-tight text-white">Account Settings</h1>
      </header>
      
      {/* Settings List */}
      <div className="space-y-6">

         {/* Security */}
         <div>
            <h2 className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest pl-2 mb-3">Security</h2>
            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800/50">
               <button 
                 onClick={() => setIsChangingPassword(!isChangingPassword)}
                 className="w-full p-5 flex items-center justify-between hover:bg-zinc-900 transition-colors"
               >
                  <div className="flex items-center gap-3 text-white">
                     <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 border border-zinc-800">
                       <Key size={18} />
                     </div>
                     <span className="font-semibold text-sm">Change Password</span>
                  </div>
                  <span className={`material-symbols-outlined text-zinc-500 text-sm transition-transform ${isChangingPassword ? 'rotate-90' : ''}`} translate="no">chevron_right</span>
               </button>

               {/* Password Form (Conditional) */}
               {isChangingPassword && (
                 <div className="p-5 bg-[#050505]/50 space-y-4 border-t border-zinc-800/50">
                    
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">Current Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input type="password" placeholder="••••••••" className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl py-2.5 pl-9 pr-10 text-sm text-white focus:border-[var(--color-siding-green)] focus:outline-none transition-colors" />
                        <EyeOff size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 cursor-pointer hover:text-white" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">New Password</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-siding-green)]" />
                        <input type="password" placeholder="Min 8 characters" className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl py-2.5 pl-9 pr-10 text-sm text-white focus:border-[var(--color-siding-green)] focus:outline-none transition-colors" />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        onClick={() => {
                           alert("Phew! Your new password is secure. (Mock Saved!)");
                           setIsChangingPassword(false);
                        }}
                        className="w-full bg-[var(--color-siding-green)] text-[#050505] font-bold text-sm py-3 rounded-xl hover:bg-[#9bdd25] transition-colors"
                      >
                        Save New Password
                      </button>
                    </div>

                 </div>
               )}
            </div>
         </div>

      </div>
    </div>
  );
}
