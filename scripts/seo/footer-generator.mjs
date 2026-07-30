#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BEGIN_MARKER = "<!-- BEGIN GENERATED MARKETING FOOTER -->";
const END_MARKER = "<!-- END GENERATED MARKETING FOOTER -->";
const APP_ORIGIN = "https://app.simplerosterplus.com";

const commercialLinks = [
  { href: "/", label: "Employee roster software" },
  { href: "/employee-scheduling-software", label: "Employee scheduling" },
  { href: "/employee-leave-and-availability", label: "Leave and availability" },
  { href: "/small-business-employee-scheduling", label: "Small business scheduling" },
  { href: "/employee-attendance-software", label: "Employee attendance" },
  { href: "/employee-time-clock-app", label: "Employee time clock" },
  { href: "/zkteco-attendance-integration", label: "ZKTeco integration" },
];

const pages = [
  {
    key: "homepage",
    file: "landing-page/index.html",
    route: "/",
    mission:
      "Simple Roster Plus helps managers create weekly staff rosters and track attendance in minutes. Auto Scheduler is coming soon to keep the process even faster.",
    homepage: true,
  },
  {
    key: "employee-scheduling-software",
    file: "landing-page/employee-scheduling-software/index.html",
    route: "/employee-scheduling-software",
    mission:
      "Simple Roster Plus helps managers build weekly staff rosters, publish clear schedules, and connect the plan to attendance.",
  },
  {
    key: "small-business-employee-scheduling",
    file: "landing-page/small-business-employee-scheduling/index.html",
    route: "/small-business-employee-scheduling",
    mission:
      "Simple Roster Plus helps managers at small, shift-based businesses build weekly staff rosters, publish clear schedules, and review attendance—without enterprise HR complexity.",
  },
  {
    key: "employee-leave-and-availability",
    file: "landing-page/employee-leave-and-availability/index.html",
    route: "/employee-leave-and-availability",
    mission:
      "Simple Roster Plus helps managers record leave, plan weekly staff rosters, and review attendance—without enterprise HR leave software.",
  },
  {
    key: "employee-attendance-software",
    file: "landing-page/employee-attendance-software/index.html",
    route: "/employee-attendance-software",
    mission:
      "Simple Roster Plus helps managers plan weekly staff rosters, review attendance, correct exceptions, and prepare worked-time summaries.",
  },
  {
    key: "employee-time-clock-app",
    file: "landing-page/employee-time-clock-app/index.html",
    route: "/employee-time-clock-app",
    mission:
      "Simple Roster Plus helps managers capture clock events, review attendance against the weekly roster, and prepare worked-time summaries for payroll handoff.",
  },
  {
    key: "zkteco-attendance-integration",
    file: "landing-page/zkteco-attendance-integration/index.html",
    route: "/zkteco-attendance-integration",
    mission:
      "Simple Roster Plus helps managers plan weekly staff rosters and review attendance from supported terminals—without claiming every ZKTeco model works.",
  },
];

function renderCommercialLinks(activeRoute) {
  return commercialLinks
    .map(({ href, label }) => {
      const current = href === activeRoute ? ' aria-current="page"' : "";
      return `        <a href="${href}"${current}>${label}</a>`;
    })
    .join("\n");
}

function renderHomepageFooter(page) {
  return `  ${BEGIN_MARKER}
  <footer>
    <div class="footer-inner">
      <a class="logo" href="#hero" aria-label="Simple Roster Plus, home">
        <img
          src="brand/srp-logo-lockup-on-dark.png"
          srcset="brand/srp-logo-lockup-on-dark-640.png 640w, brand/srp-logo-lockup-on-dark-1280.png 1280w, brand/srp-logo-lockup-on-dark.png 1361w"
          sizes="(max-width: 640px) 150px, 190px"
          width="190" height="36"
          alt="Simple Roster Plus"
        >
      </a>
      <p class="footer-mission">${page.mission}</p>
      <nav class="footer-links" aria-label="Footer">
        <a href="#features">Features</a>
        <a href="/employee-scheduling-software">Employee scheduling</a>
        <a href="/employee-leave-and-availability">Leave and availability</a>
        <a href="/small-business-employee-scheduling">Small business scheduling</a>
        <a href="/employee-attendance-software">Employee attendance</a>
        <a href="/employee-time-clock-app">Employee time clock</a>
        <a href="/zkteco-attendance-integration">ZKTeco integration</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
        <a class="cta-contact" href="#contact">Start Free</a>
        <a href="/privacy">Privacy policy</a>
        <a href="/terms">Terms of service</a>
        <a id="app-login-footer" href="${APP_ORIGIN}/login" rel="noopener noreferrer">Log in</a>
      </nav>
      <p class="footer-copy">© <span id="y"></span> Simple Roster Plus. All rights reserved.</p>
    </div>
  </footer>
  ${END_MARKER}`;
}

function renderCommercialFooter(page) {
  return `  ${BEGIN_MARKER}
  <footer>
    <div class="footer-inner">
      <a class="logo" href="/" aria-label="Simple Roster Plus home">
        <img
          src="../brand/srp-logo-lockup-on-dark.png"
          srcset="../brand/srp-logo-lockup-on-dark-640.png 640w, ../brand/srp-logo-lockup-on-dark-1280.png 1280w, ../brand/srp-logo-lockup-on-dark.png 1361w"
          sizes="(max-width: 640px) 154px, 190px"
          width="190"
          height="36"
          alt="Simple Roster Plus"
        >
      </a>
      <p class="footer-mission">${page.mission}</p>
      <nav class="footer-links" aria-label="Footer">
${renderCommercialLinks(page.route)}
        <a href="/#pricing">Pricing</a>
        <a href="/privacy">Privacy policy</a>
        <a href="/terms">Terms of service</a>
        <a href="${APP_ORIGIN}/login" rel="noopener noreferrer">Log in</a>
        <a href="${APP_ORIGIN}/sign-up" rel="noopener noreferrer">Start Free</a>
      </nav>
      <p class="footer-copy">© <span id="year"></span> Simple Roster Plus. All rights reserved.</p>
    </div>
  </footer>
  ${END_MARKER}`;
}

function renderFooter(page) {
  return page.homepage ? renderHomepageFooter(page) : renderCommercialFooter(page);
}

function footerRegion(html) {
  const generatedPattern = new RegExp(
    `  ${escapeRegex(BEGIN_MARKER)}[\\s\\S]*?  ${escapeRegex(END_MARKER)}`,
  );
  const generatedMatch = html.match(generatedPattern);
  if (generatedMatch) return generatedMatch[0];

  const footerMatch = html.match(/  <footer>[\s\S]*?  <\/footer>/);
  return footerMatch?.[0] ?? null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function navHrefs(footer) {
  const nav = footer.match(/<nav class="footer-links"[\s\S]*?<\/nav>/)?.[0] ?? "";
  return [...nav.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map((match) => match[1]);
}

function validateFooterContract(page, footer) {
  const errors = [];
  const hrefs = navHrefs(footer);
  const expectedHrefs = page.homepage
    ? [
        "#features",
        "/employee-scheduling-software",
        "/employee-leave-and-availability",
        "/small-business-employee-scheduling",
        "/employee-attendance-software",
        "/employee-time-clock-app",
        "/zkteco-attendance-integration",
        "#pricing",
        "#faq",
        "#contact",
        "/privacy",
        "/terms",
        `${APP_ORIGIN}/login`,
      ]
    : [
        ...commercialLinks.map((link) => link.href),
        "/#pricing",
        "/privacy",
        "/terms",
        `${APP_ORIGIN}/login`,
        `${APP_ORIGIN}/sign-up`,
      ];

  if (JSON.stringify(hrefs) !== JSON.stringify(expectedHrefs)) {
    errors.push("footer link set or ordering differs from the contract");
  }
  if (hrefs.some((href) => /\.html(?:$|[?#])/.test(href))) {
    errors.push("footer contains an unexpected .html URL");
  }
  if (!hrefs.includes("/privacy") || !hrefs.includes("/terms")) {
    errors.push("footer legal links are not clean /privacy and /terms paths");
  }
  if (!hrefs.includes(`${APP_ORIGIN}/login`)) {
    errors.push("footer Log in URL is not absolute");
  }
  if (!page.homepage && !hrefs.includes(`${APP_ORIGIN}/sign-up`)) {
    errors.push("footer Start Free URL is not absolute");
  }

  const activeHrefs = [
    ...footer.matchAll(/<a\b[^>]*\bhref="([^"]+)"[^>]*\baria-current="page"/g),
  ].map((match) => match[1]);
  if (page.homepage && activeHrefs.length !== 0) {
    errors.push("homepage footer must not emit aria-current");
  }
  if (!page.homepage && (activeHrefs.length !== 1 || activeHrefs[0] !== page.route)) {
    errors.push(`expected aria-current="page" only on ${page.route}`);
  }

  return errors;
}

function main() {
  const checkOnly = process.argv.slice(2).includes("--check");
  const drifted = [];
  let written = 0;

  for (const page of pages) {
    const absolutePath = path.join(repoRoot, page.file);
    const html = fs.readFileSync(absolutePath, "utf8");
    const current = footerRegion(html);
    const expected = renderFooter(page);
    const contractErrors = validateFooterContract(page, expected);

    if (contractErrors.length) {
      for (const error of contractErrors) {
        console.error(`FAIL ${page.file}: ${error}`);
      }
      process.exitCode = 1;
      continue;
    }

    if (!current) {
      console.error(`FAIL ${page.file}: could not find a footer region`);
      process.exitCode = 1;
      continue;
    }

    if (current === expected) {
      console.log(`PASS ${page.file}`);
      continue;
    }

    if (checkOnly) {
      drifted.push(page.file);
      console.error(`DRIFT ${page.file}`);
      continue;
    }

    fs.writeFileSync(absolutePath, html.replace(current, expected), "utf8");
    written += 1;
    console.log(`UPDATED ${page.file}`);
  }

  if (drifted.length) {
    console.error(`\n${drifted.length} generated footer(s) are out of date.`);
    process.exitCode = 1;
  } else if (!process.exitCode) {
    console.log(
      checkOnly
        ? `\nAll ${pages.length} generated footers are current.`
        : `\nFooter generation complete; ${written} file(s) updated.`,
    );
  }
}

main();
