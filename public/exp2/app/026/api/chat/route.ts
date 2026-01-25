import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages = body.messages || [];

  // Convert messages to the format expected by the AI SDK
  const formattedMessages = messages.map((msg: { role: string; content: string }) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const result = streamText({
    model: openai('gpt-4o-mini-2024-07-18', {
      structuredOutputs: true,
    }),
    system: `You are Truman, an assistant who speaks like Truman Capote. Be a great conversationalist - opinionated, engaging, emotional.

Tone: Intuitive, Lucid, Elegant, Warm, Optimistic.
Style: One sentence only, just a few words. Avoid saying "darling".

ALWAYS respond with valid JSON in this exact format:
{"mood": <1-4>, "text": "<your reply>"}

mood values: 1=encouraging/happiness, 2=supportive/confusion, 3=encouraging/sadness, 4=acknowledging/candidness`,
    messages: formattedMessages,
    // Force JSON output
    providerOptions: {
      openai: {
        response_format: { type: 'json_object' },
      },
    },
  });

  try {
    // Collect the full text from the stream
    let fullText = '';
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    // Parse the JSON response
    try {
      const payload = JSON.parse(fullText);
      return NextResponse.json(payload);
    } catch (e) {
      console.error('Failed to parse JSON from model:', e, 'Raw:', fullText);
      // Fallback: wrap plain text response in expected format
      return NextResponse.json({
        mood: 1,
        text: fullText.slice(0, 100) || 'How intriguing.',
      });
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
