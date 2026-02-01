"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

// Helper to generate a variable weather description for the LLM
function makeWeatherDescription(weather: string) {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  if (weather.includes('rain')) return pick(["rainy", "showery", "wet and drizzly", "a day of steady rain", "NYC is getting a good soaking"]);
  if (weather.includes('cloud')) return pick(["cloudy", "overcast", "a sky full of clouds", "gray and subdued", "the sun is hiding behind clouds"]);
  if (weather.includes('clear') || weather.includes('sun')) return pick(["sunny", "bright and clear", "bathed in sunshine", "a perfect blue sky", "NYC is sparkling in the sun"]);
  if (weather.includes('snow')) return pick(["snowy", "blanketed in snow", "flurries are falling", "a winter wonderland", "NYC is shimmering with snow"]);
  if (weather.includes('fog')) return pick(["foggy", "misty", "shrouded in fog", "the city is wrapped in mist", "a mysterious, fog-laden day"]);
  return weather;
}

// Background colors for different mood steps
const MOOD_COLORS: Record<number, string> = {
  1: '#E2E8F0', // lightest gray - encouraging/happiness
  2: '#CBD5E1', // light gray - supportive/confusion
  3: '#94A3B8', // medium gray - encouraging/sadness
  4: '#475569', // darkest gray - acknowledging/candidness
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
  step?: number;
}

interface AnimatingPill {
  id: number;
  text: string;
  isAnimating: boolean;
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [visibleChars, setVisibleChars] = useState<boolean[]>([]);
  const [bgColor, setBgColor] = useState('#E2E8F0');
  const [hasText, setHasText] = useState(false);
  const [animatingPill, setAnimatingPill] = useState<AnimatingPill | null>(null);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [weatherFetched, setWeatherFetched] = useState(false);
  const [weatherDesc, setWeatherDesc] = useState<string | null>(null);
  const [nycTime, setNycTime] = useState<string | null>(null);
  const [nycSeconds, setNycSeconds] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  // Fetch weather and time on mount
  useEffect(() => {
    async function fetchWeatherAndTime() {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current_weather=true');
        const data = await res.json();
        const code = data.current_weather.weathercode;
        let weather = '';
        if (code === 0) weather = 'clear';
        else if ([1,2,3].includes(code)) weather = 'cloudy';
        else if ([45,48].includes(code)) weather = 'foggy';
        else if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) weather = 'rainy';
        else if ([71,73,75,77,85,86].includes(code)) weather = 'snowy';
        else weather = 'unknown';
        setWeatherDesc(makeWeatherDescription(weather));
        const now = new Date();
        setNycTime(now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', hour12: true }));
        setNycSeconds(now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', second: '2-digit' }));
      } catch {
        setWeatherDesc(null);
        setNycTime(null);
        setNycSeconds(null);
      } finally {
        setWeatherFetched(true);
      }
    }
    fetchWeatherAndTime();
  }, []);

  // Animate text character by character
  const animateText = useCallback((text: string) => {
    setDisplayText(text);
    setVisibleChars(new Array(text.length).fill(false));
    setHasText(text !== "What's on your mind?");

    // Stagger character visibility
    text.split('').forEach((_, index) => {
      setTimeout(() => {
        setVisibleChars(prev => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, index * 30);
    });
  }, []);

  // Fallback to "What's on your mind?" only when weather fetch failed (opener won't load)
  useEffect(() => {
    if (weatherFetched && !weatherDesc && !initialMessageSent) {
      animateText("What's on your mind?");
    }
  }, [animateText, weatherFetched, weatherDesc, initialMessageSent]);

  // Send initial weather-based opener when weather/time is loaded
  useEffect(() => {
    if (initialMessageSent || !weatherDesc || !nycTime || !nycSeconds || messages.length > 0) return;

    const sendInitialOpener = async () => {
      setInitialMessageSent(true);
      setIsLoading(true);

      const initialContext = `The current weather in NYC is: ${weatherDesc}. The current time in NYC is: ${nycTime}. The current time in seconds is: ${nycSeconds}. State the time only by the hour (e.g., '5PM'), not the full time. Use the seconds value internally to help you randomize or select a topic. State the weather and time in the location, then add around six words of commentary on them. Then ask the user if they will do a specific activity that is fitting for the provided weather and time, but do not choose activities that are too obvious. The question should be surprising, succinct (under ten words), and not about the weather or time itself, nor include a greeting.`;

      try {
        const response = await fetch('/026/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: initialContext }],
          }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (data.text) {
          animateText(data.text);
          if (data.mood && MOOD_COLORS[data.mood]) setBgColor(MOOD_COLORS[data.mood]);
          setMessages([
            { role: 'user', content: initialContext },
            { role: 'assistant', content: data.text, step: data.mood },
          ]);
        } else {
          animateText("What's on your mind?");
          setInitialMessageSent(false);
        }
      } catch (error) {
        console.error('Error loading opener:', error);
        animateText("What's on your mind?");
        setInitialMessageSent(false);
      } finally {
        setIsLoading(false);
      }
    };

    sendInitialOpener();
  }, [initialMessageSent, weatherDesc, nycTime, nycSeconds, messages.length, animateText]);

  // Refocus input when loading completes
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Create animating pill
    const pillId = Date.now();
    setAnimatingPill({ id: pillId, text: userMessage, isAnimating: false });
    
    // Trigger animation after a brief delay
    setTimeout(() => {
      setAnimatingPill(prev => prev ? { ...prev, isAnimating: true } : null);
      
      // Remove pill after animation completes
      setTimeout(() => {
        setAnimatingPill(null);
      }, 1500);
    }, 50);

    // Clear display text
    setDisplayText('');
    setVisibleChars([]);
    setHasText(false);

    // Add user message to state
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);

    try {
      const response = await fetch('/026/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.text) {
        // Animate the assistant's reply
        animateText(data.text);

        // Update background based on mood
        if (data.mood && MOOD_COLORS[data.mood]) {
          setBgColor(MOOD_COLORS[data.mood]);
        }

        // Store assistant message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.text,
          step: data.mood,
        }]);
      } else {
        animateText('No response received');
      }
    } catch (error) {
      console.error('Error:', error);
      animateText('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
      // Focus is handled by useEffect watching isLoading
    }
  };

  const isDarkStep = bgColor === '#475569';

  return (
    <div 
      className="min-h-screen w-full flex justify-center items-center transition-colors duration-600"
      style={{ 
        backgroundColor: bgColor,
        fontFamily: "var(--font-sans), 'Archivo', sans-serif",
        paddingBottom: '100px',
      }}
    >
      <style jsx global>{`
        @keyframes pulseBlur {
          0%, 100% { filter: blur(30px); }
          50% { filter: blur(15px); }
        }
        
        .message-pill {
          background: #fff;
          color: #334155;
          padding: 15px 20px;
          border-radius: 16px;
          font-family: var(--font-sans), 'Archivo', sans-serif;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          opacity: 0.75;
          filter: blur(0px);
          position: absolute;
          bottom: 70px;
          left: 50%;
          transform: translateX(-50%) translateY(0);
          transition: opacity 1.5s ease, filter 1.5s ease, transform 1s ease, width 1.5s ease;
          pointer-events: none;
          text-align: left;
          word-wrap: break-word;
          white-space: nowrap;
          width: 700px;
          max-width: calc(100% - 48px);
        }
        
        .message-pill.animating {
          opacity: 0;
          filter: blur(125px);
          width: 300px;
          transform: translateX(-50%) translateY(-50vh);
        }
      `}</style>

      <div className="relative w-full max-w-[700px] h-full flex flex-col justify-center items-center">
        {/* Animated blur sphere */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center items-center z-[1] h-[200px] w-[300px] mt-6 transition-all duration-600"
          style={{ 
            filter: hasText ? 'blur(150px)' : 'blur(0px)',
            opacity: 1,
          }}
        >
          <svg 
            width="300" 
            height="300" 
            viewBox="0 0 200 200" 
            preserveAspectRatio="xMidYMid meet"
            style={{ animation: 'pulseBlur 3s infinite' }}
          >
            <defs>
              <linearGradient id="shimmer" x1="-350" y1="0" x2="50" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="repeat">
                <stop offset="0%" stopColor="rgba(29, 205, 152, 0.25)"/>
                <stop offset="15%" stopColor="rgba(29, 205, 152, 0.25)"/>
                <stop offset="50%" stopColor="rgba(29, 205, 152, 0.75)"/>
                <stop offset="85%" stopColor="rgba(29, 205, 152, 0.25)"/>
                <stop offset="100%" stopColor="rgba(29, 205, 152, 0.25)"/>
                <animate attributeName="x1" values="-350;50" dur="3s" repeatCount="indefinite" calcMode="linear" />
                <animate attributeName="x2" values="50;450" dur="3s" repeatCount="indefinite" calcMode="linear" />
              </linearGradient>
              <radialGradient id="sphereLight" cx="-100" cy="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="rgba(29, 205, 152, 0.5)"/>
                <stop offset="30%" stopColor="rgba(29, 205, 152, 0.4)"/>
                <stop offset="50%" stopColor="rgba(29, 205, 152, 0.3)"/>
                <stop offset="70%" stopColor="rgba(29, 205, 152, 0)"/>
                <animate attributeName="cx" values="-100;300" dur="3s" repeatCount="indefinite" calcMode="linear" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="80" fill="url(#shimmer)" />
            <circle cx="100" cy="100" r="80" fill="url(#sphereLight)" />
          </svg>
        </div>

        {/* Animated text display */}
        <h1 
          className="text-center text-[48px] font-thin leading-[110%] tracking-[-1.44px] mb-8 flex flex-wrap justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] w-full pointer-events-none mt-6"
          style={{ color: isDarkStep ? '#F9FAFB' : '#334155' }}
        >
          {displayText.split(/(\s+)/).map((word, wordIdx) => {
            if (word.trim() === '' && word.includes(' ')) {
              // Space character
              const charIndex = displayText.split(/(\s+)/).slice(0, wordIdx).join('').length;
              return (
                <span 
                  key={`space-${wordIdx}`} 
                  className="inline-block"
                  style={{ width: '0.25em' }}
                >
                  &nbsp;
                </span>
              );
            }

            // Calculate starting index for this word
            let startIndex = 0;
            for (let i = 0; i < wordIdx; i++) {
              startIndex += displayText.split(/(\s+)/)[i].length;
            }

            return (
              <span key={`word-${wordIdx}`} className="inline-block whitespace-nowrap">
                {word.split('').map((char, charIdx) => {
                  const globalIndex = startIndex + charIdx;
                  const isPunctuation = /[.,!?;:'"\-—–]/.test(char);
                  const isVisible = visibleChars[globalIndex];

                  return (
                    <span
                      key={`char-${globalIndex}`}
                      className="inline transition-all duration-300"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        filter: isVisible ? 'blur(0)' : 'blur(8px)',
                        transform: isVisible ? 'translateY(0)' : `translateY(${isPunctuation ? '10px' : '15px'})`,
                        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </h1>
      </div>

      {/* Input wrapper */}
      <div ref={inputWrapperRef} className="fixed bottom-6 left-0 w-full flex justify-center items-center flex-col gap-3">
        {/* Animating message pill */}
        {animatingPill && (
          <div 
            className={`message-pill ${animatingPill.isAnimating ? 'animating' : ''}`}
          >
            {animatingPill.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="w-full flex justify-center px-6">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything"
            disabled={isLoading}
            autoFocus
            className="w-full max-w-[700px] py-4 px-5 border border-[#e0e0e0] rounded-2xl bg-white text-[#333] text-base font-thin transition-all duration-300 outline-none disabled:bg-[#e8edf2] disabled:shadow-none"
            style={{
              caretColor: '#1DCD98',
              boxShadow: '0 481px 135px 0 rgba(0, 0, 0, 0.00), 0 308px 123px 0 rgba(0, 0, 0, 0.01), 0 173px 104px 0 rgba(0, 0, 0, 0.05), 0 77px 77px 0 rgba(0, 0, 0, 0.09), 0 19px 42px 0 rgba(0, 0, 0, 0.10)',
            }}
          />
        </form>
      </div>
    </div>
  );
}
