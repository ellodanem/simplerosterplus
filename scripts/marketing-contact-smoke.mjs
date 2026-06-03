#!/usr/bin/env node
/**
 * Smoke-test POST /api/marketing/contact (local or deployed).
 * Usage: node scripts/marketing-contact-smoke.mjs [baseUrl]
 */
const base = (process.argv[2] || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const url = `${base}/api/marketing/contact`;

const payload = {
  intent: "early_access",
  name: "Smoke Test",
  email: `smoke+${Date.now()}@example.com`,
  business: "Smoke Test Cafe",
  staffCount: "5-10",
  hasZkteco: "unknown",
  message: "Automated marketing contact smoke test — safe to delete.",
  source: "marketing-contact-smoke.mjs",
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "http://127.0.0.1:5500",
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = text;
}

if (!res.ok) {
  console.error("FAIL", res.status, data);
  process.exit(1);
}

console.log("OK", res.status, data);
console.log(`Submitted to ${url} — check MarketingInquiry row id=${data.id}`);
