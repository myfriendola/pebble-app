"use client";

import { useRef, useState, useTransition } from "react";

// Swipe a row left (on touch) to reveal a Delete action — the gesture people
// already know from Mail/Messages. Desktop keeps the Edit → Delete path, since
// a mouse doesn't swipe. After deleting, the row removes itself; the server
// action's revalidation keeps the rest of the list in sync.
const ACTION_W = 96; // px, the revealed Delete zone

export function SwipeRow({
  onDelete,
  children,
  contentClassName = "py-5",
}: {
  onDelete: () => Promise<unknown> | void;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [pending, start] = useTransition();

  const startX = useRef(0);
  const startY = useRef(0);
  const base = useRef(0);
  const cur = useRef(0);
  const dir = useRef<"none" | "h" | "v">("none");
  const moved = useRef(false);
  const active = useRef(false); // gate the move handler without waiting for state

  function onDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return; // desktop uses the Edit → Delete path
    startX.current = e.clientX;
    startY.current = e.clientY;
    base.current = offset;
    cur.current = offset;
    dir.current = "none";
    moved.current = false;
    active.current = true;
    setDragging(true);
  }

  function onMove(e: React.PointerEvent) {
    if (!active.current) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (dir.current === "none") {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        dir.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
        if (dir.current === "v") {
          active.current = false; // let the page scroll
          setDragging(false);
        }
      }
      if (dir.current !== "h") return;
    }

    let next = base.current + dx;
    next = Math.max(-ACTION_W, Math.min(0, next));
    cur.current = next;
    setOffset(next);
    if (Math.abs(dx) > 6) moved.current = true;
  }

  function onUp() {
    if (dir.current === "h") {
      const snap = cur.current < -ACTION_W / 2 ? -ACTION_W : 0;
      cur.current = snap;
      setOffset(snap);
    }
    dir.current = "none";
    active.current = false;
    setDragging(false);
  }

  // Swallow the click that follows a swipe (so the row's own tap doesn't fire),
  // and when the row is open, let a tap simply close it.
  function onClickCapture(e: React.MouseEvent) {
    if (moved.current) {
      e.preventDefault();
      e.stopPropagation();
      moved.current = false;
      return;
    }
    if (offset !== 0) {
      e.preventDefault();
      e.stopPropagation();
      cur.current = 0;
      setOffset(0);
    }
  }

  function doDelete() {
    start(async () => {
      await onDelete();
      setRemoved(true);
    });
  }

  if (removed) return null;

  const open = offset !== 0;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex items-stretch" aria-hidden={!open}>
        <button
          onClick={doDelete}
          disabled={pending}
          aria-label="Delete entry"
          tabIndex={open ? 0 : -1}
          style={{ width: ACTION_W }}
          className="flex items-center justify-center bg-clay font-sans text-[12px] uppercase tracking-label text-paper transition-opacity disabled:opacity-60"
        >
          {pending ? "…" : "Delete"}
        </button>
      </div>

      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.25s ease",
          touchAction: "pan-y",
        }}
        className={`relative bg-paper ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
