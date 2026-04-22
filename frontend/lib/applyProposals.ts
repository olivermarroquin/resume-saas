import type { Proposal } from "./types";

// --- Normalization for line matching ---

// Leading bullet glyphs commonly used in resumes. Strip these from
// both the source line and the comparison target before matching.
const LEADING_BULLET_REGEX = /^[\s]*[•\-\*·‣◦▪▸]+[\s]*/;

/**
 * Normalize a line for conservative comparison:
 * - strip leading bullet glyphs and surrounding whitespace
 * - collapse internal whitespace runs to single spaces
 * - trim leading/trailing whitespace
 * Case is preserved.
 */
function normalizeLineForMatch(line: string): string {
  return line
    .replace(LEADING_BULLET_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Section detection ---

// Known proposal section values (from the API) mapped to the set
// of header keywords that might appear in a real resume to denote
// that section. Match is case-insensitive substring.
const SECTION_KEYWORDS: Record<string, string[]> = {
  SUMMARY: ["SUMMARY", "PROFILE", "OBJECTIVE", "ABOUT"],
  SKILLS: ["SKILLS", "SKILL", "TECHNICAL", "COMPETENCIES", "EXPERTISE"],
  EXPERIENCE: ["EXPERIENCE", "WORK HISTORY", "EMPLOYMENT", "CAREER"],
};

// Superset of header-like terms that may appear as section
// boundaries in a real resume. Used to detect "end of current
// section" when walking forward. Case-insensitive substring match.
const RESUME_HEADER_TERMS: string[] = [
  "SUMMARY",
  "PROFILE",
  "OBJECTIVE",
  "ABOUT",
  "SKILLS",
  "SKILL",
  "TECHNICAL",
  "COMPETENCIES",
  "EXPERTISE",
  "EXPERIENCE",
  "WORK HISTORY",
  "EMPLOYMENT",
  "CAREER",
  "EDUCATION",
  "CERTIFICATIONS",
  "CERTIFICATION",
  "PROJECTS",
  "PUBLICATIONS",
  "AWARDS",
  "LANGUAGES",
  "REFERENCES",
  "VOLUNTEER",
  "INTERESTS",
];

/**
 * Test if a line looks like a resume section header — contains any
 * of the RESUME_HEADER_TERMS as a case-insensitive substring. Lines
 * that end with ":" are strong candidates; lines in all caps are
 * also strong candidates. This is intentionally broad.
 */
function isResumeHeaderLike(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  // A rough filter: header lines are typically short. Don't treat a
  // 200-char paragraph that mentions "experience" as a header.
  if (trimmed.length > 60) return false;
  const upper = trimmed.toUpperCase();
  return RESUME_HEADER_TERMS.some((term) => upper.includes(term));
}

/**
 * Test if a line is specifically the header for a given proposal
 * section value (SUMMARY / SKILLS / EXPERIENCE). Case-insensitive
 * substring match against the synonym list for that section.
 */
function isHeaderForSection(line: string, section: string): boolean {
  const keywords = SECTION_KEYWORDS[section];
  if (keywords == null) return false;
  const upper = line.trim().toUpperCase();
  // Also gate by header-like heuristic to avoid matching body
  // paragraphs that happen to contain a keyword.
  if (!isResumeHeaderLike(line)) return false;
  return keywords.some((kw) => upper.includes(kw));
}

/**
 * Apply an ordered list of accepted proposals to an original resume text.
 * Deterministic. Runs client-side.
 *
 * Algorithm (per frontend-mvp-spec-v1.md "Proposal application algorithm"):
 * 1. Split original resume into lines.
 * 2. For each accepted proposal, in API-returned order:
 *    - REPLACE_LINE:    replace first line matching before[0] (normalized).
 *    - REPLACE_PHRASE:  replace first substring match of before[0].
 *    - ADD_LINE:        append after[0] to the end of its section
 *                       (synonym-aware header match), else end of document.
 *    - DELETE_LINE:     remove first line matching before[0] (normalized).
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
    // Backend may emit multi-line before[0] values for line-oriented
    // ops. If detected, attempt best-effort handling: split on \n and
    // match the full block against a contiguous sequence of resume
    // lines. Only attempted for REPLACE_LINE and DELETE_LINE —
    // REPLACE_PHRASE is substring-based and tolerates embedded \n
    // naturally via String.prototype.includes.
    if (
      (p.op === "REPLACE_LINE" || p.op === "DELETE_LINE") &&
      p.before[0] != null &&
      p.before[0].includes("\n")
    ) {
      const blockLines = p.before[0].split("\n");
      const blockLen = blockLines.length;
      const normBlock = blockLines.map(normalizeLineForMatch);

      // Slide a window of size blockLen across lines and look for a
      // contiguous match.
      let matchStart = -1;
      for (let i = 0; i <= lines.length - blockLen; i++) {
        let allMatch = true;
        for (let j = 0; j < blockLen; j++) {
          if (normalizeLineForMatch(lines[i + j]) !== normBlock[j]) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) {
          matchStart = i;
          break;
        }
      }

      if (matchStart !== -1) {
        if (p.op === "REPLACE_LINE") {
          const replacement = p.after[0] ?? "";
          const replacementLines = replacement.split("\n");
          lines.splice(matchStart, blockLen, ...replacementLines);
          text = lines.join("\n");
          console.info(
            `[applyProposals] Proposal ${p.id} (REPLACE_LINE) matched ` +
              `a multi-line block of ${blockLen} lines at index ${matchStart}.`,
          );
        } else {
          lines.splice(matchStart, blockLen);
          text = lines.join("\n");
          console.info(
            `[applyProposals] Proposal ${p.id} (DELETE_LINE) removed a ` +
              `multi-line block of ${blockLen} lines at index ${matchStart}.`,
          );
        }
        continue;
      } else {
        warn(
          p,
          `${p.op} with multi-line before[0] could not be matched as ` +
            `a contiguous block in the resume.`,
        );
        continue;
      }
    }

    switch (p.op) {
      case "REPLACE_LINE": {
        const target = p.before[0];
        const replacement = p.after[0];
        if (target == null || replacement == null) {
          warn(p, "REPLACE_LINE with missing before[0] or after[0]");
          continue;
        }

        // Primary path: whole-line match after normalization.
        const normTarget = normalizeLineForMatch(target);
        const idx = lines.findIndex(
          (ln) => normalizeLineForMatch(ln) === normTarget,
        );

        if (idx !== -1) {
          lines[idx] = replacement;
          text = lines.join("\n");
          break;
        }

        // Fallback path: auto-convert to phrase replacement if
        // before[0] is a unique, sufficiently-long substring of exactly
        // one resume line.
        const MIN_SUBSTRING_RATIO = 0.3;
        const containingLineIndices = lines
          .map((ln, i) => ({ ln, i }))
          .filter(({ ln }) => ln.includes(target))
          .map(({ i }) => i);

        if (containingLineIndices.length === 1) {
          const lineIdx = containingLineIndices[0];
          const line = lines[lineIdx];
          if (target.length / line.length >= MIN_SUBSTRING_RATIO) {
            lines[lineIdx] = line.replace(target, replacement);
            text = lines.join("\n");
            console.info(
              `[applyProposals] Proposal ${p.id} (REPLACE_LINE) ` +
                `auto-converted to phrase replacement: before[0] was a ` +
                `substring of one line, not a whole line.`,
            );
            break;
          }
        }

        // Neither whole-line nor safe-substring matched.
        warn(
          p,
          `REPLACE_LINE with no matching line and no safe substring ` +
            `fallback. before[0]="${target.slice(0, 80)}..."`,
        );
        break;
      }

      case "DELETE_LINE": {
        const target = p.before[0]?.trim();
        if (!target) {
          warn(p, "DELETE_LINE with empty before[0]");
          continue;
        }
        const normTarget = normalizeLineForMatch(target);
        const idx = lines.findIndex((ln) => normalizeLineForMatch(ln) === normTarget);
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
 * Find the index in `lines` where a new line should be inserted at
 * the end of the given section. Returns -1 if the section header
 * cannot be found.
 *
 * Algorithm:
 * 1. Find the opening header for the requested section using
 *    synonym-aware matching.
 * 2. Walk forward from there. Stop at the first line that looks
 *    like a different resume header (any header-like line that is
 *    NOT the current section's header).
 * 3. Return the index of the terminator line (so splice inserts
 *    before it). If no terminator is found, return lines.length
 *    (append to end of document is acceptable fallback for
 *    last-section ADD_LINE).
 * 4. Skip trailing blank lines so the new line inserts before
 *    the blank gap, not after it.
 */
function findSectionInsertIndex(lines: string[], section: string): number {
  const headerIdx = lines.findIndex((ln) => isHeaderForSection(ln, section));
  if (headerIdx === -1) return -1;

  // Walk forward to find the next section header.
  let terminatorIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (isHeaderForSection(lines[i], section)) continue; // same section
    if (isResumeHeaderLike(lines[i])) {
      terminatorIdx = i;
      break;
    }
  }

  // Back up over trailing blank lines so we insert before the gap.
  let insertIdx = terminatorIdx;
  while (insertIdx > headerIdx + 1 && lines[insertIdx - 1].trim() === "") {
    insertIdx--;
  }

  return insertIdx;
}

function warn(p: Proposal, msg: string): void {
  // eslint-disable-next-line no-console
  console.warn(`[applyProposals] id=${p.id} op=${p.op}: ${msg}`);
}
