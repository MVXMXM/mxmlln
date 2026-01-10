"use client";

import { useState } from "react";
import BrowserWindow from "@/components/BrowserWindow";

export default function Page() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const windows = Array.from({ length: 7 }, (_, i) => i - 4).reverse();
  const overlap = 220;
  const revealOffset = 240;
  const hoverMargin = 18;
  const expandedWidth = 380;
  const collapsedWidth = expandedWidth - 48;

  const getNeighborShift = (idx: number) => {
    if (hoveredIdx === null || hoveredIdx === idx) return 0;
    return idx < hoveredIdx ? -revealOffset : revealOffset;
  };

  return (
    <div
      className="w-full flex items-center justify-center bg-[var(--n3)] p-8"
      style={{ minHeight: "100dvh" }}
    >
      <div className="w-full h-full">
        <div className="flex min-w-full flex-nowrap items-center justify-center">
          {windows.map((offset, idx) => (
            <div
              key={offset}
              className="h-[260px] flex-shrink-0"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                width: hoveredIdx === idx ? expandedWidth : collapsedWidth,
                marginLeft: `${(idx === 0 ? 0 : -overlap) + (hoveredIdx === idx ? hoverMargin : 0)}px`,
                zIndex: windows.length - idx,
                transform: `translateX(${getNeighborShift(idx)}px)`,
                transition: hoveredIdx === idx
                  ? "transform 350ms ease, width 280ms ease, margin-left 280ms ease"
                  : "transform 250ms ease, width 200ms ease, margin-left 200ms ease",
              }}
            >
              <BrowserWindow isHovered={hoveredIdx === idx} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

