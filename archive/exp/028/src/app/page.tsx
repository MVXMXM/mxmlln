"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface WindowState {
  id: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  initialX: number; // Always the center X
  initialY: number; // Always the center Y
  initialScale: number; // Always the starting scale (0.3)
  targetX: number;
  targetY: number;
  targetScale: number;
  progress: number;
  duration: number;
  startTime: number;
}

export default function Page() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const windowIdRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const nextCycleTriggeredRef = useRef(false);
  const lastCycleStartTimeRef = useRef<number | null>(null);

  // Generate spiral distribution - windows arranged in a spiral pattern
  const getSpiralEdgePoint = useCallback((spiralIndex: number, totalWindows: number): { x: number; y: number; angle: number } => {
    const viewportWidth = window.innerWidth || 1920;
    const viewportHeight = window.innerHeight || 1080;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    // Window dimensions (accounting for max scale)
    const maxWindowWidth = 380 * 5.1;
    const maxWindowHeight = 260 * 5.1;
    
    // Calculate the minimum distance needed to ensure windows fully exit
    const viewportDiagonal = Math.sqrt(
      Math.pow(viewportWidth / 2, 2) + Math.pow(viewportHeight / 2, 2)
    );
    
    // Increase distance dramatically for more dramatic fan-out effect
    const minDistance = viewportDiagonal * 2.5 + Math.max(maxWindowWidth / 2, maxWindowHeight / 2) + 1000;
    
    // Create spiral pattern: multiple rotations around the circle
    // Each window is rotated further, creating a spiral
    const spiralRotations = 2.5; // Number of full rotations in the spiral
    const angleStep = (2 * Math.PI * spiralRotations) / totalWindows;
    const angle = spiralIndex * angleStep; // Start at 0 and spiral outward
    
    // Calculate point at this angle
    const distance = minDistance;
    const targetX = centerX + Math.cos(angle) * distance;
    const targetY = centerY + Math.sin(angle) * distance;
    
    return { x: targetX, y: targetY, angle };
  }, []);

  // Create a new window at the center
  const createWindow = useCallback((spiralIndex: number, totalWindows: number) => {
    const viewportWidth = window.innerWidth || 1920;
    const viewportHeight = window.innerHeight || 1080;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    const edgePoint = getSpiralEdgePoint(spiralIndex, totalWindows);
    
    // Calculate distance from center to edge for scale factor
    const distance = Math.sqrt(
      Math.pow(edgePoint.x - centerX, 2) + Math.pow(edgePoint.y - centerY, 2)
    );
    const maxDistance = Math.sqrt(
      Math.pow(viewportWidth / 2, 2) + Math.pow(viewportHeight / 2, 2)
    ) || 1; // Prevent division by zero
    
    // Scale from 0.3 at center to much larger at edges (4x more growth)
    const targetScale = 0.3 + (distance / maxDistance) * 4.8;
    
    // Consistent duration for all windows to prevent z-index shifting - complete journey in 4s
    const duration = 4000; // 4 seconds - windows exit viewport within this time
    
    const newWindow: WindowState = {
      id: windowIdRef.current++,
      x: centerX, // Current position (starts at center)
      y: centerY, // Current position (starts at center)
      scale: 0.3, // Current scale (starts small)
      opacity: 0, // Start at 0% opacity
      initialX: centerX, // Store the center - never changes
      initialY: centerY, // Store the center - never changes
      initialScale: 0.3, // Store starting scale - never changes
      targetX: edgePoint.x,
      targetY: edgePoint.y,
      targetScale,
      progress: 0,
      duration,
      startTime: Date.now(),
    };
    
    return newWindow;
  }, [getSpiralEdgePoint]);

  // Function to create a new cycle of windows
  const createNewCycle = useCallback(() => {
    const now = Date.now();
    const totalWindows = 20;
    const staggerDuration = 2000; // 2 seconds total spread
    const newWindows: WindowState[] = [];
    
    for (let i = 0; i < totalWindows; i++) {
      const window = createWindow(i, totalWindows);
      const staggerProgress = i / (totalWindows - 1);
      window.startTime = now + staggerProgress * staggerDuration;
      window.id = windowIdRef.current++; // Assign unique sequential ID
      newWindows.push(window);
    }
    setWindows((prevWindows) => [...prevWindows, ...newWindows]);
    if (animationStartTimeRef.current === null) {
      animationStartTimeRef.current = now; // Only set initial start time once
    }
    lastCycleStartTimeRef.current = now; // Track when this cycle started
    nextCycleTriggeredRef.current = false; // Reset trigger flag for next cycle
  }, [createWindow]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      
      setWindows((prevWindows) => {
        // Update existing windows and remove completed ones
        const updatedWindows = prevWindows
          .map((win) => {
            const elapsed = now - win.startTime;
            // Clamp progress between 0 and 1 - windows that haven't started stay at 0
            const newProgress = Math.max(0, Math.min(elapsed / win.duration, 1));
            
            // Use acceleration of 2 to compensate for perceived slowness as windows grow
            // Quadratic acceleration curve as they get larger to maintain consistent perceived speed
            const eased = newProgress <= 0 ? 0 : Math.pow(newProgress, 2); // Acceleration of 2 (quadratic)
            
            // Always interpolate from the initial center position, not from current position
            const newX = win.initialX + (win.targetX - win.initialX) * eased;
            const newY = win.initialY + (win.targetY - win.initialY) * eased;
            // Always interpolate from initial scale, not from current scale
            // Ensure targetScale is always >= initialScale to prevent shrinking
            const safeTargetScale = Math.max(win.initialScale, win.targetScale);
            const newScale = win.initialScale + (safeTargetScale - win.initialScale) * eased;
            
            // Fade in opacity from 0% to 100% in 0.25s once animation begins
            const fadeInDuration = 250; // 0.25 seconds
            const fadeInProgress = elapsed <= 0 ? 0 : Math.min(elapsed / fadeInDuration, 1);
            
            // Fade out opacity from 100% to 0% over 3s with 1s delay
            const fadeOutDelay = 1000; // 1 second delay after fade-in
            const fadeOutDuration = 3000; // 3 seconds for fade-out transition
            const fadeOutStartTime = fadeInDuration + fadeOutDelay; // Start fade-out after delay
            const fadeOutElapsed = Math.max(0, elapsed - fadeOutStartTime);
            const fadeOutProgress = Math.min(fadeOutElapsed / fadeOutDuration, 1);
            const fadeOutOpacity = 1 - fadeOutProgress; // Fade from 1 to 0
            
            // Combine: fade in quickly, wait 1s, then fade out over 3s
            let newOpacity;
            if (fadeInProgress < 1) {
              // Still fading in
              newOpacity = fadeInProgress;
            } else if (elapsed < fadeOutStartTime) {
              // Fade in complete, waiting during delay period
              newOpacity = 1;
            } else {
              // Delay complete, now fading out over 3s
              newOpacity = fadeOutOpacity;
            }
            
            // If window reached its target, mark it for removal
            if (newProgress >= 1) {
              return null;
            }
            
            // Safety check: filter out invalid positions
            if (!isFinite(newX) || !isFinite(newY) || !isFinite(newScale) || !isFinite(newOpacity)) {
              return null;
            }
            
            return {
              ...win,
              x: newX,
              y: newY,
              scale: newScale,
              opacity: newOpacity,
              progress: newProgress,
            };
          })
          .filter((win): win is WindowState => win !== null);
        
        // Check if we should trigger the next cycle
        // Only trigger based on the most recent cycle, not all windows
        if (lastCycleStartTimeRef.current !== null && !nextCycleTriggeredRef.current) {
          const timeSinceLastCycle = now - lastCycleStartTimeRef.current;
          const cycleDuration = 2000 + 4000; // staggerDuration + duration
          const triggerTime = cycleDuration * 0.35; // Trigger at 35% completion for more overlap
          
          if (timeSinceLastCycle >= triggerTime) {
            nextCycleTriggeredRef.current = true;
            // Trigger next cycle after state update
            setTimeout(() => createNewCycle(), 0);
          }
        }
        
        return updatedWindows;
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [createNewCycle]);

  // Create initial cycle of windows on load
  useEffect(() => {
    createNewCycle();
  }, [createNewCycle]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-[var(--n3)]"
      style={{ 
        minHeight: "100dvh", 
        position: "relative",
      }}
    >
      {windows
        .filter((win) => isFinite(win.x) && isFinite(win.y) && isFinite(win.scale) && isFinite(win.opacity))
        .map((win) => {
          // Calculate blur based on scale - windows get more blurred as they get closer (larger)
          // Blur increases from 0px to 10px as scale increases from initial to target over 4s
          const blurRange = 4; // Max blur of 10px
          const scaleProgress = win.progress; // Progress from 0 to 1 over animation duration
          const blurAmount = scaleProgress * blurRange; // 0 to 10px blur
          
          return (
          <div
            key={win.id}
            className="absolute"
            style={{
              left: win.x,
              top: win.y,
              transform: `translate(-50%, -50%) scale(${win.scale})`,
              width: "380px",
              height: "260px",
              opacity: win.opacity,
              filter: `blur(${blurAmount}px)`,
              pointerEvents: "none",
              zIndex: Math.round(win.scale * 1000), // Larger windows (closer) have higher z-index
            }}
          >
            <img
              src="/Browser%20Window.png"
              alt="Browser Window"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
          );
        })}
    </div>
  );
}

