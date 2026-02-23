"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

// WebGL shader from 024 - vertex
const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// WebGL shader from 024 - fragment (flower/orb)
const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  uniform vec2 u_mouse;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_mood_hue;

  vec3 hsv2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    rgb = rgb * rgb * (3.0 - 2.0 * rgb);
    return c.z * mix(vec3(1.0), rgb, c.y);
  }

  void main() {
    vec2 center = u_resolution * 0.5;
    vec2 diff = (gl_FragCoord.xy - center) / u_resolution.y;
    float dist = length(diff);

    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    float angle = atan(diff.y, diff.x);
    float petalCount = 11.0;
    float baseRadius = 0.28 + 0.03 * sin(u_time * 0.6);
    float angularSpeed = mix(0.2, 26.0, u_mouse.x);
    float petalWave = 0.08 * sin(petalCount * angle + u_time * angularSpeed);
    float radius = baseRadius + petalWave;
    float edgeSoftness = 0.12;
    vec2 mousePos = vec2(u_mouse.x, u_mouse.y);
    float mouseDist = length(mousePos - vec2(0.5));
    float proximity = 1.0 - clamp(mouseDist / 0.5, 0.0, 1.0);
    radius *= mix(1.0, 0.4, proximity);
    float ring = smoothstep(radius + edgeSoftness, radius - edgeSoftness, dist);

    float hue = mix(u_mood_hue, u_mouse.y, 0.15);
    vec3 highlight = hsv2rgb(vec3(hue, 0.7, 0.6));

    gl_FragColor = vec4(highlight, ring);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const err = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Shader compile failed: ' + err);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vSource: string, fSource: string): WebGLProgram {
  const vert = createShader(gl, gl.VERTEX_SHADER, vSource);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fSource);
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
  }
  return program;
}

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

// Single palette: mood drives both page bg and shader flower color
const MOOD_PALETTE: Record<number, { bg: string; flowerHue: number }> = {
  1: { bg: '#E2E8F0', flowerHue: 0.42 }, // lightest - encouraging/happiness (green)
  2: { bg: '#CBD5E1', flowerHue: 0.45 }, // light - supportive
  3: { bg: '#94A3B8', flowerHue: 0.50 }, // medium - encouraging/sadness (cyan)
  4: { bg: '#475569', flowerHue: 0.55 }, // darkest - acknowledging/candidness (cooler)
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
  const [moodHue, setMoodHue] = useState(0.42);
  const [hasText, setHasText] = useState(false);
  const [animatingPill, setAnimatingPill] = useState<AnimatingPill | null>(null);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [weatherFetched, setWeatherFetched] = useState(false);
  const [weatherDesc, setWeatherDesc] = useState<string | null>(null);
  const [nycTime, setNycTime] = useState<string | null>(null);
  const [nycSeconds, setNycSeconds] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const shaderCanvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const moodHueRef = useRef(0.42);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    moodHueRef.current = moodHue;
  }, [moodHue]);

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
          if (data.mood && MOOD_PALETTE[data.mood]) {
            setBgColor(MOOD_PALETTE[data.mood].bg);
            setMoodHue(MOOD_PALETTE[data.mood].flowerHue);
          }
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

  // WebGL shader from 024 - init and render loop
  useEffect(() => {
    const canvas = shaderCanvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true });
    if (!gl) return;

    const c = canvas;
    const g = gl;

    g.getExtension('OES_vertex_array_object'); // optional
    const program = createProgram(g, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    g.useProgram(program);

    const positions = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const positionBuffer = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, positionBuffer);
    g.bufferData(g.ARRAY_BUFFER, positions, g.STATIC_DRAW);

    const posAttrib = g.getAttribLocation(program, 'a_position');
    g.enableVertexAttribArray(posAttrib);
    g.vertexAttribPointer(posAttrib, 2, g.FLOAT, false, 0, 0);

    const uMouse = g.getUniformLocation(program, 'u_mouse');
    const uResolution = g.getUniformLocation(program, 'u_resolution');
    const uTime = g.getUniformLocation(program, 'u_time');
    const uMoodHue = g.getUniformLocation(program, 'u_mood_hue');

    function resize() {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const w = Math.floor(c.clientWidth * dpr);
      const h = Math.floor(c.clientHeight * dpr);
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }
    }

    function render(now: number) {
      resize();
      g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);

      const seconds = now * 0.001;
      const { x, y } = mouseRef.current;
      g.uniform2f(uMouse, x, y);
      g.uniform2f(uResolution, g.drawingBufferWidth, g.drawingBufferHeight);
      g.uniform1f(uTime, seconds);
      g.uniform1f(uMoodHue, moodHueRef.current);
      g.drawArrays(g.TRIANGLES, 0, 3);

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);

    const onMouseMove = (e: MouseEvent) => {
      const rect = c.getBoundingClientRect();
      mouseRef.current = {
        x: Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
        y: Math.min(Math.max(1 - (e.clientY - rect.top) / rect.height, 0), 1),
      };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: 0.5, y: 0.5 };
    };

    c.addEventListener('mousemove', onMouseMove);
    c.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      c.removeEventListener('mousemove', onMouseMove);
      c.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

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

        // Update background and shader hue from shared mood palette
        if (data.mood && MOOD_PALETTE[data.mood]) {
          setBgColor(MOOD_PALETTE[data.mood].bg);
          setMoodHue(MOOD_PALETTE[data.mood].flowerHue);
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

  const isDarkStep = bgColor === MOOD_PALETTE[4].bg;

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');

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

      {/* Shader from 024 - full viewport; shrinks, blurs, and sits above text when hasText */}
      <div 
        className="fixed inset-0 pointer-events-none transition-all duration-600 ease-out"
        style={{ 
          zIndex: hasText ? 2 : 0,
          transform: hasText ? 'scale(0.4)' : 'scale(1)',
          filter: hasText ? 'blur(150px)' : 'blur(0px)',
        }}
      >
        <canvas
          ref={shaderCanvasRef}
          className="w-full h-full block"
          width={1}
          height={1}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      <div className="relative w-full max-w-[700px] h-full flex flex-col justify-center items-center">
        {/* Animated text display */}
        <h1 
          className="text-center text-[48px] leading-[110%] tracking-[-1.44px] mb-8 flex flex-wrap justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] w-full pointer-events-none mt-6"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: isDarkStep ? '#F9FAFB' : '#334155' }}
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
