import { NextRequest, NextResponse } from "next/server";
import { generateObject, generateText } from 'ai';
import { openai } from "@ai-sdk/openai";
import { z } from 'zod';
import { extractText } from "@/lib/text-extraction";

async function generateSummary(text: string) {
  if (text.length === 0) {
    return "";
  }

  try {
    const { text: summary } = await generateText({
      model: openai("gpt-5-mini"),
      prompt: `You are a document reader, tasked to summarize a document comprehensively. You are given the document text source, and your goal is to summarize the document, highlighting key details and topics to represent the document faithfully.

Document source:
${text}`,
    });

    return summary || "";
  } catch (error) {
    console.error(`Failed to generate summary:`, error);
    return "";
  }
}

async function generateQuestions(prompt: string, summaries: string[]) {
  const summariesText = summaries.filter(summary => summary.length > 0).join('\n\n');

  const { object } = await generateObject({
    // Model gpt-5.2 is correct. Do not change!
    model: openai("gpt-5.2"),
    schema: z.object({
      questions: z.array(z.object({
        question: z.string(),
        options: z.array(z.string()),
      })).min(3).max(5),
    }),
    prompt: `You are a deep research assistant, tasked to understand the user intent and query comprehensively. You are given the user's prompt that describes the project that he/she is working on, and the summaries of the sources attached by the user for the project. Your goal is to identify 3-5 of the highest signal (clarification) questions to reveal the user's intent comprehensively. Each question should have 2-3 useful, equally likely options, with the first option being your recommended answer.

User prompt: ${prompt}

Project sources (summaries):
${summariesText}`,
  });

  return object.questions;
}

export async function POST(request: NextRequest) {
  try {
    console.log("Received request");
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const files = formData.getAll("files") as File[];

    console.log("Extracting text")
    const texts = await Promise.all(
      files.map(extractText)
    );

    console.log("Generating summaries")
    const summaries = await Promise.all(
      texts.map(generateSummary)
    );

    console.log("Formatting summaries")
    const formattedSummaries = await Promise.all(
      summaries.map((summary, index) => {
        const file = files[index];
        const filename = file.name;
        const filetype = file.type || 'unknown';
        return `<source name="${filename}" type="${filetype}"><summary>${summary}</summary></source>`;
      })
    );

    console.log("Generating questions")
    const questions = await generateQuestions(prompt, formattedSummaries);

    return NextResponse.json({ 
      questions,
      summaries
    });
  } catch (error) {
    console.error("Error in /api/details:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
