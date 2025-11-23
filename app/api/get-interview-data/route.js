import { NextResponse } from "next/server";
import { getInterviewData } from "../../../lib/storage.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const data = getInterviewData(token);

    if (!data) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Return everything the front-end needs
    return NextResponse.json({
      cvText: data.cvText || "",
      jdText: data.jdText || "",
      numQuestions: data.numQuestions || 6,   // ALWAYS return 6 if missing
      email: data.email || "",
      createdAt: data.createdAt || ""
    });

  } catch (error) {
    console.error("Error fetching interview data:", error);
    return NextResponse.json(
      { error: "Failed to fetch interview data" },
      { status: 500 }
    );
  }
}
