"use client";

import { useRouter } from "next/navigation";

export function FieldTopBar({ title, showBack = false }: { title: string; showBack?: boolean }) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 bg-[#0d0f0d]/90 backdrop-blur-md border-b border-[#242624] px-4 h-16 flex items-center justify-between shadow-sm pt-safe">
      <div className="flex items-center">
        {showBack ? (
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 rounded-full bg-[#1e201e] border border-white/5 flex items-center justify-center text-[#faf9f5] mr-3 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-xl" translate="no">arrow_back_ios_new</span>
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#1e201e] border border-white/5 flex items-center justify-center mr-3">
             <span className="material-symbols-outlined text-[#aeee2a]" translate="no">handyman</span>
          </div>
        )}
        <h1 className="text-[#faf9f5] font-headline font-bold text-lg tracking-tight truncate max-w-[200px]">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Fake Indicator for Network/Sync */}
        <div className="h-2 w-2 rounded-full bg-[#aeee2a] shadow-[0_0_8px_rgba(174,238,42,0.8)] animate-pulse" />
      </div>
    </header>
  );
}
