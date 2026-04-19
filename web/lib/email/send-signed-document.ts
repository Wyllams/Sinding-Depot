import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendSignedDocumentEmailParams {
  to: string;
  customerName: string;
  documentTitle: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}

export async function sendSignedDocumentEmail({
  to,
  customerName,
  documentTitle,
  pdfBuffer,
  pdfFilename,
}: SendSignedDocumentEmailParams): Promise<{ success: boolean; error?: string }> {
  // If no API key configured, skip silently (dev mode)
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not configured — skipping email send");
    return { success: false, error: "Email not configured" };
  }

  try {
    const fromEmail = process.env.RESEND_FROM || "Siding Depot <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: `Your signed document: ${documentTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
          <div style="text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0;">SIDING DEPOT</h1>
            <p style="font-size: 12px; color: #888; margin: 4px 0 0;">2480 Sandy Plains Road · Marietta, GA 30066</p>
          </div>
          
          <h2 style="font-size: 18px; margin: 0 0 16px;">Hi ${customerName},</h2>
          
          <p style="font-size: 14px; line-height: 1.7; color: #333;">
            Thank you for signing <strong>"${documentTitle}"</strong>. 
            As required by Georgia law, a copy of your signed document is attached to this email for your records.
          </p>
          
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="font-size: 13px; color: #666; margin: 0;">
              📎 <strong>Attached:</strong> ${pdfFilename}
            </p>
          </div>
          
          <p style="font-size: 14px; line-height: 1.7; color: #333;">
            This document contains your electronic signature and a complete audit trail, 
            ensuring full legal compliance under the ESIGN Act and Georgia UETA.
          </p>
          
          <p style="font-size: 14px; line-height: 1.7; color: #333;">
            If you have any questions about your project, please don't hesitate to contact us:
          </p>
          
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px 20px; margin: 16px 0 32px;">
            <p style="margin: 0; font-size: 13px; color: #555;">
              📞 <a href="tel:6784002004" style="color: #1a1a1a; font-weight: bold;">(678) 400-2004</a><br/>
              ✉️ <a href="mailto:office@sidingdepot.com" style="color: #1a1a1a; font-weight: bold;">office@sidingdepot.com</a>
            </p>
          </div>
          
          <p style="font-size: 14px; color: #333;">
            Best regards,<br/>
            <strong>Siding Depot Team</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0 16px;"/>
          
          <p style="font-size: 10px; color: #aaa; text-align: center; line-height: 1.6;">
            This is an automated message from Siding Depot's digital signature system.<br/>
            © ${new Date().getFullYear()} Siding Depot LLC · All rights reserved.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
