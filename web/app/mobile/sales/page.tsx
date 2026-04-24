"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SalesMobileDashboard() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const SALES_NAV = [
    { icon: "dashboard", label: "Dashboard", href: "/mobile/sales" },
    { icon: "home_work", label: "Projects", href: "/mobile/sales/projects" },
    { icon: "request_quote", label: "Orders", href: "/mobile/sales/orders" },
    { icon: "calendar_today", label: "Calendar", href: "/mobile/sales/calendar" },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 pt-12">
      {/* Standard Header */}
      <div className="flex justify-between items-center mb-6 relative">
        {/* Left side: Hamburger Menu */}
        <div className="relative z-50">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-on-surface">menu</span>
          </button>
          
          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="absolute top-12 left-0 w-48 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                <Link 
                  href="/mobile/sales/profile"
                  className="flex items-center gap-3 px-4 py-4 hover:bg-primary/10 text-on-surface transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  <span className="font-semibold text-sm">My Profile</span>
                </Link>
                <div className="h-[1px] bg-outline-variant/30 w-full" />
                <button 
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-4 hover:bg-red-500/10 text-red-400 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  <span className="font-semibold text-sm">Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Center: Title */}
        <h1 className="text-lg font-black tracking-widest uppercase text-on-surface absolute left-1/2 -translate-x-1/2">
          DASHBOARD
        </h1>

        {/* Right side: Profile Avatar */}
        <Link href="/mobile/sales/profile" className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/30 shadow-lg flex items-center justify-center overflow-hidden active:scale-95 transition-transform z-10">
           <img src="https://ui-avatars.com/api/?name=SD&background=aeee2a&color=080808&bold=true" alt="Profile" className="w-full h-full object-cover" />
        </Link>
      </div>

      {/* Hero Financial Chart Dummy */}
      <div className="bg-gradient-to-br from-surface-container-low to-[#0a0a0a] rounded-3xl p-6 border border-outline-variant/20 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex flex-col">
            <span className="text-[#7B7B78] font-bold text-[10px] tracking-widest uppercase">My Sales (YTD)</span>
            <span className="text-3xl font-black text-on-surface mt-1 tracking-tighter">$142,500</span>
          </div>
          <div className="bg-primary/15 text-primary px-3 py-1 rounded-full text-xs font-bold font-mono">
            +12.4%
          </div>
        </div>

        {/* SVG Line Chart (Sparkline) */}
        <div className="relative h-16 w-full mt-8">
          <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#aeee2a" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#aeee2a" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area Fill */}
            <path
              d="M0,100 L0,70 L20,50 L40,65 L60,35 L80,45 L100,10 L100,100 Z"
              fill="url(#salesGradient)"
            />
            {/* Line */}
            <polyline
              points="0,70 20,50 40,65 60,35 80,45 100,10"
              fill="none"
              stroke="#aeee2a"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          {/* Monthly Dots perfectly matching the coordinates */}
          {[
            { x: 0, y: 70 },
            { x: 20, y: 50 },
            { x: 40, y: 65 },
            { x: 60, y: 35 },
            { x: 80, y: 45 },
            { x: 100, y: 10 },
          ].map((pt, i) => (
            <div 
              key={i} 
              className="absolute w-2.5 h-2.5 bg-surface-container-low border-2 border-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-sm"
              style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
            />
          ))}
        </div>
      </div>

      {/* Action Grid */}
      <div className="flex flex-col gap-4">
        <div className="bg-surface-container-low active:scale-[0.98] transition-transform duration-200 rounded-3xl p-6 flex justify-between items-center border border-outline-variant/20 shadow-lg relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
          <div className="flex flex-col">
            <span className="text-3xl font-black text-on-surface">12</span>
            <span className="text-xs font-bold text-[#7B7B78] uppercase tracking-wider mt-1">Active<br/>Jobs</span>
          </div>
          <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined text-[28px]">task_alt</span>
          </div>
        </div>
      </div>

      {/* Active Projects List */}
      <div className="flex flex-col gap-4 mt-2">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">home_work</span>
            Current Projects
          </h2>
          <span className="text-xs font-bold text-primary uppercase tracking-widest cursor-pointer">View All</span>
        </div>

        <div className="flex flex-col gap-3">
          {/* Card 1 */}
          <div className="bg-surface-container-low rounded-3xl p-5 border border-outline-variant/20 flex items-center gap-4 relative overflow-hidden active:bg-surface-container-high transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface shrink-0 font-black font-headline border border-outline-variant/30">
              SM
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-black text-on-surface truncate text-sm">Smith Residence</span>
              <span className="text-xs font-bold text-[#7B7B78] truncate mt-0.5">Siding & Windows</span>
            </div>
            <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
          </div>

          {/* Card 2 */}
           <div className="bg-surface-container-low rounded-3xl p-5 border border-outline-variant/20 flex items-center gap-4 relative overflow-hidden active:bg-surface-container-high transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-error" />
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-error shrink-0 font-black font-headline border border-error/30">
              AD
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-black text-on-surface truncate text-sm">Adamson Roof</span>
              <span className="text-xs font-bold text-error truncate mt-0.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">warning</span> Blocked
              </span>
            </div>
            <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
          </div>
        </div>
      </div>

      <MobileBottomNav items={SALES_NAV} />
    </div>
  );
}
