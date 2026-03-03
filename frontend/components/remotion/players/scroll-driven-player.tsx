"use client";

import { Player, PlayerRef } from "@remotion/player";
import { useRef, useEffect } from "react";
import { useScroll } from "framer-motion";

interface ScrollDrivenPlayerProps {
  component: React.ComponentType<Record<string, unknown>>;
  totalFrames: number;
  compositionWidth?: number;
  compositionHeight?: number;
  fps?: number;
  className?: string;
}

export function ScrollDrivenPlayer({
  component,
  totalFrames,
  compositionWidth = 1920,
  compositionHeight = 1080,
  fps = 30,
  className,
}: ScrollDrivenPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (progress) => {
      const frame = Math.round(progress * (totalFrames - 1));
      playerRef.current?.seekTo(frame);
    });
    return unsubscribe;
  }, [scrollYProgress, totalFrames]);

  return (
    <div ref={containerRef} style={{ height: "300vh", position: "relative" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        className={className}
      >
        <Player
          ref={playerRef}
          component={component}
          durationInFrames={totalFrames}
          compositionWidth={compositionWidth}
          compositionHeight={compositionHeight}
          fps={fps}
          acknowledgeRemotionLicense
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}
