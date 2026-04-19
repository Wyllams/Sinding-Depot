import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  generateSignedPDF,
  SignedDocumentPDFData,
} from "@/lib/pdf/signed-document";

/**
 * GET /api/documents/download?milestoneId=xxx
 *
 * Gera e retorna PDF do documento assinado com audit trail completo.
 * Acesso: Admin e Salesperson (verificado via session + profile role).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const milestoneId = req.nextUrl.searchParams.get("milestoneId");

    if (!milestoneId) {
      return NextResponse.json(
        { error: "Missing milestoneId parameter" },
        { status: 400 }
      );
    }

    // ─── Auth: verifica sessão ────────────────────────────────
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            /* read-only */
          },
        },
      }
    );

    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── Service client ──────────────────────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ─── Verifica role (admin ou salesperson) ────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (!profile || !["admin", "salesperson"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only Admin and Salesperson can download signed documents" },
        { status: 403 }
      );
    }

    // ─── Busca milestone com dados completos ─────────────────
    const { data: milestone, error: msErr } = await supabase
      .from("project_payment_milestones")
      .select(
        `id, title, document_type, status, amount, signed_at,
         signature_data_url, signature_metadata, payment_method,
         customer_notes, marketing_authorization_initials,
         job_id`
      )
      .eq("id", milestoneId)
      .single();

    if (msErr || !milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (milestone.status !== "signed" && milestone.status !== "paid") {
      return NextResponse.json(
        { error: "Document has not been signed yet" },
        { status: 400 }
      );
    }

    // ─── Busca dados do job + customer + vendedor ────────────
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select(
        `id, job_number, service_address_line_1, city, state,
         customers ( full_name, phone ),
         salespersons ( full_name )`
      )
      .eq("id", milestone.job_id)
      .single();

    if (jobErr || !job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // ─── Monta dados para o PDF ──────────────────────────────
    const meta = (milestone.signature_metadata || {}) as Record<string, any>;
    const customer = job.customers as unknown as { full_name: string; phone: string };
    const salesperson = job.salespersons as unknown as { full_name: string } | null;

    const pdfData: SignedDocumentPDFData = {
      title: milestone.title,
      documentType: milestone.document_type,
      customerName: customer.full_name,
      address: `${job.service_address_line_1}, ${job.city}, ${job.state}`,
      phone: customer.phone || "N/A",
      salesRepName: salesperson?.full_name || "Siding Depot Team",
      amount: milestone.amount || 0,
      signedAt: milestone.signed_at || meta.signed_at || new Date().toISOString(),
      signatureDataUrl: milestone.signature_data_url || meta.signature_data_url || "",
      paymentMethod: milestone.payment_method || meta.payment_method || "N/A",
      documentHash: meta.document_hash_sha256 || "N/A",
      consentText: meta.consent_text || "Electronic consent accepted",
      ipAddress: meta.ip_address || "N/A",
      userAgent: meta.user_agent || "N/A",
      geolocation: meta.geolocation || null,
    };

    // ─── Gera PDF ────────────────────────────────────────────
    const pdfBuffer = await generateSignedPDF(pdfData);

    // ─── Monta filename ──────────────────────────────────────
    const safeName = customer.full_name.replace(/[^a-zA-Z0-9]/g, "_");
    const safeTitle = milestone.title.replace(/[^a-zA-Z0-9\s—-]/g, "").replace(/\s+/g, "_");
    const filename = `${safeTitle}_${safeName}_${job.job_number}.pdf`;

    // ─── Retorna PDF ─────────────────────────────────────────
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[documents/download] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
