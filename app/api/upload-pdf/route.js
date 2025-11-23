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

    // Load PDF using pdf-lib
    const pdfDoc = await PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();

    let extractedText = "";

    for (const page of pages) {
      try {
        const textContent = await page.getTextContent();
        extractedText += textContent.items.map((i) => i.str).join(" ") + " ";
      } catch (err) {
        extractedText += "";
      }
    }

    if (!extractedText.trim()) {
      extractedText = "Unable to extract text from this PDF. Please upload a text-based PDF.";
    }

    const cvText = extractedText;
    const numQuestions = 6;
    const token = randomUUID().replace(/-/g, "");

    // Save data ONLY in memory (Vercel-safe)
    saveInterviewData(token, {
      cvText,
      jdText: jd,
      email,
      numQuestions,
    });

    // Send email
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
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
