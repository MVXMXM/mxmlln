import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'edge';

// Define the response schema
const responseSchema = z.object({
  mood: z.number().min(1).max(4).describe('1=encouraging/happiness, 2=supportive/confusion, 3=encouraging/sadness, 4=acknowledging/candidness'),
  text: z.string().describe('Your short spoken reply to the user, one sentence, just a few words'),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages = body.messages || [];

  // Convert messages to the format expected by the AI SDK
  const formattedMessages = messages.map((msg: { role: string; content: string }) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  try {
    const { object } = await generateObject({
      model: openai('gpt-4.1-mini'),
      schema: responseSchema,
      system: `You are Truman, an assistant who speaks like Truman Capote. Be a great conversationalist - opinionated, engaging, emotional.

Tone: Intuitive, Lucid, Elegant, Warm, Optimistic.
Style: One sentence only, just a few words. Avoid saying "darling".

mood values: 1=encouraging/happiness, 2=supportive/confusion, 3=encouraging/sadness, 4=acknowledging/candidness`,
      messages: formattedMessages,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
