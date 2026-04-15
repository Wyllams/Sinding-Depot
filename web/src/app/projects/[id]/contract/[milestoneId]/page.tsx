"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import DynamicContractForm, {
  ContractFormData,
  MilestonePaymentMethod,
} from "../../../../../components/DynamicContractForm";

// ─── Supabase client (public/anon) ────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types from DB ────────────────────────────────────────────

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
  customers: {
    full_name: string;
    phone: string;
  };
  salespersons: {
    full_name: string;
  } | null;
}

// ─── Page ─────────────────────────────────────────────────────

export default function ContractPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;
  const milestoneId = params?.milestoneId as string;

  const [milestone, setMilestone] = useState<MilestoneRow | null>(null);
  const [job, setJob] = useState<JobRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  // ── Fetch data ───────────────────────────────────────────────
  useEffect(() => {
    if (!jobId || !milestoneId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      const [{ data: ms, error: msErr }, { data: jb, error: jbErr }] =
        await Promise.all([
          supabase
            .from("project_payment_milestones")
            .select("*")
            .eq("id", milestoneId)
            .eq("job_id", jobId)
            .single(),
          supabase
            .from("jobs")
            .select(
              `id, job_number, contract_signed_at, contract_amount,
               service_address_line_1, city, state,
               customers (full_name, phone),
               salespersons (full_name)`
            )
            .eq("id", jobId)
            .single(),
        ]);

      if (msErr || jbErr) {
        setError("Documento não encontrado ou sem permissão de acesso.");
      } else {
        setMilestone(ms as MilestoneRow);
        setJob(jb as unknown as JobRow);
      }
      setLoading(false);
    }

    fetchData();
  }, [jobId, milestoneId]);

  // ── Build form data ──────────────────────────────────────────
  const buildFormData = useCallback((): ContractFormData | null => {
    if (!milestone || !job) return null;

    const contractDate = milestone.signed_at
      ? new Date(milestone.signed_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

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
      lineItems: [
        {
          title: milestone.title,
          description: milestone.description ?? undefined,
          amount: milestone.amount,
        },
      ],
      contractAmount: milestone.amount,
      existingInitials: milestone.marketing_authorization_initials ?? undefined,
      existingCustomerNotes: milestone.customer_notes ?? undefined,
      existingSignatureDataUrl: milestone.signature_data_url ?? undefined,
    };
  }, [milestone, job]);

  // ── Handle sign ──────────────────────────────────────────────
  const handleSign = useCallback(
    async (payload: {
      milestoneId: string;
      initials?: string;
      customerNotes?: string;
      signatureDataUrl: string;
      paymentMethod: MilestonePaymentMethod;
    }) => {
      const now = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from("project_payment_milestones")
        .update({
          status: "signed",
          signed_at: now,
          signature_data_url: payload.signatureDataUrl,
          payment_method: payload.paymentMethod,
          ...(payload.initials
            ? { marketing_authorization_initials: payload.initials }
            : {}),
          ...(payload.customerNotes !== undefined
            ? { customer_notes: payload.customerNotes }
            : {}),
        })
        .eq("id", payload.milestoneId);

      if (updateErr) throw new Error(updateErr.message);

      setSigned(true);
      setMilestone((prev) =>
        prev
          ? {
              ...prev,
              status: "signed",
              signed_at: now,
              signature_data_url: payload.signatureDataUrl,
              payment_method: payload.paymentMethod,
            }
          : prev
      );
    },
    []
  );

  // ── Render states ────────────────────────────────────────────

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={spinnerWrapStyle}>
          <div style={spinnerStyle} />
          <p style={loadingTextStyle}>Carregando documento...</p>
        </div>
      </div>
    );
  }

  if (error || !milestone || !job) {
    return (
      <div style={pageStyle}>
        <div style={errorCardStyle}>
          <span style={{ fontSize: "2.5rem" }}>🔒</span>
          <h1 style={errorTitleStyle}>Documento não encontrado</h1>
          <p style={errorDescStyle}>
            {error ?? "Verifique o link ou entre em contato com a Siding Depot."}
          </p>
          <a href="tel:6784002004" style={phoneLink}>
            📞 678-400-2004
          </a>
        </div>
      </div>
    );
  }

  const formData = buildFormData();
  if (!formData) return null;

  return (
    <div style={pageStyle}>
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header style={headerStyle}>
        <img
          src="/logo-new.png"
          alt="Siding Depot"
          style={{ height: 36, objectFit: "contain" }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div style={headerJobStyle}>
          <span style={headerJobLabel}>Job #{job.job_number}</span>
          <span style={headerStepStyle}>
            Documento {formData.sortOrder} —{" "}
            {formData.documentType === "job_start"
              ? "Job Start Certificate"
              : "Certificate of Completion"}
          </span>
        </div>
      </header>

      {/* ── Success banner (after sign) ──────────────────────── */}
      {signed && (
        <div style={successBannerStyle}>
          ✅ Assinatura registrada com sucesso! A equipe Siding Depot foi
          notificada.
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────── */}
      <main style={mainStyle}>
        <DynamicContractForm
          data={formData}
          onSign={handleSign}
          readOnly={signed}
        />
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={footerStyle}>
        <p>© {new Date().getFullYear()} Siding Depot LLC · 2480 Sandy Plains Road, Marietta GA 30066</p>
        <p>
          <a href="tel:6784002004" style={{ color: "#475569" }}>
            678-400-2004
          </a>{" "}
          · office@sidingdepot.com
        </p>
      </footer>
    </div>
  );
}

// ─── Inline styles (sem depender de Tailwind) ─────────────────

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  backgroundColor: "#080b10",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const headerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 24px",
  gap: 16,
};

const headerJobStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 2,
};

const headerJobLabel: React.CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
  color: "#aeee2a",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const headerStepStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "#475569",
};

const mainStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  padding: "0 16px 48px",
  boxSizing: "border-box",
};

const footerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  padding: "24px 24px 40px",
  textAlign: "center",
  fontSize: "0.72rem",
  color: "#334155",
  lineHeight: 1.8,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const spinnerWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 20,
  marginTop: 120,
};

const spinnerStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: "3px solid #1e2130",
  borderTop: "3px solid #6366f1",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const loadingTextStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: "0.85rem",
};

const errorCardStyle: React.CSSProperties = {
  marginTop: 100,
  maxWidth: 400,
  width: "100%",
  padding: "40px 32px",
  background: "#0f1117",
  border: "1px solid #1e2130",
  borderRadius: 16,
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
};

const errorTitleStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "#f1f5f9",
  margin: 0,
};

const errorDescStyle: React.CSSProperties = {
  fontSize: "0.82rem",
  color: "#64748b",
  lineHeight: 1.6,
};

const phoneLink: React.CSSProperties = {
  marginTop: 8,
  padding: "10px 24px",
  background: "#aeee2a",
  color: "#0f1117",
  fontWeight: 700,
  fontSize: "0.85rem",
  borderRadius: "100px",
  textDecoration: "none",
};

const successBannerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 720,
  margin: "0 16px 16px",
  padding: "14px 20px",
  background: "rgba(174, 238, 42, 0.08)",
  border: "1px solid rgba(174, 238, 42, 0.25)",
  borderRadius: 12,
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#aeee2a",
  textAlign: "center",
  boxSizing: "border-box",
};
