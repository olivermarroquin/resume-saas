// Throwaway diagnostic script — NOT part of the production build.
// Run with: node scripts/diagnose-apply.mjs
// Replace RESUME_TEXT and PROPOSALS below with real content before running.

// ── PASTE REAL DATA HERE ────────────────────────────────────────────────────

const RESUME_TEXT = `PASTE_RESUME_HERE`;

const PROPOSALS = [
  // PASTE_PROPOSALS_JSON_HERE
  // e.g. { "id": 1, "op": "REPLACE_LINE", "section": "SUMMARY", "before": ["..."], "after": ["..."], "rationale": "..." }
];

// ── ALGORITHM (inline copy of applyProposals logic) ──────────────────────────

const SECTION_KEYWORDS = ["SUMMARY", "SKILLS", "EXPERIENCE"];

function findSectionInsertIndex(lines, section) {
  const headerRegex = new RegExp(`\\b${section}\\b`, "i");
  const headerIdx = lines.findIndex((ln) => headerRegex.test(ln));
  if (headerIdx === -1) return -1;
  const otherHeaders = SECTION_KEYWORDS.filter((h) => h !== section);
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const isOther = otherHeaders.some((h) =>
      new RegExp(`\\b${h}\\b`, "i").test(lines[i])
    );
    if (isOther) return i;
  }
  return lines.length;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function closestCandidates(target, lines, n = 3) {
  return lines
    .map((ln, idx) => ({ idx, ln, dist: levenshtein(target.trim().toLowerCase(), ln.trim().toLowerCase()) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, n);
}

// ── DIAGNOSTIC ────────────────────────────────────────────────────────────────

if (RESUME_TEXT === "PASTE_RESUME_HERE" || PROPOSALS.length === 0) {
  console.error("ERROR: Fill in RESUME_TEXT and PROPOSALS before running.");
  process.exit(1);
}

const lines = RESUME_TEXT.split("\n");
let matched = 0, issues = 0, skipped = 0;

for (const p of PROPOSALS) {
  console.log(`\n── Proposal ${p.id}: [${p.section}] ${p.op} ──`);
  console.log(`   before[0]: ${JSON.stringify(p.before?.[0])}`);
  console.log(`   after[0]:  ${JSON.stringify(p.after?.[0])}`);

  switch (p.op) {
    case "REPLACE_LINE":
    case "DELETE_LINE": {
      const target = (p.before?.[0] ?? "").trim();
      const idx = lines.findIndex((ln) => ln.trim() === target);
      if (idx !== -1) {
        console.log(`   ✅ MATCH at line ${idx + 1}: ${JSON.stringify(lines[idx])}`);
        matched++;
      } else {
        console.log(`   ❌ NO MATCH`);
        const candidates = closestCandidates(target, lines);
        console.log(`   Closest candidates:`);
        for (const c of candidates)
          console.log(`     line ${c.idx + 1} (dist=${c.dist}): ${JSON.stringify(c.ln)}`);
        skipped++;
      }
      break;
    }

    case "REPLACE_PHRASE": {
      const target = p.before?.[0] ?? "";
      if (RESUME_TEXT.includes(target)) {
        const lineIdx = lines.findIndex((ln) => ln.includes(target));
        console.log(`   ✅ SUBSTRING MATCH at line ${lineIdx + 1}: ${JSON.stringify(lines[lineIdx])}`);
        matched++;
      } else {
        console.log(`   ❌ NO SUBSTRING MATCH`);
        // Show which words from target appear nearby
        const words = target.split(/\s+/).filter((w) => w.length > 4);
        const partial = lines.filter((ln) => words.some((w) => ln.toLowerCase().includes(w.toLowerCase())));
        if (partial.length)
          console.log(`   Partial word matches: ${partial.slice(0, 3).map((l) => JSON.stringify(l)).join(", ")}`);
        skipped++;
      }
      break;
    }

    case "ADD_LINE": {
      const keyword = p.section; // SUMMARY | SKILLS | EXPERIENCE
      const headerRegex = new RegExp(`\\b${keyword}\\b`, "i");
      const headerIdx = lines.findIndex((ln) => headerRegex.test(ln));
      if (headerIdx !== -1) {
        const insertIdx = findSectionInsertIndex(lines, keyword);
        console.log(`   ✅ Section heuristic matched: line ${headerIdx + 1}: ${JSON.stringify(lines[headerIdx])}`);
        console.log(`   Insert index: ${insertIdx} (${insertIdx === lines.length ? "end of document" : `before: ${JSON.stringify(lines[insertIdx])}`})`);
        matched++;
      } else {
        console.log(`   ❌ Section heuristic DID NOT MATCH — searched for \\b${keyword}\\b (case-insensitive)`);
        console.log(`   Would FALL BACK to end of document (line ${lines.length + 1})`);
        // Show all lines that contain the keyword as a substring (not word-bounded)
        const substringMatches = lines
          .map((ln, i) => ({ i, ln }))
          .filter(({ ln }) => ln.toLowerCase().includes(keyword.toLowerCase()));
        if (substringMatches.length)
          console.log(`   Substring (non-word-bounded) matches: ${substringMatches.map(({ i, ln }) => `line ${i+1}: ${JSON.stringify(ln)}`).join("; ")}`);
        else
          console.log(`   No substring matches either — section keyword not present in any form`);
        issues++;
      }
      break;
    }

    default:
      console.log(`   ⚠️  Unknown op: ${p.op}`);
      issues++;
  }
}

console.log(`\n${"─".repeat(60)}`);
console.log(`SUMMARY: ${PROPOSALS.length} proposals total`);
console.log(`  ✅ Matched cleanly: ${matched}`);
console.log(`  ⚠️  Matched with issues: ${issues}`);
console.log(`  ❌ Skipped (no match): ${skipped}`);
