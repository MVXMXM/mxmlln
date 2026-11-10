import Link from "next/link";

/**
 * The portfolio chatbot's message types, using the production markup + class
 * names from public/components/NavBar.html so the specimens render identically
 * to the live chat (styles pulled verbatim into system.css). Content mirrors a
 * real recommendation from the homepage chat. Static, so no 'use client' is
 * needed.
 */
export function ChatDemo() {
  return (
    <div className="chat-demo-thread">
      {/* User query */}
      <div className="chatQueryContainer">
        <div className="chatQuery">
          <p>Show me your work on AI interfaces.</p>
        </div>
      </div>

      {/* Assistant text reply */}
      <div className="chatBlurb">
        <div className="chatResponseLogoContainer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/LogoHover.gif" className="chatResponseLogo" alt="" />
        </div>
        <p>Let&rsquo;s find a relevant case study for you.</p>
      </div>

      {/* Assistant recommendation — link card */}
      <div className="chatCardURL">
        <Link href="/blog/designing-ai-beyond-conversational-interfaces">
          <div className="chatSuggestionCard">
            <div className="chatCardImageContainer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/Abstraction.gif" className="chatCardImage" alt="" />
            </div>
            <div className="chatCardTextBlock">
              <div className="chatCardHeader">
                <p className="chatCardHeaderTitle">When Words Cannot Describe</p>
              </div>
              <div className="chatCardDescription">
                <p className="chatCardDescriptionText">
                  In this article for Smashing Magazine, I write about how
                  Artificial Intelligence is evolving the computing paradigm,
                  letting designers craft more intuitive user interfaces.
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
