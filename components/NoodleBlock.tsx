"use client";

import { useEffect, useRef, useState } from "react";
import { OpenAsPageLink } from "./ui";

interface Turn {
  question: string;
  reply: string | null;
}

export function NoodleBlock({
  thoughtId,
  thoughtText,
  initialQuestion,
  initialReply = null,
  openAsPageHref,
}: {
  thoughtId: string;
  thoughtText: string;
  initialQuestion?: string | null;
  initialReply?: string | null;
  openAsPageHref?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>(
    initialQuestion ? [{ question: initialQuestion, reply: initialReply }] : [],
  );
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(!initialQuestion);
  const [saving, setSaving] = useState(false);
  const requested = useRef(false);

  // Fetch the opening question the first time we have none.
  useEffect(() => {
    if (initialQuestion || requested.current) return;
    requested.current = true;
    setLoading(true);
    fetch("/api/noodle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ thoughtId, thoughtText }),
    })
      .then((r) => r.json())
      .then((d: { question?: string }) => {
        if (d.question) setTurns([{ question: d.question, reply: null }]);
      })
      .catch(() => {
        setTurns([{ question: "What's underneath this one, if you sit with it a moment?", reply: null }]);
      })
      .finally(() => setLoading(false));
  }, [initialQuestion, thoughtId, thoughtText]);

  const latest = turns[turns.length - 1];
  const canReply = latest && latest.reply === null;

  async function reflect() {
    if (!draft.trim() || !latest) return;
    const priorQuestion = latest.question;
    const answered = turns.map((t, i) =>
      i === turns.length - 1 ? { ...t, reply: draft.trim() } : t,
    );
    setTurns(answered);
    setDraft("");
    setSaving(true);
    try {
      const res = await fetch("/api/noodle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          thoughtId,
          thoughtText,
          reply: answered[answered.length - 1].reply,
          priorQuestion,
          history: answered.map((t) => ({ question: t.question, reply: t.reply })),
        }),
      });
      const d: { question?: string } = await res.json();
      if (d.question) setTurns([...answered, { question: d.question, reply: null }]);
    } catch {
      /* keep what we have; the reflection can rest here */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 border-l-2 border-sage-ring pl-4 animate-fade-in">
      <div className="label text-sage mb-3">Noodling</div>

      <div className="space-y-4">
        {turns.map((turn, i) => (
          <div key={i} className="space-y-2">
            <p className="prose-question text-[16px] leading-[1.6]">{turn.question}</p>
            {turn.reply ? (
              <p className="prose-serif text-ink-secondary text-[15.5px]">{turn.reply}</p>
            ) : null}
          </div>
        ))}

        {loading ? <p className="prose-question text-ink-muted">Finding a question…</p> : null}
      </div>

      {canReply && !loading ? (
        <div className="mt-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Sit with it, then say what comes…"
            className="w-full resize-none bg-transparent font-serif text-[15.5px] leading-[1.6] text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <div className="mt-1 flex items-center gap-4">
            <button
              onClick={reflect}
              disabled={!draft.trim() || saving}
              className="font-sans text-[12px] text-sage transition-opacity hover:opacity-70 disabled:opacity-30"
            >
              {saving ? "Reflecting…" : "Reflect"}
            </button>
            {openAsPageHref ? <OpenAsPageLink href={openAsPageHref} /> : null}
          </div>
        </div>
      ) : (
        <div className="mt-3">{openAsPageHref ? <OpenAsPageLink href={openAsPageHref} /> : null}</div>
      )}
    </div>
  );
}
