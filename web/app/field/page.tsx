import { FieldTopBar } from "@/components/field/FieldTopBar";
import Link from "next/link";

export default function FieldHome() {
  // Em uma conta real, isso viria do Supabase auth()
  const crewName = "Wyllams Team";

  return (
    <>
      <FieldTopBar title="Dashboard" />
      
      <div className="p-6">
        {/* Greetings */}
        <div className="mb-8">
          <h2 className="text-[#ababa8] text-sm uppercase tracking-widest font-bold mb-1">Welcome back</h2>
          <h1 className="text-[#faf9f5] font-headline text-3xl font-bold tracking-tight">{crewName}</h1>
          <p className="text-[#aeee2a] font-medium mt-1">You have 2 active jobs today.</p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href="/field/jobs" className="bg-[#1e201e] border border-white/5 p-4 rounded-3xl flex flex-col items-start active:scale-95 transition-transform cursor-pointer">
             <div className="w-10 h-10 rounded-full bg-[#aeee2a]/10 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[#aeee2a]" translate="no">engineering</span>
             </div>
             <span className="text-2xl font-black text-[#faf9f5] font-headline">2</span>
             <span className="text-[#ababa8] text-xs font-bold uppercase tracking-wider mt-1">My Jobs</span>
          </Link>
          
          <div className="bg-[#1e201e] border border-white/5 p-4 rounded-3xl flex flex-col items-start">
             <div className="w-10 h-10 rounded-full bg-[#ff7351]/10 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[#ff7351]" translate="no">warning</span>
             </div>
             <span className="text-2xl font-black text-[#faf9f5] font-headline">0</span>
             <span className="text-[#ababa8] text-xs font-bold uppercase tracking-wider mt-1">Issues</span>
          </div>
        </div>

        {/* Action Widgets */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#1a2e00] to-[#121412] border border-[#aeee2a]/20 p-5 rounded-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <span className="material-symbols-outlined text-8xl" translate="no">wb_sunny</span>
             </div>
             <div className="relative z-10">
                <h3 className="text-[#aeee2a] font-bold text-sm tracking-widest uppercase mb-1">Weather Check</h3>
                <p className="text-[#faf9f5] font-headline text-xl font-bold">Clear Sky, 72°F</p>
                <p className="text-[#ababa8] text-xs mt-2">Perfect conditions for exterior siding installation today.</p>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
