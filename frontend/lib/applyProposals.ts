import type { Proposal } from "./types";

/**
 * Apply an ordered list of accepted proposals to an original resume text.
 * Deterministic. Runs client-side.
 *
 * Algorithm (per frontend-mvp-spec-v1.md "Proposal application algorithm"):
 * 1. Split original resume into lines.
 * 2. For each accepted proposal, in API-returned order:
 *    - REPLACE_LINE:    replace first line matching before[0] (trimmed).
 *    - REPLACE_PHRASE:  replace first substring match of before[0].
 *    - ADD_LINE:        append after[0] to the end of its section
 *                       (best-effort header match), else end of document.
 *    - DELETE_LINE:     remove first line matching before[0] (trimmed).
 * 3. If before text cannot be found, skip silently and log a warning.
 * 4. Re-join lines with "\n".
 */
export function applyProposals(
  originalText: string,
  acceptedProposals: Proposal[],
): string {
  let lines = originalText.split("\n");
  let text = originalText;

  for (const p of acceptedProposals) {
    switch (p.op) {
      case "REPLACE_LINE": {
        const target = p.before[0]?.trim();
        const replacement = p.after[0] ?? "";
        if (!target) {
          warn(p, "REPLACE_LINE with empty before[0]");
          continue;
        }
        const idx = lines.findIndex((ln) => ln.trim() === target);
        if (idx === -1) {
          warn(p, `REPLACE_LINE: line not found: "${target}"`);
          continue;
        }
        lines[idx] = replacement;
        text = lines.join("\n");
        break;
      }

      case "DELETE_LINE": {
        const target = p.before[0]?.trim();
        if (!target) {
          warn(p, "DELETE_LINE with empty before[0]");
          continue;
        }
        const idx = lines.findIndex((ln) => ln.trim() === target);
        if (idx === -1) {
          warn(p, `DELETE_LINE: line not found: "${target}"`);
          continue;
        }
        lines.splice(idx, 1);
        text = lines.join("\n");
        break;
      }

      case "REPLACE_PHRASE": {
        const target = p.before[0];
        const replacement = p.after[0] ?? "";
        if (!target) {
          warn(p, "REPLACE_PHRASE with empty before[0]");
          continue;
        }
        if (!text.includes(target)) {
          warn(p, `REPLACE_PHRASE: substring not found: "${target}"`);
          continue;
        }
        text = text.replace(target, replacement);
        lines = text.split("\n");
        break;
      }

      case "ADD_LINE": {
        const newLine = p.after[0];
        if (newLine == null) {
          warn(p, "ADD_LINE with missing after[0]");
          continue;
        }
        const insertIdx = findSectionInsertIndex(lines, p.section);
        if (insertIdx === -1) {
          // Fallback: append to end of document
          lines.push(newLine);
        } else {
          lines.splice(insertIdx, 0, newLine);
        }
        text = lines.join("\n");
        break;
      }

      default: {
        // Exhaustiveness check — should be unreachable.
        const _exhaustive: never = p.op;
        warn(p, `Unknown op: ${String(_exhaustive)}`);
      }
    }
  }

  return text;
}

/**
 * Best-effort: find the index at which to INSERT a new line for the
 * given section. Looks for a header line containing the section name
 * (case-insensitive, any word boundary). Returns the index immediately
 * AFTER the last non-empty line of that section, so the new line is
 * appended to the end of the section rather than the top.
 *
 * Returns -1 if no matching section header is found.
 */
function findSectionInsertIndex(
  lines: string[],
  section: "SUMMARY" | "SKILLS" | "EXPERIENCE",
): number {
  const headerRegex = new RegExp(`\\b${section}\\b`, "i");
  const headerIdx = lines.findIndex((ln) => headerRegex.test(ln));
  if (headerIdx === -1) return -1;

  // Walk forward from the header until we hit the next header-looking
  // line (all caps line or similar) or end of document. The insert
  // point is just before that next boundary.
  const otherHeaders = ["SUMMARY", "SKILLS", "EXPERIENCE"].filter(
    (h) => h !== section,
  );
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const ln = lines[i];
    const isOtherHeader = otherHeaders.some((h) =>
      new RegExp(`\\b${h}\\b`, "i").test(ln),
    );
    if (isOtherHeader) {
      return i; // insert just before the next section
    }
  }
  // No next section found — append to end
  return lines.length;
}

function warn(p: Proposal, msg: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[applyProposals] id=${p.id} op=${p.op}: ${msg}`);
}
