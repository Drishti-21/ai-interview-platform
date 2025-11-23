export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { saveInterviewData } from "../../../lib/storage.js";
import { randomUUID } from "crypto";
import { PDFDocument } from "pdf-lib";

export async function POST(request) {
  try {
    const form = await request.formData();

    const file = form.get("file");
    const jd = form.get("jd") || "";
    const email = form.get("email");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert uploaded file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract PDF text (simple safe extraction)
    let extractedText = "";
    try {
      const pdfDoc = await PDFDocument.load(buffer);
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        try {
          const content = await page.getTextContent?.();
          const text = content?.items?.map((i) => i.str).join(" ") || "";
          extractedText += text + " ";
        } catch {
          extractedText += "";
        }
      }
    } catch {
      extractedText = "";
    }

    if (!extractedText.trim()) {
      extractedText = "Unable to extract text from this PDF.";
    }

    const token = randomUUID().replace(/-/g, "");
    const numQuestions = 6;

    // SAVE ONLY IN MEMORY (Vercel safe)
    saveInterviewData(token, {
      resumeText: extractedText,
      jdText: jd,
      email,
      numQuestions,
      timestamp: Date.now(),
    });

    // SEND EMAIL
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        link: `${process.env.NEXT_PUBLIC_BASE_URL}/interview/${token}`,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Invite sent.",
      token,
    });

  } catch (error) {
    console.error("UPLOAD-PDF ERROR:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
