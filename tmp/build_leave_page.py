from pathlib import Path

style = Path(r"C:\Users\Dane\Cursor Projects\simple roster plus\srp\tmp\leave-page-style.css").read_text(encoding="utf-8")

head = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Employee Leave and Availability Software | Simple Roster Plus</title>
  <meta name="description" content="Record vacation, days off, and sick leave, see approved time off on the weekly roster, and capture soft shift preferences without full HR leave software.">
  <link rel="canonical" href="https://www.simplerosterplus.com/employee-leave-and-availability">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Simple Roster Plus">
  <meta property="og:title" content="Employee Leave and Availability Software | Simple Roster Plus">
  <meta property="og:description" content="Record vacation, days off, and sick leave, see approved time off on the weekly roster, and capture soft shift preferences without full HR leave software.">
  <meta property="og:url" content="https://www.simplerosterplus.com/employee-leave-and-availability">
  <meta property="og:image" content="https://www.simplerosterplus.com/images/app-roster-week.png">
  <meta property="og:image:alt" content="Simple Roster Plus weekly roster with color-coded shifts and leave visibility.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Employee Leave and Availability Software | Simple Roster Plus">
  <meta name="twitter:description" content="Record vacation, days off, and sick leave, see approved time off on the weekly roster, and capture soft shift preferences without full HR leave software.">
  <meta name="twitter:image" content="https://www.simplerosterplus.com/images/app-roster-week.png">
  <meta name="twitter:image:alt" content="Simple Roster Plus weekly roster with color-coded shifts and leave visibility.">
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
        "@id": "https://www.simplerosterplus.com/employee-leave-and-availability#webpage",
        "name": "Employee Leave and Availability Software | Simple Roster Plus",
        "url": "https://www.simplerosterplus.com/employee-leave-and-availability",
        "description": "Record vacation, days off, and sick leave, see approved time off on the weekly roster, and capture soft shift preferences without full HR leave software.",
        "isPartOf": {{ "@id": "https://www.simplerosterplus.com/#website" }},
        "about": {{ "@id": "https://www.simplerosterplus.com/#software" }},
        "breadcrumb": {{ "@id": "https://www.simplerosterplus.com/employee-leave-and-availability#breadcrumb" }}
      }},
      {{
        "@type": "BreadcrumbList",
        "@id": "https://www.simplerosterplus.com/employee-leave-and-availability#breadcrumb",
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
            "name": "Employee Leave and Availability",
            "item": "https://www.simplerosterplus.com/employee-leave-and-availability"
          }}
        ]
      }}
    ]
  }}
  </script>
{style}
</head>
"""

body = r"""<body>
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
        <a href="#record">Leave types</a>
        <a href="#approve">Approval</a>
        <a href="#preferences">Preferences</a>
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
          <p class="breadcrumb"><a href="/">Home</a> / Employee leave and availability</p>
          <span class="eyebrow">Employee leave management software</span>
          <h1 id="hero-heading">Manage <span class="accent">Leave and Availability</span> Before You Build the Roster</h1>
          <p class="hero-lead">Record vacation, days off, and sick leave, review conflicts before approval, and keep approved time off visible while assigning the weekly roster.</p>
          <div class="cta-row">
            <a class="btn btn-primary btn-lg" href="https://app.simplerosterplus.com/sign-up" rel="noopener noreferrer">Start Free</a>
            <a class="btn btn-secondary btn-lg" href="https://app.simplerosterplus.com/sign-up?intent=demo" rel="noopener noreferrer">Explore demo</a>
          </div>
          <ul class="hero-meta">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
              Manager-managed leave
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
              Soft shift preferences
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
              Free for up to 10 staff
            </li>
          </ul>
        </div>
        <div class="hero-visual">
          <span class="float-chip float-chip--top"><span class="dot"></span>Leave stays visible</span>
          <div class="hero-frame">
            <picture>
              <source type="image/webp" srcset="../images/app-roster-week.webp">
              <img
                src="../images/app-roster-week.png"
                width="1400"
                height="900"
                alt="Weekly roster grid in Simple Roster Plus where managers account for time off while assigning shifts."
                decoding="async"
                fetchpriority="high"
              >
            </picture>
          </div>
          <span class="float-chip float-chip--bottom"><span class="dot dot-amber"></span>Preferences stay soft</span>
        </div>
      </div>
    </section>

    <div class="proof-strip" aria-label="Leave planning summary">
      <ul class="wrap proof-list">
        <li><strong>Record time off</strong>Vacation, days off, and sick leave</li>
        <li><strong>Approve carefully</strong>Review conflicts before confirming</li>
        <li><strong>Assign with context</strong>Blocked leave cells on the roster</li>
      </ul>
    </div>

    <section id="problem" aria-labelledby="problem-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">See time off before you assign the week</span>
          <h2 id="problem-heading" class="section-title">Disconnected Leave Records Create Avoidable Roster Clashes</h2>
          <p class="section-lead">When vacation and days off live in spreadsheets or group chats, managers often discover them after the schedule is already built. Simple Roster Plus keeps leave next to the weekly roster.</p>
        </div>
        <div class="problem-grid">
          <article class="card">
            <div class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"/></svg>
            </div>
            <h3>Stop hunting through chat history</h3>
            <p>Keep vacation, days off, and sick leave in one manager-managed place instead of scattered messages.</p>
          </article>
          <article class="card">
            <div class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 9h16M8 3v4M16 3v4"/></svg>
            </div>
            <h3>See leave while you schedule</h3>
            <p>Approved time off stays visible on the roster so you are not assigning shifts into blocked days.</p>
          </article>
          <article class="card">
            <div class="card-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>
            </div>
            <h3>Stay roster-first</h3>
            <p>Leave supports weekly planning—it does not turn Simple Roster Plus into a full HR leave suite.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="record" class="feature-section" aria-labelledby="record-heading">
      <div class="wrap feature-grid">
        <div class="feature-copy">
          <span class="eyebrow">Record vacation, days off, and sick leave</span>
          <h2 id="record-heading">Manager-Managed Leave Records for Shift Teams</h2>
          <p>Managers record time off for staff in the Requests workflow—vacation date ranges, single days off, and sick-leave date ranges—with optional reasons and approve or deny decisions.</p>
          <ul class="check-list">
            <li><span class="check" aria-hidden="true">✓</span><span>Vacation ranges with start and end dates.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Single days off for one-off time away.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Sick leave ranges for short absences.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Optional notes and who decided, when.</span></li>
          </ul>
        </div>
        <div class="ui-panel" aria-label="Illustrative leave record examples">
          <div class="ui-panel-head">
            <strong>Leave records</strong>
            <span>Manager-managed</span>
          </div>
          <div class="status-list" style="padding:1rem;">
            <div class="status-row"><span>Alex Morgan · 12–16 May</span><span class="status-pill status-pill--leave">Vacation</span></div>
            <div class="status-row"><span>Jamie Lewis · Thu 15 May</span><span class="status-pill status-pill--leave">Day off</span></div>
            <div class="status-row"><span>Sam Rivera · 14–15 May</span><span class="status-pill status-pill--sick">Sick leave</span></div>
          </div>
          <p class="panel-note">Illustrative examples of manager-managed leave types—not a live product screenshot.</p>
        </div>
      </div>
    </section>

    <section id="approve" class="soft-section" aria-labelledby="approve-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Approve leave without surprises</span>
          <h2 id="approve-heading" class="section-title">Review Roster Conflicts Before You Confirm</h2>
          <p class="section-lead">When leave overlaps existing shifts, managers see a conflict summary and can confirm clearing those assignments as part of approval.</p>
        </div>
        <div class="review-grid">
          <article class="card review-card">
            <span class="step-no">Step 1</span>
            <h3>Record the request</h3>
            <p>Add vacation, a day off, or sick leave for a staff member, with an optional reason.</p>
          </article>
          <article class="card review-card review-card--warn">
            <span class="step-no">Step 2</span>
            <h3>Check overlapping shifts</h3>
            <p>If the dates already have roster assignments, review the conflict before approving.</p>
          </article>
          <article class="card review-card review-card--live">
            <span class="step-no">Step 3</span>
            <h3>Approve and clear</h3>
            <p>Confirm approval to clear overlapping shifts, or deny the request when the roster should stay as planned.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="visibility" class="feature-section" aria-labelledby="visibility-heading">
      <div class="wrap feature-grid reverse">
        <div class="feature-copy">
          <span class="eyebrow">Keep approved leave visible on the roster</span>
          <h2 id="visibility-heading">Blocked Leave Cells While You Assign the Week</h2>
          <p>Approved vacation, days off, and sick leave appear on the roster and prevent conflicting assignments. Closed holidays block separately so station closures stay clear of leave records.</p>
          <ul class="check-list">
            <li><span class="check" aria-hidden="true">✓</span><span>Approved leave labels on blocked roster cells.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Assignment writes reject conflicting leave dates.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Closed holidays handled as their own roster blocks.</span></li>
          </ul>
          <a class="inline-link" href="/employee-scheduling-software">See how weekly scheduling works →</a>
        </div>
        <div class="timeoff-panel">
          <div>
            <h2 style="font-size:1.35rem;margin:0 0 0.65rem;">On the roster</h2>
            <p>Leave stays in view while managers assign reusable shifts for the rest of the week.</p>
          </div>
          <div class="status-list" aria-label="Illustrative blocked roster cells">
            <div class="status-row"><span>Mon · Alex Morgan</span><span class="status-pill status-pill--leave">Vacation</span></div>
            <div class="status-row"><span>Wed · Sam Rivera</span><span class="status-pill status-pill--sick">Sick leave</span></div>
            <div class="status-row"><span>Fri · Team roster</span><span class="status-pill status-pill--closed">Closed holiday</span></div>
          </div>
        </div>
      </div>
    </section>

    <section id="preferences" aria-labelledby="pref-heading">
      <div class="wrap feature-grid">
        <div class="feature-copy">
          <span class="eyebrow">Capture soft shift preferences</span>
          <h2 id="pref-heading">Staff Shift Preferences Are Planning Cues—Not Hard Rules</h2>
          <p>Capture staff shift preferences as soft planning cues without treating them as automatic scheduling rules. Preference chips can appear while you roster; they do not assign shifts or act as recurring availability windows.</p>
          <ul class="check-list">
            <li><span class="check" aria-hidden="true">✓</span><span>Preferred-shift requests for a specific day.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Visible cues while assigning open cells.</span></li>
            <li><span class="check" aria-hidden="true">✓</span><span>Managers still choose the final assignment.</span></li>
          </ul>
          <p style="margin:1.1rem 0 0;color:var(--text-muted);font-size:0.94rem;">If you searched for employee availability software, treat this as preference-aware rostering—not a full availability engine.</p>
        </div>
        <div class="ui-panel" aria-label="Illustrative soft preference cue">
          <div class="ui-panel-head">
            <strong>Open roster cell</strong>
            <span>Soft cue</span>
          </div>
          <div style="padding:1.25rem;display:grid;gap:0.85rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;">
              <span><strong>Thu · Emma R.</strong><br><small style="color:var(--text-muted);">Pump Attendant</small></span>
              <span class="pref-chip">Wants Evening</span>
            </div>
            <p class="panel-note" style="margin:0;">Illustrative preference chip—preferences do not automatically assign or block shifts.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="connect" class="attendance-band" aria-labelledby="connect-heading">
      <div class="wrap attendance-inner">
        <div class="attendance-copy">
          <span class="eyebrow" style="background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.25);color:#ecfdf5;">Plan, then track</span>
          <h2 id="connect-heading">Leave Supports the Roster—Attendance Comes Next</h2>
          <p>After leave is accounted for and the week is published, managers can review what was scheduled against what actually happened. Explore <a href="/employee-scheduling-software">employee scheduling software</a> for building and publishing the week, and <a href="/employee-attendance-software">employee attendance software</a> for plan-versus-actual review.</p>
        </div>
        <div class="attendance-statuses" aria-label="Core product flow">
          <div class="attendance-status">Leave first<span>Record and approve time off</span></div>
          <div class="attendance-status">Roster next<span>Assign around blocked days</span></div>
          <div class="attendance-status">Publish<span>Share one clear schedule</span></div>
          <div class="attendance-status">Attendance<span>Compare plan vs actual</span></div>
        </div>
      </div>
    </section>

    <section id="boundaries" aria-labelledby="boundaries-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Leave planning without a full HRIS</span>
          <h2 id="boundaries-heading" class="section-title">What Simple Roster Plus Does Not Replace</h2>
          <p class="section-lead">Simple Roster Plus helps managers plan around leave. It does not calculate leave balances, accruals, entitlements, carryover, payroll, or statutory compliance.</p>
        </div>
        <div class="scope-grid">
          <article class="card scope-card--out">
            <div class="card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></div>
            <h3>Not leave-balance software</h3>
            <p>No entitlements, accrual tracking, or carryover engines.</p>
          </article>
          <article class="card scope-card--out">
            <div class="card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></div>
            <h3>Not employee self-service</h3>
            <p>Leave is manager-managed today—no employee leave portal or mobile leave app.</p>
          </article>
          <article class="card scope-card--out">
            <div class="card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></div>
            <h3>Not leave messaging automation</h3>
            <p>Leave approvals do not send SMS or WhatsApp notifications.</p>
          </article>
          <article class="card scope-card--out">
            <div class="card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></div>
            <h3>Not a recurring availability engine</h3>
            <p>Shift preferences are soft cues, not hard weekly availability calendars.</p>
          </article>
        </div>
        <p class="fit-note">Comparing plans for a small team? See <a href="/small-business-employee-scheduling">employee scheduling software for small business</a>.</p>
      </div>
    </section>

    <section id="pricing" aria-labelledby="pricing-heading">
      <div class="wrap" style="text-align:center;">
        <span class="eyebrow">Ready to start</span>
        <h2 id="pricing-heading" class="section-title">Start Free and Keep Leave Next to the Roster</h2>
        <p class="section-lead" style="margin-inline:auto;max-width:40rem;">Free for up to 10 staff. Explore a demo if you want to see a sample week before adding your team.</p>
        <div class="cta-row" style="justify-content:center;margin-top:1.5rem;">
          <a class="btn btn-primary btn-lg" href="https://app.simplerosterplus.com/sign-up" rel="noopener noreferrer">Start Free</a>
          <a class="btn btn-secondary btn-lg" href="https://app.simplerosterplus.com/sign-up?intent=demo" rel="noopener noreferrer">Explore demo</a>
        </div>
        <p class="fit-note">See full plan limits on <a href="/#pricing">Simple Roster Plus pricing</a>.</p>
      </div>
    </section>

    <section id="faq" class="soft-section" aria-labelledby="faq-heading">
      <div class="wrap">
        <div class="section-head">
          <span class="eyebrow">Employee leave and availability questions</span>
          <h2 id="faq-heading" class="section-title">Employee Leave and Availability Questions</h2>
        </div>
        <div class="faq-list">
          <details open>
            <summary>Can managers record vacation and days off?</summary>
            <p class="faq-answer">Yes. Managers can record vacation date ranges and single days off, then approve or deny them.</p>
          </details>
          <details>
            <summary>Is sick leave supported?</summary>
            <p class="faq-answer">Yes. Managers can record sick-leave date ranges. Approved sick leave is visible on the roster and blocks conflicting assignments, alongside vacation and days off.</p>
          </details>
          <details>
            <summary>Can employees submit their own leave requests?</summary>
            <p class="faq-answer">No. Leave is currently manager-managed; Simple Roster Plus does not yet provide an employee self-service leave portal.</p>
          </details>
          <details>
            <summary>Does approved leave appear on the roster?</summary>
            <p class="faq-answer">Yes. Approved vacation, days off, and sick leave appear as blocked cells while managers assign the week.</p>
          </details>
          <details>
            <summary>What happens when leave overlaps an existing shift?</summary>
            <p class="faq-answer">Managers see a conflict summary before approval. Confirming approval can clear the overlapping roster assignments.</p>
          </details>
          <details>
            <summary>Are shift preferences hard availability rules?</summary>
            <p class="faq-answer">No. Shift preferences are soft planning cues. They do not automatically assign shifts or create recurring availability restrictions.</p>
          </details>
          <details>
            <summary>Does Simple Roster Plus track leave balances or accruals?</summary>
            <p class="faq-answer">No. It does not calculate leave balances, accruals, entitlements, or carryover.</p>
          </details>
          <details>
            <summary>Does it calculate statutory leave?</summary>
            <p class="faq-answer">No. Simple Roster Plus does not provide statutory leave or compliance calculations.</p>
          </details>
          <details>
            <summary>Does it send leave approval notifications?</summary>
            <p class="faq-answer">No. Leave approvals do not send email, SMS, or WhatsApp notifications today.</p>
          </details>
          <details>
            <summary>How does leave connect to attendance?</summary>
            <p class="faq-answer">Approved leave helps keep the published plan accurate. Attendance later compares scheduled days with actual clock-ins, and leave can excuse planned absences where the product supports it.</p>
          </details>
        </div>
      </div>
    </section>

    <section id="cta-close" aria-labelledby="cta-heading">
      <div class="wrap">
        <h2 id="cta-heading">Plan Around Leave Before You Assign the Week</h2>
        <p>Record time off, review conflicts, keep approved leave on the roster, and capture soft shift preferences—then build the schedule with clearer context.</p>
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
      <p class="footer-mission">Simple Roster Plus helps managers record leave, plan weekly staff rosters, and review attendance—without enterprise HR leave software.</p>
      <nav class="footer-links" aria-label="Footer">
        <a href="/">Employee roster software</a>
        <a href="/employee-scheduling-software">Employee scheduling</a>
        <a href="/employee-attendance-software">Employee attendance</a>
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
    (function () {
      var year = document.getElementById("year");
      if (year) year.textContent = new Date().getFullYear();

      var header = document.getElementById("site-header");
      if (header) {
        var onScroll = function () {
          header.classList.toggle("is-scrolled", window.scrollY > 8);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      }
    })();
  </script>
</body>
</html>
"""

out = Path(
    r"C:\Users\Dane\Cursor Projects\simple roster plus\srp\landing-page\employee-leave-and-availability\index.html"
)
html = head + body
out.write_text(html, encoding="utf-8")
print("wrote", out, "chars", len(html))
assert html.count("<h1") == 1
assert "Employee Leave and Availability Software | Simple Roster Plus" in html
assert "https://www.simplerosterplus.com/employee-leave-and-availability" in html
assert "Start Free Trial" not in html
assert "does not calculate leave balances, accruals" in html
print("assertions ok")
