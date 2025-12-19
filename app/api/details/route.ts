import { NextRequest, NextResponse } from "next/server";

interface Question {
  question: string;
  options: string[];
}

const MOCK_QUESTIONS: Question[] = [
  {
    question: "What do you mean by X?",
    options: ["A", "B", "C"],
  },
  {
    question: "What do you mean by Y?",
    options: ["D", "E", "F"],
  },
  {
    question: "What do you mean by Z?",
    options: ["G", "H", "I"],
  },
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const files = formData.getAll("files") as File[];

    // Log the received data for debugging
    console.log("Received prompt:", prompt);
    console.log("Received files:", files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    // For now, return the mock questions
    return NextResponse.json({ questions: MOCK_QUESTIONS });
  } catch (error) {
    console.error("Error in /api/details:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
