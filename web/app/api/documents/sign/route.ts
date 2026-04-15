import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// =============================================
// PATCH /api/documents/sign
// =============================================
// Salva a assinatura do cliente (base64 PNG) em
// metadados e marca o COC (Certificate of Completion) 
// como 'active'.
// =============================================

export async function PATCH(req: Request) {
  try {
    const { docId, signatureName, signatureDataUrl } = await req.json();

    if (!docId || !signatureName) {
      return NextResponse.json(
        { error: "Validation failed: 'docId' and 'signatureName' are required." },
        { status: 400 }
      );
    }

    // Bypass RLS for backend operation since public signature doesn't have a session
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current doc to extract existing metadata if any
    const { data: doc, error: docErr } = await supabaseAdmin
      .from("documents")
      .select("metadata")
      .eq("id", docId)
      .single();

    if (docErr || !doc) {
      throw new Error("Document not found");
    }

    const currentMetadata = doc.metadata || {};

    const updatedMetadata = {
      ...currentMetadata,
      signature: signatureDataUrl, // B64 PNG representation
      signature_name: signatureName,
      signed_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabaseAdmin
      .from("documents")
      .update({
        status: "active",
        metadata: updatedMetadata,
      })
      .eq("id", docId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("COC Signature API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
