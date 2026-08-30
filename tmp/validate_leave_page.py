from pathlib import Path
import re

p = Path(
    r"C:\Users\Dane\Cursor Projects\simple roster plus\srp\landing-page\employee-leave-and-availability\index.html"
)
t = p.read_text(encoding="utf-8")
print("title:", re.search(r"<title>(.*?)</title>", t).group(1))
print("h1 count:", t.count("<h1"))
print("canonical:", re.search(r'rel="canonical" href="(.*?)"', t).group(1))
print("Start Free:", t.count("Start Free"))
print("Start Free Trial:", t.count("Start Free Trial"))
print("FAQPage:", "FAQPage" in t)
hrefs = set(re.findall(r'https://app\.simplerosterplus\.com/[^"]+', t))
print("app hrefs:", sorted(hrefs))
for term in [
    "auto scheduler",
    "start free trial",
    "leave balance",
    "accrual",
    "self-service",
    "whatsapp",
    "sms",
    "payroll",
    "statutory",
    "entitlement",
    "carryover",
    "artificial intelligence",
]:
    low = t.lower()
    if term not in low:
        continue
    idx = 0
    while True:
        i = low.find(term, idx)
        if i < 0:
            break
        snippet = " ".join(t[max(0, i - 50) : i + len(term) + 50].split())
        print(f"--- {term!r}: ...{snippet}...")
        idx = i + 1

root = Path(r"C:\Users\Dane\Cursor Projects\simple roster plus\srp\landing-page")
print(
    "sitemap has leave:",
    "employee-leave-and-availability" in (root / "sitemap.xml").read_text(encoding="utf-8"),
)
print(
    "home footer:",
    "employee-leave-and-availability" in (root / "index.html").read_text(encoding="utf-8"),
)
print(
    "sched links:",
    (root / "employee-scheduling-software" / "index.html")
    .read_text(encoding="utf-8")
    .count("employee-leave-and-availability"),
)
