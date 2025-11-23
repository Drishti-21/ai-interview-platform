export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { email, link } = await req.json();

    if (!email || !link) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // SMTP Transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email content
    await transporter.sendMail({
      from: `"AI Interview" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your AI Interview Link",
      html: `
        <p>Hello Candidate,</p>
        <p>Your AI interview is ready. Click the link below to start:</p>
        <p><a href="${link}" target="_blank">${link}</a></p>
        <p>Best wishes,<br>AI Hiring System</p>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("EMAIL ERROR:", error);
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }
}
