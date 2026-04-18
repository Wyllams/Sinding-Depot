import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// NOTE: Client is created inside the handler (not at module level)
// so that env vars are available at request-time, not build-time.

/**
 * Gera um username a partir do full_name.
 * Padrão: FirstName_LastName (sem acentos, underscores para espaços)
 * Ex: "Nick Magalhães" -> "Nick_Magalhaes"
 */
function generateUsername(fullName: string): string {
  // Remove acentos e caracteres especiais
  const normalized = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^a-zA-Z\s]/g, '')     // remove não-alfanuméricos
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return `Customer_${Date.now()}`;

  // Pega primeiro nome e último sobrenome
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

  if (!lastName) return firstName;
  return `${firstName}_${lastName}`;
}

/**
 * Gera a senha padrão a partir do nome.
 * Padrão: PrimeiroNome + Inicial do Sobrenome + * + Ano
 * Ex: "Nick Magalhães" -> "NickM*2026"
 */
function generatePassword(fullName: string): string {
  const normalized = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'User';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : 'X';
  const year = new Date().getFullYear();

  return `${firstName}${lastInitial}*${year}`;
}

export async function POST(req: Request) {
  // Initialize Supabase client inside the handler to avoid build-time errors
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server configuration error: missing Supabase credentials.' }, { status: 500 });
  }

  // Use service role key for admin operations (creating auth users).
  // Falls back to anon key if service key is not set (won't be able to create auth users).
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

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

    // ────────────────────────────────────────────────────
    // CUSTOMER PORTAL ACCESS — Auto-create login credentials
    // ────────────────────────────────────────────────────
    let customerUsername: string | null = null;
    let customerPassword: string | null = null;

    if (supabaseServiceKey && clientName && clientName !== "Unknown Client") {
      try {
        // Generate base username
        let baseUsername = generateUsername(clientName);
        let finalUsername = baseUsername;

        // Check for duplicate usernames and add suffix if needed
        const { data: existingUsernames } = await supabaseAdmin
          .from("customers")
          .select("username")
          .like("username", `${baseUsername}%`);

        if (existingUsernames && existingUsernames.length > 0) {
          const existingSet = new Set(existingUsernames.map(u => u.username));
          if (existingSet.has(baseUsername)) {
            let suffix = 2;
            while (existingSet.has(`${baseUsername}_${suffix}`)) {
              suffix++;
            }
            finalUsername = `${baseUsername}_${suffix}`;
          }
        }

        customerUsername = finalUsername;
        customerPassword = generatePassword(clientName);
        const portalEmail = `${finalUsername.toLowerCase()}@customer.sidingdepot.app`;

        // Create auth user with auto-confirm (no email verification needed for customers)
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: portalEmail,
          password: customerPassword,
          email_confirm: true, // Auto-confirm, no verification email
          user_metadata: {
            full_name: clientName,
            role: 'customer',
            username: finalUsername,
          },
        });

        if (authErr) {
          console.error("⚠️ Failed to create auth user for customer portal:", authErr.message);
          // Don't throw — job creation should continue even if portal creation fails
        } else if (authUser?.user) {
          // Create profile for the customer
          await supabaseAdmin.from("profiles").insert({
            id: authUser.user.id,
            email: portalEmail,
            full_name: clientName,
            role: 'customer',
            phone: phoneNumber,
          });

          // Update customer record with portal credentials
          await supabaseAdmin
            .from("customers")
            .update({
              profile_id: authUser.user.id,
              username: finalUsername,
              portal_email: portalEmail,
            })
            .eq("id", customerId);

          console.log(`🔑 Customer portal created: ${finalUsername} / ${portalEmail}`);

          // Send welcome email with credentials via Edge Function
          const resendApiKey = process.env.RESEND_API_KEY;
          if (resendApiKey && emailAddress) {
            try {
              await sendCustomerWelcomeEmail({
                apiKey: resendApiKey,
                toEmail: emailAddress,
                customerName: clientName,
                username: finalUsername,
                password: customerPassword,
                siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://siding-depot.vercel.app',
              });
              console.log(`📧 Welcome email sent to ${emailAddress}`);
            } catch (emailErr: unknown) {
              const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
              console.error(`⚠️ Failed to send welcome email: ${msg}`);
              // Don't throw — email failure shouldn't block job creation
            }
          } else {
            console.warn("⚠️ Skipping welcome email: RESEND_API_KEY or customer email not available.");
          }
        }
      } catch (portalErr: unknown) {
        const msg = portalErr instanceof Error ? portalErr.message : String(portalErr);
        console.error("⚠️ Customer portal creation error (non-blocking):", msg);
      }
    } else if (!supabaseServiceKey) {
      console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY not set — skipping customer portal creation.");
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

    // 4b. Automação 3.5 — Criar window_order se serviço for Windows ou Doors
    const hasWindowService = svcNames.some((s: string) =>
      s.toLowerCase().includes("window") || s.toLowerCase().includes("door")
    );
    if (hasWindowService) {
      await supabaseAdmin.from("window_orders").insert({
        job_id: newJob.id,
        customer_name: clientName,
        status: "Measurement",
        money_collected: "NO",
        quantity: null,
        quote: null,
        deposit: null,
        ordered_on: null,
        expected_delivery: null,
        supplier: "",
        order_number: null,
        notes: null,
      });
      console.log(`🪟 Auto-created window_order for job ${jobNumber}`);
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

    return NextResponse.json({
      success: true,
      job_id: newJob.id,
      message: "Job created in Siding Depot",
      portal: customerUsername
        ? { username: customerUsername, portal_email: `${customerUsername.toLowerCase()}@customer.sidingdepot.app` }
        : null,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ ClickOne Webhook Error:", msg);
    return NextResponse.json({ error: msg || "Internal Error" }, { status: 500 });
  }
}

// ─── Email Helper ────────────────────────────────────────────
interface WelcomeEmailParams {
  apiKey: string;
  toEmail: string;
  customerName: string;
  username: string;
  password: string;
  siteUrl: string;
}

async function sendCustomerWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const { apiKey, toEmail, customerName, username, password, siteUrl } = params;
  const loginUrl = `${siteUrl}/login?role=customer`;

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:#121412;padding:32px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:900;color:#aeee2a;letter-spacing:-0.5px;">SIDING DEPOT</div>
            <div style="font-size:11px;font-weight:700;color:#ababa8;text-transform:uppercase;letter-spacing:3px;margin-top:6px;">Customer Portal Access</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h1 style="font-size:22px;font-weight:800;color:#121412;margin:0 0 8px;">Welcome, ${customerName}!</h1>
            <p style="font-size:14px;color:#474846;line-height:1.6;margin:0 0 28px;">
              Your project with Siding Depot has been set up successfully. Below are your credentials to access the <strong>Customer Portal</strong>, where you can track progress, review documents, and approve changes.
            </p>

            <!-- Credentials Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fae1;border:2px solid #aeee2a;border-radius:12px;margin-bottom:28px;">
              <tr>
                <td style="padding:24px 28px;">
                  <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#5c8a00;margin-bottom:16px;">Your Login Credentials</div>
                  
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;width:100px;">
                        <span style="font-size:11px;font-weight:700;color:#474846;text-transform:uppercase;letter-spacing:1px;">Username</span>
                      </td>
                      <td style="padding:8px 0;">
                        <span style="font-size:16px;font-weight:900;color:#121412;font-family:monospace;background:#fff;padding:4px 12px;border-radius:6px;border:1px solid #e5e5e3;">${username}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;width:100px;">
                        <span style="font-size:11px;font-weight:700;color:#474846;text-transform:uppercase;letter-spacing:1px;">Password</span>
                      </td>
                      <td style="padding:8px 0;">
                        <span style="font-size:16px;font-weight:900;color:#121412;font-family:monospace;background:#fff;padding:4px 12px;border-radius:6px;border:1px solid #e5e5e3;">${password}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${loginUrl}" style="display:inline-block;background:#121412;color:#aeee2a;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:2px;padding:16px 40px;border-radius:12px;text-decoration:none;">
                    Access Your Portal →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:12px;color:#a1a19d;line-height:1.5;margin:0;border-top:1px solid #e5e5e3;padding-top:20px;">
              For security, we recommend changing your password after your first login. If you have any questions about your project, please don't hesitate to contact us.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#faf9f5;padding:20px 40px;text-align:center;border-top:1px solid #e5e5e3;">
            <p style="font-size:10px;color:#a1a19d;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0;">
              © ${new Date().getFullYear()} Siding Depot. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Siding Depot <portal@sidingdepot.app>',
      to: [toEmail],
      subject: `Your Siding Depot Customer Portal Access — ${username}`,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }
}
