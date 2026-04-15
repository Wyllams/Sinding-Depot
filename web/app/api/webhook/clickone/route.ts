import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase admin client to bypass row level security for webhooks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; // in prod, replace with service_role key
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    console.log("📥 Received ClickOne Webhook:", payload);

    // 1. Extract values dynamically based on ClickOne's default payload or custom pairs
    const clientName = payload.full_name || payload.client_name || [payload.first_name, payload.last_name].filter(Boolean).join(" ") || "Unknown Client";
    const emailAddress = payload.email || null;
    const phoneNumber = payload.phone || null;
    
    // Check multiple possible address paths
    const rawAddress = payload.location?.fullAddress || payload.full_address || payload["Billing Address - Full Address"] || payload.address || "";
    
    // Parse Address
    let finalAddress = rawAddress || "Pendente";
    let city = "Unknown";
    let state = "GA"; // Enforced default to GA per Siding Depot's area
    let zip = "00000";

    if (rawAddress) {
      const parts = rawAddress.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        city = parts[parts.length - 2];
        const stateZip = parts[parts.length - 1].split(' ');
        if (stateZip.length >= 2) {
            state = stateZip[0] || "GA";
            zip = stateZip[1] || zip;
        } else if (stateZip.length === 1 && stateZip[0].length === 2) {
            state = stateZip[0];
        }
      } else {
        city = rawAddress; // generic fallback
      }
    }

    // Parse custom fields mapped directly from Lead form
    const salespersonName = payload["Nome do Responsavel"] || payload.salesperson || null;
    const serviceValue = payload["Preço final"] || payload.value || "0";
    const rawServices = payload["Serviço"] || payload["Tipo de Serviço"] || payload.service || "Siding";

    if (!clientName || clientName === "Unknown Client") {
      console.warn("ClickOne Webhook missing client name, proceeding with generic name");
    }

    // 1. Check or Create Customer
    let customerId = "";
    if (emailAddress) {
      const { data: extCustomer } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("email", emailAddress)
        .maybeSingle();

      if (extCustomer) {
        customerId = extCustomer.id;
      }
    }

    if (!customerId) {
      const { data: newCustomer, error: custErr } = await supabaseAdmin
        .from("customers")
        .insert({
          full_name: clientName,
          email: emailAddress || `unknown-${Date.now()}@clickone.com`,
          phone: phoneNumber || "Sem Telefone",
          address_line_1: finalAddress,
          city: city,
          state: state,
          postal_code: zip,
        })
        .select("id")
        .single();
      
      if (custErr) throw custErr;
      customerId = newCustomer.id;
    }

    // 2. Resolve Salesperson Mapping
    let spId = null;
    if (salespersonName) {
      const spFirstName = String(salespersonName).split(" ")[0];
      const { data: spMatch } = await supabaseAdmin
         .from("salespersons")
         .select("id")
         .ilike("full_name", `%${spFirstName}%`)
         .maybeSingle();
         
      spId = spMatch?.id || null;
    }

    // 3. Create the Job
    const jobNumber = `SD-${new Date().getFullYear()}-${Math.floor(Math.random()*9000)+1000}`;
    const numericValue = serviceValue ? parseFloat(String(serviceValue).replace(/[^0-9.]/g, '')) : 0;

    const { data: newJob, error: jobErr } = await supabaseAdmin
      .from("jobs")
      .insert({
        customer_id: customerId,
        salesperson_id: spId,
        job_number: jobNumber,
        title: `${rawServices} - ${clientName}`,
        status: "pending_scheduling", // Specific status mapped to the Calendar
        service_address_line_1: finalAddress,
        city: city,
        state: state,
        postal_code: zip,
        contract_amount: numericValue || 0,
        description: `Webhook Source: ClickOne\nAssigned Salesperson: ${salespersonName || 'Unassigned'}\nInitial Service: ${rawServices}`
      })
      .select("id")
      .single();

    if (jobErr) throw jobErr;

    // 4. Register Services in job_services table for dashboard visibility
    const svcNames = rawServices.split(",").map((s: string) => s.trim()).filter(Boolean);
    for (const svcName of svcNames) {
      const { data: svcMatch } = await supabaseAdmin
         .from("service_types")
         .select("id")
         .ilike("name", `%${svcName}%`)
         .maybeSingle();

      if (svcMatch) {
         await supabaseAdmin.from("job_services").insert({
            job_id: newJob.id,
            service_type_id: svcMatch.id,
            scope_of_work: 'To be determined from initial inspection'
         });
      }
    }

    // 5. Update Sales Snapshot for real-time Reports dashboard
    if (spId && numericValue > 0) {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

      // Check if snapshot exists for this salesperson + month
      const { data: existingSnap } = await supabaseAdmin
        .from("sales_snapshots")
        .select("id, jobs_sold_count, total_revenue")
        .eq("salesperson_id", spId)
        .eq("snapshot_date", monthStart)
        .maybeSingle();

      if (existingSnap) {
        // Update existing snapshot: increment job count + add revenue
        await supabaseAdmin
          .from("sales_snapshots")
          .update({
            jobs_sold_count: existingSnap.jobs_sold_count + 1,
            total_revenue: Number(existingSnap.total_revenue) + numericValue,
            booked_revenue: Number(existingSnap.total_revenue) + numericValue,
          })
          .eq("id", existingSnap.id);

        console.log(`📊 Updated snapshot for salesperson ${spId}: +$${numericValue}`);
      } else {
        // Create new snapshot for this month
        await supabaseAdmin
          .from("sales_snapshots")
          .insert({
            salesperson_id: spId,
            snapshot_date: monthStart,
            jobs_sold_count: 1,
            booked_revenue: numericValue,
            total_revenue: numericValue,
            approved_change_order_revenue: 0,
          });

        console.log(`📊 Created new snapshot for salesperson ${spId}: $${numericValue}`);
      }
    }

    // 6. Set contract_signed_at so period-based queries (Quarter/Year) pick up this job
    await supabaseAdmin
      .from("jobs")
      .update({ contract_signed_at: new Date().toISOString() })
      .eq("id", newJob.id);

    console.log("✅ ClickOne job successfully registered:", jobNumber);
    return NextResponse.json({ success: true, job_id: newJob.id, message: "Job created in Siding Depot" });

  } catch (err: any) {
    console.error("❌ ClickOne Webhook Error:", err.message);
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 });
  }
}
