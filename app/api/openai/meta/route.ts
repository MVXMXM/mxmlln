import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { folioMetaPrompt } from "@/content/prompts/folio-meta";

const cardSchema = z.object({
  blurb: z.string(),
  cardImage: z.string(),
  cardHeader: z.string(),
  cardDescription: z.string(),
  cardURL: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const defineProblem =
    typeof body?.defineProblem === "string" ? body.defineProblem : "";

  try {
    const { object } = await generateObject({
      model: openai("gpt-5.4-mini"),
      schema: cardSchema,
      system: folioMetaPrompt,
      prompt: defineProblem,
      // This is a case-study lookup. Reasoning effort holds the card for seconds.
      providerOptions: {
        openai: { reasoningEffort: "none" },
      },
    });

    // ChatIntelligence.js JSON.parses this string. Keep it a string.
    return NextResponse.json({ AiResponse: JSON.stringify(object) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate a response" },
      { status: 500 },
    );
  }
}
