import { createClient } from "@supabase/supabase-js";
import ClientForm from "@/components/coc/ClientForm";
import { TopBar } from "@/components/TopBar";

// Force dynamic rendering — uses service role key that is never available at build time.
export const dynamic = "force-dynamic";

// =============================================
// PUBLIC ROUTE: Customer Certificate of Completion
// URL: /projects/[jobId]/coc/[docId]
// =============================================

export default async function COCPage({
  params,
}: {
  // To avoid Next.js 15 breaking changes with dynamic params, we await params
  params: Promise<{ id: string; docId: string }>;
}) {
  const resolvedParams = await params;
  const { id: jobId, docId } = resolvedParams;

  // Utilize Service Role for Public secure access since customer is not logged in
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: doc, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("id", docId)
    .eq("job_id", jobId)
    .single();

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-on-surface text-2xl font-bold font-headline">Document Not Found</h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            This certificate does not exist or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  const isSigned = doc.status === "active" || doc.metadata?.signature;

  return (
    <main className="min-h-screen bg-background flex flex-col items-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-3xl flex flex-col items-center mb-8">
        {/* Mock Logo Space */}
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(174,238,42,0.3)] mb-4">
          <span className="material-symbols-outlined text-[#1a2e00] font-bold" translate="no">roofing</span>
        </div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">{doc.title}</h1>
        <p className="text-on-surface-variant text-sm mt-1">Review and sign your project completion certificate.</p>
      </div>

      <div className="w-full max-w-3xl bg-surface-container-low rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
        {/* Document Body */}
        <div className="p-8 sm:p-12 relative">
          {/* Watermark if signed */}
          {isSigned && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.03] rotate-[-30deg]">
              <span className="text-9xl font-black text-primary uppercase tracking-widest outline-text">
                SIGNED
              </span>
            </div>
          )}
          
          <div className="prose prose-invert max-w-none text-sm text-on-surface/90 leading-relaxed font-serif marker:text-primary">
            {/* The body is usually markdown, but here we just render it directly maintaining newlines */}
            {doc.metadata?.body?.split("\n").map((paragraph: string, i: number) => (
              paragraph.startsWith("# ") ? (
                <h2 key={i} className="text-xl font-bold font-headline text-primary mb-6 tracking-tight uppercase">
                  {paragraph.replace("# ", "")}
                </h2>
              ) : paragraph.trim() !== "" ? (
                <p key={i} className="mb-4">{paragraph}</p>
              ) : <br key={i} />
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-dashed border-white/10">
            <h3 className="text-sm font-bold text-on-surface-variant tracking-widest uppercase mb-6">Customer Signature</h3>
            
            <ClientForm docId={docId} existingMetadata={doc.metadata} isSigned={isSigned} />
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-xs text-outline-variant font-medium">
          Siding Depot Secure Digital Signature
        </p>
      </div>
    </main>
  );
}
