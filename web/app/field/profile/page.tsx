"use client";

import { FieldTopBar } from "@/components/field/FieldTopBar";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function FieldProfile() {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState("Wyllams Team");

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push('/login?role=crew');
    router.refresh();
  };

  const toggleEditName = () => {
    setIsEditingName(!isEditingName);
  };

  return (
    <>
      <FieldTopBar title="My Profile" />
      
      <div className="p-4 space-y-6 flex flex-col items-center pt-8">
        {/* Profile Avatar */}
        <div className="w-24 h-24 rounded-full bg-[#1e201e] border-2 border-[#aeee2a] flex items-center justify-center shadow-[0_0_20px_rgba(174,238,42,0.15)]">
           <span className="material-symbols-outlined text-[48px] text-[#faf9f5]" translate="no">engineering</span>
        </div>
        
        <div className="text-center w-full max-w-[200px]">
           {isEditingName ? (
             <div className="flex flex-col items-center gap-2">
               <input 
                 autoFocus
                 type="text" 
                 value={name} 
                 onChange={(e) => setName(e.target.value)}
                 className="w-full bg-[#0a0a0a] border border-[#aeee2a] text-[#faf9f5] font-headline text-xl font-bold tracking-tight text-center rounded-lg py-1 px-2 focus:outline-none"
               />
               <button onClick={toggleEditName} className="text-[10px] bg-[#aeee2a] text-[#0a0a0a] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                 Save
               </button>
             </div>
           ) : (
             <h2 className="text-[#faf9f5] font-headline text-2xl font-bold tracking-tight">{name}</h2>
           )}
           <p className="text-[#ababa8] text-sm mt-1">Lead Siding Installer</p>
        </div>

        {/* Settings Buttons */}
        <div className="w-full space-y-3 mt-8">
           <button onClick={toggleEditName} className="w-full bg-[#1e201e] border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-[#2a2c2a] transition-colors">
              <span className="text-[#faf9f5] font-bold text-sm">App Settings (Change Name)</span>
              <span className="material-symbols-outlined text-[#474846]" translate="no">edit</span>
           </button>
           
           <button onClick={handleSignOut} className="w-full bg-[#ff7351]/10 border border-[#ff7351]/20 p-4 rounded-2xl flex items-center justify-center mt-8 hover:bg-[#ff7351]/20 transition-colors">
              <span className="text-[#ff7351] font-bold text-sm">Sign Out</span>
           </button>
        </div>
      </div>
    </>
  );
}
