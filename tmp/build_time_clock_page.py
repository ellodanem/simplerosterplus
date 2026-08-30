# -*- coding: utf-8 -*-
"""Build landing-page/employee-time-clock-app/index.html from shared CSS extract."""
from pathlib import Path

css = Path("tmp/time-clock-css-extract.txt").read_text(encoding="utf-8")

# Extra page-specific styles for capture/qualify/limits grids (keep leave CSS intact)
extra_css = """
    .current-shot {
      margin: 0;
      padding: 0.55rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      box-shadow: var(--shadow-md);
    }
    .current-shot img { width: 100%; border-radius: calc(var(--radius-lg) - 8px); }
    .current-shot figcaption {
      padding: 0.65rem 0.35rem 0.15rem;
      color: var(--text-muted);
      font-size: 0.75rem;
      text-align: center;
    }
    .capture-section { background: var(--surface-2); }
    .payroll-section { background: var(--surface); }
    .qualify-panel {
      margin-top: 1.5rem;
      padding: 1.25rem 1.4rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: linear-gradient(180deg, #fffbeb, #fff);
      box-shadow: var(--shadow-sm);
    }
    .qualify-panel strong { color: var(--text); }
    .capture-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
    }
    .capture-card {
      position: relative;
      overflow: hidden;
      padding: 1.45rem 1.4rem 1.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: var(--shadow-sm);
    }
    .capture-card::after {
      content: "";
      position: absolute;
      inset: auto -20% -40% auto;
      width: 160px;
      height: 160px;
      border-radius: 50%;
      background: var(--brand-soft);
      opacity: 0.7;
      pointer-events: none;
    }
    .capture-card--device::after { background: var(--sky-soft); }
    .capture-label {
      margin: 0 0 0.55rem;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--brand);
    }
    .capture-card--device .capture-label { color: var(--sky); }
    .capture-card h3 { position: relative; z-index: 1; margin: 0 0 0.55rem; font-size: 1.15rem; }
    .capture-card p { position: relative; z-index: 1; margin: 0; color: var(--text-muted); }
    .capture-list {
      margin: 1rem 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.45rem;
      position: relative;
      z-index: 1;
    }
    .capture-list li {
      padding-left: 1.15rem;
      position: relative;
      color: var(--text);
      font-size: 0.95rem;
    }
    .capture-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: var(--brand);
      font-weight: 800;
    }
    .device-note {
      margin: 1.25rem 0 0;
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    .limits-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }
    .limit-card {
      padding: 1.2rem 1.25rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
    }
    .limit-card h3 { margin: 0 0 0.45rem; font-size: 1.02rem; }
    .limit-card p { margin: 0; color: var(--text-muted); font-size: 0.95rem; }
    .status-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.9rem;
    }
    .status-card {
      padding: 1.1rem 1.15rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
    }
    .status-card h3 { margin: 0 0 0.4rem; font-size: 1rem; }
    .status-card p { margin: 0; color: var(--text-muted); font-size: 0.92rem; }
    .status-symbol {
      display: inline-flex;
      width: 1.6rem;
      height: 1.6rem;
      margin-right: 0.4rem;
      align-items: center;
      justify-content: center;
      border-radius: 0.4rem;
      background: var(--brand-soft);
      color: var(--brand-dark);
      font-weight: 800;
      font-size: 0.85rem;
    }
    .status-card--late .status-symbol { background: var(--amber-soft); color: var(--amber); }
    .status-card--absent .status-symbol { background: var(--rose-soft); color: var(--rose); }
    .status-card--leave .status-symbol { background: var(--sky-soft); color: var(--sky); }
    @media (max-width: 900px) {
      .capture-grid, .limits-grid { grid-template-columns: 1fr; }
      .status-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 560px) {
      .status-grid { grid-template-columns: 1fr; }
    }
"""

# Insert extra CSS before closing style tag
css = css.replace("</style>", extra_css + "\n</style>")

title = "Employee Time Clock Software for Scheduled Teams | Simple Roster Plus"
desc = (
    "Record employee clock-in and clock-out events manually or from supported ZKTeco devices, "
    "match punches to staff, and compare attendance with your weekly roster."
)
url = "https://www.simplerosterplus.com/employee-time-clock-app"
og_image = "https://www.simplerosterplus.com/images/attendance-week-current.png"
og_alt = "Simple Roster Plus attendance week view comparing scheduled shifts with present, late, and absent outcomes."

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{url}">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Simple Roster Plus">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{og_image}">
  <meta property="og:image:alt" content="{og_alt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{og_image}">
  <meta name="twitter:image:alt" content="{og_alt}">
  <link rel="icon" href="../favicon.ico" sizes="any">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../brand/srp-icon-180.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@graph": [
      {{
        "@type": "WebPage",
        "@id": "{url}#webpage",
        "name": "{title}",
        "url": "{url}",
        "description": "{desc}",
        "isPartOf": {{ "@id": "https://www.simplerosterplus.com/#website" }},
        "about": {{ "@id": "https://www.simplerosterplus.com/#software" }},
        "breadcrumb": {{ "@id": "{url}#breadcrumb" }}
      }},
      {{
        "@type": "BreadcrumbList",
        "@id": "{url}#breadcrumb",
        "itemListElement": [
          {{
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://www.simplerosterplus.com/"
          }},
          {{
            "@type": "ListItem",
            "position": 2,
            "name": "Employee Time Clock",
            "item": "{url}"
          }}
        ]
      }}
    ]
  }}
  </script>
{css}
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header id="site-header">
    <div class="header-inner">
      <a class="logo" href="/" aria-label="Simple Roster Plus home">
        <img
          src="../brand/srp-logo-lockup.png"
          srcset="../brand/srp-logo-lockup-640.png 640w, ../brand/srp-logo-lockup-1280.png 1280w, ../brand/srp-logo-lockup.png 1361w"
          sizes="(max-width: 640px) 154px, 190px"
          width="190"
          height="36"
          alt="Simple Roster Plus"
        >
      </a>
      <nav class="header-nav" aria-label="Page">
        <a href="#capture">Capture</a>
        <a href="#match">Matching</a>
        <a href="#review">Review</a>
        <a href="#faq">FAQ</a>
      </nav>
      <div class="header-actions">
        <a class="btn btn-ghost" href="https://app.simplerosterplus.com/login" rel="noopener noreferrer">Log in</a>
        <a class="btn btn-primary" href="https://app.simplerosterplus.com/sign-up" rel="noopener noreferrer">Start Free</a>
      </div>
    </div>
  </header>

  <main id="main">
    <section id="hero" aria-labelledby="hero-heading">
      <div class="wrap hero-grid">
        <div class="hero-copy">
          <p class="breadcrumb"><a href="/">Home</a> / Employee time clock</p>
          <span class="eyebrow">Employee punch clock software</span>
          <h1 id="hero-heading">Connect <span class="accent">Clock Events</span> to the Weekly Roster</h1>
          <p class="hero-lead">Capture attendance manually or from supported ZKTeco devices, match clock events to staff, and review present, late, and absent outcomes against scheduled shifts.</p>
          <div class="cta-row">
            <a class="btn btn-primary btn-lg" href="https://app.simplerosterplus.com/sign-up" rel="noopener noreferrer">Start Free</a>
            <a class="btn btn-secondary btn-lg" href="https://app.simplerosterplus.com/sign-up?intent=demo" rel="noopener noreferrer">Explore demo</a>
          </div>
          <ul class="hero-meta">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
              Manager-entered punches
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
              Supported ZKTeco ADMS events
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
              Roster-connected review
            </li>
          </ul>
        </div>
        <div class="hero-visual">
          <span class="float-chip float-chip--top"><span class="dot"></span>Plan vs punches</span>
          <div class="hero-frame">
            <picture>
              <source type="image/webp" srcset="../images/attendance-week-current.webp">
              <img
                src="../images/attendance-week-current.png"
                width="1024"
                height="530"
                alt="Attendance week view in Simple Roster Plus showing scheduled shifts beside present, late, absent, and leave-backed outcomes."
                decoding="async"
                fetchpriority="high"
              >
            </picture>
          </div>
          <span class="float-chip float-chip--bottom"><span class="dot dot-amber"></span>Exceptions stay visible</span>
        </div>
      </div>
    </section>

    <div class="proof-strip" aria-label="Clock event summary">
      <ul class="wrap proof-list">
        <li><strong>Capture punches</strong>Manual entry or supported devices</li>
        <li><strong>Match people</strong>Map terminal users to staff</li>
        <li><strong>Review the week</strong>Present, late, and absent vs schedule</li>
      </ul>
    </div>

    <section id="qualify" aria-labelledby="qualify-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">What “employee time clock app” means here</span>
          <h2 id="qualify-heading" class="section-title">A Roster-Connected Time Clock—Not a Mobile Punch App</h2>
          <p class="section-lead">Searching for an employee time clock app? Simple Roster Plus uses a roster-connected workflow for managers—not employee phone clock-in.</p>
        </div>
        <div class="qualify-panel" role="note">
          <p><strong>Simple Roster Plus is not an employee phone clock-in app.</strong> Managers can enter attendance manually, or supported ZKTeco devices can send clock events to the system. There is no employee browser self-service punch, GPS, geofencing, or in-app kiosk mode.</p>
        </div>
      </div>
    </section>

    <section id="capture" class="capture-section" aria-labelledby="capture-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Clock-event capture</span>
          <h2 id="capture-heading" class="section-title">Two Ways Clock Events Enter Simple Roster Plus</h2>
          <p class="section-lead">Choose the capture path that fits today. Both paths feed the same roster-connected attendance records.</p>
        </div>
        <div class="capture-grid">
          <article class="capture-card">
            <p class="capture-label">Manual attendance</p>
            <h3>Managers enter clock-in and clock-out</h3>
            <p>Add an in or out punch with an optional note. The product can suggest the next punch direction from the staff member’s latest record.</p>
            <ul class="capture-list">
              <li>In and out punch types</li>
              <li>Optional punch notes</li>
              <li>No terminal required</li>
            </ul>
          </article>
          <article class="capture-card capture-card--device">
            <p class="capture-label">Supported device attendance</p>
            <h3>Receive ZKTeco ADMS clock events</h3>
            <p>Supported ADMS-capable ZKTeco terminals can send compatible attendance events. Setup and compatibility limits live on our <a href="/zkteco-attendance-integration">ZKTeco attendance integration</a> page.</p>
            <ul class="capture-list">
              <li>Device-sourced punch records</li>
              <li>Location-scoped staff matching</li>
              <li>Near-duplicate suppression on ingest</li>
            </ul>
          </article>
        </div>
        <p class="device-note">Compatibility depends on terminal model, firmware, and configuration. Device slots are software connectivity—not included biometric hardware.</p>
      </div>
    </section>

    <section id="match" class="feature-section" aria-labelledby="match-heading">
      <div class="wrap feature-grid">
        <div class="feature-copy">
          <span class="eyebrow">Staff-device matching</span>
          <h2 id="match-heading">Match Device Punches to the Right Staff Member</h2>
          <p>Each terminal user ID can be linked to an employee at that location so incoming clock events attach to the correct person on the roster.</p>
          <ul class="check-list">
            <li><span class="check" aria-hidden="true">✓</span><span>Map device user IDs to staff at the device’s location.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Keep the device source on the punch record.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Review attendance after matching—not in a separate spreadsheet.</span></li>
          </ul>
          <a class="inline-link" href="/zkteco-attendance-integration">See ZKTeco ADMS setup and matching →</a>
        </div>
        <figure class="current-shot">
          <picture>
            <source type="image/webp" srcset="../images/zkteco-staff-matching.webp">
            <img
              src="../images/zkteco-staff-matching.png"
              width="1024"
              height="755"
              alt="Simple Roster Plus staff mapping screen linking a terminal user ID to an employee for attendance punches."
              loading="lazy"
            >
          </picture>
          <figcaption>Map terminal user IDs to employees so device punches attach to the right person.</figcaption>
        </figure>
      </div>
    </section>

    <section id="unmatched" aria-labelledby="unmatched-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Unmatched punch recovery</span>
          <h2 id="unmatched-heading" class="section-title">Keep Unmatched Punches for Review</h2>
          <p class="section-lead">If a device event arrives before a user is mapped, Simple Roster Plus retains it instead of silently dropping the clock event.</p>
        </div>
        <div class="problem-grid">
          <article class="card">
            <div class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 6h16v12H4zM8 10h8M8 14h5"/></svg>
            </div>
            <h3>Retain unmatched events</h3>
            <p>Unmatched device punches stay available for review with the terminal user ID preserved.</p>
          </article>
          <article class="card">
            <div class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></svg>
            </div>
            <h3>Map when ready</h3>
            <p>Link the terminal user to a staff member when you confirm who should own those punches.</p>
          </article>
          <article class="card">
            <div class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>
            </div>
            <h3>Backfill earlier punches</h3>
            <p>After mapping, earlier unmatched events for that user can attach to the employee.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="review" class="feature-section" aria-labelledby="review-heading">
      <div class="wrap feature-grid">
        <figure class="current-shot">
          <picture>
            <source type="image/webp" srcset="../images/solution-attendance.webp">
            <img
              src="../images/solution-attendance.png"
              width="1536"
              height="1024"
              alt="Attendance review screen in Simple Roster Plus with roster-connected punch outcomes for a weekly schedule."
              loading="lazy"
            >
          </picture>
          <figcaption>Review clock events beside the weekly plan so late and absent outcomes are easy to scan.</figcaption>
        </figure>
        <div class="feature-copy">
          <span class="eyebrow">Roster-connected review</span>
          <h2 id="review-heading">See Present, Late, and Absent Against the Schedule</h2>
          <p>Once punches land, managers compare them with scheduled shifts using an organization grace period. Vacation, sick leave, days off, and station-closed days also appear as leave-backed states.</p>
          <ul class="check-list">
            <li><span class="check" aria-hidden="true">✓</span><span>Present, late, and absent against expected start times.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Grace period for late and absent thresholds.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Leave-backed states from vacation, sick leave, and days off.</span></li>
          </ul>
          <a class="inline-link" href="/employee-attendance-software">Explore employee attendance software →</a>
        </div>
      </div>
      <div class="wrap" style="margin-top: 2rem;">
        <div class="status-grid" aria-label="Attendance statuses">
          <article class="status-card">
            <h3><span class="status-symbol">P</span>Present</h3>
            <p>First in-punch within the configured grace period.</p>
          </article>
          <article class="status-card status-card--late">
            <h3><span class="status-symbol">L</span>Late</h3>
            <p>First in-punch after shift start plus grace.</p>
          </article>
          <article class="status-card status-card--absent">
            <h3><span class="status-symbol">A</span>Absent</h3>
            <p>No in-punch after the scheduled start and grace window.</p>
          </article>
          <article class="status-card status-card--leave">
            <h3><span class="status-symbol">V</span>Leave-backed</h3>
            <p>Vacation, sick leave, day off, or station closed.</p>
          </article>
        </div>
        <p class="device-note">For building the weekly plan first, see <a href="/employee-scheduling-software">employee scheduling software</a>. For leave records that affect scheduled days, see <a href="/employee-leave-and-availability">employee leave and availability</a>.</p>
      </div>
    </section>

    <section id="correct" aria-labelledby="correct-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Corrections and context</span>
          <h2 id="correct-heading" class="section-title">Correct Punches and Add Context</h2>
          <p class="section-lead">When a punch is wrong or incomplete, managers can fix unfiled records and keep useful correction context.</p>
        </div>
        <div class="problem-grid">
          <article class="card">
            <div class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 20h4L18 10l-4-4L4 16v4zM14 6l4 4"/></svg>
            </div>
            <h3>Edit a punch</h3>
            <p>Update time, direction, or note. When the time changes, the first original time is retained.</p>
          </article>
          <article class="card">
            <div class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/></svg>
            </div>
            <h3>Override a day</h3>
            <p>Mark a day manually present or absent and add a reason when punches do not tell the full story.</p>
          </article>
          <article class="card">
            <div class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h10"/></svg>
            </div>
            <h3>Add notes</h3>
            <p>Attach notes to punches or day overrides so the next review has context.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="payroll" class="payroll-section" aria-labelledby="payroll-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Payroll handoff</span>
          <h2 id="payroll-heading" class="section-title">Prepare Attendance Hours for Payroll Handoff</h2>
          <p class="section-lead">Worked time comes from completed in-and-out pairs. Prepare a pay-period summary, then download CSV or print it for whoever runs payroll.</p>
        </div>
        <div class="problem-grid">
          <article class="card">
            <h3>Completed punch pairs</h3>
            <p>Matched in/out intervals contribute worked time. Incomplete sequences may need correction first.</p>
          </article>
          <article class="card">
            <h3>Weekly threshold summary</h3>
            <p>Compare weekly worked time with a configurable threshold. This is a summary aid—not an overtime-compliance engine.</p>
          </article>
          <article class="card">
            <h3>CSV or print handoff</h3>
            <p>Export or print the pay-period summary for manual payroll handoff. There is no automated payroll sync or timesheet product.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="not-this" aria-labelledby="not-this-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Honest product boundaries</span>
          <h2 id="not-this-heading" class="section-title">What This Employee Time Clock Workflow Is Not</h2>
          <p class="section-lead">Clear limits help you decide fit quickly—before you compare it to a mobile punch app or payroll suite.</p>
        </div>
        <div class="limits-grid">
          <article class="limit-card">
            <h3>Not phone clock-in</h3>
            <p>No employee mobile or browser self-service punching, GPS, or geofencing.</p>
          </article>
          <article class="limit-card">
            <h3>Not a kiosk product</h3>
            <p>No in-app kiosk, QR, or PIN station. Supported physical terminals are separate hardware.</p>
          </article>
          <article class="limit-card">
            <h3>Not payroll software</h3>
            <p>CSV and printable summaries support handoff. No payroll integration, timesheets, or break-tracking product.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="fit" aria-labelledby="fit-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Small-business fit</span>
          <h2 id="fit-heading" class="section-title">Built for Small, Shift-Based Teams</h2>
          <p class="section-lead">Managers who already publish a weekly roster and need digital clock events without a heavyweight HR suite.</p>
        </div>
        <div class="problem-grid">
          <article class="card">
            <h3>Cafés, retail, and clinics</h3>
            <p>Shift teams that need punches tied to published weeks—not project timers or enterprise HRIS.</p>
          </article>
          <article class="card">
            <h3>Manual today, devices later</h3>
            <p>Start with manager-entered punches, then add supported ZKTeco ADMS terminals when you are ready.</p>
          </article>
          <article class="card">
            <h3>Clear pricing path</h3>
            <p>See staff, location, and device-slot limits on <a href="/#pricing">Simple Roster Plus pricing</a>. For SMB scheduling context, visit <a href="/small-business-employee-scheduling">employee scheduling software for small business</a>.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="faq" class="faq-section" aria-labelledby="faq-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Employee time clock questions</span>
          <h2 id="faq-heading" class="section-title">Straight Answers Before You Start</h2>
        </div>
        <div class="faq-list">
          <details open>
            <summary>Can employees clock in from their phones?</summary>
            <p class="faq-answer">No. Simple Roster Plus does not currently provide employee mobile or browser self-service clock-in. Managers enter punches, or supported ZKTeco devices send clock events.</p>
          </details>
          <details>
            <summary>Can managers enter attendance manually?</summary>
            <p class="faq-answer">Yes. Managers can add clock-in and clock-out records with optional notes, including when no attendance terminal is connected.</p>
          </details>
          <details>
            <summary>Does Simple Roster Plus support ZKTeco devices?</summary>
            <p class="faq-answer">Supported ADMS-capable ZKTeco terminals can send compatible attendance events. Compatibility is not universal and depends on model, firmware, and configuration. See <a href="/zkteco-attendance-integration">ZKTeco attendance integration</a>.</p>
          </details>
          <details>
            <summary>What happens to unmatched clock events?</summary>
            <p class="faq-answer">Unmatched device events are retained for review and can be mapped to staff later. Earlier unmatched punches for that user can backfill after mapping.</p>
          </details>
          <details>
            <summary>Can punch records be corrected?</summary>
            <p class="faq-answer">Yes. Managers can edit or remove unfiled punches. When a time changes, the first original time is retained for context. There is no approval queue for corrections.</p>
          </details>
          <details>
            <summary>Does it show late and absent staff?</summary>
            <p class="faq-answer">Yes. Present, late, and absent outcomes are based on scheduled shifts and an organization grace period. Vacation, sick leave, days off, and station-closed days also appear as leave-backed states.</p>
          </details>
          <details>
            <summary>Does it track breaks?</summary>
            <p class="faq-answer">No dedicated break-tracking or meal-break enforcement workflow is currently provided. Multiple punches may exist in the log, but that is not break management.</p>
          </details>
          <details>
            <summary>Does it calculate overtime?</summary>
            <p class="faq-answer">Weekly worked time can be compared with a configurable threshold, but Simple Roster Plus is not an overtime-compliance engine.</p>
          </details>
          <details>
            <summary>Does it create timesheets?</summary>
            <p class="faq-answer">No dedicated timesheet product is currently provided. Managers can prepare pay-period summaries for handoff instead.</p>
          </details>
          <details>
            <summary>Does it integrate with payroll?</summary>
            <p class="faq-answer">CSV and printable summaries support manual payroll handoff. There is no automated payroll integration or payroll sync.</p>
          </details>
          <details>
            <summary>Does it support GPS or geofencing?</summary>
            <p class="faq-answer">No. GPS clock-in and geofencing are not current Simple Roster Plus features.</p>
          </details>
          <details>
            <summary>Is it a kiosk time clock?</summary>
            <p class="faq-answer">No. There is no in-app kiosk mode. Supported physical attendance terminals are separate hardware configured for ADMS push.</p>
          </details>
          <details>
            <summary>Does it work across multiple locations?</summary>
            <p class="faq-answer">Locations and devices are supported, but attendance review is location-scoped. There is no combined multi-location punch dashboard.</p>
          </details>
          <details>
            <summary>Can it handle overnight shifts?</summary>
            <p class="faq-answer">Overnight shift templates exist on the roster side, but attendance classification remains calendar-day based. Do not expect full overnight punch reconciliation from this workflow alone.</p>
          </details>
          <details>
            <summary>What hardware is required?</summary>
            <p class="faq-answer">None for manual entry. Optional supported ZKTeco ADMS terminals can send device punches. No Simple Roster Plus phone or tablet kiosk is required.</p>
          </details>
        </div>
      </div>
    </section>

    <section id="cta-close" aria-labelledby="cta-heading">
      <div class="wrap">
        <h2 id="cta-heading">Connect Clock Events to the Roster Your Team Already Uses</h2>
        <p>Enter punches manually or receive supported device events, match people, review outcomes against the week, and prepare a payroll handoff—without pretending this is a mobile employee punch app.</p>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="https://app.simplerosterplus.com/sign-up" rel="noopener noreferrer">Start Free</a>
          <a class="btn btn-secondary btn-lg" href="https://app.simplerosterplus.com/sign-up?intent=demo" rel="noopener noreferrer">Explore demo</a>
        </div>
      </div>
    </section>
  </main>

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
      <p class="footer-mission">Simple Roster Plus helps managers capture clock events, review attendance against the weekly roster, and prepare worked-time summaries for payroll handoff.</p>
      <nav class="footer-links" aria-label="Footer">
        <a href="/">Employee roster software</a>
        <a href="/employee-scheduling-software">Employee scheduling</a>
        <a href="/employee-leave-and-availability">Leave and availability</a>
        <a href="/employee-attendance-software">Employee attendance</a>
        <a href="/employee-time-clock-app" aria-current="page">Employee time clock</a>
        <a href="/zkteco-attendance-integration">ZKTeco integration</a>
        <a href="/small-business-employee-scheduling">Small business scheduling</a>
        <a href="/#pricing">Pricing</a>
        <a href="/privacy">Privacy policy</a>
        <a href="/terms">Terms of service</a>
        <a href="https://app.simplerosterplus.com/login" rel="noopener noreferrer">Log in</a>
        <a href="https://app.simplerosterplus.com/sign-up" rel="noopener noreferrer">Start Free</a>
      </nav>
      <p class="footer-copy">© <span id="year"></span> Simple Roster Plus. All rights reserved.</p>
    </div>
  </footer>

  <script>
    (function () {{
      var year = document.getElementById("year");
      if (year) year.textContent = new Date().getFullYear();

      var header = document.getElementById("site-header");
      if (header) {{
        var onScroll = function () {{
          header.classList.toggle("is-scrolled", window.scrollY > 8);
        }};
        window.addEventListener("scroll", onScroll, {{ passive: true }});
        onScroll();
      }}
    }})();
  </script>
</body>
</html>
"""

out = Path("landing-page/employee-time-clock-app/index.html")
out.write_text(html, encoding="utf-8")
print("wrote", out, "bytes", out.stat().st_size)
# sanity checks
assert html.count("<h1") == 1
assert "Connect <span class=\"accent\">Clock Events</span> to the Weekly Roster" in html
assert title in html
assert "not an employee phone clock-in app" in html
assert "https://app.simplerosterplus.com/sign-up" in html
assert "MobileApplication" not in html
print("sanity ok")
