import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// =============================================
// POST /api/services/complete
// =============================================
// Marca um serviço como concluído e automaticamente 
// gera o documento "Certificate of Completion (COC)".
// =============================================

export async function POST(req: Request) {
  try {
    const { job_service_id, template_type } = await req.json();

    if (!job_service_id || !template_type) {
      return NextResponse.json(
        { error: "Validation failed: 'job_service_id' and 'template_type' are required." },
        { status: 400 }
      );
    }

    // Bypass RLS for backend operation using Server Role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // CRITICAL: This bypasses RLS securely
    );

    // 1. Marcar o serviço como status = 'completed'
    const { error: updateSrvErr } = await supabaseAdmin
      .from("job_services")
      .update({ status: "completed" })
      .eq("id", job_service_id);

    if (updateSrvErr) throw updateSrvErr;

    // 2. Fetch Job & Customer details to populate the Certificate
    const { data: serviceData, error: srvErr } = await supabaseAdmin
      .from("job_services")
      .select(`
        job_id,
        jobs (
          service_address_line_1,
          city,
          state,
          customer_id,
          salesperson_id
        )
      `)
      .eq("id", job_service_id)
      .single();

    if (srvErr || !serviceData) throw new Error("Could not find job details");

    const job = serviceData.jobs as any;

    // Fetch Customer
    const { data: customerData } = await supabaseAdmin
      .from("customers")
      .select("full_name")
      .eq("id", job.customer_id)
      .single();

    // Fetch Salesperson
    const { data: spData } = await supabaseAdmin
      .from("salespersons")
      .select("full_name")
      .eq("id", job.salesperson_id)
      .single();

    // 3. Fetch the requested template
    const { data: templateData, error: tplErr } = await supabaseAdmin
      .from("document_templates")
      .select("title, body_template")
      .eq("type", template_type)
      .single();

    if (tplErr || !templateData) throw new Error(`Template not found: ${template_type}`);

    // 4. Parse the template
    let parsedBody = templateData.body_template;
    parsedBody = parsedBody.replace(/{{customer_name}}/g, customerData?.full_name || "Valued Customer");
    parsedBody = parsedBody.replace(
      /{{address}}/g,
      `${job.service_address_line_1}, ${job.city}, ${job.state}`
    );
    parsedBody = parsedBody.replace(/{{salesperson_name}}/g, spData?.full_name || "Siding Depot Agent");
    
    const _now = new Date();
    const today = `${(_now.getMonth() + 1).toString().padStart(2, '0')}/${_now.getDate().toString().padStart(2, '0')}/${_now.getFullYear()}`;
    parsedBody = parsedBody.replace(/{{date_today}}/g, today);

    // 5. Create the Document in the Database
    const { data: docData, error: docErr } = await supabaseAdmin
      .from("documents")
      .insert({
        job_id: serviceData.job_id,
        job_service_id: job_service_id,
        document_type: "completion_certificate",
        status: "draft",
        title: templateData.title,
        visible_to_customer: true,
        metadata: {
          body: parsedBody,
          signature: null,
          signed_at: null,
          signed_by_ip: null,
        },
      })
      .select("id")
      .single();

    if (docErr) throw docErr;

    // TODO: Send Email to the customer with Deep link -> /projects/[jobId]/coc/[docId]
    console.log(`Email notification logic goes here -> Link: /projects/${serviceData.job_id}/coc/${docData.id}`);

    return NextResponse.json({
      success: true,
      message: "Certificate generated successfully.",
      document_id: docData.id,
      job_id: serviceData.job_id,
    });

  } catch (error: any) {
    console.error("COC Generation API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
