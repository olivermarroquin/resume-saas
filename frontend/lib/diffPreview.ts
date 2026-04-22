import type { Proposal } from "./types";

export type DiffLine = {
  text: string;
  highlight: "green" | "yellow" | "red-strike" | "none";
  key: string;
};

export function computeDiffLines(
  currentText: string,
  resumeText: string,
  acceptedProposals: Proposal[],
): DiffLine[] {
  const lines = currentText.split("\n");

  // Build a set of highlighted line texts per highlight type.
  const greenLines = new Set<string>();
  const yellowLines = new Set<string>();
  const redStrikeLines: string[] = []; // order matters for ghost rows

  for (const p of acceptedProposals) {
    switch (p.op) {
      case "ADD_LINE":
        if (p.after[0] != null) greenLines.add(p.after[0]);
        break;
      case "REPLACE_LINE":
        if (p.after[0] != null) yellowLines.add(p.after[0]);
        break;
      case "REPLACE_PHRASE":
        // Highlight the line in currentText that contains after[0].
        if (p.after[0]) {
          const match = lines.find((ln) => ln.includes(p.after[0]));
          if (match != null) yellowLines.add(match);
        }
        break;
      case "DELETE_LINE":
        // Ghost row — not in currentText, rendered inline.
        if (p.before[0] != null) redStrikeLines.push(p.before[0]);
        break;
    }
  }

  const result: DiffLine[] = [];
  let keyIdx = 0;

  for (const line of lines) {
    // Insert ghost DELETE rows immediately before a line that would
    // have followed the deleted line in the original text. Best-effort:
    // we find the deleted line's position in the original and insert
    // the ghost before the line that comes after it.
    for (const deleted of redStrikeLines) {
      const origLines = resumeText.split("\n");
      const delIdx = origLines.findIndex((ln) => ln.trim() === deleted.trim());
      if (delIdx !== -1) {
        const lineAfterDeleted = origLines[delIdx + 1];
        if (lineAfterDeleted != null && line.trim() === lineAfterDeleted.trim()) {
          result.push({ text: deleted, highlight: "red-strike", key: `del-${keyIdx++}` });
        }
      }
    }

    const highlight = greenLines.has(line)
      ? "green"
      : yellowLines.has(line)
        ? "yellow"
        : "none";
    result.push({ text: line, highlight, key: `line-${keyIdx++}` });
  }

  return result;
}
