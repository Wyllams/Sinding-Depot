"use client";

import { Bell, Search, X, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export default function SalesTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(searchQuery.trim()) {
      setIsSearchOpen(false);
      // In a real app we'd pass query params: /sales/jobs?q=...
      router.push('/sales/jobs');
      setSearchQuery("");
    }
  };

  const mockNotifications = [
    { id: 1, title: 'Contract Signed', message: 'Sarah Jenkins signed JOB-041', time: '10m ago', read: false },
    { id: 2, title: 'Deposit Received', message: '$10,000 ACH cleared for JOB-041', time: '1h ago', read: false },
    { id: 3, title: 'Color Picked', message: 'Emily Davis chose "Slate Gray"', time: 'Yesterday', read: true },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-zinc-900 flex justify-between items-center px-4 h-16 relative">
        <div className="flex items-center gap-3">
          <Link href="/sales" className="w-8 h-8 bg-[#0a0a0a] border border-zinc-800 rounded-lg flex items-center justify-center text-[var(--color-siding-green)] font-bold font-headline tracking-tighter hover:bg-zinc-800 transition-colors">
            SD
          </Link>
          <div className="flex flex-col">
            <span className="text-white font-bold text-[13px] leading-tight font-headline">Sales</span>
            <span className="text-zinc-500 text-[10px] font-medium tracking-widest uppercase truncate max-w-[120px]">
              {pathname.includes("/jobs/") ? "Deal Details" : "NICK GARNER"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Lupa (Search) */}
          <button 
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              setIsNotificationsOpen(false);
            }}
            className="text-zinc-400 hover:text-white transition-colors bg-[#0a0a0a] border border-zinc-800 p-2 rounded-full"
          >
            <Search size={16} />
          </button>
          
          {/* Notifications Dropdown Trigger (Sino) */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsSearchOpen(false);
              }}
              className="relative text-zinc-400 hover:text-white transition-colors bg-[#0a0a0a] border border-zinc-800 p-2 rounded-full"
            >
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--color-siding-green)] rounded-full ring-2 ring-[#050505]"></span>
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute top-full right-0 mt-3 w-72 bg-[#0a0a0a] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 origin-top-right">
                <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-[#050505]">
                   <h3 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h3>
                   <button className="text-[10px] text-[var(--color-siding-green)] font-bold uppercase tracking-widest">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                   {mockNotifications.map(notification => (
                     <div key={notification.id} className={`p-3 border-b border-zinc-800/50 hover:bg-zinc-900 transition-colors cursor-pointer ${notification.read ? 'opacity-50' : ''}`}>
                        <div className="flex gap-3">
                           <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notification.read ? 'bg-zinc-700' : 'bg-[var(--color-siding-green)]'}`}></div>
                           <div>
                              <p className="text-xs font-bold text-white">{notification.title}</p>
                              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{notification.message}</p>
                              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1.5">{notification.time}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="absolute top-16 left-0 w-full z-40 bg-[#050505] border-b border-zinc-900 p-4 animate-in slide-in-from-top">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              autoFocus
              placeholder="Search contracts, deals or clients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-zinc-800 text-sm text-white rounded-2xl pl-11 pr-10 py-3.5 focus:outline-none focus:border-[var(--color-siding-green)] transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            />
            <button type="button" onClick={() => setIsSearchOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
               <X size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
