// Builds an iCalendar (RFC 5545) feed of to-dos, so a calendar app can
// subscribe once and see every dated task — refreshing itself over time.
// Tasks with a due date become all-day events on that day. No alarms: the
// calendar is for *seeing* the day at a glance; the morning push is the nudge.

import type { Task } from "./types";

// Fold a logical line to ~75 octets per RFC 5545 (continuations begin with a
// single space). Measured in characters — close enough for these mostly-ASCII
// fields, and clients tolerate the rare over-long line.
function fold(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [line.slice(0, 74)];
  let i = 74;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 73));
    i += 73;
  }
  return parts.join("\r\n");
}

// Escape text values: backslash, semicolon, comma, and newlines.
function esc(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// "2026-10-14" → "20261014" for a DATE value.
function dateValue(due: string): string {
  return due.slice(0, 10).replace(/-/g, "");
}

// The day after the due date, for the (exclusive) all-day DTEND.
function nextDay(due: string): string {
  const d = new Date(due.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

// A UTC timestamp like 20261014T123456Z.
function stamp(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

export function buildTasksIcs(tasks: Task[], opts?: { calName?: string }): string {
  const name = opts?.calName ?? "Pebble — To-dos";
  const now = stamp();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pebble//To-dos//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "X-WR-TIMEZONE:UTC",
    // Hints to the subscriber to re-poll about every 6 hours.
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];

  for (const t of tasks) {
    if (!t.due) continue; // only dated to-dos belong on a calendar
    const done = t.status === "done";
    const summary = (done ? "✓ " : "") + (t.action || "To-do");
    lines.push(
      "BEGIN:VEVENT",
      `UID:task-${t.domain}-${t.id}@pebble`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateValue(t.due)}`,
      `DTEND;VALUE=DATE:${nextDay(t.due)}`,
      `SUMMARY:${esc(summary)}`,
      // Don't block out the day — all-day to-dos should read as free time.
      "TRANSP:TRANSPARENT",
    );
    if (t.source_quote) {
      lines.push(`DESCRIPTION:${esc(t.source_quote + "\n\n— from Pebble")}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // Fold each logical line last, then join with CRLF as the spec requires.
  return lines.map(fold).join("\r\n") + "\r\n";
}
