import React from "react";
import Link from "next/link";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#faf9f5] min-h-screen font-body text-[#121412]">
      {/* Header Premium Light Mode */}
      <header className="bg-white border-b border-[#e5e5e3] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* Logo */}
             <div className="w-10 h-10 bg-[#121412] text-[#aeee2a] flex items-center justify-center font-bold text-lg font-headline">
               SD
             </div>
             <div className="flex flex-col">
                <span className="font-headline font-bold text-[#121412] tracking-tight leading-none text-lg">Siding Depot</span>
                <span className="text-[#a1a19d] text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Client Portal</span>
             </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
             <Link href="/customer" className="text-[#474846] hover:text-[#121412] font-medium text-sm transition-colors">Dashboard</Link>
             <Link href="/customer/documents" className="text-[#474846] hover:text-[#121412] font-medium text-sm transition-colors">Documents</Link>
             <Link href="/customer/change-orders" className="text-[#474846] hover:text-[#121412] font-medium text-sm transition-colors">Change Orders</Link>
             <Link href="/customer/colors" className="text-[#474846] hover:text-[#121412] font-medium text-sm transition-colors">Color Selection</Link>
          </nav>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-[#474846] hover:text-[#ff7351] transition-colors">
              <span className="hidden sm:inline text-sm font-bold">Sign Out</span>
              <span className="material-symbols-outlined text-[20px]" translate="no">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* Footer Light */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-[#e5e5e3] mt-12 bg-[#faf9f5]">
        <p className="text-[#a1a19d] text-xs font-bold uppercase tracking-widest text-center">
          © {new Date().getFullYear()} Siding Depot. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
