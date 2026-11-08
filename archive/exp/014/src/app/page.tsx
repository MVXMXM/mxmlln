"use client";
import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState } from 'react';
import { TextAnimate } from "@/registry/magicui/TextAnimate";

// Helper to generate a variable weather description for the LLM
function makeWeatherDescription(weather: string) {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  if (weather.includes('rain')) return pick([
    "rainy",
    "showery",
    "wet and drizzly",
    "a day of steady rain",
    "NYC is getting a good soaking"
  ]);
  if (weather.includes('cloud')) return pick([
    "cloudy",
    "overcast",
    "a sky full of clouds",
    "gray and subdued",
    "the sun is hiding behind clouds"
  ]);
  if (weather.includes('clear') || weather.includes('sun')) return pick([
    "sunny",
    "bright and clear",
    "bathed in sunshine",
    "a perfect blue sky",
    "NYC is sparkling in the sun"
  ]);
  if (weather.includes('snow')) return pick([
    "snowy",
    "blanketed in snow",
    "flurries are falling",
    "a winter wonderland",
    "NYC is shimmering with snow"
  ]);
  if (weather.includes('fog')) return pick([
    "foggy",
    "misty",
    "shrouded in fog",
    "the city is wrapped in mist",
    "a mysterious, fog-laden day"
  ]);
  return weather;
}

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const latestMsgRef = useRef<HTMLDivElement>(null);
  const latestPairRef = useRef<HTMLDivElement>(null);
  const [hasUserMessage, setHasUserMessage] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [weatherDesc, setWeatherDesc] = useState<string | null>(null);
  const [nycTime, setNycTime] = useState<string | null>(null);
  const [nycSeconds, setNycSeconds] = useState<string | null>(null);
  const prevPairCount = useRef(0);
  const { messages, input, handleInputChange, handleSubmit, status, append } = useChat({
    onFinish: () => {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
  });

  // Fetch weather and time on mount
  useEffect(() => {
    async function fetchWeatherAndTime() {
      try {
        // Open-Meteo API for NYC: latitude=40.7128, longitude=-74.0060
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true');
        const data = await res.json();
        const code = data.current_weather.weathercode;
        // Map Open-Meteo weather codes to text
        let weather = '';
        if (code === 0) weather = 'clear';
        else if ([1,2,3].includes(code)) weather = 'cloudy';
        else if ([45,48].includes(code)) weather = 'foggy';
        else if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) weather = 'rainy';
        else if ([71,73,75,77,85,86].includes(code)) weather = 'snowy';
        else weather = 'unknown';
        setWeatherDesc(makeWeatherDescription(weather));
        // Get current time in NYC (America/New_York)
        const now = new Date();
        const nycHour = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: true });
        const nycSeconds = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', second: '2-digit' });
        setNycTime(`${nycHour}`);
        setNycSeconds(nycSeconds);
      } catch {
        setWeatherDesc(null);
        setNycTime(null);
        setNycSeconds(null);
      }
    }
    fetchWeatherAndTime();
  }, []);

  // On first mount, send the initial user message after weatherDesc and nycTime are loaded
  useEffect(() => {
    if (!initialMessageSent && weatherDesc && nycTime && nycSeconds && messages.length === 0) {
      append({
        role: 'user',
        content: `The current weather in NYC is: ${weatherDesc}. The current time in NYC is: ${nycTime}. The current time in seconds is: ${nycSeconds}. State the time only by the hour (e.g., '5PM'), not the full time. Use the seconds value internally to help you randomize or select a topic. State the weather and time in the location, then add around six words of commentary on them. Then ask the user if they will do a specific activity that is fitting for the provided weather and time, but do not choose activities that are too obvious. The question should be surprising, succinct (under ten words), and not about the weather or time itself, nor include a greeting.`,
      });
      setInitialMessageSent(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessageSent, weatherDesc, nycTime, nycSeconds, messages.length]);

  const prevMessagesLength = useRef(messages.length);

  // Only scroll when a new user message is added
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg &&
      lastMsg.role === 'user' &&
      messages.length > prevMessagesLength.current
    ) {
      setHasUserMessage(true);
      requestAnimationFrame(() => {
        const el = document.getElementById('latest-user-message');
        if (el && scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: el.offsetTop - 24,
            behavior: 'smooth',
          });
        }
      });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, messages]);

  // Track the first assistant message (opener)
  const openerAssistantId = useRef<string | null>(null);
  const prevAssistantCount = useRef(0);
  useEffect(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) return;
    // If we haven't seen the opener, set it and do not scroll
    if (!openerAssistantId.current) {
      openerAssistantId.current = assistantMessages[0].id;
      prevAssistantCount.current = assistantMessages.length;
      return;
    }
    // If a new assistant message is added and it's not the opener, scroll
    if (
      assistantMessages.length > prevAssistantCount.current &&
      assistantMessages[assistantMessages.length - 1].id !== openerAssistantId.current
    ) {
      setTimeout(() => {
        latestPairRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
    prevAssistantCount.current = assistantMessages.length;
  }, [messages]);

  // Helper: is this the initial user message?
  const isInitialUserMessage = (msg: any) =>
    msg.role === 'user' && msg.content && msg.content.startsWith('The current weather in NYC is:');

  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <div
        className="flex-1 w-full flex flex-col items-center justify-start overflow-y-auto h-[calc(100vh-120px)] pb-24"
        style={{ scrollPaddingTop: 24 }}
      >
        <div className="w-full flex flex-col items-center pt-8 pb-40">
          <div
            className="w-full max-w-[770px] flex flex-col gap-12 pt-6"
            id="chat-message-list"
            ref={scrollContainerRef}
          >
            {/* Render pairs, but skip the initial user message bubble */}
            {(() => {
              const pairs = [];
              let pairIdx = 0;
              let totalPairs = 0;
              // Find the index of the latest assistant message
              let latestAssistantIdx = -1;
              for (let i = 0; i < messages.length; i++) {
                if (messages[i].role === 'assistant') latestAssistantIdx = i;
              }
              for (let i = 0; i < messages.length; i++) {
                // Skip the initial user message bubble
                if (isInitialUserMessage(messages[i])) {
                  // If the next message is assistant, show it as the opener
                  if (messages[i + 1] && messages[i + 1].role === 'assistant') {
                    const assistantMsg = messages[i + 1];
                    pairs.push(
                      <div
                        key={assistantMsg.id}
                        className="min-h-screen w-full flex flex-col"
                        ref={i + 1 === latestAssistantIdx ? latestPairRef : undefined}
                      >
                        <div className="flex-1 flex items-center w-full">
                          <div className="w-full max-w-[770px] px-8 py-6 pb-40 text-left text-[48px] font-thin text-gray-300">
                            <TextAnimate animation="blurIn">
                              {assistantMsg.parts.map((part, idx) =>
                                part.type === 'text' ? part.text : ''
                              ).join('')}
                            </TextAnimate>
                          </div>
                        </div>
                      </div>
                    );
                    i++; // Skip the assistant message in the next loop
                  }
                  continue;
                }
                if (messages[i].role === 'user') {
                  const userMsg = messages[i];
                  const assistantMsg = messages[i + 1] && messages[i + 1].role === 'assistant' ? messages[i + 1] : null;
                  if (assistantMsg) {
                    pairs.push(
                      <div
                        key={userMsg.id + '-' + assistantMsg.id}
                        className="min-h-screen w-full flex flex-col"
                        ref={i + 1 === latestAssistantIdx ? latestPairRef : undefined}
                      >
                        {/* User message at top right */}
                        <div className="w-full flex justify-end pt-8">
                          <div className="bg-[var(--stroke)] text-[var(--foreground)] px-4 py-2 rounded-full max-w-[80%] text-right shadow-lg self-end">
                            {userMsg.parts.map((part, idx) =>
                              part.type === 'text' ? part.text : ''
                            ).join('')}
                          </div>
                        </div>
                        {/* Assistant message fills remaining height */}
                        <div className="flex-1 flex items-center w-full">
                          <div className="w-full max-w-[770px] px-8 py-6 pb-40 text-left text-[48px] font-thin text-gray-300">
                            <TextAnimate animation="blurIn">
                              {assistantMsg.parts.map((part, idx) =>
                                part.type === 'text' ? part.text : ''
                              ).join('')}
                            </TextAnimate>
                          </div>
                        </div>
                      </div>
                    );
                    i++; // Skip the assistant message in the next loop
                  } else {
                    // User message with no assistant response yet (no ref)
                    pairs.push(
                      <div
                        key={userMsg.id}
                        className="min-h-screen w-full flex flex-col"
                      >
                        <div className="w-full flex justify-end pt-8">
                          <TextAnimate animation="blurInUp">
                            <div className="bg-[var(--stroke)] text-[var(--foreground)] px-4 py-2 rounded-full max-w-[80%] text-right shadow-lg self-end">
                              {userMsg.parts.map((part, idx) =>
                                part.type === 'text' ? part.text : ''
                              ).join('')}
                            </div>
                          </TextAnimate>
                        </div>
                      </div>
                    );
                  }
                }
                // If the first message is from assistant and not yet paired
                if (i === 0 && messages[i].role === 'assistant') {
                  const assistantMsg = messages[i];
                  pairs.push(
                    <div
                      key={assistantMsg.id}
                      className="min-h-screen w-full flex flex-col"
                      ref={i === latestAssistantIdx ? latestPairRef : undefined}
                    >
                      <div className="flex-1 flex items-center w-full">
                        <div className="w-full max-w-[770px] px-8 py-6 pb-40 text-left text-[48px] font-thin text-gray-300">
                          <TextAnimate animation="blurIn">
                            {assistantMsg.parts.map((part, idx) =>
                              part.type === 'text' ? part.text : ''
                            ).join('')}
                          </TextAnimate>
                        </div>
                      </div>
                    </div>
                  );
                }
              }
              return pairs;
            })()}
          </div>
        </div>
      </div>
      {/* Input form container */}
      <div
        className={
          `fixed left-1/2 bottom-6 -translate-x-1/2 w-screen flex justify-center items-center transition-all duration-1000 ease-in-out`
        }
        style={{
          zIndex: 10,
          paddingBottom: hasUserMessage ? 0 : '45vh',
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="w-[770px] flex gap-2 justify-center items-center bg-[var(--background)] border border-[var(--stroke)] rounded-full shadow px-3 py-2 text-[var(--foreground)]"
        >
          <input
            ref={inputRef}
            className="flex-1 h-12 rounded-full border-none outline-none px-4 bg-transparent text-[var(--foreground)] placeholder:text-gray-500"
            style={{ minHeight: 48, maxHeight: 48 }}
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={status !== 'ready'}
            autoFocus
          />
          <button
            type="submit"
            className="w-10 h-10 aspect-square bg-[var(--foreground)] text-white rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity duration-200 p-0"
            disabled={status !== 'ready' || !input.trim()}
            aria-label="Send"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--stroke)' }} className="lucide lucide-arrow-up-icon lucide-arrow-up"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
