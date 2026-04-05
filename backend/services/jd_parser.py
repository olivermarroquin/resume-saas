from __future__ import annotations

import re
from typing import List

# Known good short acronyms that are genuinely skills in QA/SDET JDs.
ALLOW_SHORT = {"api", "qa", "sql", "rest", "soap", "svn"}

# Tokens that are too ambiguous alone; only allow via phrase detection.
SUPPRESS_IF_SOLO = {"hp", "alm", "vb"}

# Canonical phrases to promote if present in the JD (normalized text).
PHRASES = [
    ("hp alm", {"hp", "alm"}),
    ("micro focus alm", {"alm"}),
    ("vbscript", {"vb"}),
    ("vb script", {"vb"}),
]

RE_MONEY = re.compile(r"\$\s*\d+|\b\d+(?:\.\d+)?\s*/\s*hr\b|\b\d+(?:\.\d+)?\s*per\s*hour\b", re.I)
RE_TIME = re.compile(r"\b\d{1,2}(:\d{2})?\s*(am|pm)\b", re.I)
RE_DATEISH = re.compile(r"\b\d{1,2}\s*-\s*\d{1,2}\b")
RE_NUM_ONLY = re.compile(r"^\d+(?:\.\d+)?$")
RE_URLISH = re.compile(r"(https?://|www\.)", re.I)
RE_DOMAINISH = re.compile(r"\b[a-z0-9-]+\.(com|net|org|edu|gov)\b", re.I)
RE_EEO_SLASH = re.compile(r"\b[mf]/f/(?:disability|disabled|veterans?)\b", re.I)
RE_URL = re.compile(r"\bhttps?://\S+|\bwww\.\S+|\b\S+\.(com|net|org|gov|edu)\b", re.I)
RE_EEO = re.compile(r"\bm/f\b|\bdisability\b|\bveterans?\b|\beeo\b", re.I)
RE_SALARY_K = re.compile(r"^\d{2,3}k$", re.I)
RE_LOCATION_BASED = re.compile(r"^[a-z]+-based$", re.I)

TIMEZONES = {"mst", "pst", "est", "cst", "edt", "pdt", "cdt", "mdt", "utc", "gmt"}

JUNK_WORDS = {
    "required", "requirements", "must", "must-have", "musthave", "preferred",
    "high-quality", "high quality", "short-term", "short term",
    "benefits", "401k", "pto", "vacation", "insurance", "health", "dental", "vision",
    "equal", "opportunity", "employer", "eeo", "accommodation",
    "education", "certification", "certifications", "degree", "education/certification",
    "hands-on", "contract/temporary", "contract", "temporary", "full-stack",
    "stack-ranked", "stack ranked",
}

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "for", "from", "has",
    "have", "if", "in", "into", "is", "it", "job", "more", "not", "of", "on", "or",
    "our", "per", "role", "that", "the", "their", "this", "to", "up", "we", "will",
    "with", "you", "your",
}

GENERIC = {
    "test", "testing", "team", "work", "experience", "require", "required",
    "requirements", "ensure", "support", "ability", "skills",
}

SKILL_WORDS = {
    "selenium", "playwright", "cypress", "appium", "restassured", "postman", "jmeter",
    "locust", "jenkins", "github", "bitbucket", "jira", "confluence", "testng", "junit",
    "cucumber", "python", "java", "typescript", "javascript", "sql", "api", "rest",
    "soap", "svn", "aws", "azure", "gcp", "docker", "kubernetes", "ci", "cd", "cicd",
    "devops", "agile", "scrum", "kanban", "safe", "graphql", "restful", "microservices",
    "testrail", "alm", "hp alm", "vbscript",
}


def _norm_text(s: str) -> str:
    s = (s or "").lower()
    s = s.replace("\u00a0", " ")
    s = s.replace("\u2019", "'").replace("\u2018", "'")
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def _is_junk(term: str) -> bool:
    t = (term or "").strip().lower()
    if not t:
        return True
    if t in JUNK_WORDS or t in STOPWORDS or t in GENERIC:
        return True
    if RE_NUM_ONLY.match(t):
        return True
    if RE_MONEY.search(t) or RE_TIME.search(t) or RE_DATEISH.search(t):
        return True
    if RE_URL.search(t):
        return True
    if RE_EEO.search(t):
        return True
    if RE_URLISH.search(t) or RE_DOMAINISH.search(t):
        return True
    if RE_EEO_SLASH.search(t):
        return True
    if any(x in t for x in ["equal opportunity", "eeo", "accommodation", "veteran", "veterans", "disability", "disabled"]):
        return True
    if len(t) <= 2 and t not in ALLOW_SHORT:
        return True
    if t in SUPPRESS_IF_SOLO:
        return True
    if re.fullmatch(r"[a-z0-9_-]{9,}", t) and any(ch.isdigit() for ch in t):
        return True
    if RE_SALARY_K.match(t):
        return True
    if RE_LOCATION_BASED.match(t):
        return True
    if t in TIMEZONES or t.endswith("/mst") or t.endswith("/pst") or t.endswith("/est") or t.endswith("/cst"):
        return True
    return False


def _looks_like_skill(t: str) -> bool:
    if t in ALLOW_SHORT:
        return True
    if t in SKILL_WORDS:
        return True
    if re.search(r"[^a-z]", t):
        return True
    return False


def extract_jd_terms(text: str, max_terms: int = 18) -> List[str]:
    low = _norm_text(text)

    suppress: set = set()
    promoted: List[str] = []
    for phrase, to_suppress in PHRASES:
        if phrase in low:
            if phrase == "vb script":
                if "vbscript" not in promoted:
                    promoted.append("vbscript")
            else:
                if phrase not in promoted:
                    promoted.append(phrase)
            suppress |= set(to_suppress)

    raw_tokens = re.findall(r"[a-z0-9][a-z0-9\+#\.\-/]{0,38}", low)

    candidates: List[str] = []
    for tok in raw_tokens:
        t = tok.strip(" .,-/").lower()
        if not t:
            continue
        if t in suppress:
            continue
        if len(t) <= 2 and t not in ALLOW_SHORT:
            continue
        if t in {"vbscript", "vb-script"}:
            t = "vbscript"
        if _is_junk(t):
            continue
        if not _looks_like_skill(t):
            continue
        candidates.append(t)

    uniq: List[str] = []
    seen: set = set()

    def add(x: str) -> None:
        x = x.strip().lower()
        if not x or x in seen:
            return
        if _is_junk(x):
            return
        seen.add(x)
        uniq.append(x)

    for p in promoted:
        add(p)

    def score(term: str) -> tuple:
        return (low.count(term), len(term))

    for c in sorted(set(candidates), key=score, reverse=True):
        add(c)

    return uniq[:max_terms]
