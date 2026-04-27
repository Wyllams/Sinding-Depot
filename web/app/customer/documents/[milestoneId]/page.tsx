"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import DynamicContractForm, {
  ContractFormData,
  MilestonePaymentMethod,
} from "@/components/DynamicContractForm";

interface MilestoneRow {
  id: string;
  job_id: string;
  job_service_id: string | null;
  sort_order: number;
  document_type: "job_start" | "completion_certificate";
  title: string;
  description: string | null;
  amount: number;
  status: "draft" | "pending_signature" | "signed" | "paid";
  marketing_authorization_initials: string | null;
  customer_notes: string | null;
  signed_at: string | null;
  signature_data_url: string | null;
  payment_method: MilestonePaymentMethod | null;
}

interface JobRow {
  id: string;
  job_number: string;
  contract_signed_at: string | null;
  contract_amount: number | null;
  service_address_line_1: string;
  city: string;
  state: string;
  customers: { full_name: string; phone: string };
  salespersons: { full_name: string } | null;
}

export default function CustomerSignPage(): React.ReactElement | null {
  const params = useParams();
  const router = useRouter();
  const milestoneId = params?.milestoneId as string;

  const [milestone, setMilestone] = useState<MilestoneRow | null>(null);
  const [job, setJob] = useState<JobRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!milestoneId) return;

    async function fetchData(): Promise<void> {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setError("Authentication required."); return; }

        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("profile_id", user.id)
          .single();
        if (!customer) { setError("Customer profile not found."); return; }

        const { data: jobs } = await supabase
          .from("jobs")
          .select("id")
          .eq("customer_id", customer.id);
        if (!jobs || jobs.length === 0) { setError("No projects found."); return; }

        const jobIds = jobs.map((j) => j.id);

        // Fetch milestone
        const { data: ms, error: msErr } = await supabase
          .from("project_payment_milestones")
          .select("*")
          .eq("id", milestoneId)
          .in("job_id", jobIds)
          .single();

        if (msErr || !ms) { setError("Document not found or access denied."); return; }

        // Fetch job
        const { data: jb, error: jbErr } = await supabase
          .from("jobs")
          .select(`id, job_number, contract_signed_at, contract_amount,
                   service_address_line_1, city, state,
                   customers (full_name, phone),
                   salespersons (full_name)`)
          .eq("id", ms.job_id)
          .single();

        if (jbErr || !jb) { setError("Project data unavailable."); return; }

        setMilestone(ms as MilestoneRow);
        setJob(jb as unknown as JobRow);
      } catch (err) {
        console.error("[CustomerSignPage]", err);
        setError("Unexpected error loading document.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [milestoneId]);

  const buildFormData = useCallback((): ContractFormData | null => {
    if (!milestone || !job) return null;

    const contractDate = milestone.signed_at
      ? (() => { const _d = new Date(milestone.signed_at); return `${(_d.getMonth() + 1).toString().padStart(2, '0')}/${_d.getDate().toString().padStart(2, '0')}/${_d.getFullYear()}`; })()
      : (() => { const _d = new Date(); return `${(_d.getMonth() + 1).toString().padStart(2, '0')}/${_d.getDate().toString().padStart(2, '0')}/${_d.getFullYear()}`; })();

    return {
      id: milestone.id,
      documentType: milestone.document_type,
      status: milestone.status,
      title: milestone.title,
      sortOrder: milestone.sort_order,
      contractDate,
      homeownerName: job.customers.full_name,
      address: `${job.service_address_line_1}, ${job.city}, ${job.state}`,
      phone: job.customers.phone,
      salesRepName: job.salespersons?.full_name ?? "Siding Depot Team",
      lineItems: [{
        title: milestone.title,
        description: milestone.description ?? undefined,
        amount: milestone.amount,
      }],
      contractAmount: milestone.amount,
      existingInitials: milestone.marketing_authorization_initials ?? undefined,
      existingCustomerNotes: milestone.customer_notes ?? undefined,
      existingSignatureDataUrl: milestone.signature_data_url ?? undefined,
    };
  }, [milestone, job]);

  const handleSign = useCallback(
    async (payload: {
      milestoneId: string;
      initials?: string;
      customerNotes?: string;
      signatureDataUrl: string;
      paymentMethod: MilestonePaymentMethod;
      consentAcceptedAt: string;
      consentText: string;
      userAgent: string;
      geolocation?: { lat: number; lng: number; accuracy_meters?: number } | null;
    }): Promise<void> => {
      const res = await fetch("/api/documents/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to sign document");

      setSigned(true);
      setMilestone((prev) =>
        prev
          ? { ...prev, status: "signed", signed_at: result.signedAt, signature_data_url: payload.signatureDataUrl, payment_method: payload.paymentMethod }
          : prev
      );
    },
    []
  );

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="w-8 h-8 border-3 border-[var(--color-outline-variant)] border-t-surface-container-low rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ──
  if (error || !milestone || !job) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[40px]" translate="no">lock</span>
        </div>
        <h2 className="font-headline font-bold text-xl text-on-surface mb-2">Document Unavailable</h2>
        <p className="text-outline-variant mb-6">{error ?? "Please check the link or contact Siding Depot."}</p>
        <Link href="/customer/documents" className="text-sm font-bold text-on-surface hover:underline">
          ← Back to My Documents
        </Link>
      </div>
    );
  }

  const formData = buildFormData();
  if (!formData) return null;

  // ── Render ──
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/customer/documents" className="inline-flex items-center text-on-surface-variant hover:text-on-surface text-sm font-bold transition-colors">
          <span className="material-symbols-outlined text-[18px] mr-1" translate="no">arrow_back</span>
          Back to Documents
        </Link>
        <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">
          Doc {formData.sortOrder} · {job.job_number}
        </span>
      </div>

      {signed && (
        <div className="p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl text-center">
          <p className="text-[#15803d] font-bold text-sm flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[20px]" translate="no">check_circle</span>
            Document signed successfully! The Siding Depot team has been notified.
          </p>
        </div>
      )}

      <div className="bg-surface-container border border-[var(--color-outline-variant)] rounded-3xl overflow-hidden shadow-sm p-0">
        <DynamicContractForm
          key={String(signed)}
          data={formData}
          onSign={handleSign}
          readOnly={signed || formData.status === "signed" || formData.status === "paid"}
        />
      </div>

      <footer className="text-center text-xs text-on-surface-variant py-4">
        <p>© {new Date().getFullYear()} Siding Depot LLC · 2480 Sandy Plains Road, Marietta GA 30066</p>
        <p className="mt-1">
          <a href="tel:6784002004" className="hover:text-on-surface transition-colors">678-400-2004</a>
          {" · "}office@sidingdepot.com
        </p>
      </footer>
    </div>
  );
}
