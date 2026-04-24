import React from "react";
import SalesTopBar from "@/components/sales/SalesTopBar";
import SalesBottomNav from "@/components/sales/SalesBottomNav";

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Force mobile layout on desktop using bounds and dark mode bg
    <div className="bg-layout-bg min-h-screen text-white font-sans flex justify-center items-start overflow-hidden">
      
      {/* Mobile Frame (Constricts to ~448px max width like an actual phone) */}
      <div className="w-full max-w-md h-[100dvh] bg-mobile-frame relative shadow-2xl overflow-hidden flex flex-col border-x border-zinc-900">
        
        {/* Fixed Top Bar */}
        <SalesTopBar />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
          {children}
        </div>

        {/* Fixed Bottom Nav */}
        <SalesBottomNav />
        
      </div>
    </div>
  );
}
