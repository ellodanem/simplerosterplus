/**
 * Risky marketing claim scanner (warning-oriented for v1).
 *
 * Does not attempt AI classification. Matches known risky terms, then either:
 * - skips when nearby negation / limitation language is present, or
 * - emits WARN with surrounding excerpt for human review.
 */

export const RISKY_TERMS = [
  "accrual",
  "entitlement",
  "carryover",
  "statutory",
  "payroll integration",
  "mobile app",
  "self-service",
  "SMS",
  "WhatsApp",
  "recurring availability",
  "automated leave",
  "Auto Scheduler",
];

/** Phrases that typically mean the term is a limitation, not a feature claim. */
const NEGATION_PATTERNS = [
  /\bdoes\s+not\b/i,
  /\bdo\s+not\b/i,
  /\bdon'?t\b/i,
  /\bnot\s+included\b/i,
  /\bnot\s+provide\b/i,
  /\bnot\s+yet\b/i,
  /\bnot\s+a\b/i,
  /\bnot\s+employee\b/i,
  new RegExp(String.raw`\bno\s+[a-z]+\b`, "i"),
  /\bwithout\b/i,
  /\bunavailable\b/i,
  /\brather\s+than\b/i,
];

/**
 * @param {string} html
 * @param {{ allowedPhrases?: string[] }} [options]
 * @returns {{ term: string, excerpt: string, status: "allowed" | "review" }[]}
 */
export function scanRiskyClaims(html, options = {}) {
  const text = htmlToVisibleText(html);
  const allowedPhrases = (options.allowedPhrases || []).map((p) => p.toLowerCase());
  /** @type {{ term: string, excerpt: string, status: "allowed" | "review" }[]} */
  const findings = [];

  for (const term of RISKY_TERMS) {
    const re = new RegExp(escapeRegExp(term), "gi");
    let match;
    while ((match = re.exec(text)) !== null) {
      const start = Math.max(0, match.index - 90);
      const end = Math.min(text.length, match.index + term.length + 90);
      const excerpt = collapseWs(text.slice(start, end));
      const window = text.slice(
        Math.max(0, match.index - 160),
        Math.min(text.length, match.index + term.length + 160),
      );

      const matchedSnippet = text.slice(match.index, match.index + term.length);
      const allowedHit = allowedPhrases.some((phrase) =>
        window.toLowerCase().includes(phrase),
      );
      const negated = NEGATION_PATTERNS.some((p) => p.test(window));

      findings.push({
        term: matchedSnippet,
        excerpt: `…${excerpt}…`,
        status: allowedHit || negated ? "allowed" : "review",
      });
    }
  }

  return findings;
}

/**
 * Strip tags / scripts / styles for approximate visible text.
 * @param {string} html
 */
function htmlToVisibleText(html) {
  return collapseWs(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"'),
  );
}

function collapseWs(s) {
  return s.replace(/\s+/g, " ").trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
