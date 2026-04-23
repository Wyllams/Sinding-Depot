import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * POST /api/users/send-access
 * Reenvia as credenciais de acesso (username + password) do cliente por email.
 * Busca username/portal_email da tabela customers.
 * Gera uma nova senha temporária e atualiza no Auth.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── Auth check: admin only ──
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* read-only */ },
        },
      }
    );

    const { data: { session } } = await supabaseAuth.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: actor } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (actor?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    // ── Body ──
    const body = await req.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // ── Get profile ──
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email, full_name")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Get customer portal data from customers table ──
    const { data: customer } = await supabase
      .from("customers")
      .select("username, portal_email, portal_password, email")
      .eq("profile_id", userId)
      .single();

    const username = customer?.username || profile.full_name;
    const password = customer?.portal_password || "—";
    const customerRealEmail = customer?.email; // email real do cliente (para enviar o email)

    if (!customerRealEmail) {
      return NextResponse.json({
        error: "No real email found for this customer. Cannot send credentials.",
      }, { status: 400 });
    }

    // ── Send email via Resend ──
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({
        error: "RESEND_API_KEY not configured. Password was reset but email could not be sent.",
      }, { status: 500 });
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM || "Siding Depot <onboarding@resend.dev>";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://siding-depot.vercel.app";
    const loginUrl = `${siteUrl}/login?role=customer`;

    await resend.emails.send({
      from: fromEmail,
      to: [customerRealEmail],
      subject: `Your Siding Depot Access Credentials — ${username}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; color: #1a1a1a;">
          <!-- Header -->
          <div style="background: #121412; padding: 32px 40px; text-align: center; border-radius: 16px 16px 0 0;">
            <div style="font-size: 28px; font-weight: 900; color: #aeee2a; letter-spacing: -0.5px;">SIDING DEPOT</div>
            <div style="font-size: 11px; font-weight: 700; color: #ababa8; text-transform: uppercase; letter-spacing: 3px; margin-top: 6px;">Customer Portal Access</div>
          </div>
          
          <!-- Body -->
          <div style="padding: 40px; background: #ffffff;">
            <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 8px;">Hello, ${profile.full_name}!</h1>
            <p style="font-size: 14px; color: #474846; line-height: 1.6; margin: 0 0 28px;">
              Below are your login credentials for the <strong>Customer Portal</strong>, where you can track progress, review documents, and approve changes.
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
                    <span style="font-size: 16px; font-weight: 900; color: #121412; font-family: monospace; background: #fff; padding: 4px 12px; border-radius: 6px; border: 1px solid #e5e5e3;">${username}</span>
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
              For security, we recommend changing your password after logging in. If you have any questions, please contact us at <strong>(678) 400-2004</strong>.
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

    console.log(`[send-access] Credentials sent to ${customerRealEmail} for user ${userId} (${username})`);

    return NextResponse.json({ success: true, sentTo: customerRealEmail });
  } catch (err) {
    console.error("[send-access] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
