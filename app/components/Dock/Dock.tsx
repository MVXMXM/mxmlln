'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';
import folioVersion from '@/folio-version.json';
import { DockGlass } from './DockGlass';
import './dock.css';

export type DockItem = 'about' | 'work' | 'chat';
type Panel = 'info' | 'contact';

const ITEMS: { id: DockItem; label: string }[] = [
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
  activeItem: activeItemProp,
  onActiveItemChange,
  onSend,
}: {
  contained?: boolean;
  activeItem?: DockItem;
  onActiveItemChange?: (item: DockItem) => void;
  onSend?: () => void;
}) {
  const [uncontrolledItem, setUncontrolledItem] = useState<DockItem>('work');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [closing, setClosing] = useState(false);
  const [contactSettled, setContactSettled] = useState(false);
  const [composer, setComposer] = useState(false);
  const [composerClosing, setComposerClosing] = useState(false);
  const [draft, setDraft] = useState('');
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const segmentsRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const activeItem = activeItemProp ?? uncontrolledItem;

  const closeComposer = useCallback(() => {
    setComposer(false);
    setComposerClosing(true);
    setUncontrolledItem('work');
    onActiveItemChange?.('work');
    if (composerTimer.current) clearTimeout(composerTimer.current);
    // Outlasts the bar fade. Clearing sooner lets the indicator travel while the labels are still invisible.
    composerTimer.current = setTimeout(() => setComposerClosing(false), 480);
  }, [onActiveItemChange]);

  const openComposer = useCallback(() => {
    if (composerTimer.current) clearTimeout(composerTimer.current);
    setComposerClosing(false);
    setComposer(true);
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    const container = cluster?.querySelector<HTMLElement>('.dockDynamicContainer');
    const content = cluster?.querySelector<HTMLElement>('.dockBarSegController');
    if (!container || !content) return;
    // The open transition swaps the bar to absolute, so max-content drops to 0
    // and the panel appears to grow from nothing. A measured floor stays put.
    const apply = () => {
      const width = Math.ceil(content.getBoundingClientRect().width);
      if (width) container.style.setProperty('--dock-collapsed-width', `${width}px`);
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
      const active = root.querySelector<HTMLElement>('.dockBarItem_OnState');
      const labels = indicator.querySelector<HTMLElement>('.dockBarIndicatorLabels');
      if (!active || !labels) return;
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.height = `${active.offsetHeight}px`;
      indicator.style.transform = `translate3d(${active.offsetLeft}px, ${active.offsetTop}px, 0)`;
      labels.style.transform = `translate3d(${-active.offsetLeft}px, ${-active.offsetTop}px, 0)`;
      const buttons = [...root.querySelectorAll<HTMLElement>('button')];
      const copies = [...labels.querySelectorAll<HTMLElement>('.dockBarIndicatorLabel')];
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
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node) || clusterRef.current?.contains(target)) return;
      closePanel();
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [panel]);

  useEffect(() => {
    if (!composer) return;
    const frame = window.setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 80);
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeComposer();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(frame);
      document.removeEventListener('keydown', onKey);
    };
  }, [composer, closeComposer]);

  useEffect(() => {
    if (panel !== 'contact') return;
    const id = window.setTimeout(() => setContactSettled(true), 1450);
    return () => window.clearTimeout(id);
  }, [panel]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (composerTimer.current) clearTimeout(composerTimer.current);
    };
  }, []);

  function selectItem(item: DockItem) {
    if (item === 'chat') openComposer();
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
      className={contained ? 'mx-dock mx-dock--contained' : 'mx-dock'}
      data-panel={panel ?? undefined}
      data-closing={closing ? 'true' : undefined}
      data-settled={contactSettled ? 'true' : undefined}
      data-composer={composer ? 'true' : undefined}
      data-composer-closing={composerClosing ? 'true' : undefined}
    >
      <div className="dockCluster" ref={clusterRef}>
      <div className="dockDynamicContainer">
        <DockGlass />
        <div className="dockBar">
          <div className="dockBarSegController" inert={composer || undefined}>
            <button type="button" onClick={() => openPanel('info')} aria-label="Open info menu">
              <LottieMark
                path="/assets/LogoSpin2026.json"
                fallback="/assets/LogoSpin2024.SML.gif"
                className="lottieMark lottieMark--dock"
                label="Open info menu"
              />
            </button>
            <div className="dockBarSegments" ref={segmentsRef}>
              <span className="dockBarIndicator" ref={indicatorRef} aria-hidden="true">
                <span className="dockBarIndicatorLabels">
                  {ITEMS.map((item) => (
                    <span key={item.id} className="dockBarIndicatorLabel">
                      {item.label}
                    </span>
                  ))}
                </span>
              </span>
              {ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={activeItem === item.id ? 'dockBarItem_OnState' : 'dockBarItem'}
                  aria-expanded={item.id === 'chat' ? composer : undefined}
                  onClick={() => selectItem(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => openPanel('contact')} aria-label="Open contact menu">
              <img className="openDockContactView" src="/assets/ContactSML.png" alt="" />
            </button>
          </div>
          <form
            className="dockComposer"
            inert={!composer || undefined}
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              setDraft('');
              onSend?.();
            }}
          >
            <span className="dockComposerCaret" aria-hidden="true" />
            <input
              ref={inputRef}
              className="dockComposerField"
              value={draft}
              placeholder="Ask me anything..."
              aria-label="Message"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="send"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }}
            />
            <button type="button" className="closeButton" onClick={closeComposer} aria-label="Close chat">
              <CloseMark />
            </button>
          </form>
        </div>

        <div className="infoViewContent">
          <div className="viewHeader">
            <span className="viewHeaderText">MaxOS v{folioVersion.version}</span>
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
          <div className="dockInfoActions">
            <a className="dockInfoAction dockInfoButton dockInfoButton--secondary" href="https://github.com/MVXMXM/mxmlln" target="_blank" rel="noreferrer">
              Source code
            </a>
            <a className="dockInfoAction dockInfoButton dockInfoButton--secondary" href="/system">
              Design system
            </a>
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
    </div>
  );

  if (contained) return <div className="mx-dock-frame">{root}</div>;
  return root;
}
