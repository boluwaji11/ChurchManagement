"use client";

import { useEffect, useState } from "react";

const TYPE_DELAY_MS = 190;
const HOLD_DELAY_MS = 1800;
const DELETE_DELAY_MS = 150;
const WORD_PAUSE_MS = 350;
type TypingPhase = "typing" | "holding" | "deleting" | "pausing";

export function HeroTypewriter({
  freeText,
  alwaysText,
}: {
  freeText: string;
  alwaysText: string;
}) {
  const [wordIndex, setWordIndex] = useState(0);
  const [visibleLength, setVisibleLength] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [phase, setPhase] = useState<TypingPhase>("typing");

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      setReducedMotion(media.matches);
      if (media.matches) {
        setWordIndex(0);
        setVisibleLength(freeText.length);
        setPhase("typing");
      } else {
        setVisibleLength(0);
        setWordIndex(0);
        setPhase("typing");
      }
    };

    syncMotionPreference();
    media.addEventListener("change", syncMotionPreference);
    return () => media.removeEventListener("change", syncMotionPreference);
  }, [freeText]);

  useEffect(() => {
    if (reducedMotion) return;

    const word = wordIndex === 0 ? freeText : alwaysText;
    let delay: number;
    let update: () => void;

    if (phase === "typing") {
      if (visibleLength >= word.length) {
        setPhase("holding");
        return;
      }
      delay = TYPE_DELAY_MS;
      update = () => setVisibleLength((length) => length + 1);
    } else if (phase === "holding") {
      delay = HOLD_DELAY_MS;
      update = () => setPhase("deleting");
    } else if (phase === "deleting") {
      if (visibleLength === 0) {
        setPhase("pausing");
        return;
      }
      delay = DELETE_DELAY_MS;
      update = () => setVisibleLength((length) => Math.max(0, length - 1));
    } else {
      delay = WORD_PAUSE_MS;
      update = () => {
        setWordIndex((index) => (index + 1) % 2);
        setPhase("typing");
      };
    }

    const timer = setTimeout(update, delay);
    return () => clearTimeout(timer);
  }, [reducedMotion, visibleLength, wordIndex, phase, freeText, alwaysText]);

  const activeWord = wordIndex === 0 ? freeText : alwaysText;

  return (
    <span className="site-hero-typewriter">
      <span className="sr-only">
        {freeText}, {alwaysText}
      </span>
      <span className="site-hero-typewriter__sizer" aria-hidden="true">
        <span>{freeText}</span>
        <span>{alwaysText}</span>
      </span>
      <span className="site-hero-typewriter__line" aria-hidden="true">
        {activeWord.slice(0, reducedMotion ? freeText.length : visibleLength)}
        {!reducedMotion ? <span className="site-hero-typewriter__cursor" /> : null}
      </span>
    </span>
  );
}
