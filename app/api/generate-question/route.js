import { NextResponse } from "next/server";
import { getInterviewData } from "../../../lib/storage";

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Received body:", body);
    
    // Handle both old and new parameter formats
    let resumeText, jdText, history, mode;
    
    if (body.token) {
      // Frontend is using old format - fetch data from storage
      const { token, questionMode, questionHistory, lastAnswer } = body;
      const interviewData = await getInterviewData(token);
      resumeText = interviewData?.resumeText || "No resume provided";
      jdText = interviewData?.jdText || "No job description provided";
      history = questionHistory || [];
      mode = questionMode === "first" ? "primary" : "follow_up";
      console.log("Using token-based parameters");
    } else {
      // Direct parameters
      ({ resumeText, jdText, history, mode } = body);
      console.log("Using direct parameters");
    }

    console.log("Resume length:", resumeText?.length);
    console.log("Mode:", mode);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API key missing");
      return NextResponse.json(
        { question: "Fallback: API key missing" },
        { status: 200 }
      );
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    console.log("USING ENDPOINT:", endpoint);

    const prompt = `You are a professional interviewer conducting a technical interview.

RULES:
- Generate ONE question only
- Ask like a real interviewer would
- Be conversational and direct
- NO explanations or reasoning
- NO introductory text
- NO "Here's your question:" or similar
- Just provide the direct question

Resume: ${resumeText}
Job Description: ${jdText}
Previous Questions: ${history?.join(", ") || "none"}

${mode === "follow_up" ? 
  `Generate a thoughtful follow-up question that connects to their resume content. Occasionally (about 1-2 times during the interview) you may start with phrases like "from your resume", "I noticed on your resume", but vary your question style naturally. Reference their specific skills, experiences, or achievements from their resume in a conversational way.` : 
  `Generate an opening question asking the candidate to introduce themselves and briefly talk about their background from their resume.`
}`;

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

    if (!response.ok) {
      console.error("Gemini API error:", response.status, response.statusText);
      const fallbackQuestion = mode === "follow_up" ? 
        "I noticed from your resume you have experience with various technologies. Can you walk me through one of your most challenging projects?" :
        "Please introduce yourself and tell me about your background as shown in your resume.";
      return NextResponse.json(
        { question: fallbackQuestion },
        { status: 200 }
      );
    }

    const data = await response.json();

    const result =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      (mode === "follow_up" ? 
        "From your resume, I see you have worked with multiple technologies. Can you elaborate on your experience with the most recent project?" :
        "Please introduce yourself and walk me through your professional background from your resume.");

    return NextResponse.json({ question: result }, { status: 200 });
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json(
      { question: "Fallback Question: Describe a complex project you worked on." },
      { status: 200 }
    );
  }
}
