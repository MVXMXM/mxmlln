"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

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

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [displayText, setDisplayText] = useState("What's on your mind?");
  const [visibleChars, setVisibleChars] = useState<boolean[]>([]);
  const [bgColor, setBgColor] = useState('#E2E8F0');
  const [hasText, setHasText] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Initial animation
  useEffect(() => {
    animateText("What's on your mind?");
  }, [animateText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

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
      inputRef.current?.focus();
    }
  };

  const isDarkStep = bgColor === '#475569';

  return (
    <div 
      className="min-h-screen w-full flex justify-center items-center transition-colors duration-600"
      style={{ 
        backgroundColor: bgColor,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        paddingBottom: '100px',
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Spectral:wght@200&display=swap');
        
        @keyframes pulseBlur {
          0%, 100% { filter: blur(30px); }
          50% { filter: blur(15px); }
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
          className="text-center font-[Spectral] text-[48px] font-extralight leading-[110%] tracking-[-1.44px] mb-8 flex flex-wrap justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] w-full pointer-events-none mt-6"
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
      <div className="fixed bottom-6 left-0 w-full flex justify-center items-center flex-col gap-3">
        <form onSubmit={handleSubmit} className="w-full flex justify-center px-6">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything"
            disabled={isLoading}
            autoFocus
            className="w-full max-w-[700px] py-4 px-5 border border-[#e0e0e0] rounded-2xl bg-white text-[#333] text-base font-extralight transition-all duration-300 outline-none disabled:bg-[#e8edf2] disabled:shadow-none"
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
