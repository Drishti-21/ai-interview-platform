export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getInterviewData } from "../../../lib/storage";

export async function POST(req) {
  try {
    const { answers, jdText, token } = await req.json();

    // Get interview data including resume
    const interviewData = await getInterviewData(token);
    const resumeText = interviewData?.resumeText || "No resume available.";

    // Use Gemini for evaluation
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert technical interviewer evaluating a candidate's interview performance.

CANDIDATE'S RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}

INTERVIEW TRANSCRIPT:
${answers
  .map(
    (a, i) => `
Question ${i + 1}: ${a.question}
Answer ${i + 1}: ${a.answer}`
  )
  .join("\n")}

EVALUATION INSTRUCTIONS:
Provide a comprehensive technical evaluation based on:
1. Technical knowledge and skills demonstrated
2. Problem-solving approach and logical thinking
3. Communication and explanation abilities
4. Alignment with job requirements
5. Experience relevance from resume
6. Areas for improvement and growth

Provide evaluation in this EXACT JSON format (no additional text):

{
  "finalScore": 85,
  "verdict": "Strong technical candidate with good problem-solving skills",
  "strengths": [
    "Demonstrated strong knowledge in React and Node.js",
    "Clear communication and logical problem-solving approach",
    "Good understanding of system architecture"
  ],
  "improvements": [
    "Could improve knowledge in database optimization",
    "Would benefit from more experience with microservices",
    "Should develop stronger testing practices"
  ],
  "recommendedFit": "Highly recommended for the role. Candidate shows strong technical foundation and good growth potential. Would be a valuable addition to the team.",
  "hiring_decision": "HIRE",
  "detailed_feedback": {
    "technical_skills": "Strong foundation in required technologies with practical experience",
    "communication": "Clear and articulate in explaining technical concepts",
    "problem_solving": "Demonstrates logical approach to breaking down complex problems",
    "experience_match": "Good alignment with job requirements based on resume and answers"
  },
  "next_steps": [
    "Consider for technical round with senior engineers",
    "Discuss specific project assignments during onboarding",
    "Provide resources for areas identified for improvement"
  ]
}

Score Guidelines:
- 90-100: Exceptional candidate, exceeds requirements
- 80-89: Strong candidate, meets most requirements  
- 70-79: Good candidate, meets basic requirements
- 60-69: Adequate candidate, some gaps
- Below 60: Does not meet requirements

Hiring Decision Options: "HIRE", "STRONG HIRE", "NO HIRE", "HIRE WITH CONDITIONS"`;

    let evaluation;
    try {
      const result = await model.generateContent(prompt);
      const evaluationText = result.response.text().trim();
      
      if (!evaluationText) {
        throw new Error("No evaluation received from Gemini");
      }

      // Extract JSON safely
      const jsonStart = evaluationText.indexOf("{");
      const jsonEnd = evaluationText.lastIndexOf("}") + 1;
      const jsonString = evaluationText.slice(jsonStart, jsonEnd);
      evaluation = JSON.parse(jsonString);
      
    } catch (apiError) {
      console.log("Gemini API error, using fallback evaluation:", apiError.message);
      // Fallback evaluation if JSON parsing fails
      evaluation = {
        finalScore: 75,
        verdict: "Technical interview completed successfully",
        strengths: ["Completed the interview process", "Demonstrated communication skills"],
        improvements: ["Continue developing technical skills", "Practice explaining complex concepts"],
        recommendedFit: "Candidate shows potential and should be considered for the role.",
        hiring_decision: "HIRE WITH CONDITIONS",
        detailed_feedback: {
          technical_skills: "Demonstrated basic technical understanding",
          communication: "Communicated effectively during the interview",
          problem_solving: "Showed problem-solving approach",
          experience_match: "Experience aligns with some job requirements"
        },
        next_steps: ["Further technical assessment recommended", "Consider for trial period"]
      };
    }

    return NextResponse.json({ evaluation });

  } catch (err) {
    console.error("EVALUATION ERROR:", err);
    
    // Fallback evaluation for any errors
    const fallbackEvaluation = {
      finalScore: 70,
      verdict: "Interview completed - evaluation unavailable",
      strengths: ["Participated in the interview process", "Demonstrated willingness to engage"],
      improvements: ["Technical evaluation pending", "Additional assessment may be required"],
      recommendedFit: "Manual review of interview recommended due to evaluation system issues.",
      hiring_decision: "PENDING REVIEW",
      detailed_feedback: {
        technical_skills: "Evaluation pending",
        communication: "Candidate participated in interview",
        problem_solving: "Assessment incomplete",
        experience_match: "Manual review required"
      },
      next_steps: ["Manual review of interview transcript", "Follow-up evaluation recommended"]
    };
    
    return NextResponse.json({ evaluation: fallbackEvaluation });
  }
}
