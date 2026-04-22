import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { generateSignedPDF, type SignedDocumentPDFData } from "@/lib/pdf/signed-document";
import { sendSignedDocumentEmail } from "@/lib/email/send-signed-document";
import { sendPushToAdmins } from "@/lib/send-push";

// ── Server-side Supabase client (service role for bypassing RLS) ──
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SignPayload {
  milestoneId: string;
  signatureDataUrl: string;
  paymentMethod: "check" | "financing" | "credit_card";
  initials?: string;
  customerNotes?: string;
  consentAcceptedAt: string;
  consentText: string;
  userAgent: string;
  geolocation?: { lat: number; lng: number; accuracy_meters?: number } | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Extract IP address (server-side only) ──
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // ── 2. Parse body ──
    const body: SignPayload = await req.json();

    if (!body.milestoneId || !body.signatureDataUrl || !body.consentAcceptedAt) {
      return NextResponse.json(
        { error: "Missing required fields: milestoneId, signatureDataUrl, consentAcceptedAt" },
        { status: 400 }
      );
    }

    // ── 3. Fetch existing milestone to validate ──
    const { data: milestone, error: msErr } = await supabaseAdmin
      .from("project_payment_milestones")
      .select("id, status, job_id, title, amount, document_type")
      .eq("id", body.milestoneId)
      .single();

    if (msErr || !milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    if (milestone.status === "signed" || milestone.status === "paid") {
      return NextResponse.json(
        { error: "Document has already been signed" },
        { status: 409 }
      );
    }

    // ── 4. Generate document content hash (SHA-256) ──
    const documentContent = JSON.stringify({
      id: milestone.id,
      job_id: milestone.job_id,
      title: milestone.title,
      amount: milestone.amount,
      document_type: milestone.document_type,
    });
    const documentHash = createHash("sha256")
      .update(documentContent)
      .digest("hex");

    // ── 5. Build signature_metadata (ESIGN Act + Georgia UETA audit trail) ──
    const now = new Date().toISOString();

    const signatureMetadata = {
      ip_address: ip,
      user_agent: body.userAgent || "unknown",
      geolocation: body.geolocation || null,
      signed_at: now,
      consent_text: body.consentText,
      consent_accepted_at: body.consentAcceptedAt,
      document_hash_sha256: documentHash,
      signature_data_url: body.signatureDataUrl,
      payment_method: body.paymentMethod,
      method: "canvas_touch_draw",
    };

    // ── 6. Update milestone in DB ──
    const { error: updateErr } = await supabaseAdmin
      .from("project_payment_milestones")
      .update({
        status: "signed",
        signed_at: now,
        signature_data_url: body.signatureDataUrl,
        payment_method: body.paymentMethod,
        signature_metadata: signatureMetadata,
        ...(body.initials
          ? { marketing_authorization_initials: body.initials }
          : {}),
        ...(body.customerNotes !== undefined
          ? { customer_notes: body.customerNotes }
          : {}),
      })
      .eq("id", body.milestoneId);

    if (updateErr) {
      console.error("[sign] DB update error:", updateErr);
      return NextResponse.json(
        { error: "Failed to save signature" },
        { status: 500 }
      );
    }

    // ── 7. Notify admin users about the signature ──
    try {
      // Get customer name via milestone → job → customer
      const { data: jobData } = await supabaseAdmin
        .from("jobs")
        .select("customers (full_name)")
        .eq("id", milestone.job_id)
        .single();

      const customerName =
        (jobData as any)?.customers?.full_name ?? "A customer";

      // Get admin user IDs
      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          title: "Document Signed",
          body: `${customerName} signed "${milestone.title}" — $${milestone.amount?.toLocaleString("en-US", { maximumFractionDigits: 0 }) ?? "0"}`,
          notification_type: "document_signed",
          read: false,
          related_entity_id: milestone.id,
        }));

        await supabaseAdmin.from("notifications").insert(notifications);
      }
    } catch (notifErr) {
      // Notification failure should NOT block the signing response
      console.error("[sign] Notification error (non-blocking):", notifErr);
    }

    // ── 7b. Push notification to admins ──
    try {
      const { data: jobForPush } = await supabaseAdmin
        .from("jobs")
        .select("customers (full_name)")
        .eq("id", milestone.job_id)
        .single();
      const pushName = (jobForPush as any)?.customers?.full_name ?? "A customer";

      await sendPushToAdmins({
        title: '✍️ Document Signed',
        body: `${pushName} signed "${milestone.title}"`,
        url: `/projects/${milestone.job_id}`,
        tag: 'document-signed',
        notificationType: 'document_signed',
        relatedEntityId: milestone.id,
      });
    } catch (pushErr) {
      console.error('[sign] Push notification failed (non-blocking):', pushErr);
    }

    // ┌──────────────────────────────────────────────────────┐
    // │  🚫 PAUSED — Signed document email to customer      │
    // │  To reactivate: set CUSTOMER_DOCUMENT_EMAIL_PAUSED   │
    // │  to false below.                                     │
    // └──────────────────────────────────────────────────────┘
    const CUSTOMER_DOCUMENT_EMAIL_PAUSED = true; // ← flip to false to re-enable

    if (!CUSTOMER_DOCUMENT_EMAIL_PAUSED) {
    // ── 8. Generate PDF and send email to customer ──
    try {
      // Fetch full job+customer data for the PDF
      const { data: fullJob } = await supabaseAdmin
        .from("jobs")
        .select(`
          customers (full_name, email, phone),
          salespersons (full_name),
          service_address_line_1, city, state
        `)
        .eq("id", milestone.job_id)
        .single();

      const fj = fullJob as any;
      const customerEmail = fj?.customers?.email;
      const customerNamePdf = fj?.customers?.full_name ?? "Customer";

      if (customerEmail) {
        const pdfData: SignedDocumentPDFData = {
          title: milestone.title,
          documentType: milestone.document_type as "job_start" | "completion_certificate",
          customerName: customerNamePdf,
          address: [fj?.service_address_line_1, fj?.city, fj?.state].filter(Boolean).join(", "),
          phone: fj?.customers?.phone ?? "",
          salesRepName: fj?.salespersons?.full_name ?? "Siding Depot Team",
          amount: milestone.amount ?? 0,
          signedAt: now,
          signatureDataUrl: body.signatureDataUrl,
          paymentMethod: body.paymentMethod,
          documentHash,
          consentText: body.consentText,
          ipAddress: ip,
          userAgent: body.userAgent || "unknown",
          geolocation: body.geolocation ?? null,
        };

        const pdfBuffer = await generateSignedPDF(pdfData);
        const safeTitle = milestone.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_");
        const pdfFilename = `Siding_Depot_${safeTitle}_Signed.pdf`;

        const emailResult = await sendSignedDocumentEmail({
          to: customerEmail,
          customerName: customerNamePdf,
          documentTitle: milestone.title,
          pdfBuffer,
          pdfFilename,
        });

        if (!emailResult.success) {
          console.warn("[sign] Email not sent:", emailResult.error);
        } else {
          console.log(`[sign] PDF emailed to ${customerEmail} (${pdfFilename})`);
        }
      } else {
        console.warn("[sign] No customer email found — PDF not sent");
      }
    } catch (pdfErr) {
      // PDF/email failure should NOT block the signing response
      console.error("[sign] PDF/Email error (non-blocking):", pdfErr);
    }
    } else {
      console.log(`[sign] ⏸️ Customer document email PAUSED — signature saved but email not sent.`);
    }

    return NextResponse.json({
      success: true,
      signedAt: now,
      documentHash,
    });
  } catch (err) {
    console.error("[sign] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
