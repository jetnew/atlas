import { NextRequest, NextResponse } from "next/server";
import { generateObject } from 'ai';
import { openai } from "@ai-sdk/openai";
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const files = formData.getAll("files") as File[];

    // Log the received data for debugging
    console.log("Received prompt:", prompt);
    console.log("Received files:", files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    // Generate clarification questions using AI
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        questions: z.array(z.object({
          question: z.string(),
          options: z.array(z.string()),
        })),
      }),
      prompt: `Given the following user request, generate 3-5 clarification questions to better understand their requirements. Each question should have 3-4 possible options as answers.

User request: ${prompt}`,
    });

    return NextResponse.json({ questions: object.questions });
  } catch (error) {
    console.error("Error in /api/details:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
