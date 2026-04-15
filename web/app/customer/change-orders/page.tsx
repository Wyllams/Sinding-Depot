import Link from "next/link";

export default function CustomerChangeOrders() {
  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/customer" className="inline-flex items-center text-[#a1a19d] hover:text-[#121412] text-sm font-bold transition-colors mb-4">
           <span className="material-symbols-outlined text-[18px] mr-1" translate="no">arrow_back</span>
           Back to Dashboard
        </Link>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[#121412]">Change Orders</h1>
        <p className="text-[#474846] mt-2">Approve extra materials or adjustments required during the installation process.</p>
      </div>

      <div className="text-center py-20 bg-white border border-[#e5e5e3] rounded-3xl shadow-sm">
        <div className="w-20 h-20 bg-[#f0fae1] text-[#aeee2a] rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[40px]" translate="no">thumb_up</span>
        </div>
        <h3 className="font-headline font-bold text-xl text-[#121412]">You're all caught up!</h3>
        <p className="text-[#474846] mt-2 max-w-sm mx-auto">
          There are no pending Change Orders for your project. If our teams need extra materials, they will appear here for your signature.
        </p>
      </div>
    </div>
  );
}
