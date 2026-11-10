export function ChatDemo() {
  return (
    <div className="chat-demo-thread">
      <div className="chatQueryContainer">
        <div className="chatQuery">
          <p>Show me your work on AI interfaces.</p>
        </div>
      </div>

      <div className="chatBlurb">
        <div className="chatResponseLogoContainer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/LogoHover.gif" className="chatResponseLogo" alt="" />
        </div>
        <p>Let&rsquo;s find a relevant case study for you.</p>
      </div>
    </div>
  );
}
