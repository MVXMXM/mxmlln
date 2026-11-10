"use client";
import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, useState } from 'react';
import { TextAnimate } from "@/registry/magicui/TextAnimate";

export default function Page() {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const latestMsgRef = useRef<HTMLDivElement>(null);
  const [hasUserMessage, setHasUserMessage] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    onFinish: () => {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
  });

  const prevMessagesLength = useRef(messages.length);

  // Find the index of the last user message
  const lastUserMsgIdx = [...messages].reverse().findIndex(m => m.role === 'user');
  const lastUserMsgAbsIdx = lastUserMsgIdx === -1 ? -1 : messages.length - 1 - lastUserMsgIdx;

  useEffect(() => {
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
          // Use scrollTop to bring the message to the top with a 24px gap
          scrollContainerRef.current.scrollTo({
            top: el.offsetTop - 24,
            behavior: 'smooth',
          });
        }
      });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

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
            {messages.map((message, idx) => (
              message.role === 'user' ? (
                <div
                  key={message.id}
                  className="flex justify-end"
                  id={idx === lastUserMsgAbsIdx ? 'latest-user-message' : undefined}
                >
                  <TextAnimate animation="blurInUp" className="bg-[var(--stroke)] text-[var(--foreground)] px-4 py-2 rounded-full max-w-[80%] text-right">
                    {message.parts.map((part, idx) => (
                      <span key={idx}>{part.type === 'text' ? part.text : null}</span>
                    ))}
                  </TextAnimate>
                </div>
              ) : (
                <div
                  key={message.id}
                  className="flex justify-start w-[770px]"
                  ref={idx === messages.length - 1 ? latestMsgRef : undefined}
                >
                  <div className="px-4 py-2 rounded-lg max-w-full text-left">
                    <TextAnimate animation="blurIn">
                      {message.parts.map((part, idx) =>
                        part.type === 'text' ? part.text : ''
                      ).join('')}
                    </TextAnimate>
                  </div>
                </div>
              )
            ))}
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
