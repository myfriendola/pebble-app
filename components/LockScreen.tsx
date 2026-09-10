"use client";

import { useState } from "react";

export function LockScreen() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [hint, setHint] = useState("Unlocks for two weeks on this device.");
  const [err, setErr] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim() || busy) return;
    setBusy(true);
    setErr(false);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        // Straight into the opening sequence.
        window.location.assign("/?welcome=1");
        return;
      }
      setErr(true);
      setHint("That password didn’t match. Try again.");
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setPw("");
    } catch {
      setErr(true);
      setHint("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lk-stage">
      <div className="lk-aura" aria-hidden>
        <span className="lk-blob b1" />
        <span className="lk-blob b2" />
        <span className="lk-blob b3" />
        <span className="lk-blob b4" />
      </div>

      <form className="lk-glass" onSubmit={submit} autoComplete="off">
        <div className="lk-mark">
          <span className="lk-stone" aria-hidden />
          <span className="lk-wordmark">Pebble</span>
        </div>
        <p className="lk-tagline">A quiet place for the things you say to yourself.</p>

        <div className={`lk-field${shake ? " shake" : ""}`}>
          <input
            id="app-password"
            className="lk-input"
            type="password"
            inputMode="text"
            placeholder="Enter your password"
            aria-label="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
          />
          <button className="lk-open" type="submit" aria-label="Open" disabled={busy || !pw.trim()}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h13M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <p className={`lk-hint${err ? " err" : ""}`}>{hint}</p>
      </form>
    </div>
  );
}
