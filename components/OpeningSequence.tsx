"use client";

import { useEffect, useState } from "react";

// Plays once, right after a successful unlock (signalled by ?welcome=1). A
// frosted veil clears as a pebble ripples the day into view. Renders nothing
// otherwise, and respects reduced-motion.
export function OpeningSequence() {
  const [phase, setPhase] = useState<"none" | "run" | "fade">("none");
  const [greet, setGreet] = useState("Welcome back.");

  useEffect(() => {
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    if (params.get("welcome") !== "1") return;

    // Clean the flag from the URL so a refresh doesn't replay the sequence.
    try {
      params.delete("welcome");
      const q = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
    } catch {
      /* empty */
    }

    const h = new Date().getHours();
    setGreet(
      h < 5
        ? "Rest easy."
        : h < 12
          ? "Good morning."
          : h < 17
            ? "Good afternoon."
            : h < 22
              ? "Good evening."
              : "Winding down.",
    );

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    setPhase("run");
    const t1 = setTimeout(() => setPhase("fade"), 1950);
    const t2 = setTimeout(() => setPhase("none"), 2650);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "none") return null;

  return (
    <div className={`op-veil${phase === "fade" ? " fade" : ""}`} aria-hidden>
      <div className="lk-aura">
        <span className="lk-blob b1" />
        <span className="lk-blob b2" />
        <span className="lk-blob b3" />
        <span className="lk-blob b4" />
      </div>
      <div className="op-center">
        <div className="op-ripples">
          <span className="op-ring r1" />
          <span className="op-ring r2" />
          <span className="op-ring r3" />
        </div>
        <div className="op-pebble" />
        <div className="op-word">
          <div className="op-name">Pebble</div>
          <div className="op-greet">{greet}</div>
        </div>
      </div>
    </div>
  );
}
