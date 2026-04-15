"use client";

import { LogOut, Settings, Award, MapPin, Mail, Phone, Camera } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
export default function SalesProfile() {
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push('/login?role=sales');
    router.refresh();
  };

  const handleAvatarClick = () => {
    // Abre a galeria de fotos/arquivos nativa do celular ou PC
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Cria uma URL local temporária para exibir a imagem que a pessoa acabou de selecionar
      const imageUrl = URL.createObjectURL(file);
      setPhoto(imageUrl);
    }
  };

  return (
    <div className="p-4 space-y-6">
      
      {/* Header */}
      <h1 className="text-2xl font-bold font-headline tracking-tight text-white mb-6">Profile</h1>
      
      {/* User Info Card */}
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-6 flex flex-col items-center text-center">
         
         {/* Hidden File Input */}
         <input 
           type="file" 
           accept="image/*" 
           ref={fileInputRef} 
           style={{ display: "none" }} 
           onChange={handleFileChange}
         />

         <div className="relative mb-4 group cursor-pointer" onClick={handleAvatarClick}>
           {photo ? (
             <img src={photo} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-zinc-800 transition-transform group-hover:scale-105" />
           ) : (
             <div className="w-24 h-24 rounded-full bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center text-[var(--color-siding-green)] font-headline text-3xl font-bold transition-transform group-hover:scale-105">
                NG
             </div>
           )}
           <div className="absolute bottom-0 right-0 bg-[var(--color-siding-green)] p-1.5 rounded-full text-[#050505] shadow-lg border-2 border-[#000000] group-hover:scale-110 transition-transform">
             <Camera size={14} strokeWidth={3} />
           </div>
         </div>
         <h2 className="text-xl font-bold text-white mb-1">Nick Garner</h2>
         <p className="text-[var(--color-siding-green)] text-xs font-bold uppercase tracking-widest mb-4">Senior Sales Rep</p>
         
         <div className="flex justify-center gap-2 mb-6">
            <span className="bg-[var(--color-siding-green)]/10 text-[var(--color-siding-green)] px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
               <Award size={12} /> Top Seller
            </span>
         </div>

         <div className="w-full space-y-3 text-left border-t border-zinc-800 pt-6">
            <div className="flex items-center gap-3 text-zinc-300">
               <Mail size={16} className="text-zinc-500" />
               <span className="text-sm font-medium">nick@sidingdepot.com</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
               <Phone size={16} className="text-zinc-500" />
               <span className="text-sm font-medium">+1 (404) 555-0198</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
               <MapPin size={16} className="text-zinc-500" />
               <span className="text-sm font-medium">Atlanta Territory</span>
            </div>
         </div>
      </div>

      {/* Settings / Actions */}
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-3xl overflow-hidden">
        <ul className="divide-y divide-zinc-800/50">
           <li>
             <Link href="/sales/profile/settings" className="flex items-center justify-between p-5 hover:bg-zinc-900 transition-colors group">
               <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-[var(--color-siding-green)] border border-zinc-800">
                    <Settings size={18} />
                  </div>
                  <span className="font-semibold text-sm">Account Settings</span>
               </div>
               <span className="material-symbols-outlined text-zinc-500" translate="no">chevron_right</span>
             </Link>
           </li>
           <li>
             <button onClick={handleSignOut} className="w-full flex items-center justify-between p-5 hover:bg-red-500/10 transition-colors group">
               <div className="flex items-center gap-3 text-white">
                  <div className="p-2 bg-zinc-900 rounded-lg text-zinc-400 group-hover:text-red-500 border border-zinc-800">
                    <LogOut size={18} />
                  </div>
                  <span className="font-semibold text-sm group-hover:text-red-500 transition-colors">Sign Out</span>
               </div>
             </button>
           </li>
        </ul>
      </div>

    </div>
  );
}
