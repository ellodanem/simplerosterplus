from pathlib import Path
import re
import json

p = Path(
    r"C:\Users\Dane\Cursor Projects\simple roster plus\srp\landing-page\employee-leave-and-availability\index.html"
)
t = p.read_text(encoding="utf-8")
print("TITLE", re.search(r"<title>(.*?)</title>", t).group(1))
print("META", re.search(r'name="description" content="(.*?)"', t).group(1))
print("CANON", re.search(r'rel="canonical" href="(.*?)"', t).group(1))
print(
    "H1",
    re.sub(r"<[^>]+>", "", re.search(r"<h1[^>]*>(.*?)</h1>", t, re.S).group(1)),
)
print("H1 count", t.count("<h1"))
print("FAQPage", "FAQPage" in t)
for m in re.finditer(r'<section[^>]*id="([^"]+)"', t):
    print("section", m.group(1))
for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", t, re.S):
    print("H2", re.sub(r"<[^>]+>", "", m.group(1)).strip()[:100])
print("images", re.findall(r'src="\.\./images/[^"]+"', t))
print("Start Free Trial", "Start Free Trial" in t)
print("Auto Scheduler", "Auto Scheduler" in t)
sm = Path(
    r"C:\Users\Dane\Cursor Projects\simple roster plus\srp\landing-page\sitemap.xml"
).read_text(encoding="utf-8")
print("sitemap leave count", sm.count("employee-leave-and-availability"))
ld = re.search(
    r'<script type="application/ld\+json">\s*(.*?)\s*</script>', t, re.S
).group(1)
json.loads(ld)
print("jsonld ok")
