"use client";

import { Player } from "@remotion/player";
import { useMemo } from "react";
import { HeroRoomBuilder } from "../compositions/hero-room-builder";

export function HeroPlayer() {
  const inputProps = useMemo(() => ({}), []);

  return (
    <Player
      component={HeroRoomBuilder}
      inputProps={inputProps}
      durationInFrames={300}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={30}
      autoPlay
      loop
      acknowledgeRemotionLicense
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}
