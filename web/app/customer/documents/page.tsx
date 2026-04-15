import Link from "next/link";

export default function CustomerDocuments() {
  const documents = [
    {
      id: "doc-1",
      title: "Master Siding Contract",
      date: "Oct 12, 2026",
      status: "Signed",
      type: "contract",
      icon: "contract",
    },
    {
      id: "doc-2",
      title: "Job Certificate - Siding",
      date: "Oct 15, 2026",
      status: "Signed",
      type: "certificate",
      icon: "verified",
    },
    {
      id: "doc-3",
      title: "Certificate of Completion",
      date: "Pending Conclusion",
      status: "Pending",
      type: "coc",
      icon: "task",
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/customer" className="inline-flex items-center text-[#a1a19d] hover:text-[#121412] text-sm font-bold transition-colors mb-4">
           <span className="material-symbols-outlined text-[18px] mr-1" translate="no">arrow_back</span>
           Back to Dashboard
        </Link>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-[#121412]">My Documents</h1>
        <p className="text-[#474846] mt-2">Access all your signed agreements, job certificates, and warranties in one place.</p>
      </div>

      <div className="bg-white border border-[#e5e5e3] rounded-3xl overflow-hidden shadow-sm">
        <ul className="divide-y divide-[#e5e5e3]">
          {documents.map((doc) => (
            <li key={doc.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#faf9f5] transition-colors">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  doc.status === 'Signed' ? 'bg-[#f0fae1] text-[#5c8a00]' : 'bg-[#fff1ec] text-[#ff7351]'
                }`}>
                   <span className="material-symbols-outlined" translate="no">{doc.icon}</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg text-[#121412]">{doc.title}</h3>
                  <p className="text-[#a1a19d] text-sm">{doc.date}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 sm:ml-auto">
                <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${
                  doc.status === 'Signed' ? 'bg-[#5c8a00]/10 text-[#5c8a00]' : 'bg-[#ff7351]/10 text-[#ff7351]'
                }`}>
                  {doc.status}
                </span>

                {doc.status === 'Signed' ? (
                  <button className="h-10 px-4 bg-[#121412] text-[#faf9f5] rounded-full font-bold text-sm hover:bg-[#242624] transition-colors">
                    View PDF
                  </button>
                ) : (
                  <button className="h-10 px-4 bg-[#ff7351] text-white rounded-full font-bold text-sm hover:brightness-110 transition-colors shadow-sm">
                    Sign Now
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
