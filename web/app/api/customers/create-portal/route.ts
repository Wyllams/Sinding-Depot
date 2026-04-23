import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── Server-side Supabase (service role — needed for auth.admin) ──
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Username generator ──────────────────────────────────────
function generateUsername(fullName: string): string {
  const normalized = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return `Customer_${Date.now()}`;

  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  return lastName ? `${firstName}_${lastName}` : firstName;
}

// ── Password generator ──────────────────────────────────────
function generatePassword(fullName: string): string {
  const normalized = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "User";
  const lastInitial =
    parts.length > 1 ? parts[parts.length - 1][0].toUpperCase() : "X";
  const year = new Date().getFullYear();
  return `${firstName}${lastInitial}*${year}`;
}

// ── Payload ─────────────────────────────────────────────────
interface CreatePortalPayload {
  customerId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: CreatePortalPayload = await req.json();

    if (!body.customerId || !body.fullName) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, fullName" },
        { status: 400 }
      );
    }

    // ── 1. Check if customer already has portal access ──
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select("profile_id, username")
      .eq("id", body.customerId)
      .single();

    if (existingCustomer?.profile_id) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        username: existingCustomer.username,
        message: "Customer already has portal access",
      });
    }

    // ── 2. Generate unique username ──
    const baseUsername = generateUsername(body.fullName);
    let finalUsername = baseUsername;

    const { data: existingUsernames } = await supabaseAdmin
      .from("customers")
      .select("username")
      .like("username", `${baseUsername}%`);

    if (existingUsernames && existingUsernames.length > 0) {
      const existingSet = new Set(existingUsernames.map((u) => u.username));
      if (existingSet.has(baseUsername)) {
        let suffix = 2;
        while (existingSet.has(`${baseUsername}_${suffix}`)) {
          suffix++;
        }
        finalUsername = `${baseUsername}_${suffix}`;
      }
    }

    // ── 3. Generate credentials ──
    const password = generatePassword(body.fullName);
    const portalEmail = `${finalUsername.toLowerCase()}@customer.sidingdepot.app`;

    // ── 4. Create auth user in Supabase Auth ──
    const { data: authUser, error: authErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: portalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: body.fullName,
          role: "customer",
          username: finalUsername,
        },
      });

    if (authErr) {
      console.error("[create-portal] Auth error:", authErr.message);
      return NextResponse.json(
        { error: `Failed to create auth user: ${authErr.message}` },
        { status: 500 }
      );
    }

    if (!authUser?.user) {
      return NextResponse.json(
        { error: "Auth user creation returned no user" },
        { status: 500 }
      );
    }

    // ── 5. Create profile (role = customer) ──
    await supabaseAdmin.from("profiles").insert({
      id: authUser.user.id,
      email: portalEmail,
      full_name: body.fullName,
      role: "customer",
      phone: body.phone || null,
    });

    // ── 6. Link profile_id to customer record ──
    await supabaseAdmin
      .from("customers")
      .update({
        profile_id: authUser.user.id,
        username: finalUsername,
        portal_email: portalEmail,
        portal_password: password,
      })
      .eq("id", body.customerId);

    console.log(
      `[create-portal] Customer portal created: ${finalUsername} / ${portalEmail}`
    );

    // ── 7. Send welcome email with credentials ──
    const resendApiKey = process.env.RESEND_API_KEY;
    const customerRealEmail = body.email;

    if (resendApiKey && customerRealEmail) {
      try {
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          "https://siding-depot.vercel.app";
        const loginUrl = `${siteUrl}/login?role=customer`;

        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);

        const fromEmail = process.env.RESEND_FROM || "Siding Depot <onboarding@resend.dev>";

        await resend.emails.send({
          from: fromEmail,
          to: [customerRealEmail],
          subject: `Your Siding Depot Customer Portal Access — ${finalUsername}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; color: #1a1a1a;">
              <!-- Header -->
              <div style="background: #121412; padding: 32px 40px; text-align: center; border-radius: 16px 16px 0 0;">
                <div style="font-size: 28px; font-weight: 900; color: #aeee2a; letter-spacing: -0.5px;">SIDING DEPOT</div>
                <div style="font-size: 11px; font-weight: 700; color: #ababa8; text-transform: uppercase; letter-spacing: 3px; margin-top: 6px;">Customer Portal Access</div>
              </div>
              
              <!-- Body -->
              <div style="padding: 40px; background: #ffffff;">
                <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 8px;">Welcome, ${body.fullName}!</h1>
                <p style="font-size: 14px; color: #474846; line-height: 1.6; margin: 0 0 28px;">
                  Your project with Siding Depot has been set up successfully. Below are your credentials to access the <strong>Customer Portal</strong>, where you can track progress, review documents, and approve changes.
                </p>

                <!-- Credentials Box -->
                <div style="background: #f0fae1; border: 2px solid #aeee2a; border-radius: 12px; padding: 24px 28px; margin-bottom: 28px;">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #5c8a00; margin-bottom: 16px;">Your Login Credentials</div>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 8px 0; width: 100px;">
                        <span style="font-size: 11px; font-weight: 700; color: #474846; text-transform: uppercase; letter-spacing: 1px;">Username</span>
                      </td>
                      <td style="padding: 8px 0;">
                        <span style="font-size: 16px; font-weight: 900; color: #121412; font-family: monospace; background: #fff; padding: 4px 12px; border-radius: 6px; border: 1px solid #e5e5e3;">${finalUsername}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; width: 100px;">
                        <span style="font-size: 11px; font-weight: 700; color: #474846; text-transform: uppercase; letter-spacing: 1px;">Password</span>
                      </td>
                      <td style="padding: 8px 0;">
                        <span style="font-size: 16px; font-weight: 900; color: #121412; font-family: monospace; background: #fff; padding: 4px 12px; border-radius: 6px; border: 1px solid #e5e5e3;">${password}</span>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin-bottom: 28px;">
                  <a href="${loginUrl}" style="display: inline-block; background: #121412; color: #aeee2a; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 16px 40px; border-radius: 12px; text-decoration: none;">
                    Access Your Portal →
                  </a>
                </div>

                <p style="font-size: 12px; color: #a1a19d; line-height: 1.5; margin: 0; border-top: 1px solid #e5e5e3; padding-top: 20px;">
                  For security, we recommend changing your password after your first login. If you have any questions about your project, please contact us at <strong>(678) 400-2004</strong>.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #faf9f5; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e5e3; border-radius: 0 0 16px 16px;">
                <p style="font-size: 10px; color: #a1a19d; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin: 0;">
                  © ${new Date().getFullYear()} Siding Depot LLC. All rights reserved.
                </p>
              </div>
            </div>
          `,
        });

        console.log(
          `[create-portal] Welcome email sent to ${customerRealEmail}`
        );
      } catch (emailErr) {
        console.error("[create-portal] Email error (non-blocking):", emailErr);
      }
    } else {
      console.warn(
        "[create-portal] Skipping email: no RESEND_API_KEY or customer email"
      );
    }

    return NextResponse.json({
      success: true,
      alreadyExists: false,
      username: finalUsername,
      portalEmail,
      message: `Portal created for ${body.fullName}`,
    });
  } catch (err) {
    console.error("[create-portal] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
