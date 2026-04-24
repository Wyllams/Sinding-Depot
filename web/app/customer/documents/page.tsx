"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

interface DocItem {
  id: string;
  title: string;
  document_type: string;
  status: string;
  storage_path: string | null;
  created_at: string;
  source: "document" | "certificate" | "milestone";
  certificate_number?: string;
  summary?: string;
  signed_at?: string | null;
}

const TYPE_ICONS: Record<string, string> = {
  contract: "contract",
  permit: "policy",
  insurance: "verified_user",
  invoice: "receipt_long",
  change_order: "request_quote",
  completion_certificate: "verified",
  job_start: "play_circle",
  installer_scope_packet: "assignment",
  customer_visible_document: "description",
  other: "attach_file",
};

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  draft:   { label: "Preparing",   bg: "bg-outline-variant/10", text: "text-outline-variant" },
  active:  { label: "Active",  bg: "bg-[#60a5fa]/10", text: "text-[#2563eb]" },
  signed:  { label: "Signed",  bg: "bg-[#5c8a00]/10", text: "text-[#5c8a00]" },
  paid:    { label: "Paid",    bg: "bg-[#818cf8]/10", text: "text-[#6366f1]" },
  archived:{ label: "Archived",bg: "bg-outline-variant/10", text: "text-outline-variant" },
  voided:  { label: "Voided",  bg: "bg-error/10", text: "text-[#dc2626]" },
  pending_signature: { label: "Needs Signature", bg: "bg-error/10", text: "text-error" },
  pending_customer_signature: { label: "Needs Signature", bg: "bg-error/10", text: "text-error" },
};

export default function CustomerDocuments(): React.ReactElement {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("profile_id", user.id)
          .single();
        if (!customer) return;

        const { data: jobs } = await supabase
          .from("jobs")
          .select("id")
          .eq("customer_id", customer.id);
        if (!jobs || jobs.length === 0) return;

        const jobIds = jobs.map((j) => j.id);

        // Get documents visible to customer
        const { data: documents } = await supabase
          .from("documents")
          .select("id, title, document_type, status, storage_path, created_at")
          .in("job_id", jobIds)
          .eq("visible_to_customer", true)
          .order("created_at", { ascending: false });

        // Get completion certificates
        const { data: certs } = await supabase
          .from("completion_certificates")
          .select("id, certificate_number, status, summary, signed_at, created_at")
          .in("job_id", jobIds)
          .order("created_at", { ascending: false });

        // Get payment milestones (Job Start + COCs)
        const { data: milestones } = await supabase
          .from("project_payment_milestones")
          .select("id, title, document_type, status, signed_at, created_at, sort_order")
          .in("job_id", jobIds)
          .neq("status", "draft") // Only show milestones sent to client (not draft)
          .order("sort_order", { ascending: true });

        const allDocs: DocItem[] = [];

        (documents || []).forEach((d: any) => {
          allDocs.push({
            id: d.id,
            title: d.title,
            document_type: d.document_type,
            status: d.status,
            storage_path: d.storage_path,
            created_at: d.created_at,
            source: "document",
          });
        });

        (certs || []).forEach((c: any) => {
          allDocs.push({
            id: c.id,
            title: `Certificate of Completion — ${c.certificate_number || ""}`,
            document_type: "completion_certificate",
            status: c.status,
            storage_path: null,
            created_at: c.created_at,
            source: "certificate",
            certificate_number: c.certificate_number,
            summary: c.summary,
            signed_at: c.signed_at,
          });
        });

        (milestones || []).forEach((m: any) => {
          allDocs.push({
            id: m.id,
            title: m.title,
            document_type: m.document_type,
            status: m.status,
            storage_path: null,
            created_at: m.created_at,
            source: "milestone",
            signed_at: m.signed_at,
          });
        });

        allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setDocs(allDocs);
      } catch (err) {
        console.error("[CustomerDocuments]", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmtDate = (d: string): string => {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "—";
    return `${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}/${dt.getFullYear()}`;
  };

  function handleView(doc: DocItem): void {
    if (doc.storage_path) {
      const { data } = supabase.storage.from("documents").getPublicUrl(doc.storage_path);
      window.open(data.publicUrl, "_blank");
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/customer" className="inline-flex items-center text-[#a1a19d] hover:text-surface-container-low text-sm font-bold transition-colors mb-4">
          <span className="material-symbols-outlined text-[18px] mr-1" translate="no">arrow_back</span>
          Back to Dashboard
        </Link>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-surface-container-low">My Documents</h1>
        <p className="text-outline-variant mt-2">Access all your contracts, certificates, and project files.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-3 border-[#e5e5e3] border-t-surface-container-low rounded-full animate-spin" />
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#e5e5e3] rounded-3xl shadow-sm">
          <div className="w-20 h-20 bg-[#f5f5f5] text-[#a1a19d] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-[40px]" translate="no">folder_off</span>
          </div>
          <h3 className="font-headline font-bold text-xl text-surface-container-low">No documents yet</h3>
          <p className="text-outline-variant mt-2 max-w-sm mx-auto">
            Documents will appear here once they are added to your project by our team.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#e5e5e3] rounded-3xl overflow-hidden shadow-sm">
          <ul className="divide-y divide-[#e5e5e3]">
            {docs.map((doc) => {
              const icon = TYPE_ICONS[doc.document_type] ?? "attach_file";
              const st = STATUS_STYLES[doc.status] ?? STATUS_STYLES.draft;
              const needsSignature = doc.status === "pending_signature" || doc.status === "pending_customer_signature";
              const isMilestone = doc.source === "milestone";

              return (
                <li key={doc.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-on-surface transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${needsSignature ? "bg-[#fff1ec] text-error" : st.bg + " " + st.text}`}>
                      <span className="material-symbols-outlined" translate="no">{icon}</span>
                    </div>
                    <div>
                      <h3 className="font-headline font-bold text-base text-surface-container-low">{doc.title}</h3>
                      <p className="text-[#a1a19d] text-sm">{fmtDate(doc.created_at)}</p>
                      {doc.summary && (
                        <p className="text-outline-variant text-xs mt-1 line-clamp-2">{doc.summary}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 sm:ml-auto shrink-0">
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>

                    {needsSignature && isMilestone ? (
                      <Link
                        href={`/customer/documents/${doc.id}`}
                        className="h-10 px-5 bg-error text-white rounded-full font-bold text-sm hover:brightness-110 transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]" translate="no">draw</span>
                        Sign Now
                      </Link>
                    ) : needsSignature ? (
                      <button className="h-10 px-5 bg-error text-white rounded-full font-bold text-sm hover:brightness-110 transition-colors shadow-sm flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]" translate="no">draw</span>
                        Sign Now
                      </button>
                    ) : doc.storage_path ? (
                      <button
                        onClick={() => handleView(doc)}
                        className="h-10 px-5 bg-surface-container-low text-on-surface rounded-full font-bold text-sm hover:bg-surface-container-highest transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]" translate="no">visibility</span>
                        View
                      </button>
                    ) : (doc.status === "signed" || doc.status === "paid") && isMilestone ? (
                      <Link
                        href={`/customer/documents/${doc.id}`}
                        className="h-10 px-5 bg-surface-container-low text-on-surface rounded-full font-bold text-sm hover:bg-surface-container-highest transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]" translate="no">visibility</span>
                        View
                      </Link>
                    ) : doc.signed_at ? (
                      <span className="text-xs text-[#5c8a00] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]" translate="no">check_circle</span>
                        Signed {fmtDate(doc.signed_at)}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
