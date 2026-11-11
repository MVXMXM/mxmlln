'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import folioVersion from '@/folio-version.json';
import { DockGlass } from './DockGlass';
import './dock.css';

export type NavItem = 'about' | 'work' | 'chat';
type Panel = 'info' | 'contact' | 'chat';

const ITEMS: { id: NavItem; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'chat', label: 'Chat' },
];

const CONTACT_ROWS = [
  [
    { label: 'MAX@MXMLLN.COM', href: 'mailto:max@mxmlln.com', icon: '/assets/contact/EmailButton.svg', alt: 'Email' },
    { label: 'X / TWITTER', href: 'https://x.com/MVXMXM', icon: '/assets/contact/TwitterButton.svg', alt: 'Twitter' },
    { label: 'LINKEDIN', href: 'https://www.linkedin.com/in/maximilliannyc/', icon: '/assets/contact/LinkedInButton.svg', alt: 'LinkedIn' },
  ],
  [
    { label: 'MEDIUM', href: 'https://medium.com/@MaximillianNYC', icon: '/assets/contact/MediumButton.svg', alt: 'Medium' },
    { label: 'INSTAGRAM', href: 'https://www.instagram.com/maximillian.nyc', icon: '/assets/contact/InstaButton.svg', alt: 'Instagram' },
    { label: 'DRIBBBLE', href: 'https://dribbble.com/MaximillianNYC', icon: '/assets/contact/DribbbleButton.svg', alt: 'Dribbble' },
  ],
];

function CloseMark() {
  return (
    <svg className="closeButtonIcon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4 4l8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LottieMark({
  path,
  fallback,
  className,
  label,
}: {
  path: string;
  fallback: string;
  className: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    // Lottie owns this node. The fallback image stays a sibling so React
    // never removes a child Lottie already detached.
    const anim = lottie.loadAnimation({
      container,
      path,
      renderer: 'svg',
      loop: true,
      autoplay: true,
    });
    const onReady = () => setReady(true);
    anim.addEventListener('DOMLoaded', onReady);
    return () => {
      anim.removeEventListener('DOMLoaded', onReady);
      anim.destroy();
    };
  }, [path]);

  return (
    <div className={className}>
      <div ref={ref} className="lottieMarkCanvas" />
      {!ready && <img src={fallback} alt={label} />}
    </div>
  );
}

export function Dock({
  contained = false,
  backdrop = false,
  activeItem: activeItemProp,
  onActiveItemChange,
}: {
  /** Keep the fixed bar inside a positioned stage instead of the viewport. */
  contained?: boolean;
  /** Paint the homepage gradient behind the bar so the blur has something to sample. */
  backdrop?: boolean;
  activeItem?: NavItem;
  onActiveItemChange?: (item: NavItem) => void;
}) {
  const [uncontrolledItem, setUncontrolledItem] = useState<NavItem>('work');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [closing, setClosing] = useState(false);
  const [contactSettled, setContactSettled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentsRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const activeItem = activeItemProp ?? uncontrolledItem;

  useEffect(() => {
    const container = containerRef.current;
    const content = container?.querySelector<HTMLElement>('.navBarSegController');
    if (!container || !content) return;
    // The open transition swaps the bar to absolute, so max-content drops to 0
    // and the panel appears to grow from nothing. A measured floor stays put.
    const apply = () => {
      const width = Math.ceil(content.getBoundingClientRect().width);
      if (width) container.style.setProperty('--nav-collapsed-width', `${width}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const root = segmentsRef.current;
    const indicator = indicatorRef.current;
    if (!root || !indicator) return;
    const place = () => {
      const active = root.querySelector<HTMLElement>('.navBarItem_OnState');
      const labels = indicator.querySelector<HTMLElement>('.navBarIndicatorLabels');
      if (!active || !labels) return;
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.height = `${active.offsetHeight}px`;
      indicator.style.transform = `translate3d(${active.offsetLeft}px, ${active.offsetTop}px, 0)`;
      labels.style.transform = `translate3d(${-active.offsetLeft}px, ${-active.offsetTop}px, 0)`;
      const buttons = [...root.querySelectorAll<HTMLElement>('button')];
      const copies = [...labels.querySelectorAll<HTMLElement>('.navBarIndicatorLabel')];
      buttons.forEach((button, index) => {
        const copy = copies[index];
        if (!copy) return;
        copy.style.left = `${button.offsetLeft}px`;
        copy.style.top = `${button.offsetTop}px`;
        copy.style.width = `${button.offsetWidth}px`;
        copy.style.height = `${button.offsetHeight}px`;
      });
    };
    place();
    // The first placement should not travel in from 0,0.
    if (!indicator.dataset.ready) {
      requestAnimationFrame(() => {
        indicator.dataset.ready = 'true';
      });
    }
    const observer = new ResizeObserver(place);
    observer.observe(root);
    for (const button of root.querySelectorAll('button')) observer.observe(button);
    return () => observer.disconnect();
  }, [activeItem]);

  useEffect(() => {
    if (!panel) return;
    // The clear layer no longer catches the pointer, so the page can scroll.
    // A click that lands outside the panel still dismisses it.
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node) || containerRef.current?.contains(target)) return;
      closePanel();
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [panel]);

  useEffect(() => {
    if (panel !== 'contact') return;
    const id = window.setTimeout(() => setContactSettled(true), 1450);
    return () => window.clearTimeout(id);
  }, [panel]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  function selectItem(item: NavItem) {
    setUncontrolledItem(item);
    onActiveItemChange?.(item);
  }

  function openPanel(next: Panel) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(false);
    setContactSettled(false);
    setPanel(next);
  }

  function closePanel() {
    setPanel(null);
    setContactSettled(false);
    setClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setClosing(false), 1000);
  }

  const root = (
    <div
      className={contained ? 'mx-nav mx-nav--contained' : 'mx-nav'}
      data-panel={panel ?? undefined}
      data-closing={closing ? 'true' : undefined}
      data-settled={contactSettled ? 'true' : undefined}
    >
      {backdrop && (
        <>
          <div className="gradeBG" aria-hidden="true" />
          <div className="gradeFront" aria-hidden="true" />
        </>
      )}
      <div className="bottomFade" aria-hidden="true" />
      <button type="button" className="navBarOverlay" aria-label="Close menu" onClick={closePanel} />
      <div className="navDynamicContainer" ref={containerRef}>
        <DockGlass />
        <div className="navBar">
          <div className="navBarSegController">
            <button type="button" onClick={() => openPanel('info')} aria-label="Open info menu">
              <LottieMark
                path="/assets/LogoSpin2026.json"
                fallback="/assets/LogoSpin2024.SML.gif"
                className="lottieMark lottieMark--nav"
                label="Open info menu"
              />
            </button>
            <div className="navBarSegments" ref={segmentsRef}>
              <span className="navBarIndicator" ref={indicatorRef} aria-hidden="true">
                <span className="navBarIndicatorLabels">
                  {ITEMS.map((item) => (
                    <span key={item.id} className="navBarIndicatorLabel">
                      {item.label}
                    </span>
                  ))}
                </span>
              </span>
              {ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={activeItem === item.id ? 'navBarItem_OnState' : 'navBarItem'}
                  onClick={() => selectItem(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => openPanel('contact')} aria-label="Open contact menu">
              <img className="openNavContactView" src="/assets/ContactSML.png" alt="" />
            </button>
          </div>
        </div>

        <div className="infoViewContent">
          <div className="viewHeader">
            <span className="viewHeaderText">MVXMXM folio v{folioVersion.version}</span>
            <button type="button" className="closeButton" onClick={closePanel} aria-label="Close panel">
              <CloseMark />
            </button>
          </div>
          <div className="infoLogo">
            <LottieMark
              path="/assets/Sig2026.json"
              fallback="/assets/Sig2026.gif"
              className="lottieMark lottieMark--sig"
              label="MXMLLN logo"
            />
          </div>
          <div className="navInfoActions">
            <a className="navInfoAction navInfoButton navInfoButton--secondary" href="https://github.com/MVXMXM/mxmlln" target="_blank" rel="noreferrer">
              Source code
            </a>
            <a className="navInfoAction navInfoButton navInfoButton--secondary" href="/system">
              Design system
            </a>
          </div>
        </div>

        <div className="chatViewContent">
          <div className="viewHeader" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="closeButton" onClick={closePanel} aria-label="Close panel">
              <CloseMark />
            </button>
          </div>
          <form className="chatInputContainer" onSubmit={(event) => event.preventDefault()}>
            <button type="submit" className="chatSubmit" disabled>
              <img src="/assets/up.svg" className="chatSubmitIMG" alt="Submit message" />
            </button>
            <input
              type="text"
              className="chatInputField"
              name="defineProblem"
              placeholder="Tell me what you're looking for..."
              autoComplete="off"
            />
          </form>
          <div className="chatEmptyState">
            <div className="chatEmptyStateLogo">
              <LottieMark
                path="/assets/LogoSpin2026.json"
                fallback="/assets/LogoSpin2024.MED.MEZZO.gif"
                className="lottieMark lottieMark--chat"
                label="MXMLLN logo"
              />
            </div>
            <div className="chatEmptyStateText">
              <h1>Maximillian AI</h1>
              <p>
                Tell me what you&apos;re looking for <span className="ampersand">&</span> I&apos;ll find the
                <br /> most relevant content from my design portfolio.
              </p>
            </div>
            <div className="BetaBadge">
              <div className="BadgeText">BETA v1.0</div>
            </div>
          </div>
          <div className="chatResponseLog">
            <div className="chatQueryContainer">
              <div className="chatQuery">
                <p />
              </div>
            </div>
            <div className="loadingIndicator">
              <div className="lds-ellipsis">
                <div />
                <div />
                <div />
                <div />
              </div>
            </div>
            <div className="chatResponseContainer">
              <div className="chatBlurb">
                <div className="chatResponseLogoContainer">
                  <LottieMark
                    path="/assets/LogoSpin2026.json"
                    fallback="/assets/LogoSpin2024.SML.gif"
                    className="lottieMark lottieMark--response"
                    label="MXMLLN logo"
                  />
                </div>
                <p />
              </div>
              <div className="chatCardURL">
                <a href="https://www.maximillian.nyc" target="_blank" rel="noreferrer">
                  <div className="chatSuggestionCard">
                    <div className="chatCardImageContainer">
                      <img src="/assets/chatLoad.png" className="chatCardImage" alt="Preview image for chat suggestion" />
                    </div>
                    <div className="chatCardTextBlock">
                      <p className="chatCardHeaderTitle" />
                      <p className="chatCardDescriptionText" />
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="contactViewContent">
          <div className="viewHeader">
            <span className="viewHeaderText">Connect with me</span>
            <button type="button" className="closeButton" onClick={closePanel} aria-label="Close panel">
              <CloseMark />
            </button>
          </div>
          {CONTACT_ROWS.map((row, rowIndex) => (
            <div key={row[0].label} className="contactRow">
              {row.map((link, index) => (
                <div key={link.label} className="contactViewIconContainer">
                  <div className="ToolTip">
                    <div className="ToolTipBadge">
                      <div className="BadgeText">{link.label}</div>
                    </div>
                  </div>
                  <a href={link.href} target={link.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
                    <img
                      src={link.icon}
                      className="CircleButton"
                      alt={link.alt}
                      style={{ animationDelay: `${(rowIndex * row.length + index + 1) * 75}ms` }}
                    />
                  </a>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (contained) return <div className="mx-nav-frame">{root}</div>;
  return root;
}
