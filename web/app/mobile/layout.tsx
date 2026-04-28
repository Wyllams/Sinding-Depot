import React from "react";
import { UndoProvider } from "@/components/UndoContext";
import { ProfileProvider } from "@/components/ProfileContext";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfileProvider>
    <UndoProvider>
      {/* 
        This is the absolute base container for the mobile app via Capacitor.
        100dvh guarantees it fits exactly within the Safari/iOS viewport without jumping.
        Use iOS safe-area-inset in the future for physical notches.
      */}
      <div className="bg-[#080808] text-on-surface min-h-[100dvh] max-h-[100dvh] w-full relative flex flex-col overflow-hidden font-body selection:bg-primary selection:text-black">
        {/* Content Area - Scrolls vertically, sits behind bottom nav if needed, but we pad it so content doesn't hide */}
        <div className="flex-1 overflow-y-auto w-full styled-scrollbar pb-24">
          {children}
        </div>
        
        {/* Bottom Navigation is dynamically inserted inside the pages, 
            or we can inject a global one. For now, pages handle their own nav to easily swap between Sales/Crew/Customer contexts. */}
      </div>
    </UndoProvider>
    </ProfileProvider>
  );
}
