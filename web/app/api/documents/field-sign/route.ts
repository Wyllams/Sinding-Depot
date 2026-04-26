import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { sendPushToAdmins } from "@/lib/send-push";

// ── Server-side Supabase client (service role for bypassing RLS) ──
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FieldSignPayload {
  jobId: string;
  serviceId: string;
  serviceName: string;
  signatureDataUrl: string;
  customerNotes?: string;
  consentAcceptedAt: string;
  consentText: string;
  userAgent: string;
  signerName: string;
  geolocation?: { lat: number; lng: number; accuracy_meters?: number } | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Extract IP ──
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // ── 2. Parse body ──
    const body: FieldSignPayload = await req.json();

    if (!body.jobId || !body.serviceId || !body.signatureDataUrl || !body.consentAcceptedAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ── 3. Verify the job_service exists ──
    const { data: jobService, error: jsErr } = await supabaseAdmin
      .from("job_services")
      .select("id, job_id, service_type:service_types(name)")
      .eq("id", body.serviceId)
      .eq("job_id", body.jobId)
      .single();

    if (jsErr || !jobService) {
      return NextResponse.json(
        { error: "Service not found for this job" },
        { status: 404 }
      );
    }

    // ── 4. Check if COC already exists for this service ──
    const { data: existing } = await supabaseAdmin
      .from("project_payment_milestones")
      .select("id, status")
      .eq("job_id", body.jobId)
      .eq("job_service_id", body.serviceId)
      .eq("document_type", "completion_certificate")
      .maybeSingle();

    if (existing) {
      if (existing.status === "signed" || existing.status === "paid") {
        return NextResponse.json(
          { error: "Certificate of Completion already signed for this service" },
          { status: 409 }
        );
      }
      // If draft/pending, update it instead of inserting
      const now = new Date().toISOString();
      const documentHash = createHash("sha256")
        .update(JSON.stringify({ id: existing.id, job_id: body.jobId, service_id: body.serviceId }))
        .digest("hex");

      const signatureMetadata = {
        signer_name: body.signerName,
        ip_address: ip,
        user_agent: body.userAgent || "unknown",
        geolocation: body.geolocation || null,
        signed_at: now,
        consent_text: body.consentText,
        consent_accepted_at: body.consentAcceptedAt,
        document_hash_sha256: documentHash,
        signature_data_url: body.signatureDataUrl,
        method: "canvas_touch_draw_field",
      };

      const { error: updateErr } = await supabaseAdmin
        .from("project_payment_milestones")
        .update({
          status: "signed",
          signed_at: now,
          signature_data_url: body.signatureDataUrl,
          signature_metadata: signatureMetadata,
          customer_notes: body.customerNotes || null,
        })
        .eq("id", existing.id);

      if (updateErr) {
        console.error("[field-sign] Update error:", updateErr);
        return NextResponse.json({ error: "Failed to save signature" }, { status: 500 });
      }

      return NextResponse.json({ success: true, signedAt: now, documentHash });
    }

    // ── 5. Generate hash and metadata ──
    const now = new Date().toISOString();
    const svcName = (jobService as any).service_type?.name || body.serviceName;

    const documentContent = JSON.stringify({
      job_id: body.jobId,
      service_id: body.serviceId,
      service_name: svcName,
      type: "completion_certificate",
    });
    const documentHash = createHash("sha256").update(documentContent).digest("hex");

    const signatureMetadata = {
      signer_name: body.signerName,
      ip_address: ip,
      user_agent: body.userAgent || "unknown",
      geolocation: body.geolocation || null,
      signed_at: now,
      consent_text: body.consentText,
      consent_accepted_at: body.consentAcceptedAt,
      document_hash_sha256: documentHash,
      signature_data_url: body.signatureDataUrl,
      method: "canvas_touch_draw_field",
    };

    // ── 6. Determine sort_order ──
    const { data: existingMilestones } = await supabaseAdmin
      .from("project_payment_milestones")
      .select("sort_order")
      .eq("job_id", body.jobId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSort = (existingMilestones?.[0]?.sort_order ?? 0) + 1;

    // ── 7. INSERT with service role (bypasses RLS) ──
    const { error: insertErr } = await supabaseAdmin
      .from("project_payment_milestones")
      .insert({
        job_id: body.jobId,
        job_service_id: body.serviceId,
        title: `Certificate of Completion — ${svcName}`,
        document_type: "completion_certificate",
        status: "signed",
        amount: 0,
        sort_order: nextSort,
        signed_at: now,
        signature_data_url: body.signatureDataUrl,
        signature_metadata: signatureMetadata,
        customer_notes: body.customerNotes || null,
      });

    if (insertErr) {
      console.error("[field-sign] Insert error:", insertErr);
      return NextResponse.json({ error: "Failed to save certificate" }, { status: 500 });
    }

    // ── 8. Notify admins ──
    try {
      const { data: jobData } = await supabaseAdmin
        .from("jobs")
        .select("customers(full_name)")
        .eq("id", body.jobId)
        .single();

      const customerName = (jobData as any)?.customers?.full_name ?? "A customer";

      const { data: admins } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          title: "COC Signed (Field)",
          body: `${customerName} signed COC for ${svcName}`,
          notification_type: "document_signed",
          read: false,
          related_entity_id: body.jobId,
        }));
        await supabaseAdmin.from("notifications").insert(notifications);
      }

      await sendPushToAdmins({
        title: "✍️ COC Signed (Field)",
        body: `${customerName} signed COC for ${svcName}`,
        url: `/projects/${body.jobId}`,
        tag: "document-signed",
        notificationType: "document_signed",
        relatedEntityId: body.jobId,
      });
    } catch (notifErr) {
      console.error("[field-sign] Notification error (non-blocking):", notifErr);
    }

    return NextResponse.json({ success: true, signedAt: now, documentHash });
  } catch (err) {
    console.error("[field-sign] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
