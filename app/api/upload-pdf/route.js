export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { saveInterviewData } from "../../../lib/storage.js";
import { randomUUID } from "crypto";

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const jd = form.get("jd") || "";
    const email = form.get("email");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Vercel-safe: no PDF extraction performed
    const extractedText = "Resume uploaded successfully.";

    const token = randomUUID().replace(/-/g, "");
    const numQuestions = 6;

    saveInterviewData(token, {
      resumeText: extractedText,
      jdText: jd,
      email,
      numQuestions,
      timestamp: Date.now(),
    });

    // -------------------------------
    // FIXED BASE URL LOGIC
    // -------------------------------
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    if (!baseUrl) {
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        baseUrl = "http://localhost:3000";
      }
    }
    // -------------------------------

    // Send the email
    await fetch(`${baseUrl}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        link: `${baseUrl}/interview/${token}`,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Invite sent.",
      token,
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
