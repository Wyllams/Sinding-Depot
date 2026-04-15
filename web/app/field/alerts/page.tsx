import { FieldTopBar } from "@/components/field/FieldTopBar";

export default function FieldAlerts() {
  return (
    <>
      <FieldTopBar title="Alerts & Sync" />
      
      <div className="p-4 space-y-4">
        {/* Mock Alert */}
        <div className="bg-[#1e201e] border border-white/5 p-4 rounded-3xl flex gap-4">
           <div className="bg-[#ff7351]/10 w-12 h-12 rounded-full shrink-0 flex items-center justify-center">
             <span className="material-symbols-outlined text-[#ff7351]" translate="no">warning</span>
           </div>
           <div>
             <h3 className="text-[#faf9f5] font-bold text-sm">Weather Advisory</h3>
             <p className="text-[#ababa8] text-xs mt-1">High winds expected tomorrow afternoon. Please secure all Siding materials on scaffolds.</p>
             <span className="text-[#474846] text-[10px] uppercase font-bold tracking-widest mt-2 block">2 hours ago</span>
           </div>
        </div>

        {/* Info Alert */}
        <div className="bg-[#1e201e] border border-white/5 p-4 rounded-3xl flex gap-4">
           <div className="bg-[#aeee2a]/10 w-12 h-12 rounded-full shrink-0 flex items-center justify-center">
             <span className="material-symbols-outlined text-[#aeee2a]" translate="no">verified</span>
           </div>
           <div>
             <h3 className="text-[#faf9f5] font-bold text-sm">Document Signed</h3>
             <p className="text-[#ababa8] text-xs mt-1">The customer at 400 Broad Street has successfully signed the Certificate of Completion.</p>
             <span className="text-[#474846] text-[10px] uppercase font-bold tracking-widest mt-2 block">Yesterday</span>
           </div>
        </div>

      </div>
    </>
  );
}
