import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { lastAnswer, resumeText, previousQuestion } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;

    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `You are a professional interviewer conducting a technical interview.

Generate exactly 3 short follow-up questions based on the candidate's answer and resume.

RULES:
- Ask direct questions like a real interviewer
- Be conversational and natural
- NO explanations or introductions
- Each question should be one sentence
- Focus on technical details they mentioned
- Reference their resume content naturally - sometimes using phrases like "from your resume", "I noticed on your resume", but vary your approach
- Connect to their resume content when relevant, but keep it conversational

Output ONLY this JSON format:
{
  "followups": ["question1", "question2", "question3"]
}

Previous Question: ${previousQuestion || "N/A"}
Candidate's Answer: ${lastAnswer}
Resume: ${resumeText}`;

    const payload = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = {
        followups: [
          "Can you explain more about your approach?",
          "Which skills from your resume did you use here?",
          "What challenges did you face, and how did your past experience help?"
        ]
      };
    }

    return NextResponse.json(parsed, { status: 200 });

  } catch (error) {
    console.error("Follow-up generation error:", error);

    return NextResponse.json(
      {
        followups: [
          "Can you elaborate on this?",
          "Why did you choose that approach?",
          "How did your previous experience influence your decisions?"
        ]
      },
      { status: 200 }
    );
  }
}