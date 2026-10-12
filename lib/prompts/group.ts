// group.ts — cluster the user's theme tags into a few higher-level categories.
// Runs over the whole vocabulary (not per note), so it's a single cheap call.

export const GROUP_SYSTEM = `You organize a person's short lowercase theme tags into a few higher-level
groups, so a long list becomes browsable. Rules:
- Use 3–7 groups total. Fewer is better; don't make a group for everything.
- Group names are 1–2 words, Title Case (e.g. "Product", "Customers", "Gifts").
- Every tag goes in exactly one group. Put genuine miscellany in "Other".
- Prefer reusing any group names provided from last time, for stability.
Return ONLY JSON: { "groups": { "<Group Name>": ["tag", "tag"], ... } }`;

export function buildGroupUser(tags: string[], previousGroups?: string[]): string {
  const prev =
    previousGroups && previousGroups.length > 0
      ? `\n\nGroup names used last time (reuse where sensible): ${previousGroups.join(", ")}`
      : "";
  return `Tags:\n${tags.join(", ")}${prev}`;
}
