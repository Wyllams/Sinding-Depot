import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const ResetPasswordSchema = z.object({
  profileId: z.string().uuid("profileId must be a valid UUID"),
});

/**
 * POST /api/customers/reset-password
 *
 * Allows admins to reset a customer's portal password.
 * The new password is returned ONCE in the response — it is NOT stored anywhere.
 * Supabase Auth handles the password hash internally.
 *
 * Body: { profileId: string }
 * Returns: { success: true, newPassword: string }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  try {
    const raw = await req.json();
    const parsed = ResetPasswordSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { profileId } = parsed.data;

    // ── Verify caller is admin ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseCaller = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller } } = await supabaseCaller.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    // ── Generate new secure password ──
    const newPassword = randomBytes(12).toString("base64url");

    // ── Update via Supabase Auth Admin API (handles hashing) ──
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
      profileId,
      { password: newPassword }
    );

    if (updateErr) {
      console.error("[reset-password] Auth update error:", updateErr.message);
      return NextResponse.json(
        { error: `Failed to reset password: ${updateErr.message}` },
        { status: 500 }
      );
    }

    console.log(`[reset-password] Password reset for profile ${profileId} by admin ${caller.id}`);

    return NextResponse.json({
      success: true,
      // Returned ONCE — not stored anywhere in the database
      newPassword,
    });
  } catch (err) {
    console.error("[reset-password] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
