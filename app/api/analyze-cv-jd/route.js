import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getInterviewData } from "../../../lib/storage.js";

let client;

async function initModel() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
}

export async function POST(req) {
  try {
    const { token } = await req.json();
    const data = getInterviewData(token);

    if (!data?.cvText || !data?.jdText) {
      return NextResponse.json({ error: "Missing CV or JD" }, { status: 400 });
    }

    await initModel();

    const prompt = `
Compare the following CV and Job Description and provide:

1. Match Score (0-100%)
2. Strengths (2–3 skills matched)
3. Gaps (1–2 points to ask in interview)

CV:
${data.cvText}

JD:
${data.jdText}
    `;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = response.choices[0].message.content.trim();

    return NextResponse.json({ analysis, hasJD: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error analyzing CV/JD" },
      { status: 500 }
    );
  }
}
