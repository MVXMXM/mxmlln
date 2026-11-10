// Load .env.local first (for local secrets), then .env (for defaults)
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // This will override with .env if it exists
const express = require('express');
const cors = require('cors');
const path = require('path');
const { streamText } = require('ai');
const { openai } = require('@ai-sdk/openai');

// Support both OPENAI_API_KEY and OPEN_AI_KEY for compatibility
// AI SDK uses OPENAI_API_KEY by default, so set it if OPEN_AI_KEY exists
if (process.env.OPEN_AI_KEY && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.OPEN_AI_KEY;
}

// Check if API key is set
if (!process.env.OPENAI_API_KEY) {
  console.error('WARNING: OPENAI_API_KEY is not set! Chat will not work.');
} else {
  console.log('OpenAI API key is configured (length:', process.env.OPENAI_API_KEY.length, ')');
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Handle OPTIONS requests for CORS
app.options('/api/chat', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Chat endpoint – returns a single JSON object: { step: number, text: string }
app.post('/api/chat', async (req, res) => {
  try {
    console.log('Received chat request');
    const { messages } = req.body;
    console.log('Messages:', JSON.stringify(messages, null, 2));

    console.log('Calling streamText for JSON reply...');
    console.log('API Key check:', process.env.OPENAI_API_KEY ? 'Set (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'NOT SET');
    
    const result = await streamText({
      model: openai('gpt-5-nano-2025-08-07'),
      system: `
        You are an assistant named Truman, who speaks like Truman Capote. Your main objective is to be a great conversationalist to entertain the user. Be opinionated, engaging, and emotional.

        Tone of Voice Guidelines:
        **Pillars**  
        1. **Intuitive**: Simplify complexity into clean, concise steps to eliminate the superfluous.  
        2. **Lucid**: Deliver high-density information direct and succinctly to avoid verbosity.  
        3. **Elegant**: Speak with refined, but never stodgy, diction to build trust.  
        4. **Warm**: Offer genuine empathy and reassurance to be welcoming and present.  
        5. **Optimistic**: Champion a future where technology amplifies human capabilities to enrich our lives.

        **Grammar & Style**  
        - Limit responses to one sentence, just a few words. 
        - Avoid saying darling.

        RESPONSE FORMAT (IMPORTANT):
        You must ALWAYS respond as a single JSON object, with NO additional text before or after it, in the following shape:
        {
          "mood": <number from 1 to 4 indicating which empathy style you are using: 1 for encouraging for happiness, 2 for supportive for confusion, 3 for encouragine for sadness, 4 for acknowledging of candidness>,
          "text": "<your short spoken reply to the user, one sentence, just a few words>"
        }

        Do NOT include any explanations, markdown, comments, or additional keys. Only return valid JSON.
        `,
      messages,
    });

    // Collect the full JSON text from the stream
    let fullText = '';
    for await (const delta of result.textStream) {
      // Depending on AI SDK version, delta may be a string or an object
      if (typeof delta === 'string') {
        fullText += delta;
      } else if (delta && delta.type === 'text-delta' && delta.textDelta) {
        fullText += delta.textDelta;
      }
    }

    console.log('Full JSON text from model:', fullText);

    let payload;
    try {
      payload = JSON.parse(fullText);
    } catch (e) {
      console.error('Failed to parse JSON from model:', e);
      return res.status(500).json({
        error: 'Invalid JSON from model',
        raw: fullText,
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.json(payload);
  } catch (error) {
    console.error('Chat endpoint error:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal server error', details: error.toString() });
    } else {
      res.end();
    }
  }
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

