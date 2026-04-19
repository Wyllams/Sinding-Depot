import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET(): Promise<NextResponse> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({
      error: 'GMAIL_USER or GMAIL_APP_PASSWORD not set',
      GMAIL_USER: gmailUser ? '✅ SET' : '❌ MISSING',
      GMAIL_APP_PASSWORD: gmailPass ? '✅ SET' : '❌ MISSING',
    }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    // Verify connection
    await transporter.verify();

    // Send test email
    const info = await transporter.sendMail({
      from: `"Siding Depot" <${gmailUser}>`,
      to: 'bionej20@gmail.com',
      subject: '✅ Siding Depot - Email Test',
      html: '<h1>Email is working!</h1><p>Gmail SMTP is configured correctly.</p>',
    });

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      from: gmailUser,
      to: 'bionej20@gmail.com',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: msg,
      GMAIL_USER: gmailUser,
    }, { status: 500 });
  }
}
