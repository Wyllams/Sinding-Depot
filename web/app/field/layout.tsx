import { FieldBottomNav } from "@/components/field/FieldBottomNav";

export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#000000] min-h-[100dvh] w-full relative sm:bg-[#080808]">
      {/* 
        Container constraints for desktop fallback: 
        If someone opens this on a computer, it restricts the width to a mobile layout 
        and centers it to preserve the App experience.
      */}
      <div className="max-w-md mx-auto min-h-[100dvh] bg-[#0d0f0d] relative shadow-2xl flex flex-col overflow-hidden pb-24">
        {/* Mobile Status Bar Fake Space (optional for physical notch simulation) */}
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto w-full styled-scrollbar">
          {children}
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 w-full">
          <FieldBottomNav />
        </div>
      </div>
    </div>
  );
}
