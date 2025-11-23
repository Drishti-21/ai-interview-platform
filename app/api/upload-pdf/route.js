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

    // For now, use a placeholder text - PDF parsing will be added later
    const extractedText = `RESUME_PLACEHOLDER - File uploaded: ${file.name} (${file.size} bytes)
    
This is placeholder resume text for testing purposes. The system has successfully received a PDF file and will proceed with the interview process. 

Key Skills: JavaScript, React, Node.js, Python, SQL, Git
Experience: 3+ years in software development
Education: Computer Science degree
Projects: Built web applications, APIs, and databases`;

    console.log("File uploaded successfully:", file.name, file.size + " bytes");

    const token = randomUUID().replace(/-/g, "");
    const numQuestions = 6;

    await saveInterviewData(token, {
      resumeText: extractedText,
      jdText: jd,
      email,
      numQuestions,
      timestamp: Date.now(),
    });

    // Send the email
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/send-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          link: `${process.env.NEXT_PUBLIC_BASE_URL}/interview/${token}`,
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Invite sent successfully.",
      token,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
